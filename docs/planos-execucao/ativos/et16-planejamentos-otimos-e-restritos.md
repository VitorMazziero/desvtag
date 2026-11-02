# ET16 — Planejamentos ótimos, restritos e ampliação sequencial

| Campo | Valor |
|---|---|
| Estado | **Ativo** (núcleo, motor e interface entregues; fechamento pendente de verificação nativa) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F09c |
| Marco | Prepara M4 |
| Depende de | ET15 (fatores de níveis mistos e componentes de mistura como candidatos) |
| Módulos | C13 (`designs/{optimal,constraints,augmentation}.rs`), C03 (álgebra), C06 (matriz do modelo), U06, U08 |
| Ativado em | 2026-11-02 |
| Concluído em | — |

## 1. Objetivo

Gerar planejamentos **D-ótimos e I-ótimos** para um modelo escolhido, em regiões com **restrições lineares** entre fatores e com **ensaios já realizados** (ampliação sequencial), mostrando o valor do critério, as eficiências e a estimabilidade, **sem prometer ótimo global**.

## 2. Escopo

**Inclui**

- Conjunto candidato (malha, pontos de planejamentos clássicos, candidatos do usuário) filtrado por restrições lineares `a·x ≤ b`.
- Algoritmo de troca de coordenadas ou de Fedorov com vários inícios e semente; critérios D e I (variância média de predição); eficiências D, A, G e I relatadas.
- Ampliação: manter os ensaios realizados e escolher novos (por exemplo, passar de fatorial a superfície ou separar efeitos confundidos), com blocos opcionais para a nova série.
- Planejamentos ótimos também para misturas restritas (ET15).

**Não inclui**

- Critérios bayesianos e modelos não lineares (avaliar na ET18 se houver uso para Monod).
- Restrições não lineares.

## 3. Entradas e referências

- [Roteiro F09c](../roteiro-produto.md#f09--famílias-avançadas-do-catálogo): «Viabilidade, rank e valor do critério verificáveis; sem promessa universal de ótimo».
- Atkinson, Donev e Tobias, *Optimum Experimental Designs, with SAS*; Goos e Jones, *Optimal Design of Experiments*; Meyer e Nachtsheim (1995, troca de coordenadas).
- Referências independentes: implementação Python própria do critério e da troca (NumPy), comparação de det(X'X) e da variância média de predição.

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Algoritmo | Troca de coordenadas, Fedorov ou ambos? | Coordenadas (contínuo, rápido); Fedorov (candidatos discretos) | Qualidade do critério, tempo no WebAssembly, reprodutibilidade com semente |
| Critério padrão | D ou I por padrão? | D para triagem; I para predição (superfícies) | Objetivo declarado pelo usuário, explicação simples |
| Parada e inícios | Quantos inícios e quando parar? | Fixo com semente; tolerância relativa | Tempo limitado, resultado reprodutível, cancelamento |

## 5. Tarefas

- [x] **T01** — Especificação [`planejamentos-otimos.md`](../../metodos/planejamentos-otimos.md); as decisões (troca de Fedorov com atualizações de posto 1, critério D por padrão para triagem e I para predição, inícios com semente e cancelamento) estão na especificação, sem DT separada.
- [x] **T02** — Núcleo `designs/optimal.rs`: candidatos com restrições, critérios D e I, eficiências D, A e G, troca de Fedorov com vários inícios; testes de propriedade e casos independentes (NumPy e busca exaustiva).
- [x] **T03** — Ampliação com ensaios já realizados mantidos no planejamento e na matriz de informação. *Blocos na ampliação não entregues.*
- [x] **T04** — Operação `designOptimalGenerate`, contratos gerados, paridade WebAssembly e cancelamento pelo canal da busca (`client.cancel`, como na otimização).
- [x] **T05** — `OptimalPanel`: faixas, modelo, critério, número de ensaios, restrições, ampliação, busca cancelável, eficiências, tabela, CSV/XLSX (planilha de coleta) e uso nos dados (análise de superfície); PT/EN. *O gráfico de variância de predição não foi entregue.*
- [~] **T06** — E2E (`methods-flow.spec.ts`) e documentação feitos; exemplo em `examples/` e verificação nativa pendentes.

## 6. Entregas

Planejamentos D- e I-ótimos com restrições lineares e ampliação sequencial, com critério, eficiências e estimabilidade exibidos.

## 7. Critérios de conclusão

1. Todo ensaio gerado respeita as restrições; a matriz do modelo tem posto completo ou o aplicativo explica por que não é possível. *Evidência:* testes de propriedade.
2. Valor do critério e eficiências iguais à referência independente para a mesma matriz; com a mesma semente, o resultado é reproduzível no WebAssembly e no nativo.
3. A tela não declara a matriz «ótima» em sentido global; informa o critério alcançado e o número de inícios.
4. Ampliação preserva os ensaios realizados e permite blocos.

## 8. Verificação

Rust e casos independentes; vitest; E2E; verificação nativa no Windows 10; medição de tempo (limites operacionais).

## 9. Documentação a criar ou atualizar

Especificação, DTs, limites operacionais, mapa de módulos, fichas, matriz de cobertura (F09c), CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Tempo alto no navegador com muitos fatores | Limites medidos e exibidos; cancelamento; número de inícios configurável |
| Ótimos locais | Vários inícios com semente; critério e eficiência sempre visíveis |
| Restrições que esvaziam a região | Verificação de viabilidade com mensagem clara |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Etapa não iniciada. |
| 2026-11-02 | **Ativada e implementada.** Núcleo, motor, interface e validação (NumPy e busca exaustiva, 6 problemas). Desempenho nativo medido (≤ 2,3 s nos piores casos). Pendentes: exemplo, verificação nativa e gráfico de variância de predição. |

## 12. Desvios e descobertas

Nenhum até o momento.
