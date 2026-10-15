@echo off
REM Start EhentaiView via Docker Compose (Windows). No --build.
REM Prefer a pre-loaded image: docker load -i ehentai-view-revive.tar.gz
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo [ehv] docker not found. Install Docker Desktop and ensure it is running.
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y .env.example .env >nul
    echo [ehv] Created .env from .env.example
  ) else (
    echo [ehv] Missing .env and .env.example
    exit /b 1
  )
)

if not exist downloads mkdir downloads

docker image inspect ehentai-view:revive >nul 2>&1
if errorlevel 1 (
  echo [ehv] Image ehentai-view:revive not found.
  echo [ehv] Load: docker load -i ehentai-view-revive.tar.gz
  echo [ehv] Or build on a lab box, then transfer the tar.
  exit /b 1
)

echo [ehv] docker compose up -d  (no --build)
docker compose up -d
if errorlevel 1 exit /b %ERRORLEVEL%

echo [ehv] Local:  http://localhost:3000  (or EHV_HOST_PORT from .env)
echo [ehv] Phone/tablet: http://^<this-PC-LAN-IP^>:3000
echo [ehv]   Find IP: ipconfig   look for IPv4 under Wi-Fi / Ethernet
echo [ehv] Stop: docker-down.bat   or   docker compose down
echo [ehv] Docs: DOCKER.md
exit /b 0
