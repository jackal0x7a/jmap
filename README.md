# ⚡ J-MAP

Javascript and Endpoint discovery tool. Captures every JavaScript file loaded while you browse, extracts endpoints, API keys, secrets, and tokens.

---

## Quick Start (Docker)

**Requirement:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Windows
```
Double-click start.bat
```

### Mac / Linux
```bash
chmod +x start.sh stop.sh
./start.sh
```

Opens http://localhost:5173 automatically.

---

## Chrome Extension Setup

1. Open Chrome → chrome://extensions
2. Enable Developer Mode (top-right toggle)
3. Click Load unpacked → select the extension/ folder
4. Open the extension → add your target scope (e.g. *.example.com)

The extension talks to the backend at localhost:3747.

---

## Data Persistence

Captured files live in a Docker named volume (jmap-data).  
They survive container restarts and machine reboots.

Only `docker compose down -v` (with -v flag) deletes the data.

Backup your database:
```bash
docker run --rm -v jmap_jmap-data:/data -v $(pwd):/backup alpine \
  cp /data/jmap.db /backup/jmap-backup.db
```

---

## Commands

| Action | Command |
|---|---|
| Start | ./start.sh or start.bat |
| Stop | ./stop.sh or stop.bat |
| View logs | docker compose logs -f |
| Rebuild after code change | docker compose up --build -d |
| Nuke all data | docker compose down -v |

---

## Manual Run (no Docker)

```bash
# Terminal 1
pip install flask flask-cors
cd backend && python server.py

# Terminal 2
cd dashboard && npm install && npm run dev
```
