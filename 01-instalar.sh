#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR="${APP_DIR:-/opt/automation}"
# shellcheck source=scripts/common.sh
source "$SOURCE_DIR/scripts/common.sh"
need_root

export DEBIAN_FRONTEND=noninteractive
[[ -r /etc/os-release ]] || die "Distribuição Linux não identificada."
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" =~ ^(ubuntu|debian)$ ]] || die "Suportado apenas em Ubuntu/Debian."

read_required() {
  local prompt=$1 var=$2 value
  value="${!var:-}"
  while [[ -z "$value" ]]; do read -r -p "$prompt: " value; done
  printf -v "$var" '%s' "$value"
}
valid_domain() { [[ "$1" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,63}$ ]]; }
rand_hex() { openssl rand -hex "$1"; }
env_set() {
  local key=$1 value=$2 file=$3 escaped
  escaped=${value//&/\\&}
  if grep -qE "^${key}=" "$file"; then sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"; else printf '%s=%s\n' "$key" "$value" >> "$file"; fi
}

[[ ! -e "$APP_DIR/.env" ]] || die "Instalação existente em $APP_DIR. Faça backup e use 02-atualizar.sh."
(( $(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo) >= 3500 )) || warn "Menos de 3,5 GB de RAM; ajuste os limites ou adicione swap."
(( $(df -Pm / | awk 'NR==2{print $4}') >= 10240 )) || die "São necessários pelo menos 10 GB livres."
for port in 80 443 5678 8080; do
  if ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then
    [[ "$port" == 80 || "$port" == 443 ]] && die "Porta $port já está em uso." || die "Porta local $port já está em uso."
  fi
done

apt-get update
apt-get install -y ca-certificates curl openssl nginx certbot python3-certbot-nginx ufw fail2ban dnsutils cron rsync
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
  "$(dpkg --print-architecture)" "$ID" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker nginx fail2ban cron
timedatectl set-timezone America/Sao_Paulo

read_required "Domínio da Evolution API" EVOLUTION_DOMAIN
read_required "Domínio do n8n" N8N_DOMAIN
read_required "E-mail para Let's Encrypt" LETSENCRYPT_EMAIL
valid_domain "$EVOLUTION_DOMAIN" || die "Domínio inválido: $EVOLUTION_DOMAIN"
valid_domain "$N8N_DOMAIN" || die "Domínio inválido: $N8N_DOMAIN"
[[ "$LETSENCRYPT_EMAIL" == *@*.* ]] || die "E-mail inválido."

public_ip=$(curl -4fsS --max-time 10 https://api.ipify.org || true)
for domain in "$EVOLUTION_DOMAIN" "$N8N_DOMAIN"; do
  resolved=$(dig +short A "$domain" | tail -n1)
  [[ -n "$resolved" ]] || die "$domain não possui registro DNS A."
  [[ -z "$public_ip" || "$resolved" == "$public_ip" ]] || die "$domain aponta para $resolved, mas esta VPS aparenta usar $public_ip."
done

install -d -m 750 "$APP_DIR" "$APP_DIR/backups" "$APP_DIR/rollback"
cp "$SOURCE_DIR/docker-compose.yml" "$APP_DIR/"
cp -a "$SOURCE_DIR/postgres-init" "$SOURCE_DIR/scripts" "$APP_DIR/"
cp "$SOURCE_DIR"/0*.sh "$APP_DIR/"
cp "$SOURCE_DIR/.env.example" "$APP_DIR/.env"
env_set EVOLUTION_DOMAIN "$EVOLUTION_DOMAIN" "$APP_DIR/.env"
env_set N8N_DOMAIN "$N8N_DOMAIN" "$APP_DIR/.env"
env_set LETSENCRYPT_EMAIL "$LETSENCRYPT_EMAIL" "$APP_DIR/.env"
env_set POSTGRES_SUPERUSER_PASSWORD "$(rand_hex 32)" "$APP_DIR/.env"
env_set EVOLUTION_DB_PASSWORD "$(rand_hex 32)" "$APP_DIR/.env"
env_set N8N_DB_PASSWORD "$(rand_hex 32)" "$APP_DIR/.env"
env_set EVOLUTION_API_KEY "$(rand_hex 32)" "$APP_DIR/.env"
env_set N8N_ENCRYPTION_KEY "$(rand_hex 32)" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
chmod 750 "$APP_DIR"/*.sh "$APP_DIR"/scripts/*.sh "$APP_DIR"/postgres-init/*.sh

for pair in "evolution:$EVOLUTION_DOMAIN:8080" "n8n:$N8N_DOMAIN:5678"; do
  IFS=: read -r name domain port <<< "$pair"
  cat > "/etc/nginx/sites-available/$name" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $domain;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:$port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
    }
}
EOF
  ln -sfn "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
done
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

load_env
compose config --quiet
compose_up
wait_healthy 360 || { compose ps; die "Serviços não ficaram saudáveis; consulte docker compose logs."; }
certbot --nginx --non-interactive --agree-tos --redirect --email "$LETSENCRYPT_EMAIL" -d "$EVOLUTION_DOMAIN" -d "$N8N_DOMAIN"
systemctl enable --now certbot.timer 2>/dev/null || true

cat > /etc/cron.d/automation-backup <<EOF
17 3 * * * root $APP_DIR/03-backup.sh daily >> /var/log/automation-backup.log 2>&1
37 3 * * 0 root $APP_DIR/03-backup.sh weekly >> /var/log/automation-backup.log 2>&1
57 3 1 * * root $APP_DIR/03-backup.sh monthly >> /var/log/automation-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/automation-backup

info "Instalação concluída. Evolution: https://$EVOLUTION_DOMAIN | n8n: https://$N8N_DOMAIN"
info "Credenciais protegidas em $APP_DIR/.env (modo 600)."
