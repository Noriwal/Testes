#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
ENV_FILE="$APP_DIR/.env"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
info() { printf '[INFO] %s\n' "$*"; }
warn() { printf '[AVISO] %s\n' "$*" >&2; }
need_root() { [[ ${EUID:-$(id -u)} -eq 0 ]] || die "Execute como root (sudo)."; }
need_cmd() { command -v "$1" >/dev/null 2>&1 || die "Comando ausente: $1"; }
load_env() {
  [[ -f "$ENV_FILE" ]] || die "Arquivo não encontrado: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}
compose() { docker compose --project-directory "$APP_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
worker_args() {
  if [[ "${ENABLE_N8N_WORKER:-false}" == "true" ]]; then printf '%s\n' '--profile' 'worker'; fi
}
compose_up() {
  local args=()
  if [[ "${ENABLE_N8N_WORKER:-false}" == "true" ]]; then args+=(--profile worker); fi
  compose "${args[@]}" up -d --remove-orphans
}
wait_healthy() {
  local timeout="${1:-300}" start now unhealthy
  start=$(date +%s)
  while :; do
    unhealthy=$(compose ps --format json 2>/dev/null | grep -E '"Health":"(starting|unhealthy)"|"State":"(exited|dead)"' || true)
    [[ -z "$unhealthy" ]] && compose ps --services --filter status=running | grep -qx evolution \
      && compose ps --services --filter status=running | grep -qx n8n && return 0
    now=$(date +%s)
    (( now - start < timeout )) || return 1
    sleep 5
  done
}
timestamp() { date +'%Y%m%d-%H%M%S'; }
