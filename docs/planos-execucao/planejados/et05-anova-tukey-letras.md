# ET05 — ANOVA, Tukey e letras

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F04 |
| Marco | **M2 — Comparação completa** |
| Depende de | ET04 |
| Módulos | C04 (`studentized_range`), C06–C09, C16 (`means`, `residuals`), C18, U07–U09, U16 inicial |
| Ativado em | — |
| Concluído em | — |

## 1. Objetivo

Entregar o percurso completo de comparação de tratamentos: delineamento inteiramente casualizado (DIC), ANOVA de um fator, Tukey/Tukey–Kramer, letras de comparação no gráfico de médias, explicações curtas e exportação inicial, com o exemplo das quatro condições de reação enzimática.

## 2. Escopo

**Inclui**

- ANOVA de um fator com especificação de independência: somas de quadrados, graus de liberdade, quadrados médios, F, p, médias por grupo, coeficiente de variação e tamanho de efeito definido em DT.
- Distribuição da amplitude studentizada (CDF e quantil) com validação própria antes de liberar o Tukey.
- Tukey (grupos balanceados) e Tukey–Kramer (desbalanceados): diferenças, erros-padrão, estatística q, p ajustado e intervalos simultâneos; família e alpha explícitos.
- Letras de comparação derivadas das mesmas comparações; pares não estimáveis ou não testados não são tratados como iguais; mais de 26 grupos suportados.
- Gráfico de médias com barra de incerteza identificada (desvio-padrão, erro-padrão ou IC) e letras; tabela de pares acessível a partir do gráfico; legenda: compartilhar letra indica diferença não detectada, não equivalência.
- Boxplot por grupo para inspeção da distribuição das observações.
- Diagnóstico de resíduos (resíduos × ajustados, QQ normal) e verificação de homogeneidade definida em DT, sem troca automática de método.
- Entradas **Comparar tratamentos** e **Analisar dados existentes** funcionais para este método.
- Análise salva no projeto, vinculada à revisão; reabrir não recalcula; recalcular cria nova análise.
- Exportação inicial: tabelas em CSV e figura em PNG e SVG com proveniência.

**Não inclui**

- Dunnett, Games–Howell, Welch, Bonferroni/Holm, Kruskal–Wallis/Dunn, DBC e pareados (v0.2, F08).
- Personalização gráfica completa e demais formatos (ET09 e v0.2).

## 3. Entradas e referências

- [Roteiro — F04](../roteiro-produto.md#f04--comparação-de-tratamentos-anova-e-tukey-com-letras) e [exemplo de percurso Tukey no mapa](../../arquitetura/mapa-modulos.md#exemplo-de-percurso-tukey-com-letras).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §5, §11 e §13.
- Piepho, H.-P. (2004). An algorithm for a letter-based representation of all-pairwise comparisons. *Journal of Computational and Graphical Statistics*, 13(2), 456–466.
- [Letras de comparação — emmeans](https://rvlenth.github.io/emmeans/reference/CLD.emmGrid.html).
- Referências de validação: R (`aov`, `TukeyHSD`, `ptukey`/`qtukey`, pacotes de letras), SciPy (`studentized_range`) e statsmodels (`pairwise_tukeyhsd`); conjuntos NIST StRD de ANOVA (SiRstv, SmLs01–SmLs09, AtmWtAg).
- Pendências: PD-04 (variantes) e PD-06 (biblioteca de gráficos).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Amplitude studentizada | Algoritmo de CDF e quantil | Algoritmo de Copenhaver & Holland (1988), base do `ptukey` do R, com quadratura de Gauss–Legendre | Exatidão comparada a R/SciPy, custo no WASM |
| Algoritmo das letras | Construção das letras a partir dos pares | Inserção e absorção (Piepho, 2004) | Correção semântica, ordem estável, muitos grupos |
| Tamanho de efeito e homogeneidade | Quais métricas e testes apresentar | η², ω²; Brown–Forsythe (Levene pela mediana) | Uso no laboratório, clareza da interpretação |
| Biblioteca de gráficos | Renderização 2D e caminho para 3D (ET07) e exportação (ET09) | Plotly.js, Apache ECharts, Vega-Lite, D3/visx | SVG exportável, 3D disponível, acessibilidade, licença, tamanho |

## 5. Tarefas

- [ ] **T01** — DTs da seção 4.
- [ ] **T02** — C04 `studentized_range`: CDF e quantil; validação contra R e SciPy em grade de k, graus de liberdade e probabilidades.
- [ ] **T03** — C07 `one_way_anova` e `effect_sizes`; especificação de independência e de réplicas experimentais × repetições de medição.
- [ ] **T04** — C09 `family`, `tukey` e `letters`; testes semânticos das letras (pares significativos, sobreposições, ordem, mais de 26 grupos).
- [ ] **T05** — C08 diagnósticos aplicados à ANOVA e C16 `means` e `residuals` (séries sem estilo).
- [ ] **T06** — C18: conclusão, evidência e próximo passo; textos PT/EN da legenda das letras.
- [ ] **T07** — U07 `ComparisonSetup.tsx`: resposta, fator de agrupamento, alpha e família.
- [ ] **T08** — U08 `AnovaTable.tsx`, `ComparisonTable.tsx`, `DiagnosticPanel.tsx`, `Interpretation.tsx`.
- [ ] **T09** — U09 `ChartView.tsx` e `LetterLayer.tsx`: gráfico de médias com incerteza nomeada e letras; boxplot por grupo.
- [ ] **T10** — U16 inicial: CSV das tabelas, PNG e SVG da figura, metadados de método, configuração, revisão e versão.
- [ ] **T11** — Análise persistida no documento e reaberta sem recálculo.
- [ ] **T12** — Exemplo sintético identificado em `examples/`: quatro condições de reação enzimática com réplicas experimentais independentes; caso de validação correspondente.
- [ ] **T13** — Casos de validação ANOVA (NIST SiRstv, SmLs, AtmWtAg) e Tukey balanceado e desbalanceado.
- [ ] **T14** — E2E nas duas plataformas: importar → ANOVA → Tukey → letras → exportar → salvar → reabrir.
- [ ] **T15** — Documentação: `docs/metodos/anova-um-fator.md`, `amplitude-studentizada.md`, `tukey.md`, `letras-comparacao.md`; fichas C07–C09, C16, U07–U09, U16.

## 6. Entregas

Percurso de comparação de tratamentos completo e validado, exemplo de quatro condições e exportação inicial.

## 7. Critérios de conclusão

1. O exemplo percorre importação → ANOVA → Tukey → letras → exportação → reabertura nas duas plataformas, com resultados compatíveis com referências independentes.
2. Letras verificadas semanticamente, sem exigir os mesmos caracteres de outro software.
3. A barra de incerteza exibida está sempre nomeada no gráfico e na exportação.
4. Diagnósticos aparecem como evidência; nenhum selo genérico de validade baseado em p ou R².
5. Arquivos exportados contêm método, configuração, revisão e versão.

**Marco M2** atingido com ET04–ET05 concluídas.

## 8. Verificação

Validação de distribuições e ANOVA; testes semânticos de letras; paridade nativo × WASM; E2E do percurso; inspeção visual das figuras exportadas.

## 9. Documentação a criar ou atualizar

Especificações de métodos, fichas, DTs, casos de validação, exemplo em `examples/` e [matriz de cobertura](../../produto/matriz-cobertura.md).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Exatidão da amplitude studentizada em extremos | Validar antes de expor Tukey; documentar faixa suportada |
| Biblioteca de gráficos inadequada para 3D ou SVG | DT avalia já as necessidades da ET07 e ET09 |
| Interpretação errada das letras | Legenda fixa e tabela de pares a um clique |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
