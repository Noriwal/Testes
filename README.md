# Evolution API + n8n — Docker local com DuckDNS e HTTPS

Ambiente para executar Evolution API, n8n, PostgreSQL, Redis, DuckDNS, Nginx e Certbot com Docker Compose. PostgreSQL e Redis permanecem em rede interna. O n8n é publicado em `https://noriwal.duckdns.org`; a Evolution permanece local por enquanto.

## Requisitos

- Docker Desktop ou Docker Engine com Compose v2.
- Recomendado: 6 GB de RAM disponíveis para os containers.
- Linux, macOS ou Windows com WSL/Git Bash para os scripts Bash.
- O domínio `noriwal.duckdns.org` criado no DuckDNS.
- IPv4 público no roteador, sem CGNAT.
- Portas TCP 80 e 443 encaminhadas para o IP local do computador Docker.
- Portas TCP 80 e 443 liberadas no Firewall do Windows.

Nunca publique o arquivo `.env`. O `.gitignore` já exclui segredos, backups e estados de rollback.

## Preparação

Na raiz do repositório:

~~~bash
cp .env.example .env
~~~

Abra `.env` e preencha estes dois valores:

~~~dotenv
DUCKDNS_TOKEN=TOKEN_REAL_DO_DUCKDNS
LETSENCRYPT_EMAIL=SEU_EMAIL_REAL
~~~

O token do DuckDNS funciona como uma senha. Não envie o token em mensagens e não o coloque em `.env.example`.

## Portas no roteador

Crie dois encaminhamentos TCP para o IPv4 local fixo do computador que executa o Docker Desktop:

| Porta externa | IP de destino | Porta interna |
|---:|---|---:|
| 80 | IPv4 local do computador | 80 |
| 443 | IPv4 local do computador | 443 |

Teste a publicação usando a internet móvel do celular, com o Wi-Fi desligado. Alguns roteadores não suportam testar o próprio endereço público a partir da rede interna.

## Instalação

~~~bash
chmod +x 0*.sh scripts/*.sh postgres-init/*.sh
./01-instalar.sh
~~~

O instalador:

- gera as senhas e chaves locais marcadas como `CHANGE_ME`;
- inicia PostgreSQL, Redis, Evolution, n8n e DuckDNS;
- não inicia o Nginx antes de o certificado existir.

Depois de confirmar o encaminhamento das portas 80 e 443, emita o certificado e ative o Nginx:

~~~bash
./07-configurar-https.sh
~~~

Ao finalizar:

- n8n: `https://noriwal.duckdns.org/`
- MCP do n8n: `https://noriwal.duckdns.org/mcp-server/http`
- Evolution local: `http://evolution.localhost/`

Se `evolution.localhost` não resolver no Windows, acrescente ao arquivo `C:\Windows\System32\drivers\etc\hosts`:

~~~text
127.0.0.1 evolution.localhost
~~~

## Como a publicação funciona

~~~text
Internet/Render -> DuckDNS -> roteador :80/:443 -> Windows/Docker -> Nginx
                                                                  -> n8n:8080

Evolution e n8n -> PostgreSQL + Redis na rede interna
~~~

A porta 8080 do n8n é apenas interna. PostgreSQL 5432, Redis 6379 e n8n 8080 não são publicados no roteador.

## Renovação do certificado

Execute periodicamente:

~~~bash
./08-renovar-https.sh
~~~

O script verifica a renovação pelo Certbot e recarrega o Nginx. No Windows, ele pode ser agendado mensalmente pelo Agendador de Tarefas, executando o Git Bash dentro da pasta do projeto.

## Estado e logs

~~~bash
./05-status.sh
docker compose logs -f --tail=200
docker compose logs --tail=50 duckdns
docker compose --profile https logs --tail=100 nginx
~~~

## Worker e queue mode

Altere `.env`:

~~~dotenv
ENABLE_N8N_WORKER=true
N8N_EXECUTIONS_MODE=queue
~~~

Depois execute:

~~~bash
docker compose --profile worker up -d
~~~

## Backup, restauração e atualização

~~~bash
./03-backup.sh daily
./03-backup.sh weekly
./03-backup.sh monthly
./04-restaurar.sh ./backups/daily/AAAAMMDD-HHMMSS
./02-atualizar.sh --evolution vX.Y.Z --n8n X.Y.Z
./06-rollback.sh
~~~

Os volumes persistem com `docker compose down`. O comando `docker compose down -v` apaga os bancos e dados persistentes e só deve ser usado quando a intenção for reiniciar tudo do zero.

## Arquivos importantes

- `.env.example`: modelo público sem segredos reais.
- `docker-compose.yml`: infraestrutura em containers.
- `nginx/templates/default.conf.template`: proxy reverso e HTTPS.
- `01-instalar.sh`: preparação dos serviços internos.
- `07-configurar-https.sh`: primeira emissão e ativação do HTTPS.
- `08-renovar-https.sh`: renovação do certificado.
- `postgres-init/01-create-databases.sh`: criação dos bancos e usuários.
- `02-atualizar.sh` a `06-rollback.sh`: manutenção e recuperação.
