<p align="center">
  <img width="144px" height="144px" src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/icon.png"/>
</p>

<h1 align="center">EHentaiView</h1>

English | [简体中文](/translations/zh-cn/README.md) | [ภาษาไทย](/translations/th/README.md) | [한국어](/translations/kr/README.md) | [Bahasa Melayu](/translations/ms/README.md)

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

Open **http://localhost:3000** (change host port with `EHV_HOST_PORT`). Stop with `docker compose down`.

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
| `EHV_HOST_PORT` | Optional | `3000` | Host port → container `8080` | **`3000`** |
| `EHV_PROXY` | Optional | `http://host.docker.internal:7890` | Proxy for server→site fetches | Direct (no proxy) |
| `EHV_USER_AGENT` | Optional | *(unset)* | Override upstream User-Agent | Built-in browser-like UA |
| `NODE_ENV` | Set by Compose | `production` | Production mode | Image/Compose set it |
| `PORT` | Set by Compose | `8080` | Port **inside** the container | `8080` |

**`EHV_SITE=e-hentai`** — public site, anonymous OK. **`EHV_SITE=exhentai`** — needs Sign In in the app UI; cookies stay in your browser (HttpOnly), not in `.env` or the image.

### Compose vs Windows bare Node

| | Docker Compose | `start.bat` / local pnpm |
|--|----------------|--------------------------|
| Toolchain | Docker only | Node ≥20 + pnpm + `pnpm build` |
| Config | `.env` | Hardcoded in bat (`EHV_SITE=e-hentai`, `PORT=3000`) |
| Default site | `e-hentai` | `e-hentai` (switch in Settings) |
| Best for | Notebooks, shared lab image | Local development |

- `dev.bat` — Next + API for development (`EHV_SITE=e-hentai`). Browse http://localhost:3000
- `start.bat` — production after `pnpm build` (`PORT=3000`). Prefer Docker on notebooks; see [DOCKER.md](DOCKER.md)

### Security

- `.env` is gitignored; `.env.example` is the safe committed template.
- Do not bake `ipb_member_id` / `ipb_pass_hash` / `igneous` into Dockerfiles, Compose, or git.
- `.dockerignore` keeps `.env*` out of the build context.

## FAQ

If you can't see the picture, please see [here](/translations/en/FAQ.md)

## PWA install

<img src="https://raw.githubusercontent.com/IronKinoko/asset/master/e-hentai-view/pwa_install.gif" width="25%" title="pwa install"/>

## Development

```shell
# The first time
# npm
npm install
npm run dev:server
npm run dev:app
#yarn
yarn
yarn run dev:server
yarn run dev:app
```

### Windows runners (no cross-env)

- `dev.bat` — local Next + API (`EHV_SITE=e-hentai`). Browse http://localhost:3000
- `start.bat` — production after `pnpm build` (`PORT=3000`). Prefer Docker on notebooks; see [DOCKER.md](DOCKER.md)

## Thanks

- [seven332/EhViewer](https://github.com/seven332/EhViewer)
- [Nicezki](https://github.com/Nicezki) Thai translation
- [KeepSOBP](https://github.com/KeepSOBP) Korean translation
- [TeeVenDick](https://github.com/TeeVenDick) Malay translation
