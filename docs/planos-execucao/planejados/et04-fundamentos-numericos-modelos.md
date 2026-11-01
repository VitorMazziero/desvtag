# ET04 — Fundamentos numéricos e modelos lineares

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F03 |
| Marco | Prepara M2 |
| Depende de | ET03 |
| Módulos | C03, C04 (Normal, t, F, qui-quadrado), C06, C07 (`regression_anova`, `intervals`), C08, C19 |
| Ativado em | — |
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

- [ ] **T01** — DTs de álgebra linear, funções matemáticas, algoritmos de distribuição, codificação e métrica de exatidão.
- [ ] **T02** — C03 `matrix`, `qr` (Householder com pivoteamento e tolerância de rank), `cholesky`, `svd`, `summation`, `special_functions`, `root_finding`, `integration`.
- [ ] **T03** — C04 `normal`, `student_t`, `f`, `chi_square`: CDF, cauda superior e quantil.
- [ ] **T04** — C06 `terms`, `design_matrix`, `linear`, `prediction`, `covariance`, `estimability`.
- [ ] **T05** — C07 `regression_anova` e `intervals`.
- [ ] **T06** — C08 `residuals` e `influence`.
- [ ] **T07** — C19: registro de método com versão e situação; resultados com proveniência.
- [ ] **T08** — Operação `model.fit_linear` no engine e serialização nos dois transportes.
- [ ] **T09** — Casos de validação: NIST StRD de regressão linear com LRE registrado; distribuições em grade de pontos incluindo caudas, contra mpmath/SciPy/R.
- [ ] **T10** — Casos difíceis: rank deficiente, colinearidade, variância nula, escala extrema e amostra insuficiente produzem diagnóstico compreensível.
- [ ] **T11** — Paridade nativo × WASM nos casos de validação.
- [ ] **T12** — Documentação: `docs/metodos/fundamentos-numericos.md`, `distribuicoes.md`, `regressao-linear.md`; fichas C03, C04, C06–C08.

## 6. Entregas

Base numérica e modelo linear validados, prontos para ANOVA, planejamentos e superfícies.

## 7. Critérios de conclusão

1. Rotinas utilizadas passam casos independentes de precisão normal e situações numericamente difíceis, com métricas e tolerâncias explícitas.
2. Conjuntos NIST de regressão linear atingem a exatidão registrada na DT; quando um caso mal condicionado (como Filip) não atingir o alvo, o motor emite diagnóstico de condicionamento e a limitação fica documentada.
3. Rank deficiente e dados insuficientes produzem diagnóstico compreensível, nunca coeficientes arbitrários silenciosos.
4. Nenhuma regressão baseada em inversão explícita indiscriminada de matrizes.
5. Resultados nativo e WASM concordam dentro da tolerância registrada.

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
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
