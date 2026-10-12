# Docker & environment (revive)

You do **not** need Node or pnpm on the notebook. Prefer a **pre-built image** (`docker load` from tar) so Windows never runs `docker compose build`.

For a short overview in the main docs, see [README.md § Docker & environment](README.md#docker--environment-revive).

## Quick start (pre-built image — recommended on Windows)

1. Put `ehentai-view-revive.tar.gz` next to this project (or extract `ehv-source-latest.zip`, which includes Compose files).
2. Load the image:

```bash
# Linux / macOS / Git Bash
gunzip -c ehentai-view-revive.tar.gz | docker load

# PowerShell (Docker Desktop)
docker load -i ehentai-view-revive.tar.gz
```

Confirm the tag is **`ehentai-view:revive`** (`docker images ehentai-view`).

3. Configure env and start **without** `--build`:

```bash
cp .env.example .env
# edit .env if you want ExHentai (EHV_SITE=exhentai) or a proxy
docker compose up -d
```

Open **http://localhost:3000** (or the port in `EHV_HOST_PORT`).

Stop: `docker compose down`.

`docker-compose.yml` sets `image: ehentai-view:revive`, which must match the loaded tag. Do **not** pass `--build` on the notebook unless you intentionally want a local rebuild.

## Alternative: build on a lab/server only

On a machine where build is allowed (e.g. the lab box):

```bash
cd /workspace/e-hentai-view
sudo docker compose build
sudo docker save ehentai-view:revive | gzip > /path/to/ehentai-view-revive.tar.gz
```

Transfer the tar to Windows and follow **Quick start** above.

### Load vs build at a glance

| Mode | When | Command | Needs Node/pnpm on host? |
|------|------|---------|--------------------------|
| **Load image** (everyday) | Windows notebook, sharing a lab build | `docker load …` then `docker compose up -d` | No |
| **Build image** (lab/CI) | You changed the Dockerfile or app and need a new tar | `docker compose build` then `docker save …` | No (build runs inside Docker) |
| **Bare Node** | Local develop / no Docker | `pnpm install` + `pnpm build` + `start.bat` / `pnpm start` | Yes |

Production Compose always sets `NODE_ENV=production` and listens on **8080 inside the container**. Rebuilding the image is only needed after source or Dockerfile changes — not for changing `.env` values (restart Compose after editing `.env`).

## Environment variables

Compose auto-reads `.env` for `${VAR}` substitution and passes selected vars into the container. Copy **`.env.example` → `.env`**; never commit `.env`.

### Vars you set in `.env` (Compose)

| Variable | Required? | Example (placeholder) | Purpose | If omitted |
|----------|-----------|------------------------|---------|------------|
| `EHV_SITE` | Optional default | `e-hentai` or `exhentai` | Server default when the SPA does not send `X-EHV-Site` / `ehv_site`. In-app **Settings → Gallery site** overrides per request. | Compose + app default: **`e-hentai`**. |
| `EHV_HOST_PORT` | Optional | `3000` | Host port published to the browser → container `8080` | **`3000`** → open http://localhost:3000 |
| `EHV_PROXY` | Optional | `http://host.docker.internal:7890` | HTTP(S) proxy for **server → site** requests | Empty: direct connection. (axios may still honour system `HTTP_PROXY` / `HTTPS_PROXY` if set elsewhere.) |
| `EHV_USER_AGENT` | Optional | *(leave unset)* | Override User-Agent on upstream fetches | Built-in browser-like Chrome UA |

### Vars set by Compose / the image (do not put secrets here)

| Variable | Set by | Typical value | Purpose | If omitted |
|----------|--------|---------------|---------|------------|
| `NODE_ENV` | Compose + Dockerfile | `production` | Next/server production mode | Image defaults to `production`; bare `start.bat` also sets it |
| `PORT` | Compose + Dockerfile | `8080` | Listen port **inside** the container | App falls back to `8080`. Host mapping is `EHV_HOST_PORT`, not `PORT`. |
| `EHV_PROXY_TIMEOUT` | Optional (advanced) | `10000` | Timeout (ms) for image-proxy fetches to H@H nodes | **`10000`** |

There are **no** cookie env vars. Do not invent `IPB_*`, `IGNEOUS`, or similar in `.env`.

### `EHV_SITE`: e-hentai vs exhentai

| Value | Upstream | Login needed? | Typical use |
|-------|----------|---------------|-------------|
| `e-hentai` | https://e-hentai.org | No (anonymous OK) | Fresh Compose box, public browsing |
| `exhentai` | https://exhentai.org | **Yes** — Sign In in the app UI | Full ExHentai after you have an account |

**Defaults:** Compose, app code, and Windows bats all default to **`e-hentai`**. Prefer **Settings → Gallery site** in the app to switch to ExHentai at runtime (sends `X-EHV-Site`); `EHV_SITE` is only the server fallback when the client sends no preference.

### Cookies (ExHentai)

1. Open the app (default site is e-hentai) and use **Sign In**: open forums login → optionally open exhentai.org for `igneous` → paste cookies (Cookie Login). Email/password login is removed (Cloudflare).
2. In **Settings → Gallery site**, switch to **exhentai.org** (requires login cookies + valid `igneous`).
3. Session cookies stay in **your browser** (HttpOnly on the app origin). The Node server forwards them upstream; they are **never** written into the image, Compose file, or `.env`.

Do **not** put `ipb_member_id` / `ipb_pass_hash` / `igneous` into `.env`, Dockerfiles, or git. A lab-only secrets file used for offline live-check scripts is unrelated to Compose and must stay off this repo.

**Never bake cookies into the image.** `.dockerignore` excludes `.env*` (except `.env.example`) so a rebuild cannot copy local secrets into the build context.

## Security

| Item | Rule |
|------|------|
| `.env` | Gitignored (`.env`, `.env.*`). Holds machine-local Compose settings only. |
| `.env.example` | Safe template committed to git — placeholders and comments only. |
| Gallery cookies | Browser Sign-In UI only — never env, never Dockerfile `ENV`, never `docker commit` of a logged-in container. |
| Image | Built from source + lockfile; runtime user `node`; no secrets in layers. |

## Compose (everyday) vs Windows bare Node

| | **Docker Compose** | **`start.bat` / local pnpm** |
|--|--------------------|------------------------------|
| Needs | Docker Desktop (or Engine) + loaded/built image | Node ≥20, pnpm, `pnpm install` + `pnpm build` |
| Config | `.env` from `.env.example` | Hardcoded in bat / shell env (`EHV_SITE=e-hentai`, `PORT=3000`) |
| Default site | `e-hentai` (Compose) | `exhentai` (`start.bat` / `dev.bat`) |
| Browser URL | http://localhost:**3000** (`EHV_HOST_PORT` → container 8080) | http://localhost:**3000** (Node listens on 3000 in `start.bat`) |
| Prod vs rebuild | Change `.env` → restart container. Change code → rebuild image on lab, reload tar on Windows. | Change code → `pnpm build` again, then `start.bat`. |
| Best for | Notebooks, “just run it”, sharing one lab image | Active development without Docker |

| File | Mode | What it does |
|------|------|----------------|
| `start.bat` | production | Sets `EHV_SITE=exhentai`, `NODE_ENV=production`, `PORT=3000`, then `node server\src\server.js`. Does **not** use `pnpm start` / cross-env (those can exit silently on some PCs). Needs `.next` from `pnpm build`. |
| `dev.bat` | development | Sets `EHV_SITE=exhentai`, `NODE_ENV=development`. API on **:8080** (`nodemon server\src\app.js`) and Next on **:3000** (`node server\src\server.js`). Browse **http://localhost:3000**. |

Double-click from the project root (or run from `cmd`). Prefer Docker load+compose when you do not want a local Node toolchain.

## Windows (Docker Desktop) checklist

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running (Linux engine).
2. Obtain `ehentai-view-revive.tar.gz` (lab build) and the project folder / `ehv-source-latest.zip`.
3. `docker load -i ehentai-view-revive.tar.gz` — confirm tag `ehentai-view:revive`.
4. `copy .env.example .env` then `docker compose up -d` (**no** `--build`).
5. Browse to `http://localhost:3000`.

If upstream is blocked on your network, set `EHV_PROXY` to your local proxy. On Docker Desktop, `host.docker.internal` reaches the host (e.g. `http://host.docker.internal:7890`).

## Image details

- Multi-stage `Dockerfile` (Node 22 Alpine, pnpm, Next build).
- Runtime user `node`, port `8080`.
- Image name: **`ehentai-view:revive`** (must match `docker-compose.yml`).
- `.dockerignore` excludes `.git`, `node_modules`, `.next`, and `.env*` so secrets are not copied into the build context.

## Verified on the lab box (2026-10-12 HKT)

`sudo docker compose build` produced image `ehentai-view:revive`. Saved as `ehentai-view-revive.tar.gz` for Windows `docker load`. Compose `up -d` without `--build` uses that tag. No cookie env vars inside the container.
