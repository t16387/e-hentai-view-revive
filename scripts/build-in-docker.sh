#!/bin/sh
# Legacy single-stage helper (the Dockerfile no longer uses it).
# Builds the app in-place and prunes to production dependencies.
set -e
corepack enable
if [ ! -d node_modules ]; then
  echo 'install dependencies'
  pnpm install --frozen-lockfile
  node scripts/buildTime.js
  pnpm build
  pnpm prune --prod
else
  echo 'node_modules exist'
fi
