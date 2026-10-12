@echo off
REM Production runner (Windows). Avoids pnpm start / cross-env (can exit silently).
REM Requires a prior build: pnpm install && pnpm build  (or use Docker - see DOCKER.md)
REM Port: set PORT=3001 before this script, or put PORT= / EHV_HOST_PORT= in .env
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

set EHV_SITE=e-hentai
set NODE_ENV=production

REM Load PORT / EHV_HOST_PORT from .env when not already set in the environment
call :load_dotenv_ports
if not defined PORT if defined EHV_HOST_PORT set "PORT=%EHV_HOST_PORT%"
if not defined PORT set "PORT=3000"

echo [ehv] EHV_SITE=%EHV_SITE% NODE_ENV=%NODE_ENV% PORT=%PORT%
echo [ehv] Starting: node server\src\server.js
echo [ehv] Open http://localhost:%PORT%
echo [ehv] Tip: if port is taken, set PORT=3001 (cmd) or edit .env then re-run.
node server\src\server.js
exit /b %ERRORLEVEL%

:load_dotenv_ports
if not exist ".env" goto :eof
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
  if /i "%%A"=="PORT" if not defined PORT set "PORT=%%B"
  if /i "%%A"=="EHV_HOST_PORT" if not defined EHV_HOST_PORT set "EHV_HOST_PORT=%%B"
)
goto :eof
