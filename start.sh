#!/usr/bin/env bash
# Start EhentaiView via Docker Compose (macOS / Linux / Git Bash).
# Prefers a pre-loaded image tag ehentai-view:revive — do not pass --build on notebooks.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ehv] docker not found. Install Docker Desktop (Mac/Windows) or Docker Engine (Linux)." >&2
  exit 1
fi

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

# Resolve host port for the tip line (default 3000)
HOST_PORT=3000
if grep -qE '^[[:space:]]*EHV_HOST_PORT=' .env 2>/dev/null; then
  HOST_PORT=$(grep -E '^[[:space:]]*EHV_HOST_PORT=' .env | head -1 | cut -d= -f2- | tr -d '[:space:]"'"'")
  [[ -z "$HOST_PORT" ]] && HOST_PORT=3000
fi

if ! docker image inspect ehentai-view:revive >/dev/null 2>&1; then
  echo "[ehv] Image ehentai-view:revive not found."
  echo "[ehv] Load a lab tar:  docker load -i ehentai-view-revive.tar.gz"
  echo "[ehv] Or build on a lab/server:  docker compose build"
  exit 1
fi

echo "[ehv] docker compose up -d  (no --build)"
docker compose up -d

echo "[ehv] Local:  http://localhost:${HOST_PORT}"
echo "[ehv] Phone/tablet on same Wi‑Fi: http://<this-machine-LAN-IP>:${HOST_PORT}"
echo "[ehv]   Find IP — macOS: ipconfig getifaddr en0   Linux: hostname -I   Windows: ipconfig"
echo "[ehv] Stop: ./stop.sh   or   docker compose down"
echo "[ehv] Docs: DOCKER.md (LAN access, firewall, cookies on mobile)"
