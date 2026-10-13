# Desktop shell (Electron) — quick start

In-bound **BrowserView** Sign In for revive (EhViewer / JHenTai pattern). The shell loads your already-running app; forums login happens **inside the app window**; cookies are captured automatically (no paste on the happy path).

Full auth notes: [LOGIN.md](LOGIN.md). Package details: [desktop/README.md](desktop/README.md).

## Prerequisites

1. App running at **http://127.0.0.1:3000** (Docker: `docker compose up -d`).
2. Node ≥ 20 + pnpm on the machine that runs Electron, **or** the portable `.exe` under `desktop/dist/`.

## Windows (recommended)

```bat
REM Terminal 1 — keep Docker up
docker compose up -d

REM Terminal 2 — from the repo / Windows tree root
desktop.bat
```

Manual:

```bat
cd desktop
pnpm install
set EHV_APP_URL=http://127.0.0.1:3000
pnpm start
```

**Portable** (no `pnpm start` needed after build):

```bat
cd desktop
pnpm install
pnpm dist:win
REM Run: desktop\dist\EHentaiView-4.2.0-portable.exe
REM Still needs Docker/app at EHV_APP_URL (default http://127.0.0.1:3000)
```

Set a different port if needed:

```bat
set EHV_APP_URL=http://127.0.0.1:3001
desktop.bat
```

## What you should see

1. Electron window loads the app (same UI as Chrome at localhost:3000).
2. **Sign In** shows **Sign in with WebView** (React CTA if the image includes it; otherwise a green floating fallback bar injected by Electron).
3. Clicking opens forums login **in-bound** (toolbar + BrowserView). Cancel / Esc closes it.
4. After a real login, cookies are applied via `/api/user/login` — do not paste secrets for the happy path.

Browser Chrome at localhost still uses cookie-paste (see LOGIN.md).

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `EHV_APP_URL` | `http://127.0.0.1:3000` | URL the Electron window loads |

Never put gallery cookies in `.env` or the image.
