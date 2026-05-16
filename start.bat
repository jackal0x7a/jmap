@echo off
echo.
echo ⚡ J-MAP — Starting...
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

docker compose up --build -d

echo.
echo ✅ J-MAP is running!
echo.
echo    Dashboard  ^>  http://localhost:5173
echo    Backend    ^>  http://localhost:3747
echo.
echo    Load the extension\ folder in chrome://extensions
echo.
echo    To stop: stop.bat  or  docker compose down
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173
