#!/usr/bin/env bash
# Stop EhentaiView Compose stack (macOS / Linux / Git Bash).
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ehv] docker not found." >&2
  exit 1
fi

echo "[ehv] docker compose down"
docker compose down
echo "[ehv] Stopped."
