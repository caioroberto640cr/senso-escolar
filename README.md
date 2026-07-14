# EduInsight — BI Educacional

Plataforma de **Business Intelligence para os indicadores de aprendizagem do ensino
básico brasileiro** (IDEB, aprovação, SAEB). Centraliza dados de fontes oficiais
(INEP e IBGE) e os transforma em dashboards, comparativos e um
**mapa interativo de escolas**.

> Projeto da equipe: **Caio Roberto Teixeira de Souza · Altacir Neto · Ramires Machârue**

## Estrutura do repositório

```
.
├── api/        API única centralizada (Node + Express + TS)   ← implementado
├── web/        Sistema Web (React + Vite + TypeScript)        ← implementado
└── mobile/     App Mobile (Expo / React Native)               ← próximo passo
```

A **API única centralizada** é compartilhada entre web e (futuramente) mobile,
garantindo os mesmos dados nas duas plataformas.

## Dados REAIS

Os dados **não são fictícios**. A API serve:

| Dado | Fonte real | Como |
|------|-----------|------|
| Escolas + IDEB 2023 (3 etapas) | **INEP** | ETL dos arquivos oficiais de Anos Iniciais, Anos Finais e Ensino Médio → **64.479 escolas reais** (41.295 + 31.092 + 14.457) |
| Aprovação e nota SAEB | **INEP** | mesmas planilhas do IDEB |
| **Abandono (evasão) e reprovação** | **INEP** | Taxas de Rendimento por escola 2023 |
| **Distorção idade-série** | **INEP** | TDI por escola 2023 |
| **Infraestrutura, matrículas, porte, localização, recortes (indígena/quilombola)** | **INEP** | Censo Escolar 2023 (por escola) |
| Coordenadas dos municípios | **IBGE** | centroide real de cada município |
| Estados, regiões, municípios | **IBGE** | API REST ao vivo (`servicodados.ibge.gov.br`) |
| Agregados (nacional/região/estado) | derivado | calculado em cima dos dados reais do INEP |
| Alertas | derivado | maiores quedas reais de IDEB 2021→2023 |

> Observação: IDEB por escola só existe como **arquivo** no INEP (não há API REST ao
> vivo). Por isso há um passo de **ETL** (`api/scripts/etl.ts`) que baixa e processa os
> dados oficiais uma vez. Como o IDEB de etapas diferentes não é comparável, cada escola
> guarda indicadores **por etapa** e a app tem um **seletor de etapa** (Anos Iniciais /
> Anos Finais / Ensino Médio). 2023 é o IDEB mais recente divulgado.

## Como rodar (API + Web)

As **escolas** ficam em **Postgres (Neon)**; agregados/alertas/meta são JSON pequenos.
Defina `DATABASE_URL` em `api/.env` (ver `api/.env.example`).

**1. API** (porta 3333):
```bash
cd api
npm install
npm run etl     # baixa/processa dados do INEP/IBGE -> data/processed/*.json (uma vez)
npm run seed    # carrega escolas.json no Postgres (uma vez por atualização)
npm start       # sobe a API em http://localhost:3333
```

**2. Web** (porta 5173, faz proxy de `/api` para a API):
```bash
cd web
npm install
npm run dev     # http://localhost:5173
```

### Principais endpoints da API
```
GET /api/indicadores/nacionais        métricas nacionais reais
GET /api/indicadores/regioes          IDEB médio por região
GET /api/escolas?uf=SP&q=&sort=&limit= busca paginada
GET /api/escolas/mapa?uf=&desempenho= dados enxutos p/ o mapa (amostra/cap)
GET /api/escolas/:id                  detalhe de uma escola (código INEP)
GET /api/alertas                      alertas derivados
GET /api/geografia/estados            IBGE ao vivo (cache 12h)
POST /api/auth/register · /api/auth/login · GET /api/auth/me   (cadastro/login)
GET/PATCH/DELETE /api/usuarios         gestão de usuários (somente admin)
```

## Contas de usuário (cadastro/login)

Autenticação real com **Postgres (Neon)** + senha com **hash (bcrypt)** e **JWT**.
A aplicação **abre na tela de login**: é preciso entrar ou criar conta para acessar
qualquer página. A Gestão de Usuários é exclusiva de **admin** (o 1º cadastro vira admin).

**Configurar (grátis):**
1. Crie um projeto em [neon.tech](https://neon.tech) e copie a *connection string*.
2. Local: copie `api/.env.example` para `api/.env` e preencha `DATABASE_URL` e `JWT_SECRET`.
3. Produção (Render): em *Environment*, defina `DATABASE_URL` (o `JWT_SECRET` o Render gera).
4. Suba a API — a tabela `usuarios` é criada sozinha. **O primeiro cadastro vira admin.**

> Como a app abre no login, o `DATABASE_URL` é **necessário** para usá-la (sem ele o
> cadastro/login responde 503). Em produção, o `DATABASE_URL` já está configurado no Render.

## Sistema Web

Stack: **React 19 + Vite + TypeScript + Tailwind CSS v4**, mapas com
**Leaflet/react-leaflet** (+ clustering) e gráficos com **Recharts**. Visual em
**cores claras** com **cor primária verde forte e chapado** (`#2f8f43`).

### Telas implementadas

| Rota | Tela | Descrição |
|------|------|-----------|
| `/` | Dashboard | Métricas reais, evolução do IDEB, IDEB por região, mapa e alertas |
| `/mapa` | **Mapa de Escolas** 🆕 | Mapa do Brasil com pins por desempenho (clusterizados), popup e filtros |
| `/escolas` | Buscar Escolas | Busca/ordenação server-side com paginação (14k escolas reais) |
| `/escolas/:id` | Detalhe da Escola | IDEB vs. média nacional/região, aprovação, SAEB e localização |
| `/comparativo` | Análise Comparativa | Busca e compara até 3 escolas reais |
| `/relatorios` | Relatórios | Configurador de relatório com exportação PDF/Excel |
| `/alertas` | Alertas | Alertas reais (maiores quedas de IDEB) por severidade |
| `/usuarios` | Gestão de Usuários | Tabela de usuários, perfis e ativar/desativar |
| `/fontes` | Fontes de Dados | Status das integrações (INEP/IBGE) |
| `/configuracoes` | Configurações | Perfil, notificações e segurança (2FA) |
