@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    PhotoManager Docker Deployment
echo ========================================
echo.

REM --- Add Docker to PATH ---
set "DOCKER_BIN=C:\Program Files\Docker\Docker\resources\bin"
set "PATH=%PATH%;%DOCKER_BIN%"

REM --- Check Docker installed ---
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found.
    echo Please run enable-virtualization.bat first, restart, then start Docker Desktop.
    echo.
    pause
    goto :EOF
)
echo [OK] Docker installed

REM --- Check Docker running, start if needed ---
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] Docker engine not running, starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    set "docker_ready=0"
    for /l %%i in (1,1,40) do (
        timeout /t 5 /nobreak >nul
        docker info >nul 2>&1
        if !errorlevel! equ 0 (
            set "docker_ready=1"
            echo [OK] Docker engine ready
            goto :docker_ready
        )
        echo       Waiting for Docker... %%i/40
    )

    :docker_ready
    if "!docker_ready!"=="0" (
        echo [ERROR] Docker engine failed to start
        echo Possible cause: virtualization not enabled. Run enable-virtualization.bat first.
        echo.
        pause
        goto :EOF
    )
) else (
    echo [OK] Docker engine running
)

REM --- Switch to script directory ---
cd /d "%~dp0"

echo.
echo [1/5] Checking environment config...
if not exist .env (
    if exist .env.docker (
        copy .env.docker .env >nul
        echo       Created .env from .env.docker
    ) else (
        echo [ERROR] .env.docker not found
        pause
        goto :EOF
    )
) else (
    echo       .env already exists
)

echo.
echo [2/5] Stopping old containers (if any)...
docker compose down 2>nul

echo.
echo [3/5] Building images (first build may take several minutes)...
docker compose build --progress=plain
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    echo Check error messages above.
    pause
    goto :EOF
)

echo.
echo [4/5] Starting services...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    pause
    goto :EOF
)

echo.
echo [5/5] Waiting for backend to be ready...
set "ready=0"
for /l %%i in (1,1,30) do (
    timeout /t 3 /nobreak >nul
    curl -s http://localhost:5000/api/members >nul 2>&1
    if !errorlevel! equ 0 (
        set "ready=1
        echo       Backend is ready!
        goto :svc_ready
    )
    echo       Waiting for backend... %%i/30
)

:svc_ready
if "!ready!"=="0" (
    echo       [!] Backend did not respond in time. Check: docker compose logs backend
)

echo.
echo ========================================
echo          Deployment Complete!
echo ========================================
echo.
echo   Frontend:  http://localhost
echo   Backend:   http://localhost:5000
echo.
echo   Commands:
echo     Status:  docker compose ps
echo     Logs:   docker compose logs -f
echo     Stop:   docker compose down
echo     Rebuild: docker compose up -d --build
echo.
pause
