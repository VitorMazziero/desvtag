# C11 — Planejamentos de dois níveis (com C07 Lenth e falta de ajuste, C16 efeitos e C18 fatos de triagem)

**Estado:** implementado; validado numericamente (nativo e WASM); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{designs,inference,visualization,interpretation}` |
| Arquivos de entrada | `designs/mod.rs` (`generate`, `count_runs`), `designs/analysis.rs` (`analyze`) |
| Etapa de criação | ET06 |
| Depende de | C01–C04, C06 (`models::linear`), C07 (`inference`), C19 |
| Consumido por | E01 (`designCount`, `designGenerate`, `designAnalyze`, `designRecommend`), P01 (`Experiment.design`, `AnalysisResult::TwoLevelDesign`), U06, U08/U09 |
| Métodos | [fatorial de dois níveis](../metodos/fatorial-dois-niveis.md), [fracionário](../metodos/fatorial-fracionario.md), [Plackett–Burman](../metodos/plackett-burman.md), [aleatorização](../metodos/aleatorizacao.md) |
| Decisão | [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) |

## 1. Responsabilidade

Gerar matrizes de planejamento de dois níveis (completo, fracionário, Plackett–Burman) com réplicas, pontos centrais, codificação reversível e ordem de execução reprodutível; recomendar opções por número de fatores e orçamento; analisar os resultados por efeitos, com curvatura, falta de ajuste, Lenth, séries de gráficos e fatos interpretáveis. Não acessa disco, rede, idioma ou interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `designs/spec.rs` | `DesignSpec`, `DesignKind`, `GeneratedDesign`, limites |
| `designs/coding.rs` | Codificação real ↔ codificado |
| `designs/factorial.rs` | 2ᵏ em ordem padrão |
| `designs/fractional.rs` | Geradores, relação definidora, catálogo |
| `designs/alias.rs` | Álgebra GF(2), resolução e confundimento |
| `designs/plackett_burman.rs` | Hadamard (Paley, Sylvester) e colunas fictícias |
| `designs/randomization.rs` | PCG32 e Fisher–Yates |
| `designs/generate.rs` | Monta réplicas, centrais e ordem; contagem prévia |
| `designs/recommend.rs` | Opções por `k` e orçamento |
| `designs/analysis.rs` | Efeitos, curvatura, Pareto, observado × predito, orquestra |
| `inference/{lenth,lack_of_fit}.rs` | Método de Lenth; falta de ajuste e erro puro |
| `visualization/effects.rs` | Séries de efeitos principais e de interações |
| `interpretation/rules.rs` | `design_facts` |
| `tests/design_validation.rs` | Validação contra referências independentes |

## 3. API pública

`designs::generate(&DesignSpec)`, `designs::count_runs(&DesignSpec)`, `designs::recommend::candidates(k, orçamento)`, `designs::analysis::analyze(&DesignAnalysisRequest)`. Registro: `two_level_design` e `two_level_design_analysis` (`implemented` + `numericallyValidated`). Protocolo: `designCount`, `designGenerate`, `designAnalyze`, `designRecommend`.

## 4. Fluxo de dados

U06 (`DesignPanel`) → protocolo JSON → E01 → `generate` → ensaios copiados para a grade (U04, com revisão `design`) → usuário preenche respostas → U07 (`AnalysisSetup`, termos e curvatura) → `analyze` → `AnalysisRecord` (P01) → U08/U09 (`DesignResults`: efeitos, Pareto, principais, interações, observado × predito) → exportação (CSV da matriz e dos efeitos, SVG/PNG).

## 5. Erros e limitações

Ver [seção 7 do método](../metodos/fatorial-dois-niveis.md#7-casos-sem-resultado-válido). Dois níveis por fator; fatores numéricos; sem blocos, níveis mistos, misturas ou fracionários não regulares (v0.2). PB só nos 8 tamanhos listados. Até 12 fatores no fatorial completo, 26 letras nos geradores e 5000 ensaios.

## 6. Manutenção

- Novo tamanho de PB: construção em `plackett_burman.rs`, inclusão em `SUPPORTED_RUNS`, verificação `H·Hᵀ = N·I`, caso em `make_design_cases.py` e atualização do método.
- Nova entrada de catálogo: `fractional.rs` (a resolução é conferida em teste) e `make_design_cases.py`.
- Novo algoritmo de aleatorização: novo identificador; manter o antigo para planejamentos gravados.
- Regenerar referências: `python validation/tools/make_design_cases.py`.
- Testes: `cargo test -p optima-core`; `npm test`; `npm run test:e2e`.

## 7. Testes e validação

Testes unitários (catálogo, ortogonalidade de PB nos 8 tamanhos, vetor oficial do PCG32, uniformidade simples, Lenth, recomendação), `tests/design_validation.rs` (permutações, matrizes, fracionários por força bruta, 5 análises), paridade WASM e E2E (Chromium e Firefox).
