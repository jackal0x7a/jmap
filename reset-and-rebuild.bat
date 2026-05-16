@echo off
echo.
echo ⚠️  J-MAP — COMPLETE RESET AND REBUILD
echo.
echo This will:
echo   1. Stop all containers
echo   2. Remove containers and images
echo   3. DELETE THE DATABASE (remove volume jmap-data)
echo   4. Clear Docker build cache
echo   5. Rebuild everything from scratch
echo.
pause

echo.
echo 🛑 Stopping containers...
docker compose down

echo.
echo 🗑️  Removing old images...
docker rmi jmap-backend jmap-frontend 2>nul
docker rmi j-map-backend j-map-frontend 2>nul

echo.
echo 💾 Removing database volume (this deletes all your data)...
docker volume rm jmap_jmap-data 2>nul
docker volume rm j-map_jmap-data 2>nul

echo.
echo 🧹 Clearing Docker build cache...
docker builder prune -f

echo.
echo 🔨 Rebuilding with no cache...
docker compose build --no-cache

echo.
echo 🚀 Starting fresh containers...
docker compose up -d

echo.
echo ✅ COMPLETE RESET DONE!
echo.
echo    Dashboard  ^>  http://localhost:5173
echo    Backend    ^>  http://localhost:3747
echo.
echo    The database is now fresh and empty.
echo    Load the extension folder in chrome://extensions
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173
