# Sign in (revive)

## Why Browser login is recommended

Native clients (**EhViewer**, **JHenTai**) embed a **WebView** that loads `forums.e-hentai.org`. You solve Cloudflare Turnstile inside that WebView; the app then reads `ipb_member_id` / `ipb_pass_hash` from the WebView cookie store.

This app is a **Next.js page in your Chrome at localhost**. It cannot read cross-origin forums cookies (no WebView `CookieManager`). Reverse-proxy / iframe embeds are blocked by Cloudflare (`X-Frame-Options: SAMEORIGIN`, Turnstile domain binding). FlareSolverr often fails interactive Turnstile.

## Steps

1. Open **Sign In** → **Browser login**.
2. **Open forums login** (new tab) → solve Turnstile → sign in.
3. DevTools → Application → Cookies → copy values, or paste a full dump (`ipb_member_id=…; ipb_pass_hash=…; igneous=…`).
4. **Save cookies & sign in**. Cookies are stored as HttpOnly on this origin.

Username/password (FlareSolverr) remains available as a fallback accordion.

Peer research notes: see the analysis tree `ehv-analysis/login-peer-research.md` on the lab machine (not shipped in the image).
