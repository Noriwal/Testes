#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/automation}"
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/scripts/common.sh"
need_root; load_env

backup="${1:-}"
[[ -n "$backup" && -d "$backup" ]] || die "Uso: $0 /caminho/do/backup"
for f in evolution_db.dump n8n_db.dump; do [[ -s "$backup/$f" ]] || die "Backup incompleto: $f"; done
printf 'Esta operação substitui os dois bancos atuais. Digite RESTAURAR: '
read -r answer
[[ "$answer" == RESTAURAR ]] || die "Cancelado."

"$APP_DIR/03-backup.sh" pre-update
compose stop evolution n8n n8n-worker 2>/dev/null || true
for spec in "$EVOLUTION_DB:evolution_db.dump:$EVOLUTION_DB_USER" "$N8N_DB:n8n_db.dump:$N8N_DB_USER"; do
  IFS=: read -r db dump owner <<< "$spec"
  [[ "$db" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ && "$owner" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || die "Identificador SQL inválido no .env."
  compose exec -T postgres psql -U "$POSTGRES_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$db' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"$db\";" -c "CREATE DATABASE \"$db\" OWNER \"$owner\";"
  compose exec -T postgres pg_restore -U "$POSTGRES_SUPERUSER" -d "$db" --no-owner --role="$owner" < "$backup/$dump"
done
compose_up
wait_healthy 360 || die "Restauração feita, mas os serviços não ficaram saudáveis."
info "Restauração concluída."
