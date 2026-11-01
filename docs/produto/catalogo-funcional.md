# Catálogo funcional

**Estado:** vigente · **Atualizado em:** 2026-11-01

Escopo aprovado em 2026-11-01: **todos os métodos existentes no Protimiza e os métodos e recursos já discutidos para o EnziTAG Optima**. Português e inglês são requisitos do produto desde o início.

**Situação:** catálogo de requisitos. Nenhum método listado está implementado ou validado nesta etapa. A sequência de implementação está no [roteiro do produto](../planos-execucao/roteiro-produto.md); a organização dos arquivos está no [mapa de módulos](../arquitetura/mapa-modulos.md). A versão-alvo e a situação de cada item ficam na [matriz de cobertura](matriz-cobertura.md).

## Referência Protimiza

As capturas fornecidas mostram as seguintes opções de planejamento:

| Rótulo da referência | Cobertura a especificar |
|---|---|
| Central Composite Rotatable Design — CCRD | Planejamento composto central rotacional, DCCR |
| Face Centred Design — FCD | Planejamento composto central de face centrada |
| Central Composite Design — CCD | Opção identificada por esse rótulo na referência; conferir sua matriz e nomenclatura |
| Fractional Factorial Design — FFD | Fatorial fracionário, geradores e estrutura de confundimento |
| Plackett & Burman — PB | Planejamento Plackett–Burman |
| Custom Design | Planejamento personalizado |

Também aparecem cadastro de fatores e respostas, níveis e unidades, réplicas, pontos centrais, matriz experimental, valores codificados ou reais, seleção da resposta, regressão e seleção de termos, equação, erros-padrão, testes e valores-p, nível de significância, Pareto, experimental versus predito e ANOVA com regressão, resíduos, falta de ajuste, erro puro e R².

O requisito de cobertura do Protimiza é integral. O inventário acima se baseia nas telas fornecidas; a área interna do serviço não foi autenticada nesta sessão. As funções que não aparecem nas capturas ainda precisam ser conferidas. Em particular, a captura rotulada CCD mostra uma contagem de ensaios sem explicitar a parte axial; matriz, fórmula e nomenclatura serão verificadas antes da implementação. Os rótulos e recomendações da referência não substituem a especificação estatística dos métodos.

### Inventário Protimiza (ET06)

**Estado:** inventário parcial · **Atualizado em:** 2026-11-01 · Pendência [PD-05](decisoes-pendentes.md)

**Base e limite da conferência.** O inventário parte da lista de funções descrita acima (as capturas fornecidas na concepção). Nesta execução **não houve acesso** ao serviço Protimiza, às capturas originais nem ao acervo `referencias/` (que não é versionado); portanto nada abaixo foi conferido diretamente no serviço. Cada item é classificado como **conferido** (consta na descrição das capturas e está coberto e verificado no EnziTAG Optima), **coberto, sem conferência no serviço** (consta na descrição, mas a equivalência de rótulos e fórmulas não pôde ser comparada) ou **incerto** (pode existir, sem evidência disponível). A cobertura de produto continua **integral**: um item incerto não é removido do escopo.

| Função da referência | Classe | Cobertura no EnziTAG Optima |
|---|---|---|
| Cadastro de fatores e respostas, níveis e unidades | conferido | U03, ET02 |
| Réplicas e pontos centrais | conferido | `DesignSpec.replicates/centerPoints`, ET06 |
| Matriz experimental com valores reais e codificados | conferido | U06 `RunMatrix`, ET06 |
| Fatorial fracionário (FFD) com geradores e confundimento | conferido | [fatorial fracionário](../metodos/fatorial-fracionario.md), ET06 |
| Plackett & Burman (PB) | conferido | [Plackett–Burman](../metodos/plackett-burman.md), ET06 |
| Seleção da resposta, nível de significância, erros-padrão, testes e valores-p | conferido | [fatorial de dois níveis](../metodos/fatorial-dois-niveis.md), [regressão linear](../metodos/regressao-linear.md) |
| Pareto de efeitos | conferido | `services/charts/pareto`, ET06 |
| Experimental × predito | conferido | `observedPredicted`, ET06 |
| ANOVA com regressão, R², falta de ajuste e erro puro | conferido | C07, ET04/ET06 |
| Resíduos | coberto, sem conferência no serviço | C08, ET04 (gráficos de resíduos: ET05 e ET09) |
| Equação do modelo e seleção de termos | coberto, sem conferência no serviço | termos na ET06; equação e seleção de termos de superfície na ET07 |
| CCRD (composto central rotacional) e FCD (face centrada) | coberto, sem conferência no serviço | ET07 |
| Custom Design | coberto, sem conferência no serviço | ET07 (planejamento personalizado ou matriz importada) |
| Opção rotulada CCD | incerto (ver decisão abaixo) | ET07 |
| Funções fora das capturas (relatórios, exportações, outras análises, gerenciamento de projetos) | incerto | Cobertura pelos formatos aprovados (SVG, PNG, CSV, XLSX, HTML); itens adicionais só entram por decisão do usuário |

**Decisão sobre o rótulo CCD.** A nomenclatura da referência não é copiada. O EnziTAG Optima nomeia cada planejamento pela **geometria e pela fórmula** e mostra sempre a distância axial `α`, o número de pontos fatoriais, axiais e centrais e a contagem total de ensaios antes de gerar. A ET07 oferece: **DCCR/CCRD** (`α = (2ᵏ)^(1/4)`, rotacional), **FCD** (`α = 1`, face centrada) e o **composto central com `α` informado** (o caso geral, que cobre a opção rotulada CCD qualquer que seja a variante usada pela referência: circunscrito, inscrito ou outro). A contagem de ensaios exibida na captura rotulada CCD não pôde ser reconciliada com uma fórmula sem acesso à matriz; a conferência com o usuário permanece como ponto aberto de PD-05 e **não bloqueia** a ET07, porque o caso geral com `α` explícito é suficiente. Implementado na ET07 ([composto central](../metodos/composto-central.md), [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md)); registrado em [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md); a conferência no serviço de referência continua sendo o ponto aberto.

**Pergunta ao usuário (não bloqueante).** Se houver acesso às capturas ou ao serviço, indicar quais funções internas adicionais devem ser cobertas e a contagem de ensaios e `α` da opção rotulada CCD para um caso de 2 e de 3 fatores.

## Planejamentos e organização experimental

Além da cobertura da referência, estão incluídas as famílias já discutidas:

- Fatoriais completos e fracionários, incluindo expansão para níveis mistos.
- Delineamento inteiramente casualizado — DIC.
- Delineamento em blocos casualizados — DBC.
- Compostos centrais e Box–Behnken.
- Planejamentos de misturas.
- Planejamentos ótimos e planejamentos sujeitos a restrições.

O cadastro deve representar fatores quantitativos e categóricos, níveis, unidades, respostas, blocos, réplicas, pontos centrais e identificação dos ensaios. Aleatorização, ordem de execução e valores codificados e reais também pertencem ao escopo.

O usuário define fatores e respostas; os requisitos de cada método serão tratados em sua especificação, sem transformar um exemplo didático em limite arbitrário do aplicativo.

## Modelos, inferência e diagnósticos

| Família | Cobertura incluída na discussão |
|---|---|
| Estatística descritiva | Contagens, médias, variância, desvio-padrão e resumos dos dados |
| ANOVA | Um e vários fatores, interações e análise da regressão |
| Variâncias heterogêneas | ANOVA de Welch e procedimentos compatíveis com a estrutura experimental |
| Regressão | Modelos lineares, termos quadráticos, interações e superfícies de resposta |
| Modelos mistos | Efeitos fixos e aleatórios, blocos e estruturas hierárquicas |
| Pares e acompanhamento no tempo | Modelos apropriados para observações dependentes e medidas repetidas |
| Ajuste não linear | Estimativa de parâmetros; Monod foi o exemplo de aplicação discutido |
| Adequação | Resíduos, verificações de pressupostos, métricas de ajuste, falta de ajuste e erro puro quando estimáveis |
| Planejamento da precisão | Análise de potência, conforme a família estatística correspondente |

Resultados previstos incluem estimativas, erros-padrão, graus de liberdade, estatísticas de teste, valores-p, intervalos de confiança, tamanhos de efeito, coeficiente de variação, predições e rastreabilidade das escolhas aplicadas. A lista exata de métricas de cada método será documentada com sua implementação.

## Comparações e procedimentos não paramétricos

- Tukey e Tukey–Kramer, com comparações e geração de letras para os gráficos.
- Dunnett.
- Games–Howell.
- Ajustes Bonferroni e Holm para famílias de testes.
- Contrastes planejados.
- Médias marginais estimadas e contrastes derivados do modelo apropriado.
- Kruskal–Wallis e comparações de Dunn.

A estrutura inclui grupos independentes, tratamentos contra controle, combinações de fatores, pares, blocos e acompanhamento das mesmas unidades ao longo do tempo. Cada caso utilizará o modelo e a estrutura de incerteza correspondentes; a implementação não pressupõe aplicar uma mesma comparação às médias brutas de qualquer experimento.

## Gráficos e interpretação

- Efeitos principais e interações.
- Pareto.
- Valores experimentais e preditos.
- Boxplots e gráficos de médias com intervalos de confiança.
- Comparação de médias com letras.
- Resíduos e gráficos de diagnóstico.
- Superfícies de resposta 3D e contornos.
- Visualização das soluções de otimização de uma ou várias respostas.

Cada resultado deve ter explicações curtas em português e inglês. Personalização gráfica, opções de incerteza, formatos de exportação e fluxo guiado foram aprovados nas [decisões aprovadas](decisoes-aprovadas.md); a implementação está detalhada por fase.

## Otimização

Estão incluídas otimização de condições de cultivo e reações, predição a partir dos modelos, otimização de uma ou várias respostas e abordagem por desejabilidade, já discutida como opção para combinar respostas. Objetivos de maximizar, minimizar, alvo e faixa, restrições separadas de preferências, pesos avançados e apresentação de vários candidatos foram aprovados. O algoritmo e os critérios numéricos serão especificados no módulo correspondente.

## O que a aprovação do catálogo resolve

A abrangência desejada está definida. Permanecem o detalhamento de cada procedimento, variantes, algoritmos, configurações, sequência de implementação e casos de validação. Importação, exportação, armazenamento local, Drive e compartilhamento inicial foram aprovados; detalhes técnicos seguem o plano. Colaboração simultânea será especificada posteriormente.

As etapas históricas não limitam o escopo ao primeiro exemplo implementado. Cada método deverá ter sua situação de implementação e validação identificada antes de ser apresentado como disponível.
