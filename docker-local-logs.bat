@echo off
if "%1"=="" (
    echo Usage: docker-local-logs.bat [dev^|prod] [service]
    echo Example: docker-local-logs.bat dev backend
    exit /b 1
)
if "%1"=="dev" (
    docker compose -f docker-compose.local-dev.yml logs -f %2
) else (
    docker compose -f docker-compose.local-prod.yml logs -f %2
)
