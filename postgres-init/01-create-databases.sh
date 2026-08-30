#!/usr/bin/env bash
set -Eeuo pipefail

required=(EVOLUTION_DB EVOLUTION_DB_USER EVOLUTION_DB_PASSWORD N8N_DB N8N_DB_USER N8N_DB_PASSWORD)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "Variável obrigatória ausente: $name" >&2; exit 1; }
done

# Os nomes são validados porque identificadores SQL não aceitam parâmetros.
for value in "$EVOLUTION_DB" "$EVOLUTION_DB_USER" "$N8N_DB" "$N8N_DB_USER"; do
  [[ "$value" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || { echo "Identificador SQL inválido: $value" >&2; exit 1; }
done

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=ev_user="$EVOLUTION_DB_USER" --set=ev_pass="$EVOLUTION_DB_PASSWORD" \
  --set=n8n_user="$N8N_DB_USER" --set=n8n_pass="$N8N_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'ev_user', :'ev_pass') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'n8n_user', :'n8n_pass') \gexec
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=ev_db="$EVOLUTION_DB" --set=ev_user="$EVOLUTION_DB_USER" \
  --set=n8n_db="$N8N_DB" --set=n8n_user="$N8N_DB_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'ev_db', :'ev_user') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'n8n_db', :'n8n_user') \gexec
SQL

