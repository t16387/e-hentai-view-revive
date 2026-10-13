# Sign in (revive)

## Electron desktop shell (recommended on Windows)

Native clients (**EhViewer**, **JHenTai**) embed a **WebView** that loads `forums.e-hentai.org`. You solve Cloudflare Turnstile inside that WebView; the app then reads `ipb_member_id` / `ipb_pass_hash` from the WebView cookie store.

This repo ships an **Electron** shell under `desktop/` that does the same:

1. Start the app server (Docker Compose on port **3000**, or bare Node).
2. Run the desktop shell against that URL (`EHV_APP_URL`, default `http://127.0.0.1:3000`).
3. Open **Sign In** → **Sign in with WebView**. Forums login opens **inside the app window** (BrowserView). Solve Turnstile, sign in; cookies are captured automatically and posted to `/api/user/login`. No paste on the happy path.

### Quick start (Windows + Docker)

```bat
REM 1) App already up: http://localhost:3000 (docker compose up -d)
REM 2) From the repo root:
desktop.bat
```

Or manually:

```bat
cd desktop
pnpm install
set EHV_APP_URL=http://127.0.0.1:3000
pnpm start
```

From the monorepo root (after `pnpm install` in `desktop/`):

```bash
pnpm desktop
# or: EHV_APP_URL=http://127.0.0.1:3001 pnpm desktop
```

Build a Windows portable (on Windows, or Linux with wine):

```bat
cd desktop
pnpm dist:win
REM artifact under desktop\dist\
```

Copy the portable exe to e.g. `C:\Users\nick\Downloads\ai\e-hentai-view\desktop` if you keep a load-only Windows tree.

## Browser-only (no Electron)

A **Next.js page in Chrome at localhost** cannot read cross-origin forums cookies (no WebView `CookieManager`). Reverse-proxy / iframe embeds are blocked by Cloudflare (`X-Frame-Options: SAMEORIGIN`, Turnstile domain binding). FlareSolverr often fails interactive Turnstile.

### Steps (cookie paste)

1. Open **Sign In** → **Browser login**.
2. **Open forums login** (new tab) → solve Turnstile → sign in.
3. DevTools → Application → Cookies → copy values, or paste a full dump (`ipb_member_id=…; ipb_pass_hash=…; igneous=…`).
4. **Save cookies & sign in**. Cookies are stored as HttpOnly on this origin.

Username/password (FlareSolverr) remains available as a fallback accordion in both Electron and browser.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `EHV_APP_URL` | `http://127.0.0.1:3000` | URL the Electron shell loads (Docker or local server) |

Never put gallery cookies in `.env` or the image.

Peer research notes: `login-peer-research.md` on the lab/Windows tree (not required at runtime).
