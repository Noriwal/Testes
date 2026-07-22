# Projeto Nexus Backend
https://testes-bxae.onrender.com/

## Descrição

Este projeto é uma API backend desenvolvida em Node.js com Express, projetada para simular um sistema complexo que integra funcionalidades de autenticação de usuários, conformidade com a LGPD (Lei Geral de Proteção de Dados), um módulo de e-commerce e um sistema de fórum. Ele também demonstra a integração com a ferramenta de automação n8n para orquestração de fluxos de trabalho.

## Funcionalidades

*   **Autenticação de Usuários:** Registro, login, gerenciamento de perfil e redefinição de senha com JWT.
*   **Conformidade com a LGPD:** Exportação de dados do usuário e funcionalidade de exclusão de conta com anonimização de dados.
*   **Módulo de Fórum:** Criação, listagem e visualização de posts, com suporte a comentários aninhados.
*   **Módulo de E-commerce:** Gerenciamento de produtos (digitais e físicos), criação de pedidos, carrinho de compras e avaliações de produtos.
*   **Integração com n8n:** Disparo de webhooks para eventos como registro de usuário, criação de posts no fórum, novos pedidos e solicitações de redefinição de senha.
*   **Logs de Acesso:** Registro de ações importantes dos usuários para auditoria.

## Tecnologias Utilizadas

*   **Node.js:** Ambiente de execução JavaScript.
*   **Express.js:** Framework web para Node.js.
*   **SQLite3:** Banco de dados relacional leve.
*   **bcryptjs:** Biblioteca para hash de senhas.
*   **jsonwebtoken (JWT):** Para autenticação baseada em tokens.
*   **cors:** Middleware para habilitar o CORS.
*   **dotenv:** Para carregar variáveis de ambiente.
*   **n8n:** Ferramenta de automação de fluxo de trabalho (integração via webhooks).

## Estrutura do Projeto

```
. 
├── Keys.env             # Variáveis de ambiente (exemplo)
├── app.js               # Configurações adicionais do Express (se houver)
├── database.js          # Configuração e esquema do banco de dados SQLite
├── index.html           # Página HTML de exemplo (frontend)
├── package.json         # Metadados do projeto e dependências
├── server.js            # Lógica principal da API, rotas e middlewares
└── workflow-cadastro.json # Exemplo de workflow do n8n
```

## Como Rodar o Projeto

### Pré-requisitos

*   Node.js (versão 14 ou superior)
*   npm ou yarn

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/Noriwal/Testes.git
    cd Testes
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
PORT=3000
JWT_SECRET=seu_segredo_jwt_aqui
N8N_WEBHOOK_URL=sua_url_webhook_n8n_aqui # Opcional, para integração com n8n
```

### Scripts Disponíveis

*   `npm start`: Inicia o servidor em modo de produção.
*   `npm dev`: Inicia o servidor em modo de desenvolvimento com `nodemon` (para recarregamento automático).

## Endpoints da API

A API expõe os seguintes grupos de endpoints:

### Autenticação (`/api/auth`)

*   `POST /api/auth/register`: Registra um novo usuário.
*   `POST /api/auth/login`: Realiza o login do usuário e retorna um token JWT.
*   `GET /api/auth/me`: Retorna os dados do usuário logado (requer token JWT).
*   `POST /api/auth/forgot-password`: Inicia o processo de redefinição de senha.
*   `POST /api/auth/reset-password`: Redefine a senha do usuário com um token válido.

### LGPD (`/api/lgpd`)

*   `GET /api/lgpd/export`: Exporta todos os dados do usuário logado (requer token JWT).
*   `DELETE /api/lgpd/delete-account`: Exclui a conta do usuário logado, anonimizando seus dados (requer token JWT e senha).

### Fórum (`/api/forum`)

*   `GET /api/forum/posts`: Lista todos os posts do fórum.
*   `POST /api/forum/posts`: Cria um novo post (requer token JWT).
*   `GET /api/forum/posts/:id/comments`: Lista os comentários de um post específico.
*   `POST /api/forum/posts/:id/comments`: Adiciona um comentário a um post (requer token JWT).

### Loja (`/api/products`, `/api/orders`, `/api/cart`, `/api/reviews`)

*   `GET /api/products`: Lista todos os produtos disponíveis.
*   `GET /api/products/:id`: Retorna detalhes de um produto específico.
*   `POST /api/orders`: Cria um novo pedido (requer token JWT).
*   `GET /api/orders/my`: Lista os pedidos do usuário logado (requer token JWT).
*   `POST /api/cart`: Adiciona um produto ao carrinho (requer token JWT).
*   `GET /api/cart`: Lista os itens no carrinho do usuário (requer token JWT).
*   `DELETE /api/cart/:id`: Remove um item do carrinho (requer token JWT).
*   `POST /api/reviews`: Adiciona uma avaliação a um produto (requer token JWT).

### Administração (`/api/admin`)

*   `GET /api/admin/users`: Lista todos os usuários (sem autenticação de admin explícita no `server.js` lido, mas a rota existe).

### Saúde (`/api/health`)

*   `GET /api/health`: Retorna o status de saúde da API.

## Conformidade com a LGPD

O projeto inclui funcionalidades para auxiliar na conformidade com a LGPD, permitindo que os usuários:

*   **Exportem seus dados:** Através do endpoint `/api/lgpd/export`.
*   **Excluam suas contas:** Através do endpoint `/api/lgpd/delete-account`, que anonimiza os dados do usuário em vez de excluí-los permanentemente para manter a integridade referencial de posts e pedidos.

## Integração com n8n

A API utiliza webhooks para se integrar com a ferramenta de automação n8n. Eventos como registro de novos usuários, criação de posts no fórum, novos pedidos e solicitações de redefinição de senha disparam webhooks para uma URL configurável (`N8N_WEBHOOK_URL`). Isso permite a criação de fluxos de trabalho automatizados no n8n, como envio de e-mails de boas-vindas, notificações de pedidos, etc.

Um exemplo de workflow do n8n para cadastro de usuário pode ser encontrado em `workflow-cadastro.json`.
