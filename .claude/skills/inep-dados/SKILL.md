---
name: inep-dados
description: Modelo de dados, ETL e convenções dos dados do INEP/IBGE neste BI. Use sempre que for mexer no ETL, carregar/transformar dados do INEP, alterar o modelo de Escola/indicadores, adicionar etapas/anos do IDEB, ou quando o pedido mencionar INEP, IDEB, SAEB, Censo, microdados, IBGE, coordenadas ou nomes de colunas.
---

# Dados do INEP/IBGE — modelo e ETL

Os indicadores são **reais**. Vêm das **planilhas de resultado do IDEB 2023** do INEP
(não dos microdados CSV crus) cruzadas com **coordenadas reais de municípios (IBGE)**.
O ETL fica em `api/scripts/etl.ts` e roda com `npm run etl` (dentro de `api/`).

## Fontes reais

- **IDEB por escola** — `https://download.inep.gov.br/ideb/resultados/divulgacao_<etapa>_escolas_2023.zip`
  onde `<etapa>` ∈ `anos_iniciais` | `anos_finais` | `ensino_medio`. Cada zip contém um
  **.xlsx**. As **3 etapas** estão carregadas (AI 41.295 · AF 31.092 · EM 14.457;
  64.479 escolas únicas, IDEB 2023).
- **Coordenadas de municípios** — dataset `municipios-brasileiros` (derivado do IBGE):
  `codigo_ibge, latitude, longitude`. Usado como **centroide do município**.
- **Geografia ao vivo** — API do IBGE `servicodados.ibge.gov.br/api/v1/localidades`
  (estados, regiões, municípios), com cache de 12h em `api/src/ibge.ts`.

## Estrutura do .xlsx do IDEB (importante)

- Aba única; **linha de códigos no índice 7**; **dados começam no índice 8**.
- Valores ausentes vêm como `"-"` → converter para `null`.
- Colunas-chave (acessar **pelo código**, nunca por índice fixo — a posição muda entre
  etapas/anos):
  - `SG_UF`, `CO_MUNICIPIO` (código IBGE 7 díg.), `NO_MUNICIPIO`,
    `ID_ESCOLA` (código INEP), `NO_ESCOLA`, `REDE` (dependência).
  - `VL_OBSERVADO_2017/2019/2021/2023` → **IDEB** de cada ano.
  - `VL_APROVACAO_2023_SI_4` → taxa de aprovação total.
  - `VL_NOTA_MEDIA_2023` → nota média SAEB.

## Saída do ETL (versionada em git)

`api/data/processed/`:
- `escolas.json` — uma escola por registro, com indicadores **por etapa** (~30 MB).
- `agregados.json` — por etapa: `{ anos_iniciais, anos_finais, medio }`, cada um com
  `{ nacional, regiao[], estado[] }`, **derivados** das escolas reais.
- `alertas.json` — derivados: maiores **quedas de IDEB 2021→2023** (com a etapa).
- `meta.json` — fonte, etapas/contagens, data de geração, total.

Os zips em `api/data/raw/` são **gitignored** (grandes, regeneráveis pelo ETL).
Os JSON processados **são commitados** para o deploy funcionar sem baixar do INEP.

## Modelo de dados (campos reais)

Registro de escola (tipos em `web/src/types` e `api/src/store.ts`):
identidade (`id_escola` INEP, `nome`, `municipio`, `cod_municipio`, `estado`, `regiao`,
`dependencia`, `latitude`, `longitude`) + `etapas: EtapaKey[]` + `indicadores` **por etapa**:
`{ ideb, taxa_aprovacao, nota_saeb, historico_ideb[] }`. Uma escola pode ter as 3 etapas.

A API **projeta** a escola para uma etapa (`?etapa=anos_iniciais|anos_finais|medio`,
padrão `anos_iniciais`) nas listas/mapa/indicadores; `/api/escolas/:id` devolve o registro
completo. O frontend tem um **seletor global de etapa** (`web/src/lib/etapa.tsx`).

> Evasão e alfabetização **não** estão nos arquivos do IDEB — por isso o projeto usa
> **aprovação** e **SAEB** como indicadores reais. Não inventar evasão.

## Regras ao mexer nos dados

- Ao adicionar **etapa ou ano**, parametrizar pelos **códigos de coluna**, não por
  índice fixo. Reusar/estender `etl.ts`.
- IDEB de etapas diferentes **não é comparável** (anos iniciais ~6 vs médio ~4): tratar
  **por etapa**, nunca misturar numa média única.
- Posicionar cada escola na coordenada do seu município (centroide) com **jitter
  determinístico** (estável entre execuções) para não sobrepor pinos.
- Converter `"-"` → `null` antes de agregar.

Convenções gerais do projeto: ver `CLAUDE.md` na raiz. Publicação: ver [[deploy]].
