# Planejamentos D e I-ótimos, com restrições e ampliação

**Estado:** implementado; métricas e ótimos validados contra NumPy e busca exaustiva · **Atualizado em:** 2026-11-04

| Campo | Valor |
|---|---|
| ID no registro do motor | `optimal_design` |
| Módulo | C13 `designs/optimal` |
| Etapa | [ET16](../planos-execucao/concluidos/et16-planejamentos-otimos-e-restritos.md) |
| Casos de validação | [`validation/cases/optimal_design`](../../validation/cases/optimal_design/optimal.json) (5 de métricas e 6 de busca exaustiva); gerador [`make_optimal_cases.py`](../../validation/tools/make_optimal_cases.py) |

## 1. Pergunta

Dado um modelo, um número fixo de ensaios, uma região (com restrições entre os fatores) e, às vezes, ensaios já realizados, **quais combinações de níveis** estimam melhor o modelo?

## 2. Pressupostos

O modelo escolhido descreve a resposta; o erro é aditivo, independente e de variância constante. Fatores quantitativos com faixa `[baixo, alto]`; os candidatos são uma malha regular de 3 ou 5 níveis por fator, dentro das restrições. O planejamento depende do modelo declarado.

## 3. Entradas e opções

1 a 5 fatores com faixa; modelo (linear, com interações de dois fatores, quadrático completo); critério D ou I; total de ensaios (até 60, **incluindo** os já realizados, e pelo menos o número de parâmetros); níveis da malha (3 ou 5); restrições `Σ aᵢxᵢ ≤ b` em unidades reais; ensaios já realizados (mantidos); inícios aleatórios (1 a 50), aleatorização da ordem dos ensaios novos e semente. No máximo 1 500 candidatos depois do filtro.

## 4. Fórmulas

Com `X` a matriz do modelo dos `n` ensaios e `M = XᵀX`, `p` parâmetros e `W` a média de `xxᵀ` sobre os candidatos:
**D:** maximiza `ln|M|`; eficiência `|M|^(1/p)/n`. **I:** minimiza `tr(M⁻¹W)` (variância média de predição); relatada como `n·tr(M⁻¹W)`. Também: eficiência A = `p/(n·tr M⁻¹)` e eficiência G = `p/(n·máx d(x))`, com `d(x) = xᵀM⁻¹x` sobre os candidatos.

## 5. Algoritmo numérico

A versão 5 calcula centro e semiamplitude sem transbordar quando os limites finitos exigem reescala. Antes de montar a matriz, cada nível codificado precisa corresponder a um valor real finito, estritamente crescente, com erro de ida e volta de até 10⁻¹² na escala codificada. Faixas sem resolução suficiente recebem um diagnóstico que identifica o fator.

**Troca de Fedorov** com vários inícios. Para cada ensaio livre `o` e cada candidato `c`, o critério após a troca sai de **atualizações de posto 1** de `M⁻¹`: `M₁⁻¹ = M⁻¹ + (M⁻¹xₒ)(M⁻¹xₒ)ᵀ/(1 − dₒ)`, `ln|M₂| = ln|M| + ln(1 − dₒ) + ln(1 + x_cᵀM₁⁻¹x_c)` e, para I, `tr(M₂⁻¹W) = tr(M₁⁻¹W) − x_cᵀM₁⁻¹WM₁⁻¹x_c/(1 + d_c)`. Aplica-se a melhor troca que melhora o critério e repete até não haver melhora (máximo de 60 passagens). Início `s`: permutação dos candidatos por PCG32 com a semente `semente + s`. Cholesky das matrizes simétricas. **Não há garantia de ótimo global**: o resultado informa em quantos inícios o melhor valor foi alcançado.

### Revisão de integridade da ET25 (2026-11-04, aceita localmente)

AU-B01 exige avaliar a troca conjunta quando remover o ensaio isoladamente deixa a informação singular ou numericamente instável. A decisão é formar a matriz do desenho substituído e usar Cholesky nesse ramo. Isso permite os desenhos saturados e preserva a avaliação rápida por atualizações de posto 1 quando a remoção é segura. A tolerância de melhora continua relativa ao critério. A referência NumPy enumera todos os desenhos pequenos admissíveis e identifica aqueles sem troca de uma linha que melhore o critério. Os testes incluem D/I, saturação, quase saturação, restrições e ensaios fixos fora da malha. A comparação é com os pontos estacionários dessa vizinhança e com seus valores independentes. O desempenho desse ramo será medido no bloco 08 antes de eventual otimização.

A API `evaluate` aceita pontos fora da malha dentro das faixas e restrições declaradas. Lista vazia, dimensões incorretas, valores não finitos, ponto inviável e região candidata vazia são erros explícitos antes da álgebra. Um desenho admissível singular continua retornando métricas indefinidas. A lista avaliada substitui os ensaios fixos da especificação.

A versão 2 do método acrescenta `search` opcional ao resultado. Resultados anteriores continuam desserializáveis sem esse campo. `startsRun` passa a contar todos os inícios solicitados e tentados. O diagnóstico separa sucessos, falhas, inícios aleatórios singulares, recuperações, inícios limitados, passagens e trocas avaliadas. Recuperação não conta como novo início solicitado. A causa de término do desenho escolhido distingue ausência de troca melhor, limite de passagens e singularidade. Um teste interno com orçamento de uma passagem verifica que um desenho melhorado ainda tem término limitado enquanto sua vizinhança final não for examinada. A concordância entre inícios mantém a ressalva de ausência de garantia global.

AU-B01/B05/B06 aceitos localmente no [bloco 07](../planos-execucao/plano-v0.4.md#912-execução-do-bloco-07--integridade-do-ótimo-2026-11-04). Sete testes unitários e sete públicos passaram. Sessenta tentativas pequenas foram conferidas no WASM e no IPC Windows, com 54 resultados estacionários e seis falhas singulares explícitas. O caso real de 60 passagens preserva o desenho e informa limite. Nove percursos novos e seis regressões passaram nos três navegadores. O Windows gerou D/I do zero e conferiu seis temas/PT–EN. As extensões metodológicas e a medição de desempenho continuam no bloco 08.

## 6. Saídas

Ensaios (os já realizados primeiro, depois os novos na ordem aleatorizada ou na da busca) em unidades reais e codificadas; número de candidatos; parâmetros; `ln|M|`; eficiências D, A e G; variância média de predição; inícios executados e inícios que alcançaram o melhor valor; algoritmo; avisos.

## 7. Casos sem resultado válido

`design.optimal_invalid_factor_count`, `_invalid_range`, `_invalid_levels`, `_invalid_starts`, `_invalid_runs`, `_invalid_constraint`, `_invalid_fixed_run`, `_too_few_runs` (menos ensaios que parâmetros), `_more_fixed_than_runs`, `_empty_region` (restrições sem candidatos), `_too_many_candidates` e `_singular` (nenhum início chegou a matriz de informação de posto completo).

## 8. Exemplo

3 fatores, modelo com interações, 8 ensaios: o critério D encontra o fatorial `2³` (ótimo conhecido, `ln|M| = 7·ln 8` e eficiência D = 1).

## 9. Interpretação apresentada ao usuário

O aplicativo mostra a contagem de candidatos, quantos inícios alcançaram o melhor valor e a nota de que a busca é local e **não garante o ótimo global**. O resultado vai para a grade e o modelo polinomial escolhido é aplicado à configuração da análise posterior. A inclusão de blocos adiciona a coluna e o bloco de referência explícito. O ajuste posterior só ocorre quando solicitado pelo usuário.

## 10. Validação

`optimal_validation.rs`: (a) `ln|M|`, eficiências D, A e G e a variância média de predição de 5 planejamentos dados coincidem com o NumPy (`slogdet`, `inv`, `einsum`) a 1e-9; (b) em 6 problemas pequenos (D e I; quadrático, interações, linear; com restrição; com ensaios já realizados) o melhor critério da **busca exaustiva com reposição** (`itertools.combinations_with_replacement`, até 137 mil seleções) é alcançado pela troca; (c) o fatorial `2³` é recuperado como D-ótimo. O teste do WebAssembly repete (b) e (c). E2E no navegador: busca com restrição, tabela com as restrições respeitadas e uso nos dados.

**Desempenho** (nativo, `release`, 10 inícios, critério I, modelo quadrático): 5 fatores × 3 níveis (243 candidatos, 40 ensaios) ≈ 1,6 s; 4 fatores × 5 níveis (625 candidatos, 30 ensaios) ≈ 2,2 s. No WebAssembly espera-se mais tempo; não foi medido separadamente.

## 11. Referências

Atkinson, Donev e Tobias, *Optimum Experimental Designs, with SAS*; Fedorov (1972), *Theory of Optimal Experiments*; Goos e Jones, *Optimal Design of Experiments*; Meyer e Nachtsheim (1995).

## Limitações desta versão

- Só **troca de Fedorov sobre malha** (sem troca por coordenadas contínuas); candidatos limitados a 1 500.
- Blocos fixos aditivos na ampliação conforme §12; sem interação ou efeito aleatório de bloco. Ótimo D/I para misturas e critérios A, G ou bayesianos como objetivo ficam fora (A/G são métricas relatadas).
- O planejamento aplicado fica salvo com especificação, resultado numérico, diagnósticos, associações e revisões; desenhos antigos sem esse registro continuam legíveis. A análise posterior aceita polinômio de um ou mais fatores, com blocos explícitos quando declarados.


## 12. ET25 T06 — blocos na ampliação (aceite incremental Rust/web)

Os ensaios realizados permanecem fixos, com a identidade e os valores/respostas preservados. A ampliação poderá declarar 2–8 blocos de execução, seus nomes, o bloco de cada ensaio fixo e a quantidade de novos ensaios por bloco. As quantidades são definidas pelo usuário; a busca escolhe as condições dentro de cada bloco e não desloca um ensaio para outro. Não pressupor efeito aleatório, correlação intrabloco nem interação bloco×tratamento. O modelo é o polinômio quantitativo declarado mais efeito aditivo fixo de bloco. A [orientação NIST sobre ampliação e blocos](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3364.htm) distingue a execução em etapas; a [descrição de blocos do NIST](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm) explicita o fator de perturbação.

Para o planejamento, usar contrastes de soma zero: com B blocos, o bloco b<B−1 recebe a linha unitária de B−1 colunas, e o último recebe −1 em todas. A linha completa é `[f(x), z(b)]`, incluindo o intercepto em f. D maximiza o determinante da informação completa, com a alocação por bloco fixada; não apresentar o valor bruto como equivalente ao de outro contraste/modelo. I usa a média uniforme das predições em todos os candidatos espaciais e em todos os blocos declarados, independentemente do tamanho dos blocos. W é a média desses produtos externos. Assim, I mede a predição de uma observação média em cada bloco do modelo, e não de um bloco futuro aleatório nem de uma média populacional desconhecida. A/G e os parâmetros relatados referem-se à matriz completa, e a definição/codificação acompanha a saída. Conferir essa decisão por NumPy, incluindo a média explícita das variâncias de predição.

A troca de Fedorov mantém o bloco de cada posição livre. O conjunto candidato espacial é compartilhado, mas cada bloco tem sua própria linha ampliada de modelo. Preservar o ramo de troca conjunta para remoção singular da T01. Inícios, recuperações, falhas, passagens, avaliações e causa de término mantêm a semântica aceita no bloco 07. Aleatorizar somente os ensaios novos dentro de cada bloco; os realizados conservam ordem. A avaliação pública com blocos exige associação explícita entre cada composição quantitativa e o bloco, sem inferir a partir da posição. A API anterior continua para desenhos sem blocos e rejeita falta de associação quando a especificação inclui blocos.

Contratos aditivos: `OptimalSpec.blocks` opcional com nomes, associação dos fixos e quantidades novas; `OptimalRun.block` opcional. Ausência conserva o caminho anterior. A extensão tem versão própria do método. O planejamento usado, associações/identidades e modelo ficam salvos no projeto; reabrir não gera outro desenho. A aplicação à grade usa o resultado capturado, preserva linhas/respostas e registra uma coluna categórica de bloco nova ou já existente. Alterações posteriores de entradas/dados invalidam a aplicação do resultado antigo e pedem nova busca.

A análise posterior precisa incluir o bloco como efeito aditivo. A superfície recebe seleção opcional de coluna de bloco e nível de referência explícito; ajusta polinômio+bloco sem interações, calcula erro puro somente entre réplicas do mesmo bloco e mostra os coeficientes de bloco. Equação, malha, intervalos e otimização devem identificar o bloco de referência usado nas previsões. Não ajustar uma superfície que ignore a coluna criada. Ausência da seleção mantém a análise anterior. A persistência preserva seleção, nível de referência e resultados históricos sem novo ajuste.

As referências independentes devem anteceder o aceite: modelos lineares/interações/quadráticos pequenos, D/I, saturados/quase saturados, restrições e fixos fora da malha, vários blocos novos, casos só fixos e não estimáveis. Enumerar todas as seleções com reposição separadamente por bloco e conferir também os pontos estacionários por troca de uma linha; busca local não é prova de alcançar o máximo global. Comparar análise com efeito conhecido de bloco e impedir que observações de blocos distintos sejam tratadas como réplicas de erro puro. A integração/avaliação no app passou nos três motores, conforme §9.13 do plano da versão; Windows integrado segue em T12.


Na integração T06, o resultado aplicado recebe assinatura `optimal:v1:`: os valores reais são guardados integralmente na grade e nos dados fonte, com formatação significativa apenas na tela. A conferência estrutural compara os valores em unidades codificadas, evitando uma tolerância absoluta que aceite zero em faixas de 1e−12. Protótipos anteriores sem esse marcador continuam legíveis com os valores originais; o app sinaliza divergência histórica entre grade e níveis gerados, sem reescrever o arquivo. O caso de faixa pequena tem regressão no navegador e no armazenamento.

A consulta `evaluate_with_blocks` usa as linhas e associações explicitamente fornecidas, substituindo a alocação e os fixos do gerador para avaliação. Mantém região/modelo/rótulos válidos; aceita um desenho singular (inclusive com menos linhas que parâmetros) com métricas indefinidas. Não infere o bloco pela posição. A regressão altera os campos não usados da alocação e confere que as métricas explícitas permanecem iguais.

Foram corrigidos na integração os vínculos de origem dos cálculos legados (AU-B15) e a origem da malha mostrada com um resultado antigo (AU-B13). Uma resposta tardia conserva seus dados e opções, não sobrescreve edições posteriores e não é anexada a outro experimento/projeto. A malha usa a revisão/codificação/bloco do resultado, ainda por cálculo a partir desse snapshot; esse mecanismo de reconstrução será consolidado na T11 e não significa que a figura numérica já esteja guardada. A leitura do projeto não executa busca nem ajuste primário. Os casos com limites numéricos extremos, razão da desejabilidade e identidade de réplica ficam explicitamente nas fichas AU-B17–B19 da ET28.

A análise posterior da T06 aceita também um único fator quantitativo, com termos linear/quadrático e bloco aditivo. Nesse caso são exibidos coeficientes, equação, diagnóstico e otimização/intervalos condicionais; contornos e superfície 3D continuam exigindo dois eixos quantitativos. Referências independentes de um fator conferem troca do bloco de referência, incerteza e erro puro.

## 13. ET25 T07 — variância de predição (aceite incremental Rust/web)

A saída é geométrica, calculável antes de medir respostas: para a linha completa f(x,b) e M=XᵀX, **h=fᵀM⁻¹f** é Var[ŷ(x,b)]/σ²; a escala alternativa é **n·h**. Não estimar σ² a partir do desenho nem chamar h de variância de uma observação futura: esta seria σ²(1+h), sob os pressupostos de erros independentes e homocedásticos. O [manual primário do pacote rsm](https://search.r-project.org/CRAN/refmans/rsm/html/varfcn.html) define a variância escalada por n/σ². Com blocos, usar a mesma matriz completa e contrastes da §12; cada previsão é condicional a um bloco declarado, sem incluir efeito de um bloco futuro desconhecido.

Avaliar **todos os candidatos admissíveis da malha declarada**, sem nova busca e sem amostragem aleatória. A média uniforme de n·h sobre candidatos×blocos deve coincidir com I relatado; o máximo deve recuperar G=p/(n·máx h). A figura de fração acumulada usa a distribuição discreta desses pontos (e, opcionalmente, um bloco selecionado), identificando o denominador. Não a apresentar como integração exata do volume contínuo. O [gráfico FDS no manual do JMP](https://www.jmp.com/support/help/en/19.2/jmp/fraction-of-design-space-plot-2.shtml) motiva a comparação da distribuição da variância, mas a nossa medida é explicitamente a malha finita, não a amostragem aleatória do programa citado.

Apresentar também as coordenadas reais/codificadas, os valores h e n·h e o bloco na tabela/dados fonte. Os eixos das figuras são codificados e a tabela conserva também as condições reais. Um fator permite curva espacial; dois ou mais, mapa de pontos admissíveis de dois eixos, com os demais fatores fixados explicitamente em níveis da malha. Não interpolar através de região excluída nem unir pontos de diferentes fatias como uma superfície contínua. Uma fatia vazia tem aviso explícito. A figura/distribuição e a tabela devem consumir os mesmos valores do Rust; ordenação/posição acumulada vêm do núcleo.

A API de avaliação exige as linhas reais e associações de bloco explícitas, reutilizando as validações da T06. O perfil requer modelo de posto completo: desenho singular recebe diagnóstico, sem inventar zero, inverter uma matriz singular ou substituir dados. O modelo/codificação e a geometria são os do desenho avaliado, nunca os valores atualmente editados na tela. A função independe de critério/semente/inícios/alocação não utilizados na avaliação e não executa otimização.

O perfil calculado é um suplemento numérico opcional ligado ao planejamento/revisão, com requisição, versão e proveniência próprias. Arquivos antigos sem o suplemento continuam legíveis; abrir não calcula. O usuário pode solicitar a avaliação de um desenho salvo; isso acrescenta um suplemento sem reescrever os resultados originais. Preservar a origem durante troca de projeto/experimento. Para o protótipo com divergência entre níveis gerados e matriz aplicada (AU-B16), bloquear a avaliação nominal até explicitar/corrigir a origem, evitando apresentar a precisão do desenho ideal como a dos dados aplicados.

Referências NumPy independentes precedem o aceite: casos de um a cinco fatores, linear/interações/quadrático, restrições, fixos fora da malha, dois/três blocos e replicação de todas as linhas. Conferir cada h e n·h, médias/máximos, relação I/G, ordem acumulada e invariância da escala n·h à replicação completa. Malformados/singulares e compatibilidade devem ter diagnóstico próprio. Persistência, SVG/CSV/XLSX e avaliação real nos três navegadores integram T07; artefatos finais/relatórios e qualificação Windows permanecem cumulativos T11/T12.

A primeira entrega T07 guarda os valores numéricos e a origem do perfil; as escolhas visuais de escala/eixos/fatia/bloco retornam aos padrões ao reabrir. A consolidação dessas preferências e a inclusão do perfil nos relatórios gerais permanecem no fechamento de artefatos T11. As figuras individuais e os dados fonte já têm exportação própria.

Implementação `designOptimalVariance`, método `optimal_prediction_variance v1`. O projeto conserva suplementos independentes em `optimalVariances`, cada um com identidade e revisão. Vinte e quatro perfis NumPy/1.991 pontos conferem todos os valores e resumos; 12 execuções novas nos três navegadores, três conferências adicionais de exportação por bloco e 54 regressões passaram. CSV/XLSX preservam os mesmos números; SVG/PDF têm escala/modelo e os seis PDFs individuais foram inspecionados. Detalhes e limites na §9.13 do plano v0.4.

As preferências de escala, eixos, níveis fixos, combinação categórica e bloco pertencem ao perfil que está sendo exibido. A escolha de planejamento e perfil para consulta fica separada da configuração da análise. Arquivos anteriores usam a última versão salva e as opções padrão quando esses campos estão ausentes. Alterar a visualização mantém a matriz, os perfis numéricos e as revisões de dados.

O relatório geral do modelo misto inclui o perfil do desenho vinculado ao ajuste. O relatório de superfície inclui o perfil quando os ensaios e o bloco do desenho numérico correspondem à revisão analisada. O resumo distingue o conjunto de candidatos e os blocos, e as figuras usam a escala e a fatia salvas do perfil. O relatório identifica o desenho, o perfil e a revisão. Os valores individuais continuam disponíveis em CSV/XLSX. Veja o [exemplo em dois lotes](../../examples/19-otimo-misto-em-blocos/README.md).

## 14. ET25 T09 — fatores categóricos

O desenho é dependente do modelo e do conjunto candidato, conforme [NIST: D-optimal designs](https://www.itl.nist.gov/div898/handbook/pri/section5/pri521.htm). Categorias são níveis nominais, sem ordem, distância ou termo quadrático implícitos. Usar contrastes de soma zero (L−1 colunas por fator, último nível com −1 em todas); cada fator quantitativo fornece sua coordenada codificada. O modelo linear contém intercepto e todos os efeitos principais; o de interações acrescenta os produtos entre colunas de fatores distintos, inclusive quantitativo×categoria e categoria×categoria; o quadrático acrescenta somente os quadrados quantitativos. Blocos continuam efeitos aditivos fixos, sem interações com tratamentos. O [manual primário do JMP](https://www.jmp.com/support/help/en/19.2/jmp/factors.shtml) distingue o bloco categórico aditivo dos fatores de tratamento. Não converter rótulos em doses numéricas nem chamar uma categoria de bloco para omitir suas interações.

A região é a malha quantitativa admissível cruzada com as combinações categóricas declaradas. Na ausência de lista explícita, usar o produto completo dos níveis; uma lista de combinações permitidas restringe a região sem inventar ordenação. As restrições lineares existentes continuam em unidades reais dos fatores quantitativos e se aplicam a todas as combinações permitidas. Não atribuir coeficientes numéricos de restrição aos rótulos. A alocação nos blocos permanece prescrita. I e G usam exatamente a distribuição uniforme dos candidatos completos e dos blocos, não uma média apenas sobre categorias presentes nas linhas escolhidas. Critérios D/A brutos dependem da codificação declarada; não os apresentar como comparáveis entre modelos/bases distintos. Conferir I/G e os valores por ponto sob permutação de níveis e uma transformação de base não singular.

Contrato aditivo: especificação opcional das categorias, suas combinações e associação dos ensaios fixos; cada ensaio/perfil conserva também os rótulos categóricos. A avaliação exige associações explícitas, como na T06; ausência não significa primeiro nível nem categoria zero. Preservar os caminhos numéricos históricos, suas coordenadas e seus números. Limitar dimensões, produtos candidatos e alocações antes de materializar a região; a qualificação de tempo/memória continua na T10. Referências independentes devem conferir matriz, informação, D/A/G/I, variâncias, troca local e enumeração exaustiva de desenhos pequenos, incluindo apenas categorias, combinações restritas, blocos, fixos fora da malha e casos singulares.

A aplicação precisa preencher todas as colunas selecionadas, preservar dados realizados e registrar o desenho/modelo completo. Não encaminhar silenciosamente um modelo misto para uma superfície que ignore categorias, nem trocar o polinômio por uma ANOVA de níveis nomeados com outra matriz. A integração deve oferecer ajuste do modelo exato usando o motor linear compartilhado, com codificação explícita e histórico imutável; resultados e previsões de outros percursos permanecem identificados pelo modelo que efetivamente ajustaram. Perfis devem filtrar categorias explicitamente nas vistas espaciais e conservar todas na distribuição/tabela, sem interpolação entre rótulos.

`optimal_design v4` guarda a especificação e a associação das categorias. `optimal_prediction_variance v2` inclui os rótulos de cada ponto e conserva a leitura do perfil numérico v1. `designOptimalAnalyze` produz `optimal_model v1` com a mesma base da busca, diagnóstico, intervalos e observações ajustadas, associado ao desenho e à revisão dos dados. A T09 foi aceita incrementalmente no Rust/web, com 14 referências NumPy, 15 ajustes statsmodels e conferência das exportações dos navegadores. Medição de recursos, relatórios gerais e qualificação Windows seguem em T10–T12. Evidências e limites na §9.13 do plano v0.4.

## 15. ET25 T10 — custo e interrupção da busca

Cada posição livre percorre apenas os candidatos do seu bloco. O motor mantém a ordem dos candidatos e das parcelas. Nas linhas esparsas com matrizes finitas, omite produtos por coordenadas zero. A reconstrução direta continua disponível quando remover o ensaio isoladamente deixa a informação singular ou quase singular. Essa troca ainda considera a retirada e a entrada juntas.

O orçamento compartilhado é de 20 bilhões de produtos estimados por solicitação. Com `p` termos, `n` ensaios, `C` candidatos do bloco e `w=1` para D ou `w=2` para I, cada posição regular reserva `(C−1)·w·p² + (w−1)·2p³ + 2p²`. Quando é necessário reconstruir, a posição reserva `(C−1)·(n·p² + w·p³) + 2p²`. A estimativa usa o custo denso e independe da velocidade do aparelho. A alocação da região, as fatorações no início da passagem e a avaliação final têm limites separados de dimensão, passagens e inícios.

Se faltar orçamento para uma posição, o motor descarta a melhor proposta provisória da passagem incompleta e conserva o desenho de posto completo da última passagem concluída ou do início válido. Entre os desenhos disponíveis, usa a mesma regra de seleção por critério e tolerância. A contagem de avaliações inclui as posições concluídas, e a contagem de passagens inclui as varreduras completas. Os inícios solicitados ficam na especificação e os tentados ficam no diagnóstico. `workLimit` é um campo opcional que registra o limite em milhões de produtos se o orçamento interrompeu a busca. O motivo de término do desenho escolhido continua separado do encerramento da busca inteira. O leitor aceita arquivos anteriores e não refaz a busca.

O teto mantém uma varredura de até 60 passagens no caso misto regular medido com 1.500 candidatos, 60 ensaios e 36 termos (cerca de 14,3 bilhões de produtos estimados em I). Na mesma região, cinco inícios de I sem o teto tiveram mediana de 16,76 s no WASM após a otimização das linhas esparsas. A validação dos casos limitados compara os critérios do desenho realmente devolvido com a busca de referência e informa a perda observada, quando houver. Medições, número de avaliações e limites de verificação estão na §9.13 do plano v0.4.
