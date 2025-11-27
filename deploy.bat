@echo off
echo =========================================
echo IIoT Account Intelligence - Deploy
echo =========================================
echo.

echo [1/4] Checking for uncommitted changes...
git status --short
echo.
set /p COMMIT_MSG="Commit message (Enter to skip): "
if not "%COMMIT_MSG%"=="" (
    git add .
    git commit -m "%COMMIT_MSG%"
)

echo [2/4] Pushing to GitHub...
git push origin master

echo [3/4] Deploying to GCP VM...
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="cd /opt/iiot-app && sudo git pull origin master && sudo docker-compose -f docker-compose.prod.yml build && sudo docker-compose -f docker-compose.prod.yml up -d && sleep 10 && sudo docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy"

echo [4/4] Checking status...
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo docker ps --format 'table {{.Names}}\t{{.Status}}'"

echo.
echo =========================================
echo Done! Visit: https://35.193.254.12
echo =========================================
pause
