@echo off
setlocal
REM Launch Electron shell against the local Docker/bare app (default :3000).
REM Keep docker compose up first: http://localhost:3000

cd /d "%~dp0"

if not defined EHV_APP_URL set EHV_APP_URL=http://127.0.0.1:3000

echo EHentaiView desktop
echo   EHV_APP_URL=%EHV_APP_URL%
echo   Ensure the app is running (docker compose up -d) before signing in.
echo.

pushd desktop
if not exist node_modules (
  echo Installing desktop dependencies...
  call pnpm install
  if errorlevel 1 (
    echo pnpm install failed. Is Node/pnpm on PATH?
    popd
    exit /b 1
  )
)
call pnpm start
set ERR=%ERRORLEVEL%
popd
exit /b %ERR%
