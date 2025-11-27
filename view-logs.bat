@echo off
echo Backend logs (Ctrl+C to exit)...
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo docker-compose -f /opt/iiot-app/docker-compose.prod.yml logs --tail=50 backend"
pause
