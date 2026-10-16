# Docker & environment (revive)

You do **not** need Node or pnpm on the host. Prefer a **pre-built image** (`docker load` from tar) so everyday machines never run `docker compose build`.

Works the same on **Windows**, **macOS**, and **Linux** (Linux containers via Docker Desktop or Engine). Phones/tablets on the same LAN can open the app in Safari/Chrome — see [LAN / mobile access](#lan--mobile-access).

For a short overview in the main docs, see [README.md § Docker & environment](README.md#docker--environment-revive).

## Install Docker (once)

| OS | What to install | Notes |
|----|-----------------|-------|
| **Windows 10/11** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Use the **Linux engine** (WSL2 backend recommended). Keep Desktop running while you use Compose. |
| **macOS** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Apple Silicon and Intel both work. Keep Desktop running. |
| **Linux** | [Docker Engine](https://docs.docker.com/engine/install/) + Compose plugin | Or Docker Desktop for Linux. Your user needs permission to talk to the daemon (`docker` group or `sudo`). |

Confirm: `docker version` and `docker compose version`.

## Quick start (pre-built image — recommended)

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

Open **http://localhost:3000** (or the port in `EHV_HOST_PORT`). If **3000 is already in use**, set `EHV_HOST_PORT=3001` in `.env` and open http://localhost:3001.

Stop: `docker compose down` (or `./stop.sh` / `docker-down.bat`).

Helper scripts (same Compose stack; **no** `--build`):

| OS | Start | Stop |
|----|-------|------|
| **macOS / Linux** | `./start.sh` | `./stop.sh` |
| **Windows** | `docker-up.bat` | `docker-down.bat` |
| Any | `docker compose up -d` | `docker compose down` |

`docker-compose.yml` sets `image: ehentai-view:revive`, which must match the loaded tag. Do **not** pass `--build` on notebooks unless you intentionally want a local rebuild.

Port publish binds **`0.0.0.0:${EHV_HOST_PORT}:8080`** so other devices on your LAN can connect (not localhost-only).

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
| **Load image** (everyday) | Win/Mac/Linux notebook, sharing a lab build | `docker load …` then `docker compose up -d` / `./start.sh` | No |
| **Build image** (lab/CI) | You changed the Dockerfile or app and need a new tar | `docker compose build` then `docker save …` | No (build runs inside Docker) |
| **Bare Node** | Local develop / no Docker | `pnpm install` + `pnpm build` + `start.bat` / `./start.sh` is Compose-only — use `pnpm start` / `node server` | Yes |

Production Compose always sets `NODE_ENV=production` and listens on **8080 inside the container**. Rebuilding the image is only needed after source or Dockerfile changes — not for changing `.env` values (restart Compose after editing `.env`).

## Environment variables

Compose auto-reads `.env` for `${VAR}` substitution and passes selected vars into the container. Copy **`.env.example` → `.env`**; never commit `.env`.

### Vars you set in `.env` (Compose)

| Variable | Required? | Example (placeholder) | Purpose | If omitted |
|----------|-----------|------------------------|---------|------------|
| `EHV_SITE` | Optional default | `e-hentai` or `exhentai` | Server default when the SPA does not send `X-EHV-Site` / `ehv_site`. In-app **Settings → Gallery site** overrides per request. | Compose + app default: **`e-hentai`**. |
| `EHV_HOST_PORT` | Optional | `3000` / `3001` | **Docker:** host port published to the browser → container `8080`. Change this if 3000 is taken. **Local bats:** also used as an alias for `PORT` when `PORT` is unset. | **`3000`** → open http://localhost:3000 |
| `PORT` | Optional (local only) | `3000` / `3001` | **Bare Node / `start.bat` / `dev.bat`:** Node listen port (browser URL). Compose **always** sets container `PORT=8080` — do not use `PORT` for Docker host mapping. | Local bats default **`3000`**; container **`8080`** |
| `EHV_PROXY` | Optional | `http://host.docker.internal:7890` | HTTP(S) proxy for **server → site** requests | Empty: direct connection. (axios may still honour system `HTTP_PROXY` / `HTTPS_PROXY` if set elsewhere.) |
| `EHV_USER_AGENT` | Optional | *(leave unset)* | Override User-Agent on upstream fetches | Built-in browser-like Chrome UA |
| `EHV_DOWNLOADS_HOST` | Optional (Compose) | `./downloads` / `.` | **Host** folder bind-mounted to the container download dir. Relative paths are under the **compose project directory**. | **`./downloads`** |
| `EHV_DOWNLOADS_DIR` | Optional (bare Node) | `./data/downloads` | Server download storage path. **Compose sets this to `/app/data/downloads` inside the container** — do not point it at a host path when using Compose. Alias: `EHV_DOWNLOAD_DIR`. | Bare Node: **`./data/downloads`**; Compose: **`/app/data/downloads`** |

### Vars set by Compose / the image (do not put secrets here)

| Variable | Set by | Typical value | Purpose | If omitted |
|----------|--------|---------------|---------|------------|
| `NODE_ENV` | Compose + Dockerfile | `production` | Next/server production mode | Image defaults to `production`; bare `start.bat` also sets it |
| `PORT` | Compose + Dockerfile | `8080` | Listen port **inside** the container | App falls back to `8080` (or `EHV_HOST_PORT` if somehow unset). **Host/browser mapping is `EHV_HOST_PORT`, not this `PORT`.** |
| `EHV_PROXY_TIMEOUT` | Optional (advanced) | `10000` | Timeout (ms) for image-proxy fetches to H@H nodes | **`10000`** |
| `EHV_DOWNLOADS_DIR` | Compose (fixed) | `/app/data/downloads` | Where offline gallery images/zips live **inside** the container (mounted from `EHV_DOWNLOADS_HOST`) | Compose always sets this; bare Node uses cwd default |

There are **no** cookie env vars. Do not invent `IPB_*`, `IGNEOUS`, or similar in `.env`.

### `EHV_SITE`: e-hentai vs exhentai

| Value | Upstream | Login needed? | Typical use |
|-------|----------|---------------|-------------|
| `e-hentai` | https://e-hentai.org | No (anonymous OK) | Fresh Compose box, public browsing |
| `exhentai` | https://exhentai.org | **Yes** — Sign In in the app UI | Full ExHentai after you have an account |

**Defaults:** Compose, app code, and Windows bats all default to **`e-hentai`**. Prefer **Settings → Gallery site** in the app to switch to ExHentai at runtime (sends `X-EHV-Site`); `EHV_SITE` is only the server fallback when the client sends no preference.

### Auth / cookies (ExHentai)

1. Open the app (default site is e-hentai) → **Sign In** → **Browser login** (recommended):
   - Tap **Open forums login** (new tab), solve Cloudflare Turnstile, sign in on forums.e-hentai.org.
   - DevTools → Application → Cookies → copy `ipb_member_id`, `ipb_pass_hash`, and (for ExHentai) `igneous`, or paste a full cookie dump into the dump field.
   - **Save cookies & sign in**. The server stores them as HttpOnly on this origin. Native apps (EhViewer/JHenTai) do this inside a WebView; a localhost SPA cannot capture cross-origin cookies automatically.
2. Optional: expand **Try username / password (FlareSolverr)**. This often fails on interactive Turnstile — use Browser login instead.
3. **FlareSolverr** (only for the password path on `forums.e-hentai.org`):
   - **Not started by default.** Default `docker compose up -d` / `./start.sh` / `docker-up.bat` runs **only** `ehv` (app on `EHV_HOST_PORT`). The solver is under Compose profile **`auth`** and has **no host port** — it is reachable only via Compose DNS when enabled.
   - Enable password-login helper: `docker compose --profile auth up -d` (starts `flaresolverr` + `ehv`). URL default: `EHV_FLARESOLVERR_URL=http://flaresolverr:8191/v1`.
   - External solver on the Docker host: `EHV_FLARESOLVERR_URL=http://host.docker.internal:8191/v1` (do **not** publish FlareSolverr on `0.0.0.0` — it has no auth).
   - Official FlareSolverr supports `request.post`. Byparr-compatible solvers are **GET-only**; the app falls back to clearance-cookie + direct POST when POST is unavailable.
   - If the solver cannot clear Turnstile, Sign In returns `code: "flaresolverr"` (not a bare Cloudflare page). Use **Browser login** / Advanced cookie paste instead.
3. In **Settings → Gallery site**, switch to **exhentai.org** (requires login cookies + valid `igneous`; password login tries to obtain `igneous` when possible).
4. Session cookies stay in **your browser** (HttpOnly on the app origin). The Node server forwards them upstream; they are **never** written into the image, Compose file, or `.env`.


## Downloads volume (offline manga)

Offline gallery downloads (images + zip) are stored under a **mountable** directory so they survive container recreation.

| Side | Path | How to change |
|------|------|----------------|
| **Host** (default) | `./downloads` next to `docker-compose.yml` (compose project dir) | Set `EHV_DOWNLOADS_HOST` in `.env` (e.g. `.` for the project root, or an absolute path) |
| **Container** | `/app/data/downloads` | Fixed by Compose via `EHV_DOWNLOADS_DIR` |

```yaml
# from docker-compose.yml
volumes:
  - ${EHV_DOWNLOADS_HOST:-./downloads}:/app/data/downloads
```

- **Clear downloads** in Settings deletes gallery folders under that path (same `EHV_DOWNLOADS_DIR` the server uses).
- Host content under `./downloads` (and bare-Node `./data`) is **gitignored** — do not commit manga files.
- Bare Node (no Docker): set `EHV_DOWNLOADS_DIR` (or alias `EHV_DOWNLOAD_DIR`); default is `./data/downloads`.
- **Auth:** `/api/downloads` (list, zip, images, enqueue, delete) requires a logged-in app session so a LAN peer cannot read or wipe offline galleries. Sign In once on the URL you use (localhost vs LAN IP cookies differ).

## Security

| Item | Rule |
|------|------|
| `.env` | Gitignored (`.env`, `.env.*`). Holds machine-local Compose settings only. |
| `.env.example` | Safe template committed to git — placeholders and comments only. |
| Gallery cookies / passwords | In-app Sign In only — never env, never Dockerfile `ENV`, never `docker commit` of a logged-in container. |
| FlareSolverr | Compose profile **`auth` only**; **no** host port publish. Default `up` is app-only. |
| Offline downloads API | Requires a Sign-In session (`ipb_member_id` + `ipb_pass_hash` cookies), even on public e-hentai. |
| Image | Built from source + lockfile; runtime user `node`; no secrets in layers. |

## Compose (everyday) vs bare Node

| | **Docker Compose** | **`start.bat` / local pnpm** (any OS) |
|--|--------------------|------------------------------|
| Needs | Docker Desktop (or Engine) + loaded/built image | Node ≥20, pnpm, `pnpm install` + `pnpm build` |
| Config | `.env` from `.env.example` | `.env` / shell env; bats read `PORT` / `EHV_HOST_PORT` (default listen **3000**) |
| Default site | `e-hentai` (Compose) | `e-hentai` (`start.bat` / `dev.bat`; switch in Settings) |
| Browser URL | http://localhost:**`EHV_HOST_PORT`** (→ container 8080) | http://localhost:**`PORT`** (default 3000; `EHV_HOST_PORT` aliases if `PORT` unset) |
| Prod vs rebuild | Change `.env` → restart container. Change code → rebuild image on lab, reload tar on Windows. | Change code → `pnpm build` again, then `start.bat`. |
| Best for | Any OS notebook, “just run it”, sharing one lab image, **LAN phones** | Active development without Docker |

### Changing the port (3000 already in use)

One mental model: **edit `.env`**, then restart.

| Mode | Set in `.env` (or shell) | Restart / run | Open |
|------|--------------------------|---------------|------|
| **Docker Compose** | `EHV_HOST_PORT=3001` | `docker compose up -d` | http://localhost:3001 |
| **Local `start.bat` / `dev.bat`** | `PORT=3001` **or** `EHV_HOST_PORT=3001` (alias), **or** `set PORT=3001` before the bat | re-run the bat | http://localhost:3001 |

Compose keeps the process on **8080 inside the container**; only the host publish port changes. Local bare Node listens on `PORT` directly (what the browser hits). `dev.bat` keeps the API on **8080** and only moves the Next/browser port.

| File | Mode | What it does |
|------|------|----------------|
| `start.bat` | production | Sets `EHV_SITE=e-hentai`, `NODE_ENV=production`, resolves `PORT` (env → `.env` → `EHV_HOST_PORT` → `3000`), then `node server\src\server.js`. Does **not** overwrite an already-set `PORT`. Does **not** use `pnpm start` / cross-env. Needs `.next` from `pnpm build`. |
| `dev.bat` | development | Sets `EHV_SITE=e-hentai`, `NODE_ENV=development`. API on **:8080** (`nodemon server\src\app.js`, `PORT=8080` forced). Next on **:`PORT`** (default 3000). Browse **http://localhost:`PORT`**. |

Double-click from the project root (or run from `cmd`). Prefer Docker load+compose when you do not want a local Node toolchain.

## OS checklists

### Windows (Docker Desktop)

1. Install Docker Desktop; ensure it is running (Linux engine / WSL2).
2. Obtain `ehentai-view-revive.tar.gz` (lab build) and this project folder.
3. `docker load -i ehentai-view-revive.tar.gz` — confirm tag `ehentai-view:revive`.
4. `copy .env.example .env` then `docker-up.bat` or `docker compose up -d` (**no** `--build`).
5. Browse to `http://localhost:3000` (or `EHV_HOST_PORT` from `.env`).

### macOS (Docker Desktop)

1. Install Docker Desktop; ensure it is running.
2. Load the image: `gunzip -c ehentai-view-revive.tar.gz | docker load` (or `docker load -i …`).
3. `cp .env.example .env` then `./start.sh` or `docker compose up -d` (**no** `--build`).
4. Open `http://localhost:3000` (or `EHV_HOST_PORT`).

### Linux (Docker Engine)

1. Install Docker Engine + Compose plugin; start the daemon.
2. Load the image (same as macOS) or build on this machine if it is your lab box.
3. `cp .env.example .env` then `./start.sh` or `docker compose up -d`.
4. Open `http://localhost:3000` (or `EHV_HOST_PORT`).

If upstream is blocked on your network, set `EHV_PROXY` to your local proxy. On Docker Desktop (Win/Mac), `host.docker.internal` reaches the host (e.g. `http://host.docker.internal:7890`). On Linux Engine, Compose already adds `host.docker.internal:host-gateway`.

## LAN / mobile access

Compose publishes the app on **all interfaces** (`0.0.0.0`), so phones and tablets on the **same Wi‑Fi / LAN** can use it.

### Open from iPhone / Android

1. On the host PC/Mac, note `EHV_HOST_PORT` (default **3000**).
2. Find the host’s LAN IP:

| OS | How |
|----|-----|
| **Windows** | `ipconfig` → **IPv4 Address** under your Wi‑Fi or Ethernet adapter (e.g. `192.168.1.42`) |
| **macOS** | `ipconfig getifaddr en0` (Wi‑Fi) or System Settings → Network |
| **Linux** | `hostname -I` or `ip -4 addr` |

3. On the phone/tablet browser (Safari / Chrome), open:

```text
http://<host-LAN-IP>:<port>
```

Example: `http://192.168.1.42:3000`

4. Keep the host awake and Docker running. Guest Wi‑Fi / client isolation blocks this — use the normal LAN.

### Firewall

Allow inbound TCP on `EHV_HOST_PORT` (default 3000) from your local network:

| OS | Typical action |
|----|----------------|
| **Windows** | Windows Security → Firewall → allow Docker Desktop / create an inbound rule for TCP 3000 (Private networks). First browser hit from another device may prompt “Allow access”. |
| **macOS** | System Settings → Network → Firewall: allow **Docker** / **com.docker.backend** when prompted, or add the port. |
| **Linux** | `sudo ufw allow 3000/tcp` (or your `EHV_HOST_PORT`), then `sudo ufw reload`. Firewalld: open the port in your active zone. |

Do **not** port-forward this to the public internet unless you know the risks (no built-in HTTPS or auth gate beyond your e-hentai session cookies).

### Cookies / Sign In on phone vs desktop

| Client | How to authenticate |
|--------|---------------------|
| **Desktop browser** (Chrome/Edge/Firefox on the host or LAN PC) | **Browser login**: open forums, solve Turnstile, paste cookie dump (DevTools → Application → Cookies). |
| **iOS Safari / Android Chrome** on phone | Same app UI: open **Sign In** → paste cookies into **Browser login** / Advanced fields. Get the cookie values from a desktop browser (or any cookie export), then paste on the phone. Password + FlareSolverr may work if the solver clears Turnstile. |
| **Chrome extension** (planned) | **Desktop only** — will not run on iOS. Do not expect an extension on iPhone/iPad. Tracked as a desktop follow-up; not required for LAN browsing. |

Session cookies are stored as **HttpOnly on the app origin** (whatever host:port you opened, e.g. `http://192.168.1.42:3000`). Sign in **on that device/browser** once; they are never written to `.env` or the image. Signing in on `localhost` does **not** share cookies with the LAN IP — use the LAN URL on the phone and paste cookies there.

### Optional UI hint

When you open the app via a non-localhost Host (LAN IP), Sign In may show a short LAN URL tip (after an image rebuild that includes that UI). Docs above are enough without it.

## Chrome extension (desktop follow-up)

A browser extension to help copy e-hentai cookies into this app is a **future desktop** convenience. It is **not** available on iOS/Android. Until then, use in-app cookie paste (or password + FlareSolverr).

## Image details

- Multi-stage `Dockerfile` (Node 22 Alpine, pnpm, Next build).
- Runtime user `node`, port `8080`.
- Image name: **`ehentai-view:revive`** (must match `docker-compose.yml`).
- `.dockerignore` excludes `.git`, `node_modules`, `.next`, and `.env*` so secrets are not copied into the build context.

## Verified on the lab box (2026-10-12 HKT)

`sudo docker compose build` produced image `ehentai-view:revive`. Saved as `ehentai-view-revive.tar.gz` for Windows `docker load`. Compose `up -d` without `--build` uses that tag. No cookie env vars inside the container.
