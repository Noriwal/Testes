#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/automation}"
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/scripts/common.sh"
need_root; need_cmd docker; load_env

tier="${1:-daily}"
[[ "$tier" =~ ^(daily|weekly|monthly|pre-update)$ ]] || die "Uso: $0 [daily|weekly|monthly|pre-update]"
stamp=$(timestamp)
target="${BACKUP_DIR:-$APP_DIR/backups}/$tier/$stamp"
install -d -m 700 "$target"
info "Criando backup em $target"

compose exec -T postgres pg_dump -U "$POSTGRES_SUPERUSER" -Fc "$EVOLUTION_DB" > "$target/evolution_db.dump"
compose exec -T postgres pg_dump -U "$POSTGRES_SUPERUSER" -Fc "$N8N_DB" > "$target/n8n_db.dump"
compose exec -T postgres pg_dumpall -U "$POSTGRES_SUPERUSER" --globals-only > "$target/postgres_globals.sql"
cp "$ENV_FILE" "$COMPOSE_FILE" "$target/"
chmod 600 "$target/.env" "$target"/*
compose images --format json > "$target/images.json" 2>/dev/null || true
tar -C "$APP_DIR" -czf "$target/configuration.tar.gz" postgres-init scripts 0*.sh

case "$tier" in
  daily) keep="${BACKUP_DAILY_RETENTION:-7}" ;;
  weekly) keep="${BACKUP_WEEKLY_RETENTION:-4}" ;;
  monthly) keep="${BACKUP_MONTHLY_RETENTION:-6}" ;;
  pre-update) keep=5 ;;
esac
base="${BACKUP_DIR:-$APP_DIR/backups}/$tier"
mapfile -t old < <(find "$base" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +$((keep + 1)) | cut -d' ' -f2-)
for path in "${old[@]}"; do [[ "$path" == "$base"/* ]] && rm -rf -- "$path"; done
ln -sfn "$target" "${BACKUP_DIR:-$APP_DIR/backups}/latest-$tier"
info "Backup concluído: $target"

