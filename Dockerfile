# syntax=docker/dockerfile:1
# Multi-stage build: compile with the full dependency set, ship only
# production deps + build output. Build per target platform (no
# --platform=$BUILDPLATFORM) so native binaries such as @next/swc match.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ---- full deps (cached on lockfile) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
FROM deps AS build
COPY . .
RUN node scripts/buildTime.js && pnpm build

# ---- production deps only ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# ---- runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production PORT=8080 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/next.config.js /app/next-i18next.config.js ./
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/.next ./.next
USER node
EXPOSE 8080
# Optional runtime env: EHV_SITE (exhentai|e-hentai), EHV_PROXY, PORT
CMD ["node", "server/src/server.js"]
