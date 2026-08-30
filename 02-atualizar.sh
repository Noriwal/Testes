#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/automation}"
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/scripts/common.sh"
need_root; load_env

usage() { echo "Uso: $0 [--evolution VERSAO] [--n8n VERSAO] [--postgres VERSAO] [--redis VERSAO]"; }
declare -A changes=()
while (($#)); do
  case "$1" in
    --evolution|--n8n|--postgres|--redis) [[ $# -ge 2 ]] || die "Versão ausente para $1"; changes["${1#--}"]=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Opção desconhecida: $1" ;;
  esac
done
[[ ${#changes[@]} -gt 0 ]] || die "Informe ao menos uma nova versão."

state="$APP_DIR/rollback/$(timestamp)"
install -d -m 700 "$state"
"$APP_DIR/03-backup.sh" pre-update
cp "$ENV_FILE" "$COMPOSE_FILE" "$state/"
chmod 600 "$state/.env"

for component in "${!changes[@]}"; do
  value=${changes[$component]}
  [[ "$value" =~ ^[A-Za-z0-9._-]+$ ]] || die "Tag inválida: $value"
  key="${component^^}_VERSION"
  sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
done
load_env
compose config --quiet

if ! compose pull; then
  cp "$state/.env" "$ENV_FILE"
  die "Falha ao baixar imagens; configuração anterior restaurada."
fi
compose_up
if ! wait_healthy 420; then
  warn "Atualização falhou na verificação; iniciando rollback."
  "$APP_DIR/06-rollback.sh" "$state" --yes
  exit 1
fi
ln -sfn "$state" "$APP_DIR/rollback/latest"
info "Atualização concluída. Estado anterior: $state"

