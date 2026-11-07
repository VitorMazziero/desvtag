# ET23 — Modelos mistos e medidas repetidas avançados

Estado: concluído localmente; CI da candidata final no fechamento da v0.4. Data: 2026-11-03. Versão-alvo: v0.4.0. Dependência: ET22 concluída.

## Objetivo

Entregar testes F conjuntos, médias marginais e comparações a partir do modelo ajustado, estruturas AR(1) e não estruturada, papéis próprios de unidade/tempo e perfis individuais/médios. Preservar os registros da ET22 e a gramática visual da ET27. O trabalho científico permanece no Rust. Não substituir uma estrutura pedida por outra sem erro/aviso explícito.

## Tarefas e aceite

- [x] **T01 — Decisão, inventário e contrato.** DT antes do código; separar estrutura marginal e componentes identificáveis; extensões opcionais no esquema 1; compatibilidade de resultados v1 e proveniência v2 das extensões. Inventariar inferência/codificação, IO, mapeamento e apresentação.
- [x] **T02 — Unidade e tempo.** Coluna de tempo própria na grade/importação/exportação e revisão; fonte unidade/tempo por coluna ou fator; identidade sem colisões por sanitização (dois nomes distintos não podem virar a mesma unidade); ordem/valores de tempo explícitos; dados ausentes e duplicação unidade×tempo diagnosticados. Avaliar no navegador.
- [x] **T03 — Covariâncias no Rust.** REML, CS/intercepto aleatório existente, AR(1) e não estruturada positiva definida; matriz por unidade, ausências sem imputação, parâmetros e convergência/fronteira; rejeitar estrutura não identificável. Referência independente antes de declarar validação.
- [x] **T04 — Testes F conjuntos.** Satterthwaite multivariado (Fai–Cornelius), graus de liberdade/valor-p e hipótese por termo; codificação e interpretação explícitas. Casos com mais de dois níveis e interação, desbalanceados e singularidade. Não usar n−p como substituto silencioso de inferência indefinida.
- [x] **T05 — Médias marginais e comparações.** Grade de referência documentada, ponderação dos fatores e covariáveis, estimabilidade, intervalos e diferenças com ajuste explícito; resultados/solicitação persistidos e exportáveis. Conferir contra implementação independente.
- [x] **T06 — Perfis.** Pontos por unidade e perfil médio/modelado com n/unidades/legenda, referência ao conjunto histórico e exclusões; cálculos de médias/faixas no motor; gramática comum, tabela fonte e exportação. Avaliar no navegador nos seis temas e PT/EN.
- [x] **T07 — Interface e apresentação.** Decisões em sequência, estrutura de covariância e efeitos fixos distintos, hipóteses/textos do método reais; seções de resumo/tabelas/diagnóstico/figuras/exportação. Persistir todas as opções e resultados sem recálculo.
- [x] **T08 — Validação independente e paridade.** CS contra statsmodels/ANOVA, AR(1) e UN contra implementação matricial independente, R nlme/lmerTest se disponível; registrar semente, tolerância, convergência e casos adversos. WASM×nativo.
- [x] **T09 — Percursos reais.** Criar do zero, importar unidade/tempo, covariâncias e médias/comparações, inválidos/ausentes, desatualização, salvar/reabrir e relatórios renderizados; PT/EN, temas, telas pequenas, axe e WebView2 após implementação de cada tarefa.
- [x] **T10 — Fechamento.** Conferência por requisito; casos, exemplos, fichas, especificação, mapa/cobertura, CHANGELOG e evidências com hashes; concluir só com testes e limites registrados.

## Inventário inicial

`models/mixed.rs` (548 linhas) contém o ajuste de intercepto aleatório, busca em λ, BLUP e Satterthwaite por coeficiente, com dependências só serde/ts-rs. Não há F conjunto, EMM ou covariância temporal. O projeto conserva o resultado v1 desde a ET22. A interface em `RepeatedMeasures.tsx` oferece efeitos principais e fonte da unidade; a sanitização atual pode fundir identificadores diferentes. A coluna tempo ainda não existe. Não foi localizado `Rscript` no PATH; SciPy/statsmodels e implementação independente são alternativas verificáveis, sem afirmar uma comparação R que não ocorreu.

## Referências preparatórias

- [lmerTest, artigo JSS](https://www.jstatsoft.org/article/view/v082i13): aproximação de Satterthwaite para t/F; alternativa Kenward–Roger explicitamente distinta.
- [nlme — AR(1)](https://stat.ethz.ch/R-manual/R-patched/library/nlme/html/corAR1.html): correlação por unidade e índice temporal inteiro.
- [nlme — estrutura geral](https://stat.ethz.ch/R-manual/R-patched/library/nlme/html/corSymm.html): parametrização positiva definida; correlação geral precisa também de variâncias para representar UN heterogênea.
- [emmeans — fundamentos](https://rvlenth.github.io/emmeans/articles/basics.html): médias marginais são funções do modelo e da grade/ponderação, não simples médias observadas.

A [DT-0031](../../decisoes-tecnicas/dt-0031-covariancias-e-inferencia-das-medidas-repetidas.md) registra a formulação e os contratos antes do código dependente. Este inventário não declara variantes implementadas ou validadas.

## Progresso — T02 (2026-11-03)

Coluna opcional `timeText` preservada em revisões/arquivo, importação e CSV/XLSX. Identidade de unidade mapeada sem fundir nomes com espaços, acentos, pontuação ou Unicode; rótulos capturados no resultado histórico. O percurso do navegador encontrou e corrigiu duas perdas: tempo descartado ao criar a revisão e mapeamento da importação reiniciado ao trocar idioma. 6/6 percursos funcionais em Chromium/Firefox/WebKit, 14/14 no Chromium incluindo seis temas × PT/EN, quatro larguras e quatro escalas tipográficas, axe sem violações nesses estados. 454/454 testes unitários. Capturas e exports em [evidências T02](../plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et23/t02`); inspeção visual da grade Clay/EN e modal Modern Dark/PT confirmou largura útil, separação de controles e rótulos legíveis.

T02 permanece aberta: seleção da fonte temporal, ordenação, ausências e diagnóstico unidade×tempo dependem da preparação científica avançada. Os resultados anteriores não são recalculados ao abrir. A etapa não está concluída.

## Progresso — T03 a T07 (2026-11-03)

API v2 implementada de modo aditivo, com covariância/tempo, F conjuntos, grade de referência, EMM/ajustes e perfis calculados no Rust. Cinco referências de covariância e dois modelos fatoriais independentes passaram; cinco testes de integração avançada cobrem também não identificação, ausências e permutação. Interface criada e percorrida do zero nos três navegadores (18/18). A avaliação visual corrigiu campo temporal sem estilo e exposição/duplicação de itens no PDF; delta Chromium 6/6. [Relatório parcial, limites e próximos critérios](../../../validation/reports/et23/README.md). As caixas seguem abertas até a verificação completa de cada critério, incluindo paridade nativa e todos os estados/configurações.

## Fechamento — 2026-11-03

T01–T10 conferidas por requisito no [relatório final](../../../validation/reports/et23/README.md), que substitui os estados parciais dos registros cronológicos acima. Verificação científica independente, WASM/nativo, persistência, matriz visual e última apresentação nos três navegadores/Windows concluídas. Limites metodológicos e externos registrados. A execução segue para ET24, sem encerrar a v0.4.
