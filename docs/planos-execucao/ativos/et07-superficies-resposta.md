# ET07 — Superfícies de resposta e planejamento personalizado

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F06 |
| Marco | Prepara M3 |
| Depende de | ET06 |
| Módulos | C12, C06–C08, C07 (`lack_of_fit`), C16 (`surface`, `contour`), U06–U09 |
| Ativado em | 2026-11-01 |
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

- [x] **T01** — DTs da seção 4: [DT-0012](../../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) (parametrizações de α, Box–Behnken, matriz personalizada, extrapolação, equação, renderização 3D; R² de predição não adotado).
- [x] **T02** — C12 `central_composite` (CCRD, FCD e `α` informado, circunscrito ou inscrito; a opção rotulada CCD é coberta pelo caso informado, sem conferência no serviço de referência) e `box_behnken` (3 a 5 fatores; 6 e 7 recusados).
- [x] **T03** — Matriz personalizada/importada com verificação de posto e estimabilidade para o modelo escolhido. *Sem `designs/custom.rs`:* a análise (`surface/model.rs`) aceita qualquer matriz quantitativa (ver desvios).
- [x] **T04** — Modelo de segunda ordem, edição de termos com aviso de hierarquia e modelos alternativos guardados como análises distintas (`AnalysisRecord`); sem tela de comparação entre modelos (ver desvios).
- [x] **T05** — C07 `lack_of_fit` (criado na ET06): erro puro, falta de ajuste e indicação explícita de informação insuficiente.
- [x] **T06** — Equação em unidades codificadas e reais; teste que confirma coincidência com o preditor.
- [x] **T07** — C16 `surface/{grid,contour}`: malhas, região experimental, extrapolação por intervalo e alavancagem, curvas de nível.
- [x] **T08** — U09 `SurfaceView.tsx`, superfície 3D e contorno em SVG próprio; seleção de eixos e fixação dos demais fatores visível nas figuras.
- [x] **T09** — Exemplo sintético em `examples/`: DCCR com fatores selecionados na triagem da ET06 ([exemplo 03](../../../examples/03-superficie-meio-cultivo/README.md)).
- [x] **T10** — Validação de matrizes, ajustes, falta de ajuste e predições na malha.
- [x] **T11** — Documentação: [composto central](../../metodos/composto-central.md), [Box–Behnken](../../metodos/box-behnken.md), [superfície de resposta](../../metodos/superficie-resposta.md), [planejamento personalizado](../../metodos/planejamento-personalizado.md); fichas [C12](../../modulos/c12-superficie-de-resposta.md) e [U09](../../modulos/u09-superficie-e-contorno.md).

## 6. Entregas

Superfícies de resposta completas e exemplo DCCR encadeado à triagem.

## 7. Critérios de conclusão

1. [x] Matrizes e ajustes correspondem às especificações e às referências independentes. *Evidência:* `tests/surface_validation.rs` (12 matrizes contra enumeração em Python, com rotacionalidade; 6 análises contra NumPy/SciPy) e `surface.parity.test.ts` (WebAssembly).
2. [x] Superfícies e contornos reproduzem as predições do modelo; regiões fora do domínio são identificadas. *Evidência:* malha 5×5 de cada caso comparada com as predições do NumPy e com o indicador de extrapolação (alavancagem e intervalos); testes unitários das curvas (círculo, plano, níveis) e dos gráficos; E2E com a hachura no contorno.
3. [x] A equação exibida usa a codificação indicada e coincide com o preditor. *Evidência:* teste que avalia a equação codificada e a real em todos os ensaios dos 6 casos e compara a real com um segundo ajuste independente; E2E do exemplo 03.
4. [x] Falta de ajuste aparece apenas quando identificável; caso contrário, a ausência de informação é explícita. *Evidência:* casos 001 (disponível, `p = 0,34`) e 006 (um só ponto central: indisponível, com o fato `surface.lack_of_fit_unavailable` e o texto explicativo).
5. [ ] **Windows:** geração do composto central, ajuste, falta de ajuste e malha no `native-checks.mjs` do job `desktop-windows`. **Pendente da execução da CI** (Linux nativo aprovado).

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
| 2026-11-01 | Etapa ativada ao concluir a ET06; [DT-0012](../../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) registrada com as primeiras evidências. |
| 2026-11-01 | **Núcleo:** `designs/{central_composite,box_behnken}`, tipos `CentralComposite`/`BoxBehnken`, pontos axiais e `α`; módulo `surface/` (termos, ajuste na escala codificada, ANOVA, falta de ajuste, equação codificada e real, região e alavancagem, malha, extrapolação e curvas de nível); operações `surfaceAnalyze` e `surfaceGrid`; resultado `ResponseSurface` e opção `surface` no arquivo do projeto. |
| 2026-11-01 | **Validação:** 12 matrizes (CCD e Box–Behnken) e 6 análises (CCD rotacional 2 fatores, FCD 3, Box–Behnken 3, matriz irregular, modelo sem hierarquia, um só ponto central), com equação em unidades reais por segundo ajuste independente; nativo e WebAssembly. Defeito de referência encontrado: ajustar `y` diretamente em colunas reais dá mais parâmetros que um modelo sem hierarquia; a referência passou a ajustar os valores ajustados. |
| 2026-11-01 | **Interface:** objetivo *superfície* no painel de planejamento (DCCR, FCD, `α` informado, inscrito, parte fatorial fracionária, Box–Behnken), termos sem eliminação automática, resultados, equação, região, superfície 3D e contorno com extrapolação hachurada, exportações; matriz personalizada no caminho de dados existentes. E2E em Chromium e Firefox, axe nos três temas, verificação em PT e EN sem chaves cruas e inspeção visual (corrigidos: legenda sobre o eixo, emendas entre células, rótulos sobre a superfície, hachura nas bordas). |
| 2026-11-01 | **Exemplo 03** (DCCR de 19 ensaios com glicose, peptona e NaCl): coeficientes, ANOVA, falta de ajuste e ponto estacionário recalculados com NumPy fora do código. |
| 2026-11-01 | **Nativo:** `native-checks.mjs` ampliado e executado sob Xvfb no Linux (composto central, ajuste, falta de ajuste e malha): aprovado. |
| 2026-11-01 | **Documentação:** DT-0012, quatro especificações de método, fichas C12 e U09, matriz, catálogo, mapa de módulos, formato `.enzitag`, validação e exemplos. |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`; T01–T11 concluídas e critérios 1–4 com evidência; pendente o critério 5 (execução do job do Windows). Próxima etapa em código: ET08.

## 12. Desvios e descobertas

- **`designs/custom.rs` não criado:** a matriz personalizada não precisa de gerador; a análise aceita qualquer matriz e a estimabilidade vem da QR do núcleo (DT-0012, item 4). Mapa de módulos atualizado.
- **Histórico de modelos alternativos:** cada ajuste vira uma análise guardada com seus termos, mas não há tela de comparação entre modelos; fica como melhoria.
- **Box–Behnken limitado a 3–5 fatores:** 6 e 7 exigem construção por blocos que não foi verificada; recusa explícita.
- **Sem ponto estacionário, análise canônica ou R² de predição (PRESS):** fora do escopo da v0.1 (DT-0012, item 9); o ponto estacionário do exemplo 03 foi conferido fora do aplicativo.
- **3D estático:** projeção ortogonal com rotação por controles; sem arrastar com o mouse e sem WebGL (DT-0012, item 8). Desempenho medido apenas de forma qualitativa (malha de até 61 × 61); medição formal fica para a ET10.
- **Rótulo CCD:** continua sem conferência no serviço de referência (PD-05 aberto, não bloqueante).
