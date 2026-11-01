# ET04 — Fundamentos numéricos e modelos lineares

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F03 |
| Marco | Prepara M2 |
| Depende de | ET03 |
| Módulos | C03, C04 (Normal, t, F, qui-quadrado), C06, C07 (`regression_anova`, `intervals`), C08, C19 |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Construir e validar a base matemática que todos os métodos da v0.1 consomem: álgebra matricial estável, funções especiais, distribuições de probabilidade, ajuste de modelos lineares por QR, ANOVA da regressão, intervalos e diagnósticos de resíduos.

## 2. Escopo

**Inclui**

- C03: tipo de matriz, decomposição QR com tratamento de rank, Cholesky, SVD para diagnóstico e número de condição, somas estáveis, funções especiais (log-gama, beta incompleta regularizada, gama incompleta regularizada), busca de raízes e integração numérica.
- C04: Normal, t de Student, F e qui-quadrado com distribuição acumulada, cauda superior precisa para p pequenos e quantis.
- C06: termos, matriz do modelo, intercepto, codificação de fatores categóricos, interações e termos quadráticos; coeficientes, erros-padrão, covariância, valores ajustados, resíduos, graus de liberdade, estimabilidade e predição com intervalos.
- C07: ANOVA da regressão, testes dos coeficientes e intervalos de confiança.
- C08: resíduos brutos, padronizados e studentizados, alavancagem e distância de Cook.
- Estados explícitos para variância nula, colinearidade, rank deficiente e n ≤ número de parâmetros.

**Não inclui**

- Telas próprias de regressão: a exposição na interface ocorre pelos métodos da ET05–ET07.
- Distribuição da amplitude studentizada (ET05) e distribuições necessárias apenas a métodos posteriores.

## 3. Entradas e referências

- [Roteiro — F03](../roteiro-produto.md#f03--fundamentos-numéricos-e-modelos-lineares) e [validação por módulo](../roteiro-produto.md#6-validação-e-definição-de-pronto-por-módulo).
- [NIST Statistical Reference Datasets](https://www.nist.gov/itl/sed/statistical-reference-datasets): regressão linear (Norris, Pontius, NoInt1, NoInt2, Filip, Longley, Wampler1–5).
- Referências de comparação: R, SciPy/statsmodels e mpmath para valores de alta precisão.
- Pendência: PD-04 (algoritmos e tolerâncias).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Álgebra linear | Implementação própria ou biblioteca para matrizes e decomposições | Implementação própria documentada; nalgebra; faer | Transparência dos cálculos, exatidão, tamanho do WASM, manutenção |
| Funções matemáticas nos dois alvos | Uso da biblioteca matemática da plataforma ou implementação única | `std` de cada alvo; crate `libm` nos dois | Paridade nativo × WASM, exatidão |
| Algoritmos das distribuições | Métodos de CDF e quantil | Frações contínuas para beta incompleta; algoritmos publicados para quantil Normal; inversão com Brent/Newton | Exatidão em caudas, referências publicadas |
| Codificação categórica | Contrastes usados na matriz do modelo | Tratamento (referência), soma zero | Interpretação dos coeficientes, coerência com ANOVA e médias |
| Métrica de exatidão | Como medir concordância | Erro relativo e LRE (log relative error) por grandeza | Comparabilidade com NIST e referências |

## 5. Tarefas

- [x] **T01** — DTs de álgebra linear, funções matemáticas, algoritmos de distribuição, codificação e métrica de exatidão: [DT-0009](../../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md) (registrada depois do primeiro código; ver seção 12).
- [x] **T02** — C03 `matrix`, `qr` (Householder com pivoteamento e tolerância de rank), `svd`, `summation`, `special_functions`, `root_finding`. **Desvio:** `cholesky` e `integration` não foram criadas (nenhum consumidor na ET04); ver seção 12.
- [x] **T03** — C04 `normal`, `student_t`, `f`, `chi_square`: CDF, cauda superior e quantil, mais `evaluate` (lote por contrato).
- [x] **T04** — C06 `terms`, `design_matrix`, `linear`, `prediction`, `covariance` (a estimabilidade está em `covariance.rs`).
- [x] **T05** — C07 `regression_anova` e `intervals`.
- [x] **T06** — C08 `residuals` e `influence`.
- [x] **T07** — C19: método `linear_model` (versão 1) registrado com situação real; resultados com proveniência.
- [x] **T08** — Operações `modelFitLinear` e `distributionEvaluate` no engine, nos dois transportes (WASM e Tauri).
- [x] **T09** — Casos de validação: NIST StRD de regressão linear (11 conjuntos) com LRE registrado; 6 casos do construtor de modelos contra NumPy/SciPy; distribuições (531 pontos, incluindo caudas até 1e-290) contra mpmath.
- [x] **T10** — Casos difíceis: rank deficiente, coluna nula, variância nula (resposta constante), escala extrema, modelo saturado, n = 1 e dados ausentes produzem estado explícito ou diagnóstico codificado.
- [x] **T11** — Paridade nativo × WASM nos casos de validação (Node) e verificação do IPC nativo (Linux).
- [x] **T12** — Documentação: [fundamentos-numericos](../../metodos/fundamentos-numericos.md), [funcoes-especiais](../../metodos/funcoes-especiais.md), [distribuicoes](../../metodos/distribuicoes.md), [regressao-linear](../../metodos/regressao-linear.md); fichas [C03/C04](../../modulos/c03-c04-fundamentos-numericos-e-distribuicoes.md) e [C06–C08](../../modulos/c06-c08-modelos-lineares.md).

## 6. Entregas

Base numérica e modelo linear validados, prontos para ANOVA, planejamentos e superfícies.

## 7. Critérios de conclusão

1. [x] Rotinas utilizadas passam casos independentes de precisão normal e situações numericamente difíceis, com métricas e tolerâncias explícitas. *Evidência:* [distribuições](../../metodos/distribuicoes.md#10-validação) (531 pontos mpmath, erros medidos e tolerâncias), [regressão linear](../../metodos/regressao-linear.md#10-validação) (LRE por conjunto) e `linear_model_edge_cases.rs`.
2. [x] Conjuntos NIST de regressão linear atingem a exatidão registrada na DT; Filip (mal condicionado) atinge 7,3 dígitos nos coeficientes e o motor emite `model.ill_conditioned`; a limitação está documentada. *Evidência:* [DT-0009](../../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md), `linear_model_validation.rs` (assere o aviso do Filip e a ausência de avisos nos demais).
3. [x] Rank deficiente e dados insuficientes produzem diagnóstico compreensível, nunca coeficientes arbitrários silenciosos. *Evidência:* casos 105 (aliasing) e 106 (saturado) e `aliasing_and_saturation_are_explicit_states`.
4. [x] Nenhuma regressão baseada em inversão explícita indiscriminada de matrizes: QR com `R·b = Qᵀy` e `(RᵀR)⁻¹` por substituição; `XᵀX` nunca é formada.
5. [x] Resultados nativo e WASM concordam dentro da tolerância registrada. *Evidência:* `linear.parity.test.ts` (17 casos) e `numeric.parity.test.ts` com as mesmas tolerâncias; IPC nativo no Linux em `native-checks.mjs`.
6. [ ] **Windows 11:** a verificação nativa (`native-checks.mjs`, inclusive `modelFitLinear` e `distributionEvaluate`) roda no job `desktop-windows` da CI; o resultado é a evidência. **Pendente** (mesma pendência das ET01–ET03, ver o [índice](../README.md)). Por isso a ET04 permanece em `ativos/` e os itens da matriz não passam a "validado".

## 8. Verificação

Testes unitários e de propriedades das decomposições; casos NIST; comparação com referências de alta precisão; testes de paridade; revisão da documentação dos métodos.

## 9. Documentação a criar ou atualizar

Especificações em `docs/metodos/`; fichas; DTs; casos em `validation/cases/`; [matriz de cobertura](../../produto/matriz-cobertura.md); `dependencias.md` se houver biblioteca numérica.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Exatidão insuficiente em caudas | Validação contra mpmath com tolerância relativa em p pequenos |
| Divergência entre plataformas | DT de funções matemáticas e testes de paridade desde o início |
| Esforço maior que o previsto | Implementar apenas o que ET05–ET08 consomem; o restante segue com os métodos posteriores |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-01 | Etapa ativada (exceção ao "uma etapa ativa por vez" registrada no índice). |
| 2026-11-01 | **Base numérica:** matriz, QR com pivoteamento, SVD de Jacobi, funções especiais (`ln Γ`, `ln B`, gama e beta incompletas, `erfc`), Brent e quantis no logaritmo da cauda. Normal, t, qui-quadrado e F validadas contra mpmath (4 casos, 531 pontos). Erros iniciais corrigidos durante a validação: cancelamento em `ln B`/prefator de Poisson, `z²` de `erfc` (FMA), critério de parada `2ε` e uma referência mpmath imprecisa na cauda de F (gerador corrigido e verificações cruzadas acrescentadas). Limite documentado: t com g.l. ≥ 1e5 (erro até 2e-11). |
| 2026-11-01 | **Modelos lineares:** `models/`, `inference/`, `diagnostics/`; método `linear_model` registrado; operação `modelFitLinear`. NIST StRD (11 conjuntos) contra mínimos quadrados exatos em racionais: Filip 7,3 dígitos com aviso de condicionamento; os demais ≥ 5,7 (Wampler5, ruído dominante) e a maioria ≥ 9; erros-padrão ≥ 7,2. 6 casos do construtor contra NumPy/SciPy (tolerância 1e-9). 11 testes de borda e propriedades. |
| 2026-11-01 | **Defeito encontrado pelos testes:** `serde_json` sem `float_roundtrip` lê decimais com erro de 1 ULP (ida e volta de `LinearFit` falhou). Corrigido em todo o workspace e no pacote Tauri (DT-0009, item 6). |
| 2026-11-01 | **Paridade e IPC:** `linear.parity.test.ts` e `numeric.parity.test.ts` (WASM em Node); `native-checks.mjs` estendido (regressão Norris e quantil t); executado localmente no Linux (Tauri sob Xvfb). Operação `distributionEvaluate` criada para esse fim. Contratos TypeScript regenerados (64 tipos). |
| 2026-11-01 | **Documentação:** DT-0009, quatro especificações de método, fichas C03/C04 e C06–C08, mapa de módulos, dependências, estrutura do repositório e matriz de cobertura. Verificações locais: `cargo fmt/clippy -D warnings/test` (workspace e Tauri), `biome`, `tsc`, `vitest` (inclui paridade), verificação de links e de versões. |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`; todas as tarefas T01–T12 concluídas; pendente apenas o critério 6 (Windows). Próxima etapa em código: ET05 (exige decisão registrada para estender a exceção de paralelismo).

## 12. Desvios e descobertas

- **DT depois do código.** A regra "criar a DT antes do código" foi cumprida de forma retroativa: DT-0009 foi escrita depois do primeiro código numérico, ao consolidar as decisões já medidas. As escolhas foram guiadas por medições registradas, nenhuma alternativa foi adotada sem teste.
- **`cholesky` e `integration` não criadas.** Nenhuma rotina da ET04 as consome (regressão por QR). A integração numérica entra na ET05 com a amplitude studentizada; `cholesky` só se algum método a exigir. Mapa de módulos atualizado.
- **`estimability.rs` incorporado em `covariance.rs`.** A verificação de estimabilidade é uma função da forma quadrática e não justifica arquivo próprio ainda.
- **Operação `distributionEvaluate` não prevista.** Necessária para verificar as distribuições nos dois transportes sem expor funções internas; também será usada pela interface.
- **Referências.** R não foi usado (indisponível no ambiente); as referências independentes são mpmath, SciPy, NumPy e aritmética racional exata.
- **`serde_json` `float_roundtrip`.** Descoberta de teste (ver registro); afeta toda leitura de números do protocolo e do projeto.
- **Limite aceito.** t com g.l. ≥ 1e5 tem tolerância própria (5e-11 em `sf`); nenhum método da v0.1 depende dessa região.
