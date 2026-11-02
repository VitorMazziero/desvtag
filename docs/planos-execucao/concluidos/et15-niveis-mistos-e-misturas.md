# ET15 — Níveis mistos e misturas

| Campo | Valor |
|---|---|
| Estado | **Concluído na v0.3** (2026-11-02) com itens movidos para a v0.4 (§13) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F09a (níveis mistos), F09b (misturas) |
| Marco | Prepara M4 |
| Depende de | ET14 |
| Módulos | C13 (`designs/{mixed_levels,mixture}.rs`), C06 (modelos de Scheffé), C16 (gráfico ternário), C17 (otimização em misturas), U06, U08, U09 |
| Ativado em | 2026-11-02 |
| Concluído em | 2026-11-02 (itens não entregues → v0.4) |

## 1. Objetivo

Gerar e analisar **fatoriais com níveis mistos** (fatores com 2, 3 ou mais níveis, numéricos ou categóricos) e **planejamentos de misturas** (componentes que somam 1), cada um com variante inicial documentada e validada contra referência independente, com gráficos próprios e otimização no domínio correto.

## 2. Escopo

**Inclui**

- Níveis mistos: fatorial completo com qualquer combinação de níveis, contrastes (polinomiais ortogonais para numéricos, tratamento ou soma para categóricos), aleatorização com semente, estimabilidade e análise pela ANOVA multifatorial da v0.2.
- Misturas: simplex-lattice `{q, m}`, simplex-centroide, pontos axiais e de verificação; limites inferiores (pseudocomponentes) e superiores com vértices extremos para restrições simples; modelos de Scheffé linear, quadrático e cúbico especial; gráfico ternário (3 componentes) e traço de Cox; otimização por desejabilidade restrita ao simplex.
- Exemplos sintéticos com solução conhecida (padrão PD-08).

**Não inclui**

- Mistura-processo (componentes e fatores de processo combinados) e restrições lineares gerais: avaliar na DT; se ficarem fora, destino ET16 ou posterior.
- Planejamentos ótimos para misturas (ET16).

## 3. Entradas e referências

- [Roteiro F09a e F09b](../roteiro-produto.md#f09--famílias-avançadas-do-catálogo); [matriz de cobertura](../../produto/matriz-cobertura.md).
- Cornell, *Experiments with Mixtures*; Montgomery, *Design and Analysis of Experiments* (fatoriais gerais); Scheffé (1958, 1963).
- Referências independentes: statsmodels (OLS sem intercepto para Scheffé), implementação Python própria das redes simplex e dos vértices extremos.
- Pendência: PD-04 (variantes e tolerâncias), PD-08 (dados).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Contrastes de níveis mistos | Que codificação expor e usar por padrão? | Polinomiais ortogonais (numéricos), tratamento, soma | Interpretação, coerência com a ANOVA multifatorial (tipos I–III) |
| R² e ANOVA sem intercepto | Como apresentar R² e testes nos modelos de Scheffé? | R² corrigido pela média; teste do modelo contra o linear | Coerência com as referências e com a literatura de misturas |
| Restrições de componentes | Até onde vai a v0.3? | Só limites inferiores (pseudocomponentes); limites inferiores e superiores (vértices extremos) | Correção geométrica, validação, utilidade para bioprocessos |
| Esquema do projeto | Como gravar componentes de mistura? | Tipo de fator novo (campo opcional); estrutura própria do experimento | Esquema aditivo, abertura por versões antigas |

## 5. Tarefas

- [x] **T01** — Especificações [`niveis-mistos.md`](../../metodos/niveis-mistos.md) e [`misturas.md`](../../metodos/misturas.md). *As DTs separadas não foram escritas: as decisões estão nas especificações (contrastes e ANOVA pela ANOVA multifatorial já existente; Scheffé sem intercepto com ANOVA centrada; apenas limites inferiores).*
- [x] **T02** — (`designs/mixed_levels.rs`, `mixed_levels_validation.rs`, `make_mixed_cases.py`; 6 casos.) Núcleo: geração de níveis mistos com aleatorização e estimabilidade; testes e casos independentes.
- [x] **T03** — Núcleo (`designs/mixture.rs`, `models/mixture.rs`): lattice, centroide, pseudocomponentes com limites inferiores, repetições, centrais extras, modelos de Scheffé e malha ternária; 6 + 5 casos independentes (itertools e statsmodels). *Vértices extremos (limites superiores) não entregues.*
- [~] **T04** — Malha ternária entregue; *traço de Cox e otimização restrita ao simplex pendentes.*
- [x] **T05** — Operações do motor `designMixedGenerate`, `designMixtureGenerate` e `mixtureAnalyze`, contratos gerados e paridade WebAssembly (níveis mistos).
- [x] **T06** — Projeto: campos opcionais `mixed`, `mixture` e `mixtureModel` no experimento (esquema 1; projetos antigos abrem sem migração).
- [x] **T07** — Interface: `MixedPanel`, `MixturePanel`, `MixtureAnalysis` e `TernaryPlot` (escala viridis, tabela equivalente); PT/EN. *Misturas: a análise não é guardada no projeto e não entra nos relatórios.*
- [x] **T08** — Planilha de coleta (ET13) para os dois tipos: níveis mistos por `unit_id` e misturas por níveis (proporções).
- [~] **T09** — E2E dos dois tipos (`methods-flow.spec.ts`) feitos; exemplos sintéticos em `examples/` e verificação nativa pendentes.

## 6. Entregas

Fatoriais de níveis mistos e planejamentos de misturas com análise, gráficos, otimização, planilha de coleta, exemplos e validação.

## 7. Critérios de conclusão

1. Matrizes de níveis mistos e de misturas iguais às referências independentes (inclusive vértices extremos). *Evidência:* casos em `validation/cases/`.
2. Ajustes de Scheffé (coeficientes, erros-padrão, ANOVA) iguais ao statsmodels nas tolerâncias registradas, no WebAssembly e no nativo.
3. A otimização nunca propõe composição fora do simplex ou dos limites. *Evidência:* teste de propriedade.
4. Gráfico ternário legível em PT/EN e nos seis temas; axe sem violações; exportação SVG/PNG/PDF.
5. Projetos antigos abrem sem migração.

## 8. Verificação

Rust e casos independentes; vitest; E2E nos quatro navegadores; verificação nativa no Windows 10; inspeção visual do gráfico ternário.

## 9. Documentação a criar ou atualizar

Especificações e DTs; mapa de módulos (C13); fichas U06/U08/U09; matriz de cobertura (F09a, F09b); exemplos; CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Vértices extremos com restrições inconsistentes | Validação de viabilidade antes da geração; mensagem explicando a restrição impossível |
| Usuário analisar mistura com modelo com intercepto | O tipo de experimento fixa o modelo de Scheffé; aviso explicativo |
| Gráfico ternário difícil de ler em telas estreitas | Tamanho mínimo e tabela equivalente |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Etapa não iniciada. |
| 2026-11-02 | **Misturas entregues:** simplex-lattice/centroide com limites inferiores e modelos de Scheffé validados (itertools e statsmodels), gráfico ternário e E2E. Pendentes: limites superiores, otimização no simplex, guarda da análise no projeto, exemplos e verificação nativa. |
| 2026-11-02 | **Ativada.** Níveis mistos implementados e validados (geração idêntica à referência Python; E2E com ANOVA multifatorial). **Misturas (simplex, Scheffé, gráfico ternário) e a variante de estimabilidade em fracionários de níveis mistos continuam pendentes.** |

## 12. Desvios e descobertas

Nenhum até o momento.

## 13. Destino dos itens não entregues (decisão de 2026-11-02)

O usuário fechou a v0.3 e levou as demais pendências para a [v0.4](../plano-v0.4.md) ([decisões aprovadas §18](../../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02)). Itens desta etapa que ficam sem entrega na v0.3:

- Misturas: limites superiores, traço de Cox e otimização restrita ao simplex; estimabilidade em fracionários de níveis mistos → [ET25](../plano-v0.4.md#et25--misturas-e-planejamentos-ótimos-avançados).
- Guardar no projeto o resultado da análise de misturas e levá-lo aos relatórios → [ET22](../plano-v0.4.md#et22--resultados-das-famílias-novas-guardados-no-projeto).
- Exemplos criados na v0.3 (07 — misturas; 09 — níveis mistos); a verificação nativa dos fluxos novos está descrita no relatório de validação da v0.3.0.
