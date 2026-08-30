#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/automation}"
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/scripts/common.sh"
need_root

state="${1:-$APP_DIR/rollback/latest}"
auto="${2:-}"
[[ -d "$state" && -f "$state/.env" && -f "$state/docker-compose.yml" ]] || die "Estado de rollback inválido: $state"
if [[ "$auto" != --yes ]]; then
  printf 'Restaurar versões/configuração de %s? Digite ROLLBACK: ' "$state"
  read -r answer
  [[ "$answer" == ROLLBACK ]] || die "Cancelado."
fi
cp "$state/.env" "$ENV_FILE"
cp "$state/docker-compose.yml" "$COMPOSE_FILE"
chmod 600 "$ENV_FILE"
load_env
compose config --quiet
compose pull
compose_up
wait_healthy 420 || die "Rollback aplicado, mas serviços não ficaram saudáveis. Use 05-status.sh e consulte os logs."
info "Rollback de versões/configuração concluído. Bancos não foram alterados."

