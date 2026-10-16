# Sign in (revive)

## Why Browser login is recommended

Native clients (**EhViewer**, **JHenTai**) embed a **WebView** that loads `forums.e-hentai.org`. You solve Cloudflare Turnstile inside that WebView; the app then reads `ipb_member_id` / `ipb_pass_hash` from the WebView cookie store.

This app is a **Next.js page in your browser** (localhost or a LAN IP). It cannot read cross-origin forums cookies (no WebView `CookieManager`). Reverse-proxy / iframe embeds are blocked by Cloudflare (`X-Frame-Options: SAMEORIGIN`, Turnstile domain binding). FlareSolverr often fails interactive Turnstile.

## Steps (desktop browser)

1. Open **Sign In** → **Browser login**.
2. **Open forums login** (new tab) → solve Turnstile → sign in.
3. DevTools → Application → Cookies → copy values, or paste a full dump (`ipb_member_id=…; ipb_pass_hash=…; igneous=…`).
4. **Save cookies & sign in**. Cookies are stored as HttpOnly on this origin.

Username/password (FlareSolverr) remains available as a fallback accordion. With Docker Compose, start the optional solver with `docker compose --profile auth up -d` (no host port; Compose DNS only). Prefer Browser login.

## Phone / tablet (iOS Safari, Android Chrome)

1. On the host PC, run Docker Compose so the app listens on the LAN (`0.0.0.0` — see [DOCKER.md § LAN / mobile access](DOCKER.md#lan--mobile-access)).
2. On the phone, open `http://<host-LAN-IP>:<port>`.
3. Open **Sign In**. Paste cookies into the dump / fields (same as Advanced cookie paste).
4. Obtain cookie values from a **desktop** browser (DevTools), or any cookie export — then paste on the phone. iOS has no Chrome DevTools equivalent for easy cookie copy.
5. A future **Chrome extension** (if built) is **desktop only** and will **not** work on iOS.

Signing in on `http://localhost:…` does not share cookies with `http://192.168.x.x:…` — sign in on the URL you actually use on that device.

Peer research notes: see the analysis tree `ehv-analysis/login-peer-research.md` on the lab machine (not shipped in the image).
