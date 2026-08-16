# Nashville NA 2200 PRO — Guia de Bancada

Página estática React/Vite com o guia técnico atualizado do Nashville NA 2200 PRO.

## Publicação no Render

O arquivo `../render.yaml` declara um serviço estático com `rootDir: nashville-guide`.

- **Build command:** `pnpm install --frozen-lockfile && pnpm build`
- **Publish directory:** `dist/public`
- **Runtime:** Static Site

Os ativos visuais estão em `public/media/` para ficarem disponíveis no build externo do Render.
