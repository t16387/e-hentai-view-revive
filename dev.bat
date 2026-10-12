@echo off
REM Development runner (Windows). Env set in-process (no cross-env / pnpm).
REM Starts API :8080 + Next app :3000 (proxies /api -> 8080).
REM Same as package.json: dev:server (nodemon app.js) + dev:app (server.js).
cd /d "%~dp0"

if not exist "server\src\server.js" (
  echo [ehv] Missing server\src\server.js - run from the project root.
  exit /b 1
)
if not exist "node_modules\" (
  echo [ehv] node_modules missing. Run: pnpm install
  exit /b 1
)

set EHV_SITE=e-hentai
set NODE_ENV=development

echo [ehv] EHV_SITE=%EHV_SITE% NODE_ENV=%NODE_ENV%
echo [ehv] API  :8080  (nodemon server\src\app.js -w server)
echo [ehv] App  :3000  (node server\src\server.js)  ^<- browse this
echo.

REM Sibling console for the API so this window stays on Next.
start "ehv-api" cmd /k "cd /d %~dp0 && set EHV_SITE=e-hentai&& set NODE_ENV=development&& if exist node_modules\.bin\nodemon.cmd (node_modules\.bin\nodemon.cmd server\src\app.js -w server) else (node server\src\app.js)"

timeout /t 2 /nobreak >nul
node server\src\server.js
