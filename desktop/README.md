# EHentaiView desktop (Electron)

In-bound **BrowserView** login shell for the revive app. Connects to an already-running server (Docker Compose or bare Node) via `EHV_APP_URL`.

## Requirements

- Node ≥ 20
- pnpm (or npm)
- App reachable at `http://127.0.0.1:3000` (or your `EHV_HOST_PORT`)

## Run

```bash
cd desktop
pnpm install
EHV_APP_URL=http://127.0.0.1:3000 pnpm start
```

Windows: use `desktop.bat` from the repo root.

## Architecture

| Piece | Role |
|-------|------|
| `src/main.js` | BrowserWindow → app URL; opens login BrowserView + toolbar |
| `src/preload.js` | `contextIsolation` bridge: `openLoginWebView`, `onLoginCookies` |
| `src/cookieHelpers.js` | Pure cookie pick/merge (unit-tested) |
| Login partition `persist:ehv-login` | Isolated session for forums / exhentai |
| Renderer (`pages/signin.tsx`) | Detects `window.electronAPI`; primary CTA opens WebView; posts cookies to existing `/api/user/login` |

Flow: Sign In → WebView loads `forums.e-hentai.org` → user solves Turnstile → `session.cookies` yields `ipb_*` → optional `exhentai.org` navigation for `igneous` → IPC to renderer → cookie login API → HttpOnly on app origin → WebView closes.

## Build

```bash
pnpm dist:win   # portable under dist/
```

Linux CI boxes may lack Windows build tooling; shipping `desktop/` source + scripts is enough. Prefer building the portable on the Windows notebook.
