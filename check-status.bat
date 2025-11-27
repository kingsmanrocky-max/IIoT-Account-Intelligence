@echo off
echo Checking production status...
gcloud compute ssh iiot-intelligence --zone=us-central1-a --command="sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
pause
