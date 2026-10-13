<p align="center">
  <img width="144px" height="144px" src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/icon.png"/>
</p>

<h1 align="center">EHentaiView</h1>

English | [简体中文](/translations/zh-cn/README.md) | [繁體中文](/translations/zh-tw/README.md) | [ภาษาไทย](/translations/th/README.md) | [한국어](/translations/kr/README.md) | [Bahasa Melayu](/translations/ms/README.md)

welcome to EhentaiView, a mobile(PWA) website for exhentai.org, build with Next.js.

**If google chrome version >= 84, you need change exhentai.org cookies with `Secure` and `SameSite=None`** [see here](https://github.com/IronKinoko/e-hentai-view/blob/master/translations/en/FAQ.md#4-windows-browser-cant-see-pictures)

***If you prefer to browse exhentai on PC, you can use [IronKinoko/e-hentai-infinite-scroll](https://github.com/IronKinoko/userscripts/blob/master/packages/e-hentai-infinite-scroll)***

## Screenshot

<div style="display: flex;">
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/dark-zh.png" width="25%" title="home"/>
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/light-en.png" width="25%" title="home" />
<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/detail.png" width="25%" title="detail"/>
</div>

## Usage

**Because webSecurity in browser (cors), we can't direct access the exhentai image, you should sign in e-hentai before use this website**

Upstream Docker Hub image (original project):

```
docker run -d -p 80:8080 --restart always ironkinoko/e-hentai-view
```

open in browser http://localhost

see more detail https://hub.docker.com/r/ironkinoko/e-hentai-view

<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/login.gif" width="25%" title="login"/>

## Docker & environment (revive)

This **revive** branch ships a Compose stack and a tagged image `ehentai-view:revive`. Everyday use on Windows is **load a pre-built tar + `docker compose up -d`** (no local Node, no `--build`). Full steps, Windows checklist, and image details: **[DOCKER.md](DOCKER.md)**.

### Run with Docker Compose

```bash
# 1) Load lab image (or build on a lab box — see DOCKER.md)
docker load -i ehentai-view-revive.tar.gz   # tag: ehentai-view:revive

# 2) Local config (gitignored)
cp .env.example .env

# 3) Start — do NOT pass --build on the notebook
docker compose up -d
```

Open **http://localhost:3000** (if port 3000 is taken, set `EHV_HOST_PORT=3001` in `.env` and open http://localhost:3001). Stop with `docker compose down`.

Downloaded manga persist on the host under **`./downloads`** by default (compose project directory). Override with `EHV_DOWNLOADS_HOST` in `.env`. Details: [DOCKER.md § Downloads volume](DOCKER.md#downloads-volume-offline-manga).

| Goal | What to do |
|------|------------|
| Everyday run | `docker load` then `docker compose up -d` |
| New image after code change | On lab: `docker compose build` → `docker save … \| gzip` → transfer tar → `docker load` on Windows |
| Only change site/proxy/port | Edit `.env`, then `docker compose up -d` (no rebuild) |

### Environment variables

Copy `.env.example` → `.env`. **Never commit `.env`.** Never put gallery cookies in env or the image.

| Variable | Required? | Example | Purpose | If omitted |
|----------|-----------|---------|---------|------------|
| `EHV_SITE` | Optional default | `e-hentai` / `exhentai` | Server fallback site; in-app **Settings → Gallery site** overrides per request | **`e-hentai`** (Compose, app, bats) |
| `EHV_HOST_PORT` | Optional | `3000` / `3001` | **Docker:** host/browser port → container `8080`. **Local:** alias for `PORT` when `PORT` is unset | **`3000`** |
| `PORT` | Optional (local) | `3000` / `3001` | **Bare Node / bats:** Node listen port (what the browser hits). **Compose:** always `8080` inside the container (do not use for host mapping) | Local default **`3000`** (bats); container **`8080`** |
| `EHV_PROXY` | Optional | `http://host.docker.internal:7890` | Proxy for server→site fetches | Direct (no proxy) |
| `EHV_USER_AGENT` | Optional | *(unset)* | Override upstream User-Agent | Built-in browser-like UA |
| `EHV_DOWNLOADS_HOST` | Optional (Compose) | `./downloads` | Host folder mounted to container downloads (compose project dir) | **`./downloads`** |
| `EHV_DOWNLOADS_DIR` | Optional (bare Node) / set by Compose | `./data/downloads` / `/app/data/downloads` | Server download storage; Compose fixes container path. Alias: `EHV_DOWNLOAD_DIR` | See [DOCKER.md](DOCKER.md#downloads-volume-offline-manga) |
| `NODE_ENV` | Set by Compose | `production` | Production mode | Image/Compose set it |

**`EHV_SITE=e-hentai`** — public site, anonymous OK. **`EHV_SITE=exhentai`** — needs Sign In in the app UI; cookies stay in your browser (HttpOnly), not in `.env` or the image.

### Compose vs Windows bare Node

| | Docker Compose | `start.bat` / local pnpm |
|--|----------------|--------------------------|
| Toolchain | Docker only | Node ≥20 + pnpm + `pnpm build` |
| Config | `.env` (`EHV_HOST_PORT` for browser port) | `.env` / env (`PORT`, or `EHV_HOST_PORT` alias); bats default `PORT=3000` |
| Default site | `e-hentai` | `e-hentai` (switch in Settings) |
| Browser URL | http://localhost:**`EHV_HOST_PORT`** (→ container 8080) | http://localhost:**`PORT`** (default 3000) |
| Best for | Notebooks, shared lab image | Local development |

**Change port when 3000 is in use**

| Mode | What to set | Then open |
|------|-------------|-----------|
| Docker | `EHV_HOST_PORT=3001` in `.env`, then `docker compose up -d` | http://localhost:3001 |
| Local bats | `set PORT=3001` then `start.bat` / `dev.bat`, **or** `PORT=3001` (or `EHV_HOST_PORT=3001`) in `.env` | http://localhost:3001 |

- `dev.bat` — Next + API for development (`EHV_SITE=e-hentai`). API stays on **8080**; browse `PORT` (default 3000).
- `start.bat` — production after `pnpm build`. Prefer Docker on notebooks; see [DOCKER.md](DOCKER.md)

### Security

- `.env` is gitignored; `.env.example` is the safe committed template.
- Do not bake `ipb_member_id` / `ipb_pass_hash` / `igneous` into Dockerfiles, Compose, or git.
- `.dockerignore` keeps `.env*` out of the build context.

## Revive changes (summary)

Branch **`revive`** modernizes the original EHentaiView app so it works against current e-hentai/exhentai markup, ships a safer auth model, and is easier to run (Docker or bare Node). High-level themes for contributors:

| Area | What changed |
|------|----------------|
| **Toolchain** | **pnpm 10**, **Node ≥ 20** (`engines`), **Next 12.3.7**, **Vitest** (`pnpm test`). Multi-stage **Dockerfile** (Node 22) and pnpm-based CI. Prefer `pnpm` over npm/yarn for local work. |
| **Parsing** | List, detail, and image-page parsers updated for current upstream HTML; sad-panda / blank upstream pages reported instead of empty lists. |
| **Search** | Category bitmask + Advanced query builders; richer `/search` UI; filters wired through list API, index, and result pages. **AI-generated tag filter** (Include / Exclude / Only). **Cursor-based** gallery paging (favorites/watched included). Multi-tag select → Confirm from gallery detail. |
| **Reader / images** | Image queue with prefetch, cancellation, hedging, and `nl=` retries; Tap to reload; mode switch keeps page index; RTL-aware arrows/tap zones; Browser Back returns to the gallery. Proxy: timeouts, abort on client disconnect, redirect allowlist, HTTPS-only cookies to default ports, refuse private DNS for `*.hath.network`. |
| **Security / auth** | **Web cookie login only** (paste cookies after signing in on the forums/site in your browser). **No email/password** login in the UI. Cookies are **HttpOnly + SameSite=Lax** (+ Secure on HTTPS); secrets are not stored in `localStorage`. CSRF checks, path-only logs, comment HTML sanitizer (gallery links kept), per-user cache keys, closed open-proxy paths. |
| **Gallery site** | In-app **Settings → Gallery site**: **e-hentai** / **exhentai**. Default **`e-hentai`** (anonymous OK). ExHentai needs Sign In; cookies stay in the browser, never in `.env` or the image. |
| **UI themes** | Settings: **Classic**, **V3**, **V4** (category chips, filter rail / Filter Deck, pagers). Design notes: [UI-V3.md](UI-V3.md), `design-system/`. |
| **Docker + env** | Compose stack, tagged image `ehentai-view:revive`, `.env.example` → `.env` (gitignored). Everyday Windows: **load tar + `docker compose up -d`** (no `--build`). Full steps: **[DOCKER.md](DOCKER.md)**. |
| **Configurable port** | Docker: `EHV_HOST_PORT` (host → container `8080`). Local / bats: `PORT` (or `EHV_HOST_PORT` alias). Default browser port **3000**. |
| **Offline downloads** | Gallery zip/images under `EHV_DOWNLOADS_DIR` (default `./data/downloads`). Compose mounts host `EHV_DOWNLOADS_HOST` (default `./downloads`) → `/app/data/downloads`. Clear-downloads uses the same path. |
| **Windows bats** | `dev.bat` (Next + API) and `start.bat` (production after `pnpm build`). Default `EHV_SITE=e-hentai`. |

There is no separate UAT checklist in-tree; use **DOCKER.md** for run/verify, **UI-V3.md** / `design-system/` for UI chrome, and `pnpm test` for unit coverage (parser/CSRF/proxy/list modes, etc.).

## FAQ

If you can't see the picture, please see [here](/translations/en/FAQ.md)

## PWA install

<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/pwa_install.gif" width="25%" title="pwa install"/>

## Development

Prefer **pnpm 10** and **Node ≥ 20** (`packageManager` / `engines`). npm/yarn are not preferred.

```shell
# First time
pnpm install

# Dev (two terminals)
pnpm run dev:server
pnpm run dev:app

# Or on Windows: dev.bat
```

Production locally: `pnpm build`, then `start.bat` (Windows) or `node server` / `pnpm start`. Browse http://localhost:3000 (or `PORT` / `EHV_HOST_PORT`).

For Docker Compose, see **[Docker & environment (revive)](#docker--environment-revive)** and [DOCKER.md](DOCKER.md).

## Thanks

- [seven332/EhViewer](https://github.com/seven332/EhViewer)
- [Nicezki](https://github.com/Nicezki) Thai translation
- [KeepSOBP](https://github.com/KeepSOBP) Korean translation
- [TeeVenDick](https://github.com/TeeVenDick) Malay translation
