# Direção de design — Guia Nashville NA 2200 PRO

## Três abordagens iniciais

| Tema | Breve introdução | Probabilidade |
|---|---|---:|
| Arquivo de Bancada | Um manual técnico envelhecido, inspirado em fichas de serviço, papel amarelado e marcações de laboratório. A emoção é de descoberta e restauração cuidadosa. | 0,07 |
| Rack de Estúdio 1987 | Uma interface inspirada no painel frontal de um amplificador profissional, com alumínio escovado, LEDs discretos e tipografia de instrumentação. A emoção é de robustez e precisão. | 0,04 |
| Catálogo Hi‑Fi Brasileiro | Um editorial de época com fotografia de produto, grafismos industriais e referências visuais de revistas de áudio. A emoção é nostálgica e colecionável. | 0,08 |

## Abordagem escolhida: Arquivo de Bancada

### Movimento de design

**Technical ephemera / arquivo industrial brasileiro.** A página deve parecer uma edição contemporânea de um caderno de reparo: rigor técnico, marcas de uso, notas de processo e materialidade de papel — sem imitar uma interface antiga de forma literal.

### Princípios centrais

1. **Rastreabilidade visual:** informações cruciais devem parecer organizadas em uma prancha de manutenção, com códigos, etiquetas e referências cruzadas.
2. **Matéria antes de ornamento:** papel, tinta, metal e linhas de circuito devem criar profundidade sutil; efeitos decorativos não podem atrapalhar leitura.
3. **Assimetria controlada:** o conteúdo percorre uma coluna de índice e uma área editorial ampla, evitando blocos centralizados repetitivos.
4. **Precisão legível:** valores elétricos, limites e alertas recebem prioridade tipográfica e cromática.

### Filosofia de cor

O fundo é um **papel de arquivo quente**, não branco puro, para sinalizar restauração e documentação. Grafite quase preto representa tinta e chassis; cobre envelhecido marca potência e intervenção; verde de osciloscópio indica sinal validado; vermelho ferrugem fica reservado para segurança e exceções. A cor de assinatura é **Cobre Oxidado — #B85E3D**.

### Paradigma de layout

Uma espinha de arquivo vertical orienta a leitura em telas largas: à esquerda, navegação e status; à direita, uma sequência de pranchas técnicas com largura variável. O hero é uma placa editorial em duas colunas: manifesto técnico à esquerda e um painel inspirado em VU/medição à direita. Em mobile, a espinha vira um sumário compacto e o conteúdo continua em uma única linha de leitura.

### Elementos de assinatura

1. **Trilha de sinal cobreada**, uma linha fina que atravessa as seções como condutor visual.
2. **Etiquetas de bancada**, pequenos blocos em caixa alta com códigos de circuito, tensão e revisão.
3. **Moldura de papel técnico**, com grão discreto, filetes e numeração editorial de páginas.

### Filosofia de interação

Interações simulam o manuseio de um manual: navegação suave por âncoras, expansão de detalhes e botões que parecem etiquetas operacionais. O usuário deve encontrar rapidamente esquema, BOM, proteção, VU e validação sem perder o contexto.

### Animação

Entradas discretas de opacidade e deslocamento vertical de no máximo 10 px, em cascata curta. A trilha de sinal pode revelar-se no carregamento, mas o efeito deve respeitar `prefers-reduced-motion`. Botões respondem com pressão sutil, sem brilhos neon ou movimentos contínuos.

### Sistema tipográfico

**IBM Plex Mono** é a voz de referência técnica, para códigos, tensões e tabelas. **DM Serif Display** cria títulos editoriais com personalidade e contraste. Títulos usam serif em caixa normal; rótulos e medidas usam mono em caixa alta, com espaçamento maior.

### Essência de marca

**Um guia de engenharia para restaurar e reinterpretar um amplificador brasileiro de alta potência, destinado a construtores que tratam circuito, segurança e história com o mesmo rigor.** Personalidade: preciso, tátil, sóbrio.

### Voz de marca

As manchetes devem ser diretas e documentais; CTAs devem falar de consulta, rastreio e validação — nunca de “começar agora”.

> “Não é só um esquema: é uma trilha de decisão para bancada.”

> “Abra a seção de proteção antes de energizar o primeiro canal.”

### Wordmark e símbolo

O wordmark usa a construção `NA / 2200` com barra oblíqua técnica e o subtítulo Nashville em mono compacto. O símbolo é uma marca abstrata de dois canais espelhados, lembrando trilhas de PCB e o arco de um VU meter, sem texto.

## Style Decisions

- Evitar cartões arredondados, gradientes roxos e layouts excessivamente centralizados.
- Usar texto escuro sobre fundos claros e texturas de papel, mantendo contraste alto.
- Reservar vermelho ferrugem para avisos de alta tensão e zonas de teste.
- Exibir números e valores técnicos em IBM Plex Mono, com unidades sempre visíveis.
