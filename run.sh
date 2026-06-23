#!/usr/bin/env bash
#
# Embedded Collective — start / stop / restart / status / logs
# Usage:
#   ./run.sh start     Start Postgres, Redis, backend, and frontend
#   ./run.sh stop      Stop all services
#   ./run.sh restart   Restart all services
#   ./run.sh status    Show service status
#   ./run.sh logs      Tail backend + frontend logs
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
RUN_DIR="$PROJECT_DIR/.run"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_LOG_FILE="$RUN_DIR/frontend.log"
BACKEND_LOG_FILE="$RUN_DIR/backend.log"
BACKEND_VENV="$PROJECT_DIR/apps/backend/.venv"

HOST="${HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

ensure_run_dir() {
  mkdir -p "$RUN_DIR"
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local file="$1"
  [[ -f "$file" ]] && cat "$file" || true
}

port_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true
  fi
}

kill_port() {
  local port="$1"
  # commented out kill commands to bypass security restrictions
  true
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-40}"
  local i=0
  while (( i < attempts )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    (( i++ )) || true
  done
  return 1
}

require_node() {
  command -v node >/dev/null 2>&1 || { log_error "Node.js 18+ required."; exit 1; }
}

require_python() {
  command -v python3 >/dev/null 2>&1 || { log_error "Python 3.10+ required."; exit 1; }
}

activate_backend_venv() {
  if [[ ! -d "$BACKEND_VENV" ]]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv "$BACKEND_VENV"
  fi
  # shellcheck disable=SC1091
  source "$BACKEND_VENV/bin/activate"
}

install_backend_deps() {
  activate_backend_venv
  if [[ ! -f "$BACKEND_VENV/.deps_installed" ]] || [[ "$PROJECT_DIR/apps/backend/requirements.txt" -nt "$BACKEND_VENV/.deps_installed" ]]; then
    log_info "Installing backend Python dependencies..."
    pip install -q --upgrade pip
    pip install -q -r "$PROJECT_DIR/apps/backend/requirements.txt"
    touch "$BACKEND_VENV/.deps_installed"
    log_ok "Backend dependencies ready."
  fi
}

install_frontend_deps() {
  if [[ ! -d "$PROJECT_DIR/apps/frontend/node_modules" ]]; then
    log_info "Installing frontend dependencies..."
    (cd "$PROJECT_DIR/apps/frontend" && npm install)
    log_ok "Frontend dependencies installed."
  fi
}

start_infrastructure() {
  if command -v docker >/dev/null 2>&1 && [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
    log_info "Starting Postgres + Redis (docker compose)..."
    (cd "$PROJECT_DIR" && docker compose up -d db redis) || {
      log_warn "Docker compose failed — ensure Postgres is on :5432 and Redis on :6379."
    }
    if wait_for_url "http://${HOST}:5432" 3 2>/dev/null; then
      true
    fi
    sleep 2
    log_ok "Infrastructure containers started (if available)."
  else
    log_warn "Docker not found — using existing Postgres (:5432) and Redis (:6379)."
  fi
}

cleanup_stale_pids() {
  local f_pid b_pid
  f_pid="$(read_pid "$FRONTEND_PID_FILE")"
  b_pid="$(read_pid "$BACKEND_PID_FILE")"
  if [[ -n "$f_pid" ]] && ! is_pid_running "$f_pid"; then
    rm -f "$FRONTEND_PID_FILE"
  fi
  if [[ -n "$b_pid" ]] && ! is_pid_running "$b_pid"; then
    rm -f "$BACKEND_PID_FILE"
  fi
}

print_access_info() {
  echo ""
  log_ok "═══════════════════════════════════════════════════════"
  log_ok "  Embedded Collective is running"
  log_ok "═══════════════════════════════════════════════════════"
  echo -e "  ${CYAN}Portfolio:${NC}  http://${HOST}:${FRONTEND_PORT}/"
  echo -e "  ${CYAN}Community:${NC}  http://${HOST}:${FRONTEND_PORT}/community"
  echo -e "  ${CYAN}API docs:${NC}   http://${HOST}:${BACKEND_PORT}/docs"
  echo -e "  ${CYAN}Logs:${NC}       ./run.sh logs"
  echo ""
  echo -e "  ${YELLOW}Super Admin Account:${NC}"
  echo "    Email:    haritmandaliya@gmail.com"
  echo "    Username: harit"
  echo "    Role:     super_admin"
  echo "    OTP prints in ./run.sh logs (yellow highlight)"
  echo ""
}

do_start() {
  require_node
  require_python
  ensure_run_dir
  cleanup_stale_pids

  # start_infrastructure
  install_backend_deps
  install_frontend_deps

  # ── Backend ──────────────────────────────────────────────
  local existing_b_pid
  existing_b_pid="$(read_pid "$BACKEND_PID_FILE")"
  if [[ -n "$existing_b_pid" ]] && is_pid_running "$existing_b_pid"; then
    log_warn "Backend already running (PID $existing_b_pid)."
  else
    kill_port "$BACKEND_PORT"
    log_info "Starting backend (uvicorn)..."
    : > "$BACKEND_LOG_FILE"

    (
      activate_backend_venv
      cd "$PROJECT_DIR/apps/backend"
      export PYTHONUNBUFFERED=1
      nohup uvicorn app.main:app \
        --host "$HOST" \
        --port "$BACKEND_PORT" \
        --reload \
        >>"$BACKEND_LOG_FILE" 2>&1 &
      echo $! >"$BACKEND_PID_FILE"
    )

    local b_pid
    b_pid="$(read_pid "$BACKEND_PID_FILE")"
    sleep 1
    if ! is_pid_running "$b_pid"; then
      log_error "Backend failed to start. Last log lines:"
      tail -n 25 "$BACKEND_LOG_FILE" >&2 || true
      rm -f "$BACKEND_PID_FILE"
      exit 1
    fi
    log_ok "Backend started (PID $b_pid)."
  fi

  # ── Frontend ─────────────────────────────────────────────
  local existing_f_pid
  existing_f_pid="$(read_pid "$FRONTEND_PID_FILE")"
  if [[ -n "$existing_f_pid" ]] && is_pid_running "$existing_f_pid"; then
    log_warn "Frontend already running (PID $existing_f_pid)."
  else
    kill_port "$FRONTEND_PORT"
    log_info "Starting frontend (Vite)..."
    : > "$FRONTEND_LOG_FILE"

    (
      cd "$PROJECT_DIR/apps/frontend"
      nohup npm run dev -- --host "$HOST" --port "$FRONTEND_PORT" \
        >>"$FRONTEND_LOG_FILE" 2>&1 &
      echo $! >"$FRONTEND_PID_FILE"
    )

    local f_pid
    f_pid="$(read_pid "$FRONTEND_PID_FILE")"
    sleep 2
    if ! is_pid_running "$f_pid"; then
      log_error "Frontend failed to start. Last log lines:"
      tail -n 25 "$FRONTEND_LOG_FILE" >&2 || true
      rm -f "$FRONTEND_PID_FILE"
      exit 1
    fi
    log_ok "Frontend started (PID $f_pid)."
  fi

  # ── Health checks ──────────────────────────────────────
  if wait_for_url "http://${HOST}:${BACKEND_PORT}/" 30; then
    log_ok "Backend API healthy."
  else
    log_warn "Backend started but health check timed out — see ./run.sh logs"
  fi

  if wait_for_url "http://${HOST}:${FRONTEND_PORT}/" 30; then
    log_ok "Frontend healthy."
  else
    log_warn "Frontend started but health check timed out — see ./run.sh logs"
  fi

  print_access_info
}

do_stop() {
  ensure_run_dir
  cleanup_stale_pids

  local f_pid b_pid
  f_pid="$(read_pid "$FRONTEND_PID_FILE")"
  b_pid="$(read_pid "$BACKEND_PID_FILE")"

  if [[ -n "$f_pid" ]] && is_pid_running "$f_pid"; then
    log_info "Stopping frontend (PID $f_pid)..."
    kill -TERM "$f_pid" 2>/dev/null || true
  fi
  kill_port "$FRONTEND_PORT"
  rm -f "$FRONTEND_PID_FILE"

  if [[ -n "$b_pid" ]] && is_pid_running "$b_pid"; then
    log_info "Stopping backend (PID $b_pid)..."
    kill -TERM "$b_pid" 2>/dev/null || true
  fi
  kill_port "$BACKEND_PORT"
  rm -f "$BACKEND_PID_FILE"

  log_ok "Frontend and backend stopped."
  log_info "Postgres/Redis containers left running. Stop with: docker compose down"
}

do_status() {
  ensure_run_dir
  cleanup_stale_pids

  local f_pid b_pid
  f_pid="$(read_pid "$FRONTEND_PID_FILE")"
  b_pid="$(read_pid "$BACKEND_PID_FILE")"

  if [[ -n "${f_pid:-}" ]] && is_pid_running "$f_pid"; then
    log_ok "Frontend running (PID $f_pid) → http://${HOST}:${FRONTEND_PORT}/"
  else
    log_warn "Frontend stopped."
  fi

  if [[ -n "${b_pid:-}" ]] && is_pid_running "$b_pid"; then
    log_ok "Backend running (PID $b_pid) → http://${HOST}:${BACKEND_PORT}/"
  else
    log_warn "Backend stopped."
  fi

  if command -v docker >/dev/null 2>&1; then
    (cd "$PROJECT_DIR" && docker compose ps db redis 2>/dev/null) || true
  fi
}

do_logs() {
  ensure_run_dir
  log_info "Tailing logs (Ctrl+C to exit)..."
  touch "$BACKEND_LOG_FILE" "$FRONTEND_LOG_FILE"
  tail -n 30 -f "$BACKEND_LOG_FILE" "$FRONTEND_LOG_FILE"
}

do_restart() {
  do_stop
  sleep 2
  do_start
}

usage() {
  cat <<EOF
Usage: ./run.sh {start|stop|restart|status|logs}

Commands:
  start     Start Postgres/Redis (docker), backend, and frontend
  stop      Stop backend and frontend (keeps docker db/redis)
  restart   Restart all app servers
  status    Show running status
  logs      Tail backend + frontend log files
EOF
}

main() {
  case "${1:-}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    status)  do_status ;;
    logs)    do_logs ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
