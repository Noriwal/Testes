#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
source "$APP_DIR/scripts/common.sh"
load_env

info "Verificando renovação do certificado..."
compose --profile ssl-tools run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot \
  --quiet

if compose --profile https ps --services --filter status=running | grep -qx nginx; then
  compose --profile https exec -T nginx nginx -s reload
  info "Nginx recarregado."
else
  warn "Nginx não está em execução; inicie com: docker compose --profile https up -d nginx"
fi

info "Verificação de renovação concluída."
