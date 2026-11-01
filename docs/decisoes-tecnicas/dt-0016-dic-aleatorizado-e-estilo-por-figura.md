# DT-0016 — DIC aleatorizado e personalização gráfica por figura salva no projeto (fechamento da v0.1)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Decisão do usuário em 2026-11-01: implementar, antes de finalizar a v0.1, a geração aleatorizada de DIC e a personalização por figura (lacunas registradas no [relatório de validação](../../validation/reports/v0.1.0/README.md#lacunas-e-reclassificações)) |
| Pendências relacionadas | — |
| Substitui / substituída por | Complementa a [DT-0011](dt-0011-planejamentos-dois-niveis.md) (aleatorização) e substitui o item 5 da [DT-0014](dt-0014-exportacao-e-relatorio.md) no que diz respeito à personalização por figura (as preferências do dispositivo continuam como estão) |

## Contexto

O primeiro percurso da v0.1 (quatro condições enzimáticas → ANOVA → Tukey → letras) partia de dados já digitados ou colados; o aplicativo não **gerava** o delineamento inteiramente casualizado (DIC) com ordem de execução sorteada. Além disso, a personalização gráfica era só preferência do dispositivo (paleta, fonte, algarismos): não havia título, rótulos de eixos nem controle das letras por figura, e nada disso ia para o arquivo do projeto.

## Decisões

### 1. DIC como método próprio do núcleo, separado do planejamento de dois níveis

`optima-core::designs::completely_randomized` (método `completely_randomized_design`, versão 1) recebe `CrdSpec` (fator, níveis, unidades por nível, aleatorizar, semente) e devolve `GeneratedCrd` (ensaios na ordem de execução, ordem padrão, nível, unidade, algoritmo, avisos e proveniência). Reaproveita **o mesmo PCG32 e Fisher–Yates** da [aleatorização](../metodos/aleatorizacao.md); não reutiliza `DesignSpec` porque o fator é categórico e não tem níveis baixo/alto. Ordem padrão: agrupada por nível (nível 1 com suas unidades, nível 2, …). Sem aleatorização, a ordem de execução é a padrão. Operação do motor `designCrdGenerate` (adição ao protocolo; `PROTOCOL_VERSION` permanece 1 porque nenhuma operação existente mudou).

Regras tipadas: ao menos 2 níveis (máximo 100), nomes não vazios e únicos, ao menos 1 unidade por nível (aviso `design.crd_single_replicate` com 1), no máximo 5000 ensaios (o mesmo limite dos demais planejamentos).

### 2. Cada ensaio é uma unidade experimental com identidade própria

A interface grava `unitId = T<nível>-R<unidade>` (por exemplo `T2-R3`) em cada linha gerada. O identificador nomeia o tratamento e a unidade, não a posição sorteada, e portanto **não muda quando a semente muda**. Atende à regra de que réplicas experimentais e repetições de medição são conceitos distintos e que a independência não é inferida pelo número de linhas.

### 3. Onde fica o DIC no projeto

`Experiment.crd` (opcional, `serde(default, skip_serializing_if)`): guarda só a especificação; a ordem é **regenerada de forma determinística** a partir dela, como já ocorre com `Experiment.design`. Um DIC e um planejamento de dois níveis são alternativos: gerar um limpa o outro. Remover o fator do DIC descarta o DIC. Como o campo é aditivo e opcional, `schemaVersion` permanece 1 (política da [DT-0008](dt-0008-formato-enzitag-versoes-recuperacao.md)): projetos antigos abrem sem migração e a versão anterior do aplicativo ignora o campo novo.

No caminho "Planejar experimento", um DIC gerado é analisado como **comparação de tratamentos** (ANOVA, Tukey, letras), com o fator do DIC já escolhido.

### 4. Personalização por figura salva no projeto

`Experiment.figure_styles`: mapa `chave da figura → FigureStyle` (`title`, `xLabel`, `yLabel`, `showLetters`, `fontScale`, todos opcionais; textos até 200 caracteres; escala 0,85, 1 ou 1,2). A chave é o identificador de teste estável da figura (`means-chart`, `box-chart`, `contour-chart`, …). O documento é validado no Rust (`project.invalid_figure_style`).

A aplicação é **pura sobre o SVG já desenhado**: os textos personalizáveis levam `data-figure="title|xLabel|yLabel|letters|lettersLegend"` e `applyFigureStyle` troca (com escape) ou remove o texto apresentado. Tela, SVG, PNG e relatório HTML recebem o mesmo tratamento porque passam pelo mesmo `ChartFigure`. Os campos oferecidos são os que o desenho tem (`figureFields`). Ocultar as letras remove só a exibição na figura: as letras calculadas continuam na tabela de resultados e a legenda da incerteza continua visível. A personalização **não altera dados, escalas nem resultados**.

### 5. O que continua fora

Letras manuais e anotações livres, símbolos e posição das letras, e rótulos dos eixos da superfície 3D permanecem fora da v0.1 (v0.2). As preferências do dispositivo (paleta, algarismos, idioma de exportação, formato do CSV) não vão ao `.enzitag`.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Estender `DesignSpec` com fator categórico | Misturaria níveis reais baixo/alto com níveis nomeados e complicaria codificação, aliases e análise de dois níveis |
| `ChartSpec` serializada completa no projeto (plano original da ET09-T02) | Maior que o necessário: a figura é derivada dos resultados; só os ajustes de apresentação precisam persistir |
| Reescrever textos por regex sem marcadores | Frágil; os marcadores `data-figure` tornam a troca explícita e testável |
| Subir `schemaVersion` para 2 | Os campos são aditivos e opcionais; subir a versão tornaria projetos novos ilegíveis pela versão anterior sem necessidade |

## Critérios e evidências

Rust: testes unitários do DIC (ordem padrão, determinismo, permutação, códigos de erro, aviso de unidade única), validação contra a [reimplementação independente em Python](../../validation/tools/make_crd_cases.py) (`validation/cases/completely_randomized_design/crd.json`, 6 casos incluindo semente de 2⁵³ − 1), validação do `FigureStyle` e do documento. Web: paridade WebAssembly × casos independentes, estado (DIC e estilos ao salvar e reabrir), aplicação do estilo ao SVG e E2E completo (gerar → conferir a ordem contra a referência → analisar → personalizar a figura → exportar SVG → salvar → reabrir).
