# U06 — Planejamento de experimento (com U07–U09 para triagem)

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/design/` e `features/results/DesignResults.tsx` |
| Arquivos de entrada | `features/design/index.ts` |
| Etapa de criação | ET06 |
| Depende de | U12 (cliente do motor), U11 (estado e revisões), U03/U04 (fatores e grade), U07 (`AnalysisSetup`), `services/charts` |
| Consumido por | U02 (fluxo guiado: caminho “Planejar experimento”) |
| Módulos do núcleo | [C11](c11-planejamentos-dois-niveis.md) |

## 1. Responsabilidade

Guiar a escolha do planejamento (recomendação curta por número de fatores e orçamento de ensaios, com opções), receber fatores e níveis reais, mostrar a **contagem de ensaios antes de gerar**, a semente da aleatorização, a matriz real/codificada e entregar os ensaios à grade de dados. Na análise, apresentar efeitos, Pareto, efeitos principais, interações e observado × predito, sem exibir testes não estimáveis como válidos.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `DesignPanel.tsx` | Seletor do tipo de planejamento: fatores quantitativos (`TwoLevelPanel`) ou um fator categórico (`CrdPanel`) |
| `TwoLevelPanel.tsx` | Fatores, tipo, recomendação, réplicas, centrais, aleatorização e semente; gera e aplica |
| `CrdPanel.tsx`, `CrdMatrix.tsx`, `crdRows.ts` | DIC aleatorizado ([método](../metodos/delineamento-inteiramente-casualizado.md)): fator categórico, níveis (gravados no fator), unidades por nível, semente; ordem de execução, identificadores `T<nível>-R<unidade>` e CSV/XLSX da matriz |
| `RunMatrix.tsx` | Matriz com alternância real/codificada, tipo de ponto, ordem padrão e de execução |
| `designRows.ts` | Converte o planejamento em linhas da grade |
| `matrixCsv.ts` | Exporta a matriz em CSV (BOM, metadados `#`) |
| `features/results/DesignResults.tsx` | Tabela de termos (coeficiente × efeito), ANOVA, curvatura, Lenth, gráficos, interpretação |
| `services/charts/{pareto,effects}.ts` | Pareto, efeitos principais e interações em SVG |

## 3. Comportamento

Recomendação: maior resolução que cabe no orçamento, em empate o maior número de ensaios (regra em [fatorial de dois níveis](../metodos/fatorial-dois-niveis.md)); ao gerar, os dados já digitados são preservados numa revisão e as linhas do planejamento substituem a grade. A tela mostra algoritmo e semente; a mesma semente reproduz a ordem. Textos em português e inglês; os três temas; acessíveis por teclado.

## 4. Erros e limitações

Diagnósticos `design.*` do núcleo aparecem com texto traduzido, sem expor códigos. Dois níveis por fator, fatores numéricos (o fator categórico usa o painel do DIC). O DIC é balanceado (mesmo número de unidades por nível) e sem blocos; no caminho “Planejar”, um DIC gerado é analisado como comparação de tratamentos.

## 5. Manutenção

Nova opção de planejamento: ampliar `DesignKind` no núcleo, regenerar tipos, incluir no seletor e nas chaves `design.*` de `common.json` nos dois idiomas. Testes: `npm test`, `npm run test:e2e` (`design-flow.spec.ts`), axe nos três temas.

## 6. Testes

Unitários de linhas e CSV (inclui `crdRows.test.ts`); paridade WASM × nativo (inclui `crd.parity.test.ts`); E2E planejar → preencher → analisar (Chromium e Firefox), incluindo o exemplo 02; `crd-flow.spec.ts` (DIC: ordem conferida contra a referência independente, análise, personalização da figura, salvar e reabrir); reabertura do projeto preservando planejamento e resultado.
