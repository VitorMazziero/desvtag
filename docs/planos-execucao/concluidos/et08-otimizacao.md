# ET08 — Otimização de uma ou várias respostas

| Campo | Valor |
|---|---|
| Estado | **Concluído** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F07 |
| Marco | **M3 — DoE e otimização** |
| Depende de | ET07 |
| Módulos | C17, C06 (`prediction`), C16 (visualização da desejabilidade), E02 (cancelamento inicial), P01 (vínculo da confirmação), U10 |
| Ativado em | 2026-11-01 |
| Concluído em | 2026-11-01 |

## 1. Objetivo

Encontrar condições que atendam aos objetivos de uma ou várias respostas a partir dos modelos ajustados, apresentando vários candidatos com previsões e incerteza, e propor ensaios de confirmação como novo experimento vinculado.

## 2. Escopo

**Inclui**

- Objetivo por resposta: maximizar, minimizar, atingir alvo ou permanecer em faixa.
- Restrições obrigatórias separadas de preferências; pesos e importâncias como opções avançadas.
- Desejabilidade individual e global (Derringer & Suich), incluindo respostas fora das faixas e desejabilidade zero.
- Algoritmo de busca com critérios de parada, múltiplos inícios com semente e relatório de convergência; nenhuma afirmação de ótimo global sem justificativa.
- Candidatos viáveis ordenados, com condições reais e codificadas, previsões e intervalos quando estimáveis e compromissos entre respostas.
- Região experimental como domínio padrão; extensão apenas por escolha explícita, com extrapolação identificada.
- Proposta de ensaios de confirmação registrada como novo experimento vinculado ao de origem.
- Cancelamento e progresso para buscas longas (Worker terminado e recriado no navegador; verificação de cancelamento no Windows).

**Não inclui**

- Otimização em modelos de misturas, mistos ou não lineares (F09).

## 3. Entradas e referências

- [Roteiro — F07](../roteiro-produto.md#f07--otimização-de-uma-ou-várias-respostas).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §12.
- Derringer, G.; Suich, R. (1980). Simultaneous optimization of several response variables. *Journal of Quality Technology*, 12(4), 214–219.
- Referência de validação: pacote R desirability e casos analíticos com solução conhecida.
- Pendências: PD-04 e PD-07.

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Estratégia de busca | Algoritmo e critérios de parada | Múltiplos inícios (grade ou hipercubo latino com semente) + Nelder–Mead com projeção nos limites; busca por padrões | Respeito às restrições, reprodutibilidade, transparência |
| Domínio | Forma da região experimental | Cuboidal (limites dos fatores) ou esférica (DCCR rotacional) | Coerência com o planejamento de origem |
| Agrupamento de candidatos | Quando duas soluções são a mesma | Distância em unidades codificadas com tolerância | Lista útil sem duplicatas |

## 5. Tarefas

- [x] **T01** — DTs da seção 4: [DT-0013](../../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) (estratégia de busca, domínio, agrupamento, compromissos, confirmação e cancelamento).
- [x] **T02** — C17 `objective` e `constraints`.
- [x] **T03** — C17 `desirability`: funções individuais, global ponderada e tratamento de zero.
- [x] **T04** — C17 `search` e `candidates`: hipercubo latino com semente, Nelder–Mead projetado, convergência, agrupamento e ordenação.
- [x] **T05** — Previsões e intervalos por resposta em cada candidato (C06 `prediction`).
- [x] **T06** — Confirmação: avaliação nas condições propostas (`evaluate`), criação do experimento vinculado (`origin`, `confirmation` em P01) e comparação posterior do observado com o intervalo de predição. *Sem `confirmation.rs` em C17:* a proposta é montada na interface sobre `evaluate` (ver desvios).
- [x] **T07** — E02 inicial: **cancelamento** da busca (`EngineClient.cancel`; Worker recriado no navegador; resultado descartado no Windows) e descarte de resultados de tarefas canceladas. **Sem progresso incremental** (ver desvios).
- [x] **T08** — C16: série da desejabilidade sobre dois fatores (`optimization/grid.rs`, no mapa de módulos).
- [x] **T09** — U10 `GoalsEditor.tsx` (objetivos e restrições), `CandidateTable.tsx`, `DesirabilityView.tsx` (gráfico), `ConfirmationPanel.tsx` e `ConfirmationCheck.tsx`.
- [x] **T10** — Exemplo em `examples/`: otimização de duas respostas do DCCR da ET07, seguida da proposta de confirmação ([exemplo 04](../../../examples/04-otimizacao-e-confirmacao/README.md)).
- [x] **T11** — Validação: solução analítica conhecida, ótimo na fronteira, objetivos conflitantes, região inviável e não convergência.
- [x] **T12** — Documentação: [desejabilidade](../../metodos/desejabilidade.md), [busca e confirmação](../../metodos/busca-otimizacao.md); fichas [C17](../../modulos/c17-otimizacao-por-desejabilidade.md) e [U10](../../modulos/u10-otimizacao-e-confirmacao.md).

## 6. Entregas

Otimização de uma ou várias respostas, com candidatos, previsões e confirmação, fechando o percurso PB → DCCR → otimização → confirmação.

## 7. Critérios de conclusão

1. [x] Casos com solução conhecida, ótimo na fronteira, conflito de objetivos e região inviável apresentam comportamento correto. *Evidência:* `tests/optimization_validation.rs`, casos 001 (interior), 004 (fronteira), 002 (conflito com limite e pesos), 005 (inviável: sem candidatos), 006 (desejabilidade zero), contra busca exaustiva independente; paridade WebAssembly.
2. [x] Nenhum candidato listado como viável viola restrição além da tolerância registrada (1e-9 na amplitude observada). *Evidência:* verificação em todos os candidatos de todos os casos e no teste nativo do CI.
3. [x] A mesma semente produz os mesmos candidatos nas duas plataformas, dentro da tolerância registrada. *Evidência obtida:* mesma semente → candidatos idênticos no motor nativo (Linux) e no WebAssembly (testes), e melhor `D` dentro do intervalo da referência independente em ambos. **Windows:** job `Tauri (build no Windows)` aprovado em `windows-latest` (Windows Server 2025, não Windows 11) com a verificação nativa de otimização, execução [41339828071](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41339828071) no commit `5e5a375`. A igualdade bit a bit entre plataformas **não** é afirmada (ver [método](../../metodos/busca-otimizacao.md#5-algoritmo-numérico)).
4. [x] Cancelar uma busca não altera os resultados atuais nem deixa a interface inconsistente. *Evidência:* testes do cliente (`cancel`) e E2E (busca de 5000 inícios cancelada; resultado anterior mantido; nova busca funciona).

**Marco M3** (ET06–ET08 concluídas): o critério do marco só se completa com a ET08; a **declaração formal** do marco aguarda M1 e M2, que dependem da evidência em Windows 11 das etapas anteriores.

## 8. Verificação

Testes de C17 com soluções analíticas; comparação da desejabilidade com referência; paridade; E2E do percurso completo de DoE nas duas plataformas.

## 9. Documentação a criar ou atualizar

Especificações, fichas, DTs, [mapa de módulos](../../arquitetura/mapa-modulos.md) (arquivo de visualização da desejabilidade), [matriz de cobertura](../../produto/matriz-cobertura.md) e exemplo.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Ótimos locais | Múltiplos inícios, vários candidatos e linguagem que não afirma ótimo global |
| Extrapolação apresentada como recomendação | Domínio experimental por padrão e marcação explícita fora dele |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-01 | Etapa ativada ao concluir a ET07; [DT-0013](../../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) registrada com as primeiras evidências. |
| 2026-11-01 | **Núcleo (C17):** objetivos (maximizar, minimizar, alvo, faixa), limites obrigatórios, desejabilidade individual e global, hipercubo latino com semente (PCG32), Nelder–Mead projetado, agrupamento, previsões com intervalo de predição, compromissos, relatório de convergência, avaliação em condições dadas e malha de desejabilidade; operações `optimizationRun`, `optimizationEvaluate` e `optimizationGrid`; resultado `Optimization` e `origin`/`confirmation` no projeto. |
| 2026-11-01 | **Validação:** 6 casos (interior, conflito com limite e pesos, alvo e faixa, fronteira, inviável, desejabilidade zero) contra busca exaustiva em NumPy (401² e 61³ pontos); motor ≥ malha − 1e-9 em todos (ex.: caso 002: 0,538089 × 0,538056); sondagens de previsões, IC e IP conferidas com NumPy. |
| 2026-11-01 | **Interface:** painel de otimização nos resultados da superfície (objetivos, limites, domínio, busca, cancelamento), candidatos, compromissos, gráfico de desejabilidade, proposta e conferência da confirmação; E2E em Chromium e Firefox; axe nos três temas; inspeção visual. |
| 2026-11-01 | **Exemplo 04** (DCCR de duas respostas, otimização e confirmação): `D = 0,9255` (malha: 0,9254); confirmação dentro dos intervalos. |
| 2026-11-01 | **Nativo:** `native-checks.mjs` ampliado (otimização com semente) e executado sob Xvfb no Linux: aprovado. |
| 2026-11-01 | **Documentação:** DT-0013, duas especificações, fichas C17 e U10, matriz, mapa de módulos, formato `.enzitag`, validação e exemplos. |
| 2026-11-01 | **Windows:** execução 41339828071 (commit `5e5a375`) aprovada em todos os jobs, inclusive `Tauri (build no Windows)` com a verificação nativa de otimização (`windows-latest` = Windows Server 2025; não é Windows 11). Critério 3 atendido; etapa movida para `concluidos/`. |

**Retomada.** Etapa concluída. Próxima etapa em código: ET09 (gráficos e exportação).

## 12. Desvios e descobertas

- **Sem `confirmation.rs` em C17:** a proposta de confirmação usa `optimizationEvaluate` e o vínculo é criado na interface/estado; o formato do vínculo está em `optima-project`. Mapa de módulos atualizado.
- **Sem progresso incremental e sem interrupção cooperativa no Windows:** o núcleo é síncrono; cancelar encerra o Worker (navegador) ou descarta o resultado (Windows). Buscas típicas levam milissegundos a poucos segundos; medição formal na ET10.
- **Modelo completo por resposta na interface:** o núcleo aceita termos por resposta; a interface não os expõe na otimização.
- **Busca local:** nenhuma afirmação de ótimo global; plano de contingência é aumentar os inícios (o relatório mostra a concordância entre inícios).
- **Caso 003 (alvo e faixa):** o conjunto de pontos com `D = 1` é uma superfície, não um ponto; o motor lista candidatos distintos sobre ele (35 grupos) e o teste não exige posição única nesse caso.
