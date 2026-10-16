# SETUP — quick checklist (humans + AIs)

Zero → running on **macOS** (same ideas work on Linux; Windows uses the `.bat` helpers). Full AI entry: **[AGENTS.md](AGENTS.md)**.

## 1. Prerequisites

- [ ] Docker Desktop **or** Node ≥ 20.9 + pnpm 10
- [ ] Clone / extract this repo (branch **`revive`**)

## 2. Configure (no cookies)

```bash
cp .env.example .env
# Optional edits only: EHV_SITE, EHV_HOST_PORT, EHV_PROXY, downloads paths
mkdir -p downloads
```

Never put `ipb_member_id` / `ipb_pass_hash` / `igneous` in `.env`.

## 3. Run

**macOS preferred:**

```bash
./scripts/run-mac.sh
# or, with image already loaded:
./start.sh
```

**Docker only:** load `ehentai-view:revive` (release tar) → `./start.sh`  
**Bare Node:** `pnpm install` → `pnpm build` → `pnpm start`

Open **http://localhost:3000** (or your `EHV_HOST_PORT` / `PORT`).

## 4. LAN phone

```bash
ipconfig getifaddr en0   # Mac Wi‑Fi IP
# then: http://<that-IP>:<port>
```

## 5. Optional auth helper

Default Compose is **app only**. Password Sign In helper (FlareSolverr):

```bash
docker compose --profile auth up -d
```

Browser login (cookie paste) does **not** need this profile. See [LOGIN.md](LOGIN.md).

## 6. Watched vs Histories

| Nav | Meaning |
|-----|---------|
| **Watched** | Upstream subscribed-tags list |
| **Histories** | Local browse / read history in this browser |

## More

- [DOCKER.md](DOCKER.md) — Compose, firewall, downloads volume  
- [README.md](README.md) — overview & env table  
- [AGENTS.md](AGENTS.md) — do/don’t for AI assistants  
