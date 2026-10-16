# AGENTS.md — e-hentai-view revive

Mobile/PWA viewer for e-hentai / exhentai (Next.js + Node). Fork work lives on branch **`revive` only**.

## Branch & secrets

- Push / PR only **`revive`**. Do not update `master` unless the user explicitly approves.
- **Never** commit cookies, passwords, or `.env`. Never bake `ipb_member_id` / `ipb_pass_hash` / `igneous` into git, Dockerfiles, Compose, or images. Sign In only via the app UI (Browser login / cookie paste).

## Prerequisites

- **Preferred:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) or Docker Engine + Compose (Linux).
- **Or bare Node:** Node **≥ 20.9** + **pnpm 10** (`packageManager` in `package.json`). Prefer `pnpm` over npm/yarn.

## Quick start

### A) Docker (preferred)

```bash
cp .env.example .env          # edit EHV_SITE / EHV_HOST_PORT / EHV_PROXY if needed
# Load a release tar OR build once:
#   docker load -i ehentai-view-revive.tar.gz
#   # or: docker compose build
./start.sh                    # macOS / Linux — no --build
# Windows: docker-up.bat
```

Image tag must be **`ehentai-view:revive`**. Open **http://localhost:3000** (or `EHV_HOST_PORT`).

### B) Bare Node (dev / prod)

```bash
cp .env.example .env
pnpm install
pnpm build
pnpm start                    # or: ./scripts/run-mac.sh
# Windows prod: start.bat   |  Windows dev: dev.bat
```

**macOS one-shot:** `./scripts/run-mac.sh` — creates `.env` if missing, prefers Docker + `ehentai-view:revive`, else builds/starts with pnpm.

## Key env vars (from `.env.example`)

| Var | Purpose | Default |
|-----|---------|---------|
| `EHV_SITE` | Server fallback site (`e-hentai` / `exhentai`) | `e-hentai` |
| `EHV_HOST_PORT` | Docker host/browser port → container `8080`; bare Node alias for `PORT` | `3000` |
| `PORT` | Bare Node listen port (Compose forces container `8080`) | `3000` |
| `EHV_PROXY` | Optional proxy for server→site | unset |
| `EHV_DOWNLOADS_HOST` | Compose host folder for offline downloads | `./downloads` |
| `EHV_DOWNLOADS_DIR` | Bare Node download dir | `./data/downloads` |

**Never** put gallery cookies in `.env`. Auth profile is **optional** and **off by default**:

```bash
docker compose --profile auth up -d   # FlareSolverr, no host port
```

## LAN (phones / tablets)

Compose already binds **`0.0.0.0`**. Open `http://<LAN-IP>:<EHV_HOST_PORT>`.

- macOS Wi‑Fi IP: `ipconfig getifaddr en0`
- Allow the port in the host firewall. Details: [DOCKER.md](DOCKER.md#lan--mobile-access).

## Watched vs Histories

- **Watched** — site subscribed-tags feed (`/watched`).
- **Histories** — local browse / read progress in the browser (`/histories`).

## Docs map

| Doc | Use when |
|-----|----------|
| [README.md](README.md) | Overview, env table, revive summary |
| [DOCKER.md](DOCKER.md) | Compose, LAN, OS checklists, downloads volume |
| [LOGIN.md](LOGIN.md) | Browser login / cookies / FlareSolverr |
| [SETUP.md](SETUP.md) | Short human checklist (Mac + AI) |
| This file | AI assistants — zero tribal knowledge |

## Do / Don’t (AIs)

**Do**

- Follow this file + `.env.example`; prefer Docker path A.
- Edit `.env` only for site/proxy/port/downloads — never cookies.
- Push commits/tags only to remote **`fork`** branch **`revive`** when asked.
- Keep Windows bats (`start.bat`, `docker-up.bat`, …) and Linux `start.sh` working.

**Don’t**

- Add Electron / desktop WebView shells (removed from revive).
- Bake cookies or secrets into images or commits.
- Enable Compose profile `auth` by default in docs or scripts.
- Force-push, or push/update **`master`** / upstream **`origin`** without explicit user approval.
- Commit `.agents/`, `node_modules/`, `.next/`, `.env`, or download folders.
