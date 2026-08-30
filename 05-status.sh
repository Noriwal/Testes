#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/automation}"
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/scripts/common.sh"
load_env

printf '\nAMBIENTE DE AUTOMAÇÃO\n======================\n'
compose ps
printf '\nRecursos da VPS\n'
printf 'Disco raiz: %s usado | Memória: %s usada\n' "$(df -h / | awk 'NR==2{print $5}')" "$(free | awk '/Mem:/{printf "%.0f%%", $3/$2*100}')"
printf 'Carga: %s\n' "$(cut -d' ' -f1-3 /proc/loadavg)"

for spec in "Evolution:https://$EVOLUTION_DOMAIN" "n8n:https://$N8N_DOMAIN"; do
  IFS=: read -r label scheme rest <<< "$spec"
  url="$scheme:$rest"
  if curl -fsSIL --max-time 10 "$url" >/dev/null; then state='OK'; else state='FALHA'; fi
  expiry=$(echo | openssl s_client -servername "${url#https://}" -connect "${url#https://}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2- || true)
  printf '%-10s %-6s %s | SSL: %s\n' "$label" "$state" "$url" "${expiry:-indisponível}"
done

if systemctl is-active --quiet nginx; then echo 'Nginx: OK'; else echo 'Nginx: FALHA'; fi
if systemctl is-active --quiet fail2ban; then echo 'Fail2ban: OK'; else echo 'Fail2ban: FALHA'; fi
if ufw status | grep -q 'Status: active'; then echo 'UFW: OK'; else echo 'UFW: INATIVO'; fi

