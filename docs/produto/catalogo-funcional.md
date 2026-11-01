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
