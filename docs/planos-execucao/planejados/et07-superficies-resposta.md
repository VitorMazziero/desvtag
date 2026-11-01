# ET07 — Superfícies de resposta e planejamento personalizado

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F06 |
| Marco | Prepara M3 |
| Depende de | ET06 |
| Módulos | C12, C06–C08, C07 (`lack_of_fit`), C16 (`surface`, `contour`), U06–U09 |
| Ativado em | — |
| Concluído em | — |

## 1. Objetivo

Entregar planejamentos e modelos de segunda ordem: compostos centrais (rotacional e face centrada), a opção rotulada CCD após conferência, Box–Behnken e planejamento personalizado ou importado, com ANOVA da regressão, falta de ajuste, equação em unidades codificadas e reais, superfícies 3D e contornos.

## 2. Escopo

**Inclui**

- DCCR/CCRD com pontos axiais ±α rotacionais, parte fatorial completa ou fracionária, pontos centrais e réplicas; FCD com α = 1; parametrizações adicionais apenas quando justificadas.
- Opção rotulada CCD conforme a decisão registrada na ET06.
- Box–Behnken para os números de fatores suportados, com elegibilidade e contagem documentadas.
- Matriz personalizada ou importada, com escolha do modelo e verificação de rank, estimabilidade e domínio.
- Modelo com termos lineares, interações e quadráticos; edição de termos com indicação de hierarquia e histórico; sem eliminação automática silenciosa por valor-p; modelos alternativos salvos como análises distintas.
- ANOVA da regressão, erro puro e falta de ajuste quando identificáveis; R² e R² ajustado; indicação explícita quando falta informação.
- Equação exibida na codificação indicada, coincidente com o preditor.
- Malhas de superfície e contorno calculadas em Rust; interface escolhe dois eixos e fixa os demais fatores, exibindo essas condições; região experimental e extrapolação identificadas.

**Não inclui**

- Misturas e planejamentos ótimos/restritos (F09b/F09c).
- Otimização (ET08).

## 3. Entradas e referências

- [Roteiro — F06](../roteiro-produto.md#f06--superfícies-de-resposta-e-planejamento-personalizado).
- Inventário Protimiza e decisão sobre CCD registrados na [ET06](../concluidos/et06-fatoriais-plackett-burman.md).
- Referências de validação: pacote R rsm (`ccd`, `bbd`, ajuste de segunda ordem), pyDOE3, statsmodels e exemplos publicados.
- Pendências: PD-04, PD-05 e PD-06 (renderização 3D).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Parametrizações de α | Valores de α oferecidos | Rotacional (F^¼, F = pontos fatoriais), face centrada (α = 1), outras justificadas | Correspondência com a literatura e o Protimiza |
| Box–Behnken | Números de fatores suportados e fonte das matrizes | Construções publicadas | Verificação independente das matrizes |
| Renderização 3D | Desenho da superfície e exportação | Recurso 3D da biblioteca escolhida na ET05; three.js | Rotação acessível, exportação PNG, desempenho |
| Métricas de ajuste | Métricas adicionais | R² de predição (PRESS) | Utilidade para iniciantes, referência |

## 5. Tarefas

- [ ] **T01** — DTs da seção 4.
- [ ] **T02** — C12 `central_composite` (CCRD, FCD, CCD conferido) e `box_behnken`.
- [ ] **T03** — C12 `custom`: matriz personalizada/importada com verificação de rank e estimabilidade para o modelo escolhido.
- [ ] **T04** — Modelo de segunda ordem, edição de termos com hierarquia e histórico de modelos alternativos.
- [ ] **T05** — C07 `lack_of_fit`: erro puro, falta de ajuste e indicação de informação insuficiente.
- [ ] **T06** — Equação em unidades codificadas e reais; teste que confirma coincidência com o preditor.
- [ ] **T07** — C16 `surface` e `contour`: malhas, região experimental e marcação de extrapolação.
- [ ] **T08** — U09 `SurfaceView.tsx` e contorno; seleção de eixos e fixação dos demais fatores visível.
- [ ] **T09** — Exemplo sintético em `examples/`: DCCR com fatores selecionados na triagem da ET06.
- [ ] **T10** — Validação de matrizes, ajustes, falta de ajuste e predições na malha.
- [ ] **T11** — Documentação: `docs/metodos/composto-central.md`, `box-behnken.md`, `superficie-resposta.md`, `planejamento-personalizado.md`; fichas C12, C16.

## 6. Entregas

Superfícies de resposta completas e exemplo DCCR encadeado à triagem.

## 7. Critérios de conclusão

1. Matrizes e ajustes correspondem às especificações e às referências independentes.
2. Superfícies e contornos reproduzem as predições do modelo; regiões fora do domínio são identificadas.
3. A equação exibida usa a codificação indicada e coincide com o preditor.
4. Falta de ajuste aparece apenas quando identificável; caso contrário, a ausência de informação é explícita.

## 8. Verificação

Testes de matrizes e de ajuste; comparação ponto a ponto entre malha e preditor; paridade nativo × WASM; E2E planejar → ajustar → visualizar nas duas plataformas.

## 9. Documentação a criar ou atualizar

Especificações, fichas, DTs, [matriz de cobertura](../../produto/matriz-cobertura.md) e exemplo.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Desempenho do 3D no navegador | Resolução de malha ajustável e medição na ET10 |
| Remoção de termos sem critério | Edição manual com histórico; nenhuma eliminação automática silenciosa |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
