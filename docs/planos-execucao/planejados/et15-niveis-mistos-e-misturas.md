# ET15 — Níveis mistos e misturas

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F09a (níveis mistos), F09b (misturas) |
| Marco | Prepara M4 |
| Depende de | ET14 |
| Módulos | C13 (`designs/{mixed_levels,mixture}.rs`), C06 (modelos de Scheffé), C16 (gráfico ternário), C17 (otimização em misturas), U06, U08, U09 |
| Ativado em | — |
| Concluído em | — |

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

- [ ] **T01** — Especificações de método (`docs/metodos/niveis-mistos.md`, `docs/metodos/misturas.md`) e DTs (§4).
- [ ] **T02** — Núcleo: geração de níveis mistos com aleatorização e estimabilidade; testes e casos independentes.
- [ ] **T03** — Núcleo: redes simplex, centroide, axiais, pseudocomponentes e vértices extremos; modelos de Scheffé; casos independentes.
- [ ] **T04** — Núcleo: traço de Cox, malha ternária e otimização restrita ao simplex.
- [ ] **T05** — Operações do motor, contratos gerados e paridade WebAssembly × nativo × Tauri.
- [ ] **T06** — Projeto: tipos de fator novos (campos opcionais) e abertura dos exemplos antigos.
- [ ] **T07** — Interface: painéis de planejamento, resultados em seções, gráfico ternário (tela e exportação SVG/PNG/PDF), otimização; PT/EN, temas e axe.
- [ ] **T08** — Planilha de coleta (ET13) para os dois tipos.
- [ ] **T09** — Exemplos sintéticos, E2E, verificação nativa e documentação.

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

## 12. Desvios e descobertas

Nenhum até o momento.
