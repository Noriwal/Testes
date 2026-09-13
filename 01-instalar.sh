#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$APP_DIR/scripts/common.sh"

need_cmd docker
docker info >/dev/null 2>&1 || die "Docker não está em execução. Inicie o Docker Desktop/Engine."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 não está disponível."

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$APP_DIR/.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE" 2>/dev/null || true
fi

env_set() {
  local key=$1 value=$2 escaped
  escaped=${value//&/\\&}
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}
random_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  else docker run --rm alpine:3.21 sh -c 'head -c 32 /dev/urandom | od -An -tx1 | tr -d " \n"'; fi
}

for key in POSTGRES_SUPERUSER_PASSWORD EVOLUTION_DB_PASSWORD N8N_DB_PASSWORD EVOLUTION_API_KEY N8N_ENCRYPTION_KEY; do
  current=$(grep -E "^${key}=" "$ENV_FILE" | cut -d= -f2- || true)
  [[ -n "$current" && "$current" != CHANGE_ME ]] || env_set "$key" "$(random_secret)"
done

load_env
[[ -n "${DUCKDNS_TOKEN:-}" && "$DUCKDNS_TOKEN" != CHANGE_ME ]] || \
  die "Preencha DUCKDNS_TOKEN no arquivo .env e execute novamente."
[[ -n "${LETSENCRYPT_EMAIL:-}" && "$LETSENCRYPT_EMAIL" != admin@example.com ]] || \
  die "Preencha LETSENCRYPT_EMAIL no arquivo .env e execute novamente."

mkdir -p "$APP_DIR/backups" "$APP_DIR/rollback"
compose config --quiet
compose_up
wait_healthy 420 || { compose --profile https ps; die "Os containers não ficaram saudáveis. Consulte: docker compose logs"; }

info "Serviços internos e DuckDNS prontos."
if compose --profile https ps --services --filter status=running | grep -qx nginx; then
  info "n8n: https://${N8N_DOMAIN}/"
else
  info "Próximo passo: encaminhe as portas 80 e 443 no roteador e execute ./07-configurar-https.sh"
fi
info "API key e chaves estão no arquivo .env; não o publique."
