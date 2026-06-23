#!/usr/bin/env bash
set -euo pipefail

mkdir -p /home/harit/Harit_Portfolio/.run

# Start backend
cd /home/harit/Harit_Portfolio/apps/backend
source .venv/bin/activate
export PYTHONUNBUFFERED=1
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload >> /home/harit/Harit_Portfolio/.run/backend.log 2>&1 &
echo $! > /home/harit/Harit_Portfolio/.run/backend.pid

# Start frontend
cd /home/harit/Harit_Portfolio/apps/frontend
nohup npm run dev -- --host 127.0.0.1 --port 5173 >> /home/harit/Harit_Portfolio/.run/frontend.log 2>&1 &
echo $! > /home/harit/Harit_Portfolio/.run/frontend.pid

echo "Frontend and backend started successfully in the background!"
