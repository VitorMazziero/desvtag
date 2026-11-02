# Histórico de mudanças

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O produto segue versionamento semântico; a `0.x` é o **canal experimental**.

## Planejado (ainda não implementado)

- [Plano da v0.3](docs/planos-execucao/plano-v0.3.md) (ET13–ET20): planilha de coleta (matriz com respostas e importação das respostas), itens adiados da v0.1 e da v0.2 (inclui a seleção de modelos para efeitos de dois níveis), níveis mistos e misturas, planejamentos ótimos, modelos mistos e medidas repetidas, Monod e potência, Google Drive, DOCX, comentários, Safari e canais de atualização.
- Medição das operações novas no limite de tamanho (Dunnett com muitos tratamentos).
- Windows 11: a validação não será realizada (decisão do usuário, 2026-11-02).

## Não lançado — v0.3 (em desenvolvimento)

Ver o [plano da v0.3](docs/planos-execucao/plano-v0.3.md).

### Planejamentos ótimos (ET16)

- **Planejamento D e I-ótimo** por troca de Fedorov sobre uma malha de candidatos, com **restrições lineares** entre os fatores e **ampliação** que mantém os ensaios já realizados; relata eficiências D, A e G e a variância média de predição, e informa em quantos inícios o melhor valor foi alcançado. Validado contra NumPy e contra a busca exaustiva em 6 problemas pequenos. [Método](docs/metodos/planejamentos-otimos.md). **Sem garantia de ótimo global**; a análise posterior é a de superfície de resposta.

### Níveis mistos (ET15)

- **Misturas**: simplex-lattice `{q, m}` e simplex-centroide com limites inferiores (pseudocomponentes), repetições e pontos centrais extras; modelos de **Scheffé** (linear, quadrático e cúbico especial) sem intercepto com ANOVA centrada, e **gráfico ternário** para três componentes. Validados contra `itertools` e `statsmodels` (11 casos). [Método](docs/metodos/misturas.md). Sem limites superiores, sem otimização no simplex e **a análise de misturas não é guardada no projeto** nem entra nos relatórios.
- **Fatorial completo de níveis mistos**: dois a oito fatores com números de níveis diferentes, repetições, aleatorização com semente e planilha de coleta; análise pela ANOVA multifatorial. Geração validada contra a implementação independente em Python (6 casos; Rust e WebAssembly). [Método](docs/metodos/niveis-mistos.md). 

### Atualização e verificação (ET14)

- O aviso de atualização mostra as **notas de versão formatadas** (títulos, listas, tabelas e links https, sem HTML); o manifesto e o release trazem só a seção da versão no CHANGELOG, cortada em limite de bloco.
- Sementes de aleatorização limitadas a 0–2⁵³ − 1 na interface ([DT-0024](docs/decisoes-tecnicas/dt-0024-sementes-no-navegador-e-pdf-sem-novas-fontes.md)).
- Novos: [guia dos resultados](docs/guias/resultados.md), capturas PT/EN dos seis temas e verificação da versão web publicada em quatro navegadores (`app/web/tests/public`).

### Interface (ET21)

- Botões com mais espaço: 16 px entre botões vizinhos e 8 px entre linhas (eram 8 px e 4 px na barra de seções); altura mínima de 40 px (36 px no botão pequeno, que era 32 px). Um teste mede as distâncias nos seis temas e em 1200 e 375 px ([DT-0023](docs/decisoes-tecnicas/dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md)).
- O **logotipo aparece uma só vez** (cabeçalho); o da tela inicial foi retirado.
- Ao trocar de etapa, a página **volta ao topo com rolagem suave** (imediata com movimento reduzido) e o foco vai ao título da etapa.

### Planilha de coleta (ET13)

- A matriz de ensaios exportada (dois níveis, superfícies, DIC e DBC) traz **uma coluna vazia para cada resposta**, com a unidade no cabeçalho, e reexportar preserva os valores já digitados; a matriz do DBC ganhou `unit_id`.
- Importar o **mesmo arquivo** preenchido grava só as respostas nos ensaios correspondentes (por unidade experimental ou por níveis), com conferência: linhas sem ensaio, valores não numéricos, valores que serão substituídos. Planejamento, fatores e ordem dos ensaios não mudam; o estado anterior fica no histórico. [Guia](docs/guias/planilha-de-coleta.md), [DT-0022](docs/decisoes-tecnicas/dt-0022-planilha-de-coleta-e-correspondencia-de-ensaios.md).
- O importador de CSV passa a **ignorar as linhas `# chave: valor`** que o aplicativo grava nos CSV exportados.

## [0.2.0] — 2026-11-02

> **Versão web publicada em 2026-11-02** (https://vitormazziero.github.io/enzitag-optima/) e etiqueta `v0.2.0` criada. O **release do instalador foi publicado pelo usuário** e a **atualização a partir da 0.1.0 foi verificada** ([registro de publicação](docs/distribuicao/publicacao.md#publicação-dos-releases-e-atualização-2026-11-02)). Evidências em [validation/reports/v0.2.0](validation/reports/v0.2.0/README.md).

### Mudanças de ferramenta e desempenho

- **Node.js 22 → 26** (primeira tarefa da etapa, antes das funcionalidades; [DT-0015](docs/decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)).
- **Valor-p de Tukey mais rápido** (tabela de Chebyshev de `W(w; k)`, [DT-0019](docs/decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)): 40 grupos × 30 repetições de ≈ 5,0 s para ≈ 61 ms e 100 grupos × 30 de ≈ 30 s para ≈ 126 ms, medidos com o código da 0.1 e o da 0.2 na mesma máquina ([limites operacionais](docs/arquitetura/limites-operacionais.md)).

### Métodos novos (todos validados contra referências independentes)

| Método | Referência independente |
|---|---|
| Games–Howell (ANOVA de Welch), Bonferroni, Holm | statsmodels, SciPy, scikit-posthocs |
| Dunnett exato (tamanhos desiguais) | integração dupla própria; `scipy.stats.dunnett` |
| Kruskal–Wallis com comparações de Dunn (empates, Bonferroni ou Holm) | SciPy, scikit-posthocs |
| ANOVA multifatorial com blocos (tipos I, II e III), médias marginais, comparações e contrastes | statsmodels |
| Delineamento em blocos completos casualizados (DBC), aleatorizado e reprodutível | PCG32 e Fisher–Yates em Python |
| Seleção e comparação de modelos de superfície (PRESS, `R²` predito, AICc, BIC, eliminação regressiva com hierarquia) | statsmodels |

### Aplicativo

- **Resultados em seções com barra lateral** (resumo, tabelas, efeitos, modelo, diagnósticos, figuras, otimização, confirmação) e **exportação por último**; a opção «mostrar todas as seções» preserva a página longa ([DT-0018](docs/decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md)).
- **Modelo: termos e comparação:** ligue e desligue termos, compare o modelo completo, o atual e o recomendado e siga a sequência de remoções sugerida (com avisos de falta de ajuste, poucos graus de liberdade e sobreajuste).
- **Comparação de tratamentos:** escolha do procedimento (Tukey, Games–Howell, Dunnett com controle, Bonferroni, Holm, Kruskal–Wallis/Dunn) ou **vários fatores** com bloco, tipo de soma de quadrados, médias marginais e contrastes.
- **Planejar:** além do DIC, o **DBC aleatorizado** (blocos e tratamentos nomeados, semente registrada, matriz em CSV/XLSX e análise já preparada com o bloco).
- **Figuras:** letras manuais (identificadas como manuais na legenda), anotações livres, cor, fundo transparente, fonte, grade, legenda e resolução do PNG, salvas no projeto ([DT-0020](docs/decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)).
- **PDF** de figuras (vetorial) e de relatórios (A4, mesmo conteúdo do relatório HTML), com fonte embutida, gerado localmente; verificado no navegador e no aplicativo Windows.
- **Seis temas:** Industrial, Organic e Clay (ET12) além de Soft Light, Modern Dark e Professional, com tokens de relevo e rebaixo, fontes IBM Plex Mono e Source Serif 4, contraste e axe verificados; o **logotipo do grupo** no cabeçalho, na tela inicial e como crédito nos relatórios HTML e PDF (desligável); o logo não é coberto pela licença MIT ([DT-0021](docs/decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)).
- **Um modelo por resposta** (gravado no projeto e usado pela otimização), **seção ativa lembrada** e resultados em seções também na comparação de um fator e nos planejamentos de dois níveis; exemplo sintético [06 — kLa](examples/06-kla-sintetico/README.md).
- **Plataforma Windows 10** (decisão do usuário, [§16](docs/produto/decisoes-aprovadas.md#16-escopo-e-plataforma-da-v02-2026-11-01)): aplicativo verificado no Windows 10 Pro 22H2 e em `windows-latest`.

### Compatibilidade

Projetos da 0.1 abrem sem migração (`schemaVersion` permanece 1; campos novos são opcionais). Uma versão anterior ignora os campos novos de um projeto da 0.2.

### Limitações conhecidas

- **Windows 11 não verificado.**
- O instalador **não tem assinatura de código** (o Windows pode avisar na primeira execução); a atualização ponta a ponta continua não verificada.
- Os dados reais do exemplo kLa não foram distribuídos (PD-16); o exemplo do repositório é sintético.
- PDF: a família de fonte da figura e o hachurado da extrapolação não são reproduzidos (usa Roboto normal; sombreado no lugar do hachurado).
- Operações novas (procedimentos adicionais, ANOVA multifatorial, DBC, seleção) **não foram medidas no limite**; o Dunnett exato pode ser lento com muitos tratamentos (não caracterizado).
- A otimização continua sendo uma busca local com vários inícios: **não prova ótimo global**.
- Sem DOCX nem Google Drive. Marcos M1–M3 não declarados.

## [0.1.0] — 2026-11-01 (release publicado em 2026-11-02 como pré-lançamento)

> A **versão web foi publicada em 2026-11-01** (https://vitormazziero.github.io/enzitag-optima/) e a etiqueta `v0.1.0` existe. O **release do instalador foi publicado pelo usuário em 2026-11-02** (como pré-lançamento) e a atualização para a 0.2.0 foi verificada; ver o [registro de publicação](docs/distribuicao/publicacao.md).

### Métodos e variantes disponíveis

| Método | Variantes | Validação numérica |
|---|---|---|
| Estatística descritiva | geral e por grupo | 9 conjuntos NIST StRD |
| Distribuições Normal, t, F, qui-quadrado e amplitude studentizada | cdf, cauda, quantis | 531 pontos mpmath; 432 pontos SciPy |
| Modelo linear | termos, interações, quadráticos, estimabilidade, predição, resíduos, alavancagem | 11 conjuntos NIST StRD; 6 casos NumPy/SciPy |
| ANOVA de um fator, Tukey/Tukey–Kramer, letras | variâncias iguais; diagnósticos (Brown–Forsythe, QQ) | 11 conjuntos NIST ANOVA; SciPy |
| Fatorial completo, fracionário (geradores, resolução) e Plackett–Burman (8–48 ensaios) | réplicas, pontos centrais, aleatorização com semente (PCG32) | enumeração independente; análise 5 casos |
| DIC aleatorizado (um fator categórico) | 2 a 100 níveis, unidades experimentais com identificador, ordem de execução reprodutível | PCG32/Fisher–Yates independente (6 casos) |
| Análise de efeitos, curvatura, Lenth, falta de ajuste e erro puro | desenhos saturados | NumPy/SciPy |
| Composto central (rotacional, face centrada, α informado, inscrito) e Box–Behnken (3–5 fatores) | matriz personalizada | enumeração independente; 6 casos de superfície |
| Superfície de resposta de 2ª ordem | equação codificada e em unidades reais, região experimental, malha e contornos | NumPy/SciPy |
| Otimização por desejabilidade | maximizar, minimizar, alvo, faixa; limites obrigatórios; pesos; vários candidatos; compromissos; ensaios de confirmação | busca exaustiva independente (6 casos) |

### Aplicativo

- Planejar experimento, analisar dados existentes e comparar tratamentos; digitação, colagem do Excel e importação CSV/XLSX com prévia.
- Projetos `.enzitag` com vários experimentos, revisões e recuperação automática; uso local, sem login.
- Português e inglês; temas Soft Light, Modern Dark e Professional; navegação por teclado; axe sem violações nos percursos testados.
- Exportação: figuras SVG/PNG, tabelas CSV (técnico e Excel PT) e XLSX, relatório HTML autocontido; metadados de proveniência; proteção contra fórmulas.
- Personalização por figura (título, rótulos dos eixos, exibição das letras e fonte), salva no projeto e válida na tela e nos arquivos exportados.
- Aplicativo Windows com verificação de atualizações assinadas (canal experimental).
- Navegador (WebAssembly) e Windows (Tauri) com o mesmo motor Rust.

### Limitações conhecidas

- **Windows 11 não verificado.** O aplicativo foi verificado no Windows 10 Pro 22H2 e em `windows-latest` (Windows Server 2025); o navegador, em Chromium, Firefox, Chrome e Edge estáveis (versões 156–157).
- O instalador **não tem assinatura de código**: na primeira execução o Windows pode mostrar “O Windows protegeu seu computador” (escolha *Mais informações* e *Executar assim mesmo* após conferir a soma SHA-256 do release). As atualizações são verificadas pela assinatura do próprio aplicativo; a atualização ponta a ponta ainda não foi verificada.
- Figuras: sem letras manuais, anotações livres, símbolos nem posição das letras.
- Comparação de tratamentos com 40 ou mais tratamentos pode levar vários segundos ([limites operacionais](docs/arquitetura/limites-operacionais.md)).
- A otimização é uma busca local com vários inícios: **não prova ótimo global** e pede confirmação com ensaios novos.
- Sem PDF, DOCX, Google Drive ou DBC.
- Marcos M1–M3 não declarados.
