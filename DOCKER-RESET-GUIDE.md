# 🔧 J-MAP Docker Reset Guide

## Why Your Changes Didn't Apply

When you ran `start.bat` after updating the code, you saw the old version because:

1. **Docker Build Cache**: Docker cached the old layers and didn't rebuild from scratch
2. **Persistent Volume**: The database volume `jmap-data` persists even when you delete containers
3. **Container Restart**: `docker compose up --build` doesn't use `--no-cache` by default

## Solutions

### Option 1: Complete Reset (Recommended for code updates)

Run `reset-and-rebuild.bat` - This will:
- ✅ Stop and remove all containers
- ✅ Delete old images
- ✅ **DELETE the database** (removes jmap-data volume)
- ✅ Clear Docker build cache
- ✅ Rebuild everything from scratch with new code
- ✅ Start fresh containers

```bash
reset-and-rebuild.bat
```

**Use this when:** You've updated the code and want to see the changes

### Option 2: Clear Database Only

Run `clear-database.bat` - This will:
- ✅ Stop containers
- ✅ **DELETE the database only** (removes jmap-data volume)
- ✅ Restart with the same code but empty database

```bash
clear-database.bat
```

**Use this when:** You want to clear all projects/data but keep the current code

### Option 3: Manual Commands (Advanced)

```bash
# Stop everything
docker compose down

# Remove images
docker rmi jmap-backend jmap-frontend

# Remove database volume (THIS IS THE KEY STEP)
docker volume rm jmap_jmap-data

# Rebuild with no cache
docker compose build --no-cache

# Start fresh
docker compose up -d
```

## Understanding Docker Volumes

The `jmap-data` volume is defined in `docker-compose.yml`:

```yaml
volumes:
  jmap-data:
    driver: local
```

This volume stores `/data/jmap.db` (your SQLite database) and **persists even when containers are deleted**. This is normally good (you don't lose data on restart), but it means:

- Deleting containers ❌ doesn't delete data
- Deleting images ❌ doesn't delete data
- You must explicitly remove the volume ✅ to clear data

## Quick Reference

| What You Want | Command |
|---------------|---------|
| See new code changes | `reset-and-rebuild.bat` |
| Clear all data (keep code) | `clear-database.bat` |
| Normal start | `start.bat` |
| Stop the app | `stop.bat` or `docker compose down` |

## Checking What's Running

```bash
# See running containers
docker ps

# See all volumes
docker volume ls

# Inspect the database volume
docker volume inspect jmap_jmap-data

# See build cache size
docker system df
```

## After Running Reset

1. Go to `http://localhost:5173`
2. You'll see "No active project" (empty database)
3. The glassy theme improvements will be visible
4. Create a new project to test
5. The delete modal will appear centered when you try to delete

---

**Note:** If you only want to keep your data and see code changes, you can skip the volume removal step, but you MUST rebuild with `--no-cache` flag.
