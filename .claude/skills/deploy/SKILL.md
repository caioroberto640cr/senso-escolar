---
name: deploy
description: Publica o EduInsight em produção no Render seguindo o procedimento padrão. Procedimento com efeito colateral — só rodar quando o usuário pedir explicitamente.
disable-model-invocation: true
---

# Deploy para produção (Render)

Publica o EduInsight no Render. O deploy é **automático por push**: o Render está
ligado ao repositório GitHub (`caioroberto640cr/senso-escolar`) via Blueprint
([render.yaml](render.yaml)). Empurrar para `main` dispara um novo deploy.

Argumentos: $ARGUMENTS  <!-- ex.: nada, ou uma nota de versão -->

## Como funciona

Serviço **único** no Render: o `render.yaml` builda o frontend e instala a API; o
Express então serve `web/dist` **e** as rotas `/api` (mesma origem).
- `buildCommand`: `cd web && npm install --include=dev && npm run build && cd ../api && npm install`
- `startCommand`: `cd api && npm start`

## Passos

1. Garantir branch limpa e atualizada com o remoto (`git status`, `git pull`).
2. **Validar o build localmente** antes de empurrar:
   - `cd web && npm run build` (tem que passar o `tsc -b`).
   - Testar o modo de produção: subir a API numa porta de teste e conferir que ela
     serve o site **e** `GET /api/health`.
3. Se mudou **dado** (ETL): rodar `cd api && npm run etl` e **commitar** os JSON de
   `api/data/processed/` (são versionados; sem eles o deploy não tem dados).
4. `git add -A && git commit && git push origin main` → o Render builda e publica.
5. Acompanhar o build no painel do Render; quando concluir, conferir a **saúde**:
   - página inicial carrega;
   - `GET /api/health` responde `{ ok: true, ... }`;
   - logs do Render sem erro.

## Regras

- **Nunca** commitar segredos/chaves; usar variáveis de ambiente no painel do Render.
- `api/data/raw/` é **gitignored** (zips grandes, regeneráveis pelo ETL) — não versionar.
- Não pular a checagem de saúde após o deploy.
- Plano **free** do Render: o serviço dorme após ~15 min sem uso (primeiro acesso
  seguinte demora ~30–50s). É esperado.

## Rollback

- Reverter o commit problemático (`git revert <hash>`) e `git push` — o Render
  redeploya a versão corrigida; **ou**
- No painel do Render, escolher um **deploy anterior** e refazer (rollback).

Convenções gerais do projeto: ver `CLAUDE.md` na raiz. Dados/ETL: ver [[inep-dados]].
