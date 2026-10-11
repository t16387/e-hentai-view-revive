# Running with Docker Compose

You do **not** need Node or pnpm on the notebook. Prefer a **pre-built image** (load from tar) so Windows never runs `docker compose build`.

## Quick start (pre-built image — recommended on Windows)

1. Copy `ehentai-view-revive.tar.gz` next to this project (or extract `ehv-source-latest.zip` which includes Compose files).
2. Load the image (PowerShell or bash):

```bash
# Linux / macOS / Git Bash
gunzip -c ehentai-view-revive.tar.gz | docker load

# PowerShell (Docker Desktop)
docker load -i ehentai-view-revive.tar.gz
```

3. Configure env and start **without** `--build`:

```bash
cp .env.example .env
# edit .env if you want ExHentai (EHV_SITE=exhentai) or a proxy
docker compose up -d
```

Open **http://localhost:3000** (or the port in `EHV_HOST_PORT`).

Stop: `docker compose down`.

The Compose file sets `image: ehentai-view:revive`, which must match the loaded tag. Do **not** pass `--build` on the notebook unless you intentionally want a local rebuild.

## Alternative: build on a lab/server only

On a machine where build is allowed (e.g. the lab box):

```bash
cd /workspace/e-hentai-view
sudo docker compose build
sudo docker save ehentai-view:revive | gzip > /path/to/ehentai-view-revive.tar.gz
```

Then transfer the tar to Windows and follow **Quick start** above.

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

## Windows (Docker Desktop) checklist

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running (Linux engine).
2. Obtain `ehentai-view-revive.tar.gz` (lab build) and the project folder / `ehv-source-latest.zip`.
3. `docker load -i ehentai-view-revive.tar.gz` — confirm tag `ehentai-view:revive`.
4. `copy .env.example .env` then `docker compose up -d` (**no** `--build`).
5. Browse to `http://localhost:3000`.

If upstream is blocked on your network, set `EHV_PROXY` to your local proxy. On Docker Desktop, `host.docker.internal` reaches the host (e.g. `http://host.docker.internal:7890`).

## Windows native (Node, no Docker)

If you already have Node ≥20 and a built tree (or are developing):

| File | Mode | What it does |
|------|------|----------------|
| `start.bat` | production | Sets `EHV_SITE=exhentai`, `NODE_ENV=production`, `PORT=3000`, then `node server\src\server.js`. Does **not** use `pnpm start` / cross-env (those can exit silently on some PCs). Needs `.next` from `pnpm build`. |
| `dev.bat` | development | Sets `EHV_SITE=exhentai`, `NODE_ENV=development`. Opens API on **:8080** (`nodemon server\src\app.js`, same as `dev:server`) and Next on **:3000** (`node server\src\server.js`, same as `dev:app`). Browse **http://localhost:3000**. |

Double-click from the project root (or run from `cmd`). Prefer Docker load+compose when you do not want a local Node toolchain.

## Image details

- Multi-stage `Dockerfile` (Node 22 Alpine, pnpm, Next build).
- Runtime user `node`, port `8080`.
- Image name: **`ehentai-view:revive`** (must match `docker-compose.yml`).
- `.dockerignore` excludes `.git`, `node_modules`, `.next`, and `.env*` so secrets are not copied into the build context.

## Verified on the lab box (2026-10-12 HKT)

`sudo docker compose build` produced image `ehentai-view:revive`. Saved as `ehentai-view-revive.tar.gz` for Windows `docker load`. Compose `up -d` without `--build` uses that tag. No cookie env vars inside the container.
