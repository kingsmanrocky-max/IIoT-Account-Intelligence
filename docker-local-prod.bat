@echo off
echo Building and starting local Docker production mirror...
docker compose -f docker-compose.local-prod.yml build
docker compose -f docker-compose.local-prod.yml up -d
echo.
echo Local production mirror started!
echo Access the app at: http://localhost
echo.
echo Containers:
docker compose -f docker-compose.local-prod.yml ps
