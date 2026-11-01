# ET08 — Otimização de uma ou várias respostas

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F07 |
| Marco | **M3 — DoE e otimização** |
| Depende de | ET07 |
| Módulos | C17, C06 (`prediction`), C16 (visualização da desejabilidade), E02 (cancelamento inicial), P01 (vínculo da confirmação), U10 |
| Ativado em | — |
| Concluído em | — |

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

- [ ] **T01** — DTs da seção 4.
- [ ] **T02** — C17 `objective` e `constraints`.
- [ ] **T03** — C17 `desirability`: funções individuais, global ponderada e tratamento de zero.
- [ ] **T04** — C17 `search` e `candidates`: múltiplos inícios, convergência, agrupamento e ordenação.
- [ ] **T05** — Previsões e intervalos por resposta em cada candidato (C06 `prediction`).
- [ ] **T06** — C17 `confirmation`: proposta de ensaios e criação do experimento vinculado (P01); comparação posterior do observado com o intervalo de predição.
- [ ] **T07** — E02 inicial: progresso e cancelamento da busca; descarte de resultados de tarefas canceladas.
- [ ] **T08** — C16: série da desejabilidade sobre dois fatores (acrescentar o arquivo ao mapa de módulos).
- [ ] **T09** — U10 `ObjectivesEditor.tsx`, `ConstraintsEditor.tsx`, `CandidateTable.tsx` e gráfico da desejabilidade.
- [ ] **T10** — Exemplo em `examples/`: otimização de duas respostas do DCCR da ET07, seguida da proposta de confirmação.
- [ ] **T11** — Validação: solução analítica conhecida, ótimo na fronteira, objetivos conflitantes, região inviável e não convergência.
- [ ] **T12** — Documentação: `docs/metodos/desejabilidade.md`, `busca-otimizacao.md`; fichas C17, U10.

## 6. Entregas

Otimização de uma ou várias respostas, com candidatos, previsões e confirmação, fechando o percurso PB → DCCR → otimização → confirmação.

## 7. Critérios de conclusão

1. Casos com solução conhecida, ótimo na fronteira, conflito de objetivos e região inviável apresentam comportamento correto.
2. Nenhum candidato listado como viável viola restrição além da tolerância registrada.
3. A mesma semente produz os mesmos candidatos nas duas plataformas, dentro da tolerância registrada.
4. Cancelar uma busca não altera os resultados atuais nem deixa a interface inconsistente.

**Marco M3** atingido com ET06–ET08 concluídas.

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
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
