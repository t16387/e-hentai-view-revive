# Running with Docker Compose

You do not need Node or pnpm on the notebook. Docker builds the image and runs the production server.

## Quick start

```bash
cp .env.example .env
# edit .env if you want ExHentai (EHV_SITE=exhentai) or a proxy
docker compose up --build
```

Open **http://localhost:3000** (or the port in `EHV_HOST_PORT`).

Stop: `Ctrl+C` or `docker compose down`.

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `EHV_SITE` | `e-hentai` in Compose | `e-hentai` (public) or `exhentai` (needs login) |
| `EHV_PROXY` | empty | Optional HTTP(S) proxy for upstream fetches |
| `EHV_HOST_PORT` | `3000` | Host port → container `8080` |
| `PORT` | `8080` (in image) | Listen port inside the container |
| `EHV_USER_AGENT` | browser-like default | Optional UA override |

Compose sets `EHV_SITE=e-hentai` by default so a fresh box works anonymously. The Dockerfile alone still defaults the app to `exhentai` if the env is unset.

## Cookies (ExHentai)

1. Set `EHV_SITE=exhentai` in `.env`.
2. Start Compose, open the app, use **Sign In** (email/password or cookie paste in the UI).
3. Session cookies stay in **your browser** (HttpOnly). They are never written into the image or Compose file.

Do **not** put `ipb_member_id` / `ipb_pass_hash` / `igneous` into `.env`, Dockerfiles, or git. A secrets file used only for offline live-check scripts on a lab machine is unrelated to Compose.

## Windows (Docker Desktop)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running (Linux engine).
2. Open PowerShell in the project folder (or extract `ehv-source-latest.zip`).
3. `copy .env.example .env` then `docker compose up --build`.
4. Browse to `http://localhost:3000`.

If upstream is blocked on your network, set `EHV_PROXY` to your local proxy. On Docker Desktop, `host.docker.internal` reaches the host (e.g. `http://host.docker.internal:7890`).

## Image details

- Multi-stage `Dockerfile` (Node 22 Alpine, pnpm, Next build).
- Runtime user `node`, port `8080`.
- `.dockerignore` excludes `.git`, `node_modules`, `.next`, and `.env*` so secrets are not copied into the build context.

Rebuild after code changes: `docker compose up --build`.
