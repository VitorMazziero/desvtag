# C09 — Comparação de tratamentos (com C04 amplitude studentizada, C07 ANOVA de um fator, C08 pressupostos, C16 séries e C18 fatos)

**Estado:** implementado; validado numericamente (nativo e WASM); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{comparisons,inference,diagnostics,visualization,distributions,numeric,interpretation}` |
| Arquivos de entrada | `comparisons/mod.rs` (`compare_one_way`) |
| Etapa de criação | ET05 |
| Depende de | C01–C04, C05 (`summarize_column`), C08, C16, C18, C19 |
| Consumido por | E01 (`comparisonOneWay`), P01 (`AnalysisResult::OneWayComparison`), U08/U09/U16 |
| Métodos | [ANOVA de um fator](../metodos/anova-um-fator.md), [Tukey](../metodos/tukey.md), [letras](../metodos/letras-comparacao.md), [amplitude studentizada](../metodos/amplitude-studentizada.md) |
| Decisão | [DT-0010](../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md) |

## 1. Responsabilidade

Dado um conjunto de dados, uma resposta e um fator, devolver numa só análise reproduzível: estatísticas por grupo, ANOVA, tamanhos de efeito, Tukey/Tukey–Kramer, letras, diagnósticos e as séries científicas dos gráficos, com fatos interpretáveis e proveniência. Não acessa disco, rede, idioma ou interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `comparisons/mod.rs` | `OneWayRequest`, `OneWayResult`, `GroupStats`, `compare_one_way` (orquestra) |
| `comparisons/groups.rs` | Formação dos grupos por fator e observações excluídas |
| `comparisons/tukey.rs` | Tukey e Tukey–Kramer (valor-p, intervalos simultâneos) |
| `comparisons/letters.rs` | Letras por inserção e absorção |
| `inference/one_way_anova.rs` | Partição deslocada, tabela F, η², ω², CV |
| `diagnostics/assumptions.rs` | Brown–Forsythe |
| `visualization/{boxplot,residuals}.rs` | Quartis, bigodes, pontos distantes e QQ |
| `distributions/studentized_range.rs` | `Q(k, ν)` (`cdf`, `sf`, quantil) |
| `numeric/integration.rs` | Gauss–Legendre |
| `interpretation/rules.rs` | `one_way_facts` |
| `tests/comparison_validation.rs`, `tests/studentized_range_validation.rs` | Validação contra referências independentes |

## 3. API pública

`comparisons::compare_one_way(&OneWayRequest) -> Result<OneWayResult, CoreError>`; `StudentizedRange::new(k, ν)` com `cdf`/`sf`/`quantile_upper`; `letters::compute(grupos, ordem, relação)`. Protocolo: `comparisonOneWay` → `OperationResult::ComparisonOneWay` (caixa) ou `invalidInput` com `issues`. O método `one_way_comparison` está no registro como `implemented` + `numericallyValidated`.

## 4. Fluxo de dados

U07 (`AnalysisSetup`) → protocolo JSON → E01 → `compare_one_way` → `OneWayResult` → guardado como `AnalysisRecord` (P01) → U08/U09 (tabelas e gráficos) → U16 (exportação).

## 5. Erros e limitações

Ver [seção 7 do método](../metodos/anova-um-fator.md#7-casos-sem-resultado-válido). Um fator por vez; sem blocos, fatores cruzados, Welch, Dunnett, Games–Howell ou testes não paramétricos (v0.2). Até 1000 grupos (a amplitude studentizada), 26+ letras suportadas. Custo do Tukey: ~1 s para 325 pares (26 grupos) em compilação otimizada.

## 6. Manutenção

- Nova estatística: campo em `OneWayResult` (regenerar tipos), cálculo no módulo de C07/C08, referência em `make_comparison_cases.py` **independente do Rust**, verificação nos testes nativo e WASM, coluna na tabela da interface e textos PT/EN.
- Novo fato: regra em `interpretation/rules.rs`, chaves em `results.json` nos dois idiomas.
- Regenerar as referências: `python validation/tools/make_comparison_cases.py <.dat do NIST>`.
- Testes: `cargo test -p optima-core`; `npm test`; `npm run test:e2e`.

## 7. Testes e validação

151 testes unitários do núcleo (inclui letras: propriedade com grafos aleatórios e 27–60 grupos; quartis; QQ; Brown–Forsythe à mão; quadratura), 4 testes de validação nativos (11 NIST + 4 aplicados; 432 pontos da amplitude), 17 de paridade WASM, E2E do percurso (Chromium e Firefox) e verificação do IPC nativo no Linux.
