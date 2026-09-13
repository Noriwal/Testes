#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
source "$APP_DIR/scripts/common.sh"

need_cmd docker
need_cmd curl
load_env

[[ -n "${N8N_DOMAIN:-}" && "$N8N_DOMAIN" != *.localhost ]] || \
  die "Defina N8N_DOMAIN com um domínio público no arquivo .env."
[[ -n "${DUCKDNS_SUBDOMAIN:-}" ]] || die "Defina DUCKDNS_SUBDOMAIN no arquivo .env."
[[ -n "${DUCKDNS_TOKEN:-}" && "$DUCKDNS_TOKEN" != CHANGE_ME ]] || \
  die "Preencha DUCKDNS_TOKEN no arquivo .env. Não publique esse token."
[[ -n "${LETSENCRYPT_EMAIL:-}" && "$LETSENCRYPT_EMAIL" != admin@example.com ]] || \
  die "Preencha LETSENCRYPT_EMAIL com seu e-mail real no arquivo .env."

info "Iniciando serviços internos e atualizador DuckDNS..."
compose up -d postgres redis evolution n8n duckdns

if [[ "${ENABLE_N8N_WORKER:-false}" == "true" ]]; then
  compose --profile worker up -d n8n-worker
fi

info "Aguardando a primeira atualização do DuckDNS..."
sleep 15
compose logs --tail=30 duckdns

info "Parando o Nginx temporariamente para a validação do Let's Encrypt..."
compose --profile https stop nginx >/dev/null 2>&1 || true

info "Emitindo certificado para $N8N_DOMAIN. A porta 80 deve estar encaminhada no roteador."
compose --profile ssl-tools run --rm --service-ports certbot certonly \
  --standalone \
  --preferred-challenges http \
  --non-interactive \
  --agree-tos \
  --no-eff-email \
  --keep-until-expiring \
  --email "$LETSENCRYPT_EMAIL" \
  -d "$N8N_DOMAIN"

info "Iniciando Nginx com HTTPS..."
compose --profile https up -d nginx

for _ in {1..24}; do
  if curl -fsSIL --max-time 10 "https://$N8N_DOMAIN/" >/dev/null; then
    info "HTTPS ativo: https://$N8N_DOMAIN/"
    info "MCP do n8n: https://$N8N_DOMAIN/mcp-server/http"
    exit 0
  fi
  sleep 5
done

compose --profile https ps
die "O certificado foi emitido, mas o HTTPS não respondeu. Consulte: docker compose --profile https logs nginx"
