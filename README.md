# Evolution API + n8n em VPS

Pacote de instalação para Ubuntu/Debian com Evolution API, n8n, PostgreSQL, Redis, Nginx, HTTPS, firewall, Fail2ban, backups e rollback. PostgreSQL e Redis ficam somente na rede Docker interna; Evolution e n8n também participam de uma rede de saída, escutam no host exclusivamente em `127.0.0.1` e são publicados pelo Nginx.

> Leia antes de executar. Teste primeiro em uma VPS descartável e mantenha um backup externo. As tags em `.env.example` são pontos de partida configuráveis: confirme a compatibilidade das versões desejadas antes da instalação.

## Requisitos

- Ubuntu 22.04/24.04 ou Debian 12, acesso root e arquitetura suportada pelas imagens.
- Recomendado: 4 vCPU, 6 GB RAM, 30 GB livres. O instalador exige 10 GB livres e avisa abaixo de 3,5 GB RAM.
- Dois registros DNS A já apontando para o IPv4 público da VPS.
- Portas 22, 80 e 443 acessíveis. As portas 5678 e 8080 não devem ser publicadas.
- O SSH deve estar funcional antes de ativar o UFW.

## Instalação

Copie a pasta para a VPS, revise `.env.example` e execute:

```bash
chmod +x 0*.sh scripts/*.sh postgres-init/*.sh
sudo ./01-instalar.sh
```

O instalador solicita os dois domínios e o e-mail do Let's Encrypt, valida recursos, portas e DNS, instala dependências, gera segredos, cria `/opt/automation`, sobe os serviços, espera os healthchecks e emite o certificado. O `.env` gerado recebe permissão `600`.

URLs finais:

- `https://evolution.seudominio.tld`
- `https://n8n.seudominio.tld`

A API key da Evolution fica em `/opt/automation/.env`. Guarde uma cópia segura fora da VPS. A chave de criptografia do n8n nunca deve ser perdida.

## Worker e queue mode

Por padrão o n8n usa execução regular. Para ativar um worker, altere no `.env`:

```dotenv
ENABLE_N8N_WORKER=true
N8N_EXECUTIONS_MODE=queue
```

Depois aplique:

```bash
cd /opt/automation
sudo docker compose --profile worker up -d
```

Para desativar, volte aos valores `false` e `regular` e execute `sudo docker compose up -d --remove-orphans`.

## Operação

```bash
sudo /opt/automation/03-backup.sh daily
sudo /opt/automation/03-backup.sh weekly
sudo /opt/automation/03-backup.sh monthly
sudo /opt/automation/05-status.sh
```

Os agendamentos diário, semanal (domingo) e mensal (dia 1) são criados em `/etc/cron.d/automation-backup`. A retenção padrão é 7 backups diários, 4 semanais e 6 mensais. Para redundância real, sincronize `/opt/automation/backups` com armazenamento externo; este pacote não envia dados para terceiros.

Restauração destrutiva dos dois bancos:

```bash
sudo /opt/automation/04-restaurar.sh /opt/automation/backups/daily/AAAAMMDD-HHMMSS
```

## Atualização e rollback

Informe explicitamente as novas tags. O script faz backup, guarda o estado, baixa imagens, aplica e aguarda saúde. Em falha, restaura automaticamente as versões/configuração anteriores.

```bash
sudo /opt/automation/02-atualizar.sh --evolution vX.Y.Z --n8n X.Y.Z
sudo /opt/automation/02-atualizar.sh --postgres 16.x-alpine --redis 7.x-alpine
sudo /opt/automation/06-rollback.sh
```

O rollback automático restaura imagens/configuração, não os bancos. Se uma atualização executou migrações incompatíveis, use também `04-restaurar.sh` com o backup `pre-update`. Atualizações de versão principal do PostgreSQL exigem procedimento próprio (`pg_dump`/restore em instância nova); não troque apenas a tag.

## Segurança e manutenção

- UFW libera `OpenSSH` e `Nginx Full`. Confirme a porta SSH caso use uma porta personalizada antes da instalação.
- Fail2ban é habilitado com a configuração padrão da distribuição.
- Logs Docker usam rotação de 10 MB × 5 arquivos por serviço.
- Limites de CPU/RAM são configuráveis no `.env` e devem ser ajustados à carga real.
- O Certbot instala redirecionamento HTTPS e usa seu timer de renovação.
- Não coloque `.env`, dumps ou chaves em Git. Restrinja acesso ao diretório `/opt/automation`.
- Faça testes periódicos de restauração; backup não testado não é garantia de recuperação.

## Arquivos

- `01-instalar.sh`: validação, instalação, hardening básico e HTTPS.
- `02-atualizar.sh`: atualização versionada com backup e rollback automático.
- `03-backup.sh`: dumps PostgreSQL, configuração e retenção.
- `04-restaurar.sh`: restauração confirmada dos bancos.
- `05-status.sh`: containers, URLs, SSL, recursos e serviços do host.
- `06-rollback.sh`: retorno às tags/configuração anteriores.
- `docker-compose.yml`: serviços, healthchecks, rede interna, volumes e limites.
- `postgres-init/01-create-databases.sh`: usuários e bancos separados no primeiro boot.

## Diagnóstico

```bash
cd /opt/automation
sudo docker compose ps
sudo docker compose logs --tail=200 evolution n8n postgres redis
sudo nginx -t
sudo certbot renew --dry-run
```
