#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
source "$SCRIPT_DIR/scripts/common.sh"
load_env

printf '\nAMBIENTE DE AUTOMAÇÃO\n======================\n'
compose ps
printf '\nRecursos da VPS\n'
printf 'Disco raiz: %s usado | Memória: %s usada\n' "$(df -h / | awk 'NR==2{print $5}')" "$(free | awk '/Mem:/{printf "%.0f%%", $3/$2*100}')"
printf 'Carga: %s\n' "$(cut -d' ' -f1-3 /proc/loadavg)"

for spec in "Evolution:${PUBLIC_SCHEME:-http}://$EVOLUTION_DOMAIN" "n8n:${PUBLIC_SCHEME:-http}://$N8N_DOMAIN"; do
  IFS=: read -r label scheme rest <<< "$spec"
  url="$scheme:$rest"
  if curl -fsSIL --max-time 10 "$url" >/dev/null; then state='OK'; else state='FALHA'; fi
  printf '%-10s %-6s %s\n' "$label" "$state" "$url"
done
