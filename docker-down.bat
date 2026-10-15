@echo off
REM Stop EhentaiView Compose stack (Windows).
cd /d "%~dp0"
where docker >nul 2>&1
if errorlevel 1 (
  echo [ehv] docker not found.
  exit /b 1
)
echo [ehv] docker compose down
docker compose down
echo [ehv] Stopped.
exit /b %ERRORLEVEL%
