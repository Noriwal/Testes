# Evolution API + n8n — ambiente Docker local

Ambiente autocontido para executar Evolution API, n8n, PostgreSQL, Redis e Nginx com Docker Compose. PostgreSQL e Redis permanecem em uma rede interna; apenas o Nginx publica portas no computador.

## Requisitos

- Docker Desktop ou Docker Engine com Compose v2.
- Recomendado: 6 GB de RAM disponíveis para os containers.
- Linux, macOS ou Windows com WSL/Git Bash para os scripts Bash.

## Início rápido

```bash
chmod +x 0*.sh scripts/*.sh postgres-init/*.sh
./01-instalar.sh
```

O instalador cria `.env`, gera senhas/chaves aleatórias e inicia todos os containers. Depois acesse:

- Evolution API: `http://evolution.localhost`
- n8n: `http://n8n.localhost`

Os domínios `*.localhost` normalmente resolvem automaticamente para `127.0.0.1`. Se isso não ocorrer, acrescente ao arquivo `hosts`:

```text
127.0.0.1 evolution.localhost n8n.localhost
```

No Windows, o arquivo é `C:\Windows\System32\drivers\etc\hosts`.

## Serviços

```text
Internet/host → Nginx :80/:443
                    ├── evolution:8080
                    └── n8n:5678

Evolution/n8n → PostgreSQL + Redis (rede interna)
```

Evolution e n8n possuem rede de saída para webhooks e APIs externas. PostgreSQL e Redis não publicam portas e não participam dessa rede.

## Operação

```bash
./05-status.sh
./03-backup.sh daily
./03-backup.sh weekly
./03-backup.sh monthly
./04-restaurar.sh ./backups/daily/AAAAMMDD-HHMMSS
```

Parar e iniciar diretamente:

```bash
docker compose down
docker compose up -d
docker compose logs -f --tail=200
```

Os volumes persistem ao executar `docker compose down`. O comando `docker compose down -v` apaga todos os bancos e dados persistentes; use somente quando realmente quiser reiniciar do zero.

## Worker e queue mode

Altere `.env`:

```dotenv
ENABLE_N8N_WORKER=true
N8N_EXECUTIONS_MODE=queue
```

Depois execute:

```bash
docker compose --profile worker up -d
```

## Atualização e rollback

```bash
./02-atualizar.sh --evolution vX.Y.Z --n8n X.Y.Z
./02-atualizar.sh --postgres 16.x-alpine --redis 7.x-alpine
./06-rollback.sh
```

A atualização cria backup e registra o estado anterior. Não altere apenas a tag para fazer upgrade de versão principal do PostgreSQL; use dump/restore em um banco novo.

## HTTPS e Certbot

O modo local usa HTTP porque o Let's Encrypt não emite certificados para `localhost`. O container Certbot está disponível no perfil `ssl` para uma futura publicação com domínios reais:

```bash
docker compose --profile ssl run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email voce@dominio.com --agree-tos --no-eff-email \
  -d evolution.seudominio.com -d n8n.seudominio.com
```

Para uso público, altere os domínios e `PUBLIC_SCHEME=https` no `.env` e acrescente os blocos TLS ao template do Nginx apontando para os certificados no volume `/etc/letsencrypt`. Não use certificados públicos com os nomes `.localhost`.

## Arquivos importantes

- `.env.example`: versões, domínios, portas e limites.
- `docker-compose.yml`: toda a infraestrutura em containers.
- `nginx/templates/default.conf.template`: proxy reverso local.
- `postgres-init/01-create-databases.sh`: bancos/usuários separados.
- `01-instalar.sh`: preparação e inicialização local.
- `02-atualizar.sh` a `06-rollback.sh`: manutenção e recuperação.

Nunca publique o arquivo `.env`. O `.gitignore` já exclui segredos, backups e estados de rollback.
