# EduInsight — contexto para o Claude

BI dos indicadores de aprendizagem do ensino básico brasileiro (IDEB, aprovação, SAEB),
com **dados reais** do INEP/IBGE. Monorepo: `api/` (Node/Express) + `web/` (React/Vite).
App publicada no Render (repo `caioroberto640cr/senso-escolar`).

## Stack

- **api/** — Node 22 + Express 4 + TypeScript, rodado por **tsx** (sem build). ESM.
  **Escolas (64k) ficam no Postgres (Neon)**; a API consulta via `src/escolasDb.ts`.
  Agregados (nacional/região/estado), alertas e meta ficam em JSON pequeno em
  `api/data/processed/` (versionado). Pipeline: `npm run etl` (gera os JSON) →
  `npm run seed` (carrega `escolas.json` no Postgres).
- **web/** — React 19 + Vite + TS + **Tailwind v4**, react-router, Leaflet (+cluster), Recharts.
- **Produção**: serviço **único** no Render — o Express serve `web/dist` **e** `/api`.

## Convenções que importam (siga sempre)

1. **Imports internos no `api/` usam extensão `.ts`** (ESM + tsx), ex.: `from './store.ts'`.
2. **Dados do INEP nunca ficam no frontend.** Vêm sempre da API via `web/src/lib/api.ts`
   (hook `useFetch`). `web/src/data/mock.ts` guarda **só** dados de aplicação (usuário
   logado, status de fontes) — nunca indicadores.
3. **Cor primária: verde vivo `#17a24a`** (ramo `brand`, tokens `@theme` em
   `web/src/index.css`), com apoio de dourado (`sun #f4a11e`), azul (`sky #1f6fe0`) e
   coral (`peach #e2463a`). Paleta forte, **sem neon** e sem gradiente pesado. Marca:
   logo "livro + barras" + wordmark **Sora** em duas cores (`components/Logo.tsx`);
   navegação em **abas no topo** (`components/Layout.tsx`).
4. **Postgres (Neon)** é a fonte das **escolas** (tabelas `escolas` + `escola_etapa`,
   ver `seed-db.ts`/`escolasDb.ts`) e das **contas de usuário** (`db.ts` + `auth.ts`,
   bcrypt + JWT). Variáveis: `DATABASE_URL`, `JWT_SECRET` (ver `api/.env.example`).
   Sem `DATABASE_URL` a app não tem dados de escola nem login. `escolas.json` NÃO é
   versionado (regerado por `etl` e carregado por `seed`).
5. Textos da UI e nomes/comentários **em português**.

## Onde colocar

- Nova tela → `web/src/pages/` + registrar em `App.tsx` + link em `components/Layout.tsx`.
- Novo endpoint → `api/src/index.ts` (prefixo `/api/...`).
- Nova transformação/fonte de dado → `api/scripts/etl.ts` (saída em `data/processed/`).
- Componente de UI reutilizável → `web/src/components/ui/`.

## Rodar local

```bash
cd api && npm install && npm run etl && npm run seed && npm start   # etl=baixa/gera JSON · seed=carrega no Postgres
cd web && npm install && npm run dev                                # Web :5173 (proxy /api -> :3333)
```
(Precisa de `DATABASE_URL` no `api/.env`. O `etl`/`seed` só são necessários ao atualizar os dados.)

## Skills do projeto (`.claude/skills/`)

- **inep-dados** — modelo de dados e detalhes do ETL do INEP (estrutura do `.xlsx`,
  colunas do IDEB, coordenadas IBGE). Consulte ao mexer em dados/ETL.
- **deploy** — runbook de publicação no Render (manual).
