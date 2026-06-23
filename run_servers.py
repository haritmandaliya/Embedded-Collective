import subprocess
import time
import sys

print("Starting backend (uvicorn)...")
backend = subprocess.Popen(
    ["/home/harit/Harit_Portfolio/apps/backend/.venv/bin/uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    cwd="/home/harit/Harit_Portfolio/apps/backend"
)

print("Starting frontend (vite)...")
frontend = subprocess.Popen(
    ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
    cwd="/home/harit/Harit_Portfolio/apps/frontend"
)

try:
    while True:
        if backend.poll() is not None:
            print("Backend stopped!")
            sys.exit(1)
        if frontend.poll() is not None:
            print("Frontend stopped!")
            sys.exit(1)
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping servers...")
    backend.terminate()
    frontend.terminate()
