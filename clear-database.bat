@echo off
echo.
echo 🗑️  J-MAP — Clear Database Only
echo.
echo This will DELETE all projects, files, and findings from the database.
echo The code will stay the same.
echo.
pause

echo.
echo 🛑 Stopping containers...
docker compose down

echo.
echo 💾 Removing database volume...
docker volume rm jmap_jmap-data 2>nul
docker volume rm j-map_jmap-data 2>nul

echo.
echo 🚀 Starting containers with fresh database...
docker compose up -d

echo.
echo ✅ Database cleared! The app is running with an empty database.
echo.
echo    Dashboard  ^>  http://localhost:5173
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173
