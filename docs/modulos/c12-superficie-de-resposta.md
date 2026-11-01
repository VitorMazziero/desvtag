# C12 — Planejamentos de superfície (com C16 superfície e contorno, C07 falta de ajuste e C18 fatos)

**Estado:** implementado; validado numericamente (nativo e WASM); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/crates/optima-core/src/{designs,surface}` |
| Arquivos de entrada | `designs/mod.rs` (`generate`, `count_runs`), `surface/mod.rs` (`analyze`, `compute_grid`) |
| Etapa de criação | ET07 |
| Depende de | C01–C04, C06 (`models::linear`, `prediction`, `covariance`), C07 (`inference::lack_of_fit`), C11 (`generate`, `fractional`, `randomization`) |
| Consumido por | E01 (`designGenerate`, `surfaceAnalyze`, `surfaceGrid`), P01 (`AnalysisResult::ResponseSurface`, `AnalysisOptions.surface`), U06, U08/U09 |
| Métodos | [composto central](../metodos/composto-central.md), [Box–Behnken](../metodos/box-behnken.md), [superfície de resposta](../metodos/superficie-resposta.md), [matriz personalizada](../metodos/planejamento-personalizado.md) |
| Decisão | [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |

## 1. Responsabilidade

Gerar o composto central (rotacional, face centrada, `α` informado, circunscrito ou inscrito, parte fatorial completa ou fracionária) e o Box–Behnken (3–5 fatores); ajustar o modelo de segunda ordem na escala codificada com ANOVA, `R²`, falta de ajuste, equação codificada e real, região experimental e extrapolação; produzir a malha de predições e as curvas de nível para os gráficos. Não acessa disco, rede, idioma ou interface.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `designs/central_composite.rs` | Parte fatorial, axiais, `α` e arranjos |
| `designs/box_behnken.rs` | Pares de fatores (3–5) |
| `designs/generate.rs` | Integra os tipos, conta ensaios e marca pontos axiais |
| `surface/terms.rs` | Termos, modelo completo padrão, hierarquia, linha do modelo |
| `surface/model.rs` | Codificação, ajuste, ANOVA, falta de ajuste, região, fatos (`analyze`) |
| `surface/equation.rs` | Equação codificada e real |
| `surface/grid.rs` | Malha, condições fixadas, extrapolação (`compute_grid`) |
| `surface/contour.rs` | Curvas de nível e níveis redondos |
| `tests/surface_validation.rs` | Validação contra Python, NumPy e SciPy |

## 3. API pública

`designs::generate(&DesignSpec)` com `DesignKind::CentralComposite { axial, inscribed, generators }` ou `BoxBehnken`; `surface::analyze(&SurfaceRequest)`; `surface::compute_grid(&GridRequest)`. Registro: `response_surface_design` e `response_surface` (`implemented` + `numericallyValidated`). Protocolo: `designGenerate`, `surfaceAnalyze`, `surfaceGrid`.

## 4. Fluxo de dados

U06 (`DesignPanel`, objetivo *superfície*) → `designGenerate` → grade → respostas → U07 (`AnalysisSetup`, termos) → `surfaceAnalyze` → `AnalysisRecord` → U08 (`SurfaceResults`) → U09 (`SurfaceView`) → `surfaceGrid` (reajuste + malha + curvas) → figuras SVG/PNG e CSV.

## 5. Erros e limitações

Ver [seção 7 do método](../metodos/superficie-resposta.md#7-casos-sem-resultado-válido). Sem R² de predição, ponto estacionário, blocos, misturas ou Box–Behnken de 6 e 7 fatores. Termos limitados a grau 2 e interações de dois fatores.

## 6. Manutenção

- Novo planejamento: variante em `DesignKind` (regenerar tipos), arquivo próprio em `designs/`, caso em `make_surface_cases.py` **independente do Rust**, campos na interface e textos PT/EN.
- Nova estatística da superfície: campo em `SurfaceResult`, cálculo em `surface/model.rs`, referência em Python, coluna na interface.
- Regenerar as referências: `python validation/tools/make_surface_cases.py`.
- Testes: `cargo test -p optima-core`; `npm test`; `npm run test:e2e`.

## 7. Testes e validação

Testes unitários dos geradores, dos termos, da equação (coincidência codificada × real) e dos contornos (círculo, plano, níveis); `tests/surface_validation.rs` (12 matrizes e 6 análises, malha 5×5 com extrapolação e recusas); paridade WebAssembly; E2E em Chromium e Firefox (planejar, preencher, ajustar, equação, malha, exportar, reabrir; matriz personalizada); axe nos três temas.
