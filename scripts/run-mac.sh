#!/usr/bin/env bash
# macOS (also works on Linux): zero→running helper for e-hentai-view revive.
# Prefers Docker image ehentai-view:revive → ./start.sh; else bare Node + pnpm.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

have() { command -v "$1" >/dev/null 2>&1; }

ensure_env() {
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      cp .env.example .env
      echo "[ehv] Created .env from .env.example — edit EHV_SITE / EHV_HOST_PORT / EHV_PROXY as needed."
    else
      echo "[ehv] Missing .env and .env.example" >&2
      exit 1
    fi
  fi
  mkdir -p downloads
}

read_port() {
  local port=3000
  if [[ -f .env ]] && grep -qE '^[[:space:]]*(PORT|EHV_HOST_PORT)=' .env 2>/dev/null; then
    # Prefer explicit PORT for bare Node; else EHV_HOST_PORT
    if grep -qE '^[[:space:]]*PORT=' .env 2>/dev/null; then
      port=$(grep -E '^[[:space:]]*PORT=' .env | head -1 | cut -d= -f2- | tr -d '[:space:]"'"'")
    elif grep -qE '^[[:space:]]*EHV_HOST_PORT=' .env 2>/dev/null; then
      port=$(grep -E '^[[:space:]]*EHV_HOST_PORT=' .env | head -1 | cut -d= -f2- | tr -d '[:space:]"'"'")
    fi
    [[ -z "$port" ]] && port=3000
  fi
  echo "$port"
}

print_urls() {
  local port="$1"
  echo "[ehv] Local:  http://localhost:${port}"
  echo "[ehv] Phone/tablet (same Wi‑Fi): http://<this-Mac-LAN-IP>:${port}"
  if have ipconfig; then
    local ip
    ip=$(ipconfig getifaddr en0 2>/dev/null || true)
    if [[ -n "${ip:-}" ]]; then
      echo "[ehv]   This Mac (en0): http://${ip}:${port}"
    else
      echo "[ehv]   Find IP: ipconfig getifaddr en0"
    fi
  else
    echo "[ehv]   Find IP (macOS): ipconfig getifaddr en0"
  fi
}

ensure_pnpm() {
  if have pnpm; then
    return 0
  fi
  if have corepack; then
    echo "[ehv] Enabling pnpm via corepack…"
    corepack enable
    corepack prepare pnpm@10.33.4 --activate || true
  fi
  if ! have pnpm; then
    echo "[ehv] pnpm not found. Install Node ≥20.9, then: corepack enable && corepack prepare pnpm@10 --activate" >&2
    exit 1
  fi
}

run_bare_node() {
  ensure_pnpm
  if [[ ! -d node_modules ]]; then
    echo "[ehv] pnpm install…"
    pnpm install
  fi
  if [[ ! -d .next ]]; then
    echo "[ehv] pnpm build… (no .next yet)"
    pnpm build
  fi
  local port
  port="$(read_port)"
  export NODE_ENV=production
  # Bare Node: PORT wins; fall back to EHV_HOST_PORT from .env via read_port
  if [[ -z "${PORT:-}" ]]; then
    export PORT="$port"
  else
    port="$PORT"
  fi
  echo "[ehv] Starting bare Node on PORT=${port}…"
  print_urls "$port"
  exec pnpm start
}

ensure_env
PORT_HINT="$(read_port)"

if have docker && docker info >/dev/null 2>&1; then
  if docker image inspect ehentai-view:revive >/dev/null 2>&1; then
    echo "[ehv] Docker + image ehentai-view:revive found → ./start.sh"
    exec ./start.sh
  fi
  echo "[ehv] Docker is available but image ehentai-view:revive is missing."
  echo "[ehv] Next steps (pick one):"
  echo "[ehv]   1) Load a release tar:  docker load -i ehentai-view-revive.tar.gz"
  echo "[ehv]   2) Build locally:       docker compose build && ./start.sh"
  echo "[ehv]   3) Skip Docker and use bare Node (this script will continue if you set EHV_FORCE_NODE=1)."
  if [[ "${EHV_FORCE_NODE:-}" == "1" ]]; then
    echo "[ehv] EHV_FORCE_NODE=1 → bare Node"
    run_bare_node
  fi
  # Interactive offer only when stdin is a TTY
  if [[ -t 0 ]]; then
    read -r -p "[ehv] Run docker compose build now? [y/N] " ans || true
    case "${ans:-}" in
      y|Y|yes|YES)
        docker compose build
        exec ./start.sh
        ;;
    esac
    read -r -p "[ehv] Fall back to bare Node instead? [y/N] " ans2 || true
    case "${ans2:-}" in
      y|Y|yes|YES) run_bare_node ;;
    esac
  fi
  echo "[ehv] Stopped. Load/build the image, or re-run with EHV_FORCE_NODE=1 for bare Node." >&2
  print_urls "$PORT_HINT"
  exit 1
fi

if have node; then
  echo "[ehv] No usable Docker — bare Node path"
  run_bare_node
fi

echo "[ehv] Neither Docker nor Node found." >&2
echo "[ehv] Install Docker Desktop (preferred) or Node ≥20.9 + pnpm 10." >&2
echo "[ehv] Docs: AGENTS.md, SETUP.md, DOCKER.md" >&2
exit 1
