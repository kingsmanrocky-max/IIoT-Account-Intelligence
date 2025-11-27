@echo off
echo Stopping local Docker containers...
docker compose -f docker-compose.local-dev.yml down 2>nul
docker compose -f docker-compose.local-prod.yml down 2>nul
echo Local Docker stack stopped.
