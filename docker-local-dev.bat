@echo off
echo Starting local Docker development environment (hot-reload)...
docker compose -f docker-compose.local-dev.yml up -d
echo.
echo Local Docker stack started!
echo Access the app at: http://localhost
echo.
echo Containers:
docker compose -f docker-compose.local-dev.yml ps
