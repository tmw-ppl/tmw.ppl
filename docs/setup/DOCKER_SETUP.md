# Docker Setup for Local Supabase

## Prerequisite: Docker Desktop

Supabase local development requires Docker Desktop to be running.

## Install Docker Desktop

1. **Download Docker Desktop for Mac**
   - Visit: https://www.docker.com/products/docker-desktop
   - Download for Apple Silicon (M1/M2/M3) or Intel chip
   - Install the `.dmg` file

2. **Start Docker Desktop**
   - Open Docker Desktop from Applications
   - Wait for it to fully start (whale icon in menu bar should be steady)
   - First start may take a few minutes

3. **Verify Docker is running**
   ```bash
   docker --version
   docker ps
   ```

## Quick Check

To verify Docker is ready:
```bash
# Check if Docker daemon is running
docker info

# If this command works without errors, Docker is ready
```

## Starting Supabase

Once Docker Desktop is running:

```bash
# Start Supabase
npm run supabase:start

# This will:
# - Download required Docker images (first time only)
# - Start PostgreSQL, PostgREST, GoTrue, Storage, etc.
# - Show you connection details
```

## Troubleshooting

### Docker won't start
- Make sure Docker Desktop is installed
- Check if your Mac supports virtualization
- Restart Docker Desktop

### "Cannot connect to Docker daemon"
- Docker Desktop is not running
- Open Docker Desktop application
- Wait for it to fully start (check menu bar icon)

### Port conflicts
If ports are already in use:
```bash
# Check what's using the ports
lsof -i :54321  # API port
lsof -i :54322  # DB port
lsof -i :54323  # Studio port

# Stop Supabase
npm run supabase:stop

# Or stop the conflicting service
```

## Docker Desktop Settings

Recommended settings:
- **Resources**: At least 4GB RAM allocated
- **Disk Image Size**: 60GB+ recommended
- **WSL Integration** (not needed on macOS, but good for Windows)

## Next Steps

1. ✅ Install Docker Desktop
2. ✅ Start Docker Desktop
3. ✅ Run `npm run supabase:start`
4. ✅ Apply migrations: `npm run supabase:migrate`
