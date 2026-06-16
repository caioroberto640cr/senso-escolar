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
| Escolas + IDEB 2023 (Ensino Médio) | **INEP** | ETL do arquivo oficial `divulgacao_ensino_medio_escolas_2023.zip` → **14.457 escolas reais** |
| Taxa de aprovação e nota SAEB | **INEP** | mesmas planilhas do IDEB |
| Coordenadas dos municípios | **IBGE** | centroide real de cada município |
| Estados, regiões, municípios | **IBGE** | API REST ao vivo (`servicodados.ibge.gov.br`) |
| Agregados (nacional/região/estado) | derivado | calculado em cima dos dados reais do INEP |
| Alertas | derivado | maiores quedas reais de IDEB 2021→2023 |

> Observação: IDEB por escola só existe como **arquivo** no INEP (não há API REST ao
> vivo). Por isso há um passo de **ETL** (`api/scripts/etl.ts`) que baixa e processa os
> dados oficiais uma vez. Atualmente carregado o **Ensino Médio**; Anos Iniciais/Finais
> podem ser adicionados rodando o ETL para os respectivos arquivos.

## Como rodar (API + Web)

**1. API** (porta 3333):
```bash
cd api
npm install
npm run etl     # baixa e processa os dados reais do INEP/IBGE (uma vez)
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
```

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

### Funcionalidade nova: Mapa de Escolas

Adicionada além do documento original. Cada escola é um **pin colorido pelo IDEB**
(verde = bom, amarelo = atenção, coral = crítico). Clicar abre um popup com IDEB,
aprovação e SAEB reais e um botão "Ver detalhe". Filtros por região, UF, dependência
e faixa de desempenho. Com 14k escolas, os pins são **clusterizados** para performance.

## Próximos passos

- [ ] App **mobile** em Expo consumindo a mesma API
- [ ] Ampliar o ETL para Anos Iniciais/Finais (mais escolas e etapas)
- [ ] Banco de dados (PostgreSQL + PostGIS) no lugar dos JSON processados
- [ ] Chatbot educacional (Claude API)
- [ ] Autenticação real e push notifications
