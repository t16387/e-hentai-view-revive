@echo off
REM Development runner (Windows). Env set in-process (no cross-env / pnpm).
REM Starts API :8080 + Next app on PORT (default 3000; proxies /api -> 8080).
REM Same as package.json: dev:server (nodemon app.js) + dev:app (server.js).
REM Port: set PORT=3001 before this script, or put PORT= / EHV_HOST_PORT= in .env
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

REM Browser/Next port only — do not force if already set
call :load_dotenv_ports
if not defined PORT if defined EHV_HOST_PORT set "PORT=%EHV_HOST_PORT%"
if not defined PORT set "PORT=3000"

echo [ehv] EHV_SITE=%EHV_SITE% NODE_ENV=%NODE_ENV%
echo [ehv] API  :8080  (nodemon server\src\app.js -w server)
echo [ehv] App  :%PORT%  (node server\src\server.js)  ^<- browse this
echo [ehv] Tip: if %PORT% is taken, set PORT=3001 or edit .env then re-run.
echo.

REM Sibling console for the API — force PORT=8080 so browser PORT from .env
REM does not move the API (Next still proxies /api -> localhost:8080).
start "ehv-api" cmd /k "cd /d %~dp0 && set EHV_SITE=e-hentai&& set NODE_ENV=development&& set PORT=8080&& if exist node_modules\.bin\nodemon.cmd (node_modules\.bin\nodemon.cmd server\src\app.js -w server) else (node server\src\app.js)"

timeout /t 2 /nobreak >nul
node server\src\server.js
exit /b %ERRORLEVEL%

:load_dotenv_ports
if not exist ".env" goto :eof
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
  if /i "%%A"=="PORT" if not defined PORT set "PORT=%%B"
  if /i "%%A"=="EHV_HOST_PORT" if not defined EHV_HOST_PORT set "EHV_HOST_PORT=%%B"
)
goto :eof
