@echo off
REM Production runner (Windows). Avoids pnpm start / cross-env (can exit silently).
REM Requires a prior build: pnpm install && pnpm build  (or use Docker - see DOCKER.md)
cd /d "%~dp0"

if not exist "server\src\server.js" (
  echo [ehv] Missing server\src\server.js - run from the project root.
  exit /b 1
)
if not exist ".next\BUILD_ID" (
  echo [ehv] No production build (.next\BUILD_ID missing).
  echo [ehv] Run: pnpm install ^&^& pnpm build
  echo [ehv] Or use Docker: see DOCKER.md
  exit /b 1
)

set EHV_SITE=exhentai
set NODE_ENV=production
set PORT=3000

echo [ehv] EHV_SITE=%EHV_SITE% NODE_ENV=%NODE_ENV% PORT=%PORT%
echo [ehv] Starting: node server\src\server.js
echo [ehv] Open http://localhost:%PORT%
node server\src\server.js
