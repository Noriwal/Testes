#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
source "$SCRIPT_DIR/scripts/common.sh"
load_env

printf '\nAMBIENTE DE AUTOMAÇÃO\n======================\n'
compose --profile https ps
printf '\nRecursos do servidor\n'
if command -v df >/dev/null 2>&1; then
  printf 'Disco raiz: %s usado\n' "$(df -h / | awk 'NR==2{print $5}')"
fi

check_url() {
  local label=$1 url=$2 state
  if curl -fsSIL --max-time 10 "$url" >/dev/null; then state='OK'; else state='FALHA'; fi
  printf '%-10s %-6s %s\n' "$label" "$state" "$url"
}

check_url "DuckDNS" "http://${N8N_DOMAIN}/"
check_url "n8n" "https://${N8N_DOMAIN}/"
check_url "Evolution" "${EVOLUTION_PUBLIC_URL:-http://evolution.localhost}"
