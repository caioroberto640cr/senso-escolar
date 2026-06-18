# EduInsight — contexto para o Claude

BI dos indicadores de aprendizagem do ensino básico brasileiro (IDEB, aprovação, SAEB),
com **dados reais** do INEP/IBGE. Monorepo: `api/` (Node/Express) + `web/` (React/Vite).
App publicada no Render (repo `caioroberto640cr/senso-escolar`).

## Stack

- **api/** — Node 22 + Express 4 + TypeScript, rodado por **tsx** (sem build). ESM.
  Dados ficam em **JSON processado** em `api/data/processed/` (carregado em memória).
- **web/** — React 19 + Vite + TS + **Tailwind v4**, react-router, Leaflet (+cluster), Recharts.
- **Produção**: serviço **único** no Render — o Express serve `web/dist` **e** `/api`.

## Convenções que importam (siga sempre)

1. **Imports internos no `api/` usam extensão `.ts`** (ESM + tsx), ex.: `from './store.ts'`.
2. **Dados do INEP nunca ficam no frontend.** Vêm sempre da API via `web/src/lib/api.ts`
   (hook `useFetch`). `web/src/data/mock.ts` guarda **só** dados de aplicação (usuário
   logado, status de fontes) — nunca indicadores.
3. **Cor primária: verde chapado `#2f8f43`** (ramo `brand`, tokens `@theme` em
   `web/src/index.css`). Sem lavanda/roxo, sem neon, sem gradiente pesado.
4. **Indicadores do INEP**: sem banco SQL — a "fonte da verdade" é o JSON do ETL.
   **Contas de usuário** (cadastro/login): ficam em **Postgres (Neon)** via `api/src/db.ts`
   + `auth.ts` (hash bcrypt + JWT). Variáveis: `DATABASE_URL`, `JWT_SECRET` (ver
   `api/.env.example`); sem `DATABASE_URL` o login degrada com 503 e o resto segue normal.
5. Textos da UI e nomes/comentários **em português**.

## Onde colocar

- Nova tela → `web/src/pages/` + registrar em `App.tsx` + link em `components/Layout.tsx`.
- Novo endpoint → `api/src/index.ts` (prefixo `/api/...`).
- Nova transformação/fonte de dado → `api/scripts/etl.ts` (saída em `data/processed/`).
- Componente de UI reutilizável → `web/src/components/ui/`.

## Rodar local

```bash
cd api && npm install && npm run etl && npm start   # API :3333 (etl = baixa dados reais)
cd web && npm install && npm run dev                # Web :5173 (proxy /api -> :3333)
```

## Skills do projeto (`.claude/skills/`)

- **inep-dados** — modelo de dados e detalhes do ETL do INEP (estrutura do `.xlsx`,
  colunas do IDEB, coordenadas IBGE). Consulte ao mexer em dados/ETL.
- **deploy** — runbook de publicação no Render (manual).
