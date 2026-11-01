# ET05 — ANOVA, Tukey e letras

| Campo | Valor |
|---|---|
| Estado | **Concluído** (Windows 10 no lugar do Windows 11, decisão do usuário) |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F04 |
| Marco | **M2 — Comparação completa** |
| Depende de | ET04 |
| Módulos | C04 (`studentized_range`), C06–C09, C16 (`means`, `residuals`), C18, U07–U09, U16 inicial |
| Ativado em | 2026-11-01 |
| Concluído em | 2026-11-01 |

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

- [x] **T01** — DTs da seção 4: [DT-0010](../../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md) (amplitude studentizada, letras, efeito e homogeneidade, gráficos próprios, exportação, esquema do resultado).
- [x] **T02** — C04 `studentized_range`: CDF, cauda e quantil validados contra SciPy (432 pontos) e mpmath (10 pontos); erro absoluto 5e-13.
- [x] **T03** — C07 `one_way_anova` (com η², ω² e CV no mesmo arquivo; `effect_sizes.rs` separado não foi necessário); independência e réplicas × repetições na [especificação](../../metodos/anova-um-fator.md#2-pressupostos-e-estruturas-compatíveis) e em fato sempre emitido.
- [x] **T04** — C09 `tukey` e `letters`; a família é explícita no próprio `tukey.rs` (`family.rs` não foi criado); testes semânticos das letras (propriedade em grafos aleatórios e de intervalos, 27–60 grupos, 30 letras distintas, pares desconhecidos, grafo patológico).
- [x] **T05** — C08 `assumptions` (Brown–Forsythe) e resíduos; C16 `boxplot` e `residuals` (QQ). As barras `média ∓ dp/EP` vêm de `comparisons` (não há `means.rs`).
- [x] **T06** — C18: `one_way_facts` (conclusão, evidência e próximo passo na interface; fatos por chave; legenda das letras) em PT/EN.
- [x] **T07** — U07: `AnalysisSetup` ganhou o caminho de comparação (resposta, fator, α); `ComparisonSetup.tsx` separado não foi criado.
- [x] **T08** — U08: `ComparisonTables.tsx` (grupos com letras, ANOVA, pares), `ComparisonInterpretation.tsx`, diagnósticos em `ComparisonResults.tsx`.
- [x] **T09** — U09: renderizador SVG próprio (`services/charts`): médias com incerteza nomeada e letras, boxplot, resíduos e QQ; letras na própria figura (`LetterLayer.tsx` não foi necessário).
- [x] **T10** — U16 inicial: CSV das tabelas, SVG e PNG com proveniência (método, configuração, revisão, versões), comando nativo `export_file`.
- [x] **T11** — Análise persistida (`AnalysisResult::OneWayComparison`) e reaberta sem recálculo (E2E e exemplo 01).
- [x] **T12** — [Exemplo 01](../../../examples/01-enzimas-quatro-condicoes/README.md) (quatro condições, cinco réplicas independentes) e caso de validação 101.
- [x] **T13** — Casos de validação: NIST ANOVA (11 conjuntos), Tukey balanceado (101, 103) e desbalanceado (102, 104).
- [x] **T14** — E2E (Chromium e Firefox): colar → ANOVA → Tukey → letras → exportar → salvar → editar → abrir; exemplo 01; PT e EN; axe nos três temas. **No Windows:** a verificação nativa (`native-checks.mjs`, agora com a comparação) depende do job `desktop-windows` (ver critério 6).
- [x] **T15** — Documentação: [anova-um-fator](../../metodos/anova-um-fator.md), [amplitude-studentizada](../../metodos/amplitude-studentizada.md), [tukey](../../metodos/tukey.md), [letras-comparacao](../../metodos/letras-comparacao.md); fichas [C09 (com C04, C07, C08, C16, C18)](../../modulos/c09-comparacao-de-tratamentos.md) e [U07–U09 e U16](../../modulos/u07-u09-u16-comparacao-resultados-e-exportacao.md).

## 6. Entregas

Percurso de comparação de tratamentos completo e validado, exemplo de quatro condições e exportação inicial.

## 7. Critérios de conclusão

1. [x] (Linux e navegadores) O exemplo percorre importação/colagem → ANOVA → Tukey → letras → exportação → reabertura, com resultados compatíveis com referências independentes. *Evidência:* `comparison-flow.spec.ts` (Chromium e Firefox), `native-checks.mjs` (IPC nativo no Linux), `comparison_validation.rs`, `comparison.parity.test.ts`. **No Windows 11: pendente** (critério 6).
2. [x] Letras verificadas semanticamente, sem exigir os mesmos caracteres de outro software. *Evidência:* [letras](../../metodos/letras-comparacao.md#8-validação) (propriedade `compartilha ⇔ não diferente`; igualdade com cliques maximais independentes nos casos 101–104).
3. [x] A barra de incerteza exibida está sempre nomeada no gráfico e na exportação. *Evidência:* teste do renderizador e E2E (`Barras: média ± IC 95%` na tela e no SVG exportado).
4. [x] Diagnósticos aparecem como evidência; nenhum selo genérico de validade baseado em p ou R². *Evidência:* fatos `diagnostics.*`, [DT-0010, item 4](../../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md).
5. [x] Arquivos exportados contêm método, configuração, revisão e versão. *Evidência:* E2E verifica o CSV (`# methodId`, `# revisionId`), o SVG (`<metadata>`) e o PNG (chunk `tEXt`) byte a byte.
6. [x] **Windows (10, no lugar do 11):** `native-checks.mjs` (inclui `comparisonOneWay`) aprovado no Windows 10 Pro 22H2 e no job `desktop-windows` da CI; o fluxo do primeiro percurso foi coberto pelo E2E em Chrome e Edge estáveis. Windows 11 não verificado (decisão do usuário, [§15](../../produto/decisoes-aprovadas.md#15-fechamento-da-v01-2026-11-01)).

**Marco M2** (ET04–ET05 concluídas): **não declarado**; depende dos itens pendentes no Windows de ET01–ET05.

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
| 2026-11-01 | Etapa ativada com decisão registrada de estender o paralelismo até a ET10 (ver [índice](../README.md)). |
| 2026-11-01 | **Núcleo:** quadratura de Gauss–Legendre, amplitude studentizada, ANOVA de um fator, Tukey/Tukey–Kramer, letras, Brown–Forsythe, boxplot e QQ, fatos. Validação: NIST ANOVA (11 conjuntos) a 15,0 dígitos contra a referência exata; 432 pontos da amplitude contra SciPy (5e-13) e mpmath; 4 casos aplicados contra SciPy/NumPy/cliques. |
| 2026-11-01 | **Defeito encontrado pela validação:** a quadratura externa em `u` dava erro de 1e-10 com df pequeno e caudas profundas (singularidade em `u = 0`); passou a nós em `ln(cauda)`, 5e-13. Também: valor de tabela digitado errado de memória (3,8777 em vez de 3,8768) — os testes agora usam tabelas com 3 casas e referências calculadas. |
| 2026-11-01 | **Interface:** caminho "Comparar tratamentos", tabelas, quatro gráficos SVG próprios (tela e exportação da mesma fonte), exportação CSV/SVG/PNG com proveniência, comando nativo `export_file`, resultado guardado no projeto e reaberto sem recálculo, exemplo 01. E2E em Chromium e Firefox (62 testes) com axe nos três temas; verificação visual das figuras nos temas claro e escuro; IPC nativo verificado no Linux. |
| 2026-11-01 | **CI no Windows:** o diagnóstico (execução 41324447874) mostrou que o WebView2 ignora `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`; o passo agora compila o binário de teste com `additionalBrowserArgs` via `TAURI_CONFIG`. Resultado da nova execução registrado nas ET01–ET03. |
| 2026-11-01 | **Documentação:** DT-0010, quatro especificações de método, fichas C09 e U07–U09/U16, formato `.enzitag`, mapa de módulos, matriz de cobertura, exemplo e casos de validação. |
| 2026-11-01 | **Windows (CI):** na [execução 41334658975](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41334658975) (comando de disparo manual, commit `492db19`) o job `desktop-windows` passou em `windows-latest` — Microsoft Windows Server 2025 Datacenter, build 26100, 64 bits: build NSIS do instalador e verificação nativa por WebView2/CDP com `native-checks.mjs` (`engine.info`, estatística descritiva, abertura e adulteração de `.enzitag`, XLSX, regressão NIST, quantil t, comparação de tratamentos, planejamento aleatorizado e análise de planejamento). **Não é Windows 11 de usuário**, não houve diálogos nativos de abrir/salvar nem clone limpo pelo guia: a evidência literal em Windows 11 continua pendente. |
| 2026-11-01 | **Windows 10:** verificação nativa de `comparisonOneWay` aprovada; E2E do percurso 1 em Chromium, Firefox, Chrome e Edge. Marco M2 continua **não declarado**. |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`; T01–T15 concluídas; pendente apenas o critério 6 (Windows). Próxima etapa em código: ET06.

## 12. Desvios e descobertas

- **DT depois do primeiro código** (como na ET04): [DT-0010](../../decisoes-tecnicas/dt-0010-comparacao-de-tratamentos.md) consolidou decisões já medidas.
- **Arquivos não criados:** `effect_sizes.rs`, `family.rs`, `ComparisonSetup.tsx`, `LetterLayer.tsx` e `visualization/means.rs` (cada responsabilidade coube nos arquivos citados nas tarefas). Mapa de módulos atualizado.
- **Biblioteca de gráficos (PD-06):** renderizador próprio em vez de Plotly/ECharts/Vega; a superfície 3D da ET07 terá DT própria.
- **Cauda do Tukey por `1 − cdf`:** o valor-p é indicativo abaixo de ~1e-9; suficiente para a v0.1 e documentado.
- **Sem R:** as referências são SciPy, NumPy, mpmath, aritmética racional exata e cliques maximais.
- **Relatório HTML e XLSX** ficam na ET09; a ET05 entrega CSV, SVG e PNG.
- **`[profile.test] opt-level = 2`:** os casos de quadratura levavam 60 s sem otimização.
