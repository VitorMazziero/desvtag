// GERADO por scripts/gen-contracts.mjs a partir dos tipos Rust (ts-rs).
// NÃO EDITAR. Regenerar com `npm run gen:contracts`.

/** Versão do protocolo interface↔motor (optima-engine). */
export const PROTOCOL_VERSION = 1;

/** Versão do esquema do documento do projeto (optima-project). */
export const PROJECT_SCHEMA_VERSION = 1;

/**
 * Ajuste dos valores-p de comparações pareadas.
 */
export type Adjustment = "bonferroni" | "holm";

/**
 * Efeito e seus confundidos (fracionários).
 */
export type AliasRow = { 
/**
 * Efeito (`A`, `AB`, …).
 */
effect: string, 
/**
 * Efeitos confundidos com ele, com sinal (`+BCD`, `−CD`).
 */
aliases: Array<string>, };

/**
 * Opções da análise.
 */
export type AnalysisOptions = { 
/**
 * Resposta analisada (vazio se ainda não escolhida na seleção do experimento).
 */
responseId: StableId | null, 
/**
 * Fatores de agrupamento.
 */
groupBy: Array<StableId>, 
/**
 * Fator que define os grupos da comparação de tratamentos (ausente nas análises descritivas).
 */
factorId?: StableId, 
/**
 * Nível de significância da comparação (ausente nas análises descritivas).
 */
alpha?: number, 
/**
 * Termos do modelo de um planejamento: cada termo é a lista dos fatores que o compõem (um =
 * efeito principal; dois ou mais = interação). Na superfície de resposta, o mesmo fator
 * repetido (`[A, A]`) é o termo quadrático `A²`.
 */
terms?: Array<Array<StableId>>, 
/**
 * Incluir o termo de curvatura (planejamentos com pontos centrais).
 */
includeCurvature?: boolean, 
/**
 * Analisar como superfície de resposta de segunda ordem (matriz personalizada ou importada,
 * no caminho "Analisar dados existentes").
 */
surface?: boolean, 
/**
 * Configuração da otimização (objetivos, limites, domínio e busca), para restaurar a tela.
 */
optimization?: OptimizationSetup, 
/**
 * Procedimento de comparação múltipla escolhido (ausente = Tukey).
 */
procedure?: Procedure, 
/**
 * Configuração da ANOVA multifatorial.
 */
factorial?: FactorialSetup, 
/**
 * Modelo escolhido para cada resposta (id da resposta → termos, no formato de `terms`).
 * `terms` continua sendo o modelo da resposta analisada; a otimização usa o de cada resposta.
 */
responseModels?: { [key in string]: Array<Array<StableId>> }, };

/**
 * Análise guardada. Reabrir um projeto **não recalcula**: o resultado é o que foi guardado.
 */
export type AnalysisRecord = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Instante (RFC 3339) informado pela interface.
 */
createdAt: string, 
/**
 * Revisão de dados usada.
 */
revisionId: StableId, 
/**
 * Assinatura opaca dos dados e opções (para detectar resultado obsoleto).
 */
signature: string, 
/**
 * Método (`snake_case`).
 */
methodId: string, 
/**
 * Versão do método.
 */
methodVersion: number, 
/**
 * Versão do motor que calculou.
 */
engineVersion: string, 
/**
 * Opções usadas.
 */
options: AnalysisOptions, 
/**
 * Resultado.
 */
result: AnalysisResult, };

/**
 * Resultado guardado, por método.
 */
export type AnalysisResult = { "type": "descriptive" } & DescriptiveResult | { "type": "oneWayComparison" } & OneWayResult | { "type": "twoLevelDesign" } & DesignAnalysisResult | { "type": "responseSurface" } & SurfaceResult | { "type": "optimization" } & OptimizationResult | { "type": "multipleComparison" } & ProcedureResult | { "type": "factorialAnova" } & FactorialResult;

/**
 * Linha da tabela.
 */
export type AnovaRow = { 
/**
 * Graus de liberdade.
 */
df: number, 
/**
 * Soma de quadrados.
 */
sumSquares: Stat, 
/**
 * Quadrado médio.
 */
meanSquare: Stat, };

/**
 * Distância axial do composto central.
 */
export type AxialKind = { "type": "rotatable" } | { "type": "faceCentered" } | { "type": "custom", 
/**
 * Distância axial na escala codificada.
 */
alpha: number, };

/**
 * Estatísticas do boxplot de um grupo.
 */
export type BoxStats = { 
/**
 * Mínimo.
 */
min: number, 
/**
 * Primeiro quartil.
 */
q1: number, 
/**
 * Mediana.
 */
median: number, 
/**
 * Terceiro quartil.
 */
q3: number, 
/**
 * Máximo.
 */
max: number, 
/**
 * Extremo inferior do bigode.
 */
whiskerLow: number, 
/**
 * Extremo superior do bigode.
 */
whiskerHigh: number, 
/**
 * Pontos fora das cercas.
 */
outliers: Array<Outlier>, };

/**
 * Resultado do teste de Brown–Forsythe.
 */
export type BrownForsythe = { 
/**
 * Estatística F.
 */
f: Stat, 
/**
 * Graus de liberdade do numerador (`k − 1`).
 */
dfBetween: number, 
/**
 * Graus de liberdade do denominador (`N − k`).
 */
dfWithin: number, 
/**
 * Valor-p.
 */
pValue: Stat, };

/**
 * Pedido que carrega bytes (em base64, para trafegar em JSON).
 */
export type BytesRequest = { 
/**
 * Conteúdo do arquivo em base64.
 */
bytesBase64: string, };

/**
 * Uma opção de planejamento.
 */
export type Candidate = { 
/**
 * Tipo, pronto para compor a especificação.
 */
kind: DesignKind, 
/**
 * Ensaios do planejamento básico.
 */
baseRuns: number, 
/**
 * Resolução (`None` no fatorial completo, que não confunde efeitos).
 */
resolution: number | null, 
/**
 * Cabe no orçamento informado.
 */
withinBudget: boolean, 
/**
 * É a opção recomendada.
 */
recommended: boolean, };

/**
 * Capacidades do motor: hoje, apenas a lista de métodos.
 */
export type Capabilities = { 
/**
 * Métodos disponíveis, com situação de implementação e validação.
 */
methods: Array<MethodInfo>, };

/**
 * Codificação dos fatores categóricos na matriz do modelo.
 */
export type CategoricalCoding = "treatment" | "sum";

/**
 * Linha da tabela de coeficientes.
 */
export type CoefficientRow = { 
/**
 * Rótulo da coluna.
 */
label: string, 
/**
 * Estimativa.
 */
estimate: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Estatística t.
 */
tValue: Stat, 
/**
 * Valor-p bilateral.
 */
pValue: Stat, 
/**
 * Limite inferior do intervalo de confiança.
 */
ciLower: Stat, 
/**
 * Limite superior do intervalo de confiança.
 */
ciUpper: Stat, };

/**
 * Proposta de confirmação: previsões gravadas no momento da proposta, para comparação posterior
 * com o observado.
 */
export type ConfirmationPlan = { 
/**
 * Nível de confiança dos intervalos de predição.
 */
confidenceLevel: number, 
/**
 * Previsões por ensaio e resposta.
 */
predictions: Array<ConfirmationPrediction>, };

/**
 * Previsão de uma resposta em um ensaio de confirmação (intervalo de predição de uma nova observação).
 */
export type ConfirmationPrediction = { 
/**
 * Observação (linha) do experimento de confirmação.
 */
rowId: StableId, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Valor previsto.
 */
predicted: number, 
/**
 * Limite inferior do intervalo de predição.
 */
lower: number | null, 
/**
 * Limite superior do intervalo de predição.
 */
upper: number | null, };

/**
 * Curva de nível: valor e segmentos.
 */
export type ContourLevel = { 
/**
 * Valor da resposta.
 */
level: number, 
/**
 * Segmentos da curva.
 */
segments: Array<Segment>, };

/**
 * Contraste definido pelo usuário sobre as células de um subconjunto de fatores.
 */
export type ContrastRequest = { 
/**
 * Nome apresentado.
 */
name: string, 
/**
 * Fatores que definem as células.
 */
factors: Array<StableId>, 
/**
 * Coeficientes, um por célula, na ordem das células (o primeiro fator varia mais devagar).
 */
coefficients: Array<number>, };

/**
 * Resultado de um contraste.
 */
export type ContrastResult = { 
/**
 * Nome.
 */
name: string, 
/**
 * Estimativa `Σ cᵢ·média_i`.
 */
estimate: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Estatística `t`.
 */
tValue: Stat, 
/**
 * Graus de liberdade.
 */
df: number, 
/**
 * Valor-p sem ajuste.
 */
pValue: Stat, 
/**
 * Valor-p ajustado por Bonferroni entre os contrastes pedidos.
 */
pAdjusted: Stat, 
/**
 * Limite inferior do IC.
 */
ciLower: Stat, 
/**
 * Limite superior do IC.
 */
ciUpper: Stat, };

/**
 * Relatório de convergência da busca.
 */
export type ConvergenceReport = { 
/**
 * Algoritmo.
 */
algorithm: string, 
/**
 * Semente do hipercubo latino.
 */
seed: number, 
/**
 * Inícios executados.
 */
starts: number, 
/**
 * Inícios que terminaram por tolerância (e não por limite de iterações).
 */
convergedStarts: number, 
/**
 * Inícios que terminaram em ponto viável.
 */
feasibleStarts: number, 
/**
 * Ótimos locais distintos (após o agrupamento).
 */
distinctOptima: number, 
/**
 * Inícios que chegaram à melhor solução.
 */
bestSolutionStarts: number, 
/**
 * Iterações somadas.
 */
iterations: number, 
/**
 * Avaliações do objetivo somadas.
 */
evaluations: number, 
/**
 * Tolerância de viabilidade usada (unidades da amplitude observada de cada resposta).
 */
feasibilityTolerance: number, };

/**
 * Um ensaio (unidade experimental) do DIC.
 */
export type CrdRun = { 
/**
 * Posição de execução (1-based).
 */
run: number, 
/**
 * Posição na ordem padrão (1-based), agrupada por nível.
 */
standardOrder: number, 
/**
 * Índice do nível em `levels` (0-based).
 */
levelIndex: number, 
/**
 * Nível aplicado.
 */
level: string, 
/**
 * Unidade experimental dentro do nível (1-based).
 */
replicate: number, };

/**
 * Especificação do DIC.
 */
export type CrdSpec = { 
/**
 * Identificador do fator no experimento.
 */
factorId: StableId, 
/**
 * Nome do fator, como digitado.
 */
factorName: string, 
/**
 * Níveis (tratamentos) do fator, na ordem em que foram digitados.
 */
levels: Array<string>, 
/**
 * Unidades experimentais por nível (≥ 1; a ANOVA exige pelo menos 2 em algum nível).
 */
replicates: number, 
/**
 * Aleatorizar a ordem de execução.
 */
randomize: boolean, 
/**
 * Semente da aleatorização (registrada no resultado); inteiro de até 2⁵³ − 1 na interface.
 */
seed: number, };

/**
 * Teste de curvatura (pontos centrais × pontos fatoriais).
 */
export type CurvatureTest = { 
/**
 * Média dos centrais menos o previsto pelo modelo linear nos fatoriais.
 */
difference: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Estatística t.
 */
tValue: Stat, 
/**
 * Valor-p.
 */
pValue: Stat, 
/**
 * Pontos centrais usados.
 */
centerPoints: number, };

/**
 * Conjunto de dados.
 */
export type Dataset = { 
/**
 * Fatores.
 */
factors: Array<Factor>, 
/**
 * Respostas.
 */
responses: Array<Response>, 
/**
 * Observações.
 */
observations: Array<Observation>, };

/**
 * Solicitação de resumo descritivo.
 */
export type DescriptiveRequest = { 
/**
 * Dados.
 */
dataset: Dataset, 
/**
 * Resposta a resumir.
 */
responseId: StableId, 
/**
 * Fatores que definem os grupos (vazio: apenas o resumo geral).
 */
groupBy: Array<StableId>, };

/**
 * Resultado do resumo descritivo.
 */
export type DescriptiveResult = { 
/**
 * Resposta resumida.
 */
responseId: StableId, 
/**
 * Resumo de todas as observações.
 */
overall: Summary, 
/**
 * Resumo por grupo, na ordem definida pelos níveis dos fatores.
 */
groups: Array<GroupSummary>, 
/**
 * Observações fora dos grupos por falta do valor de algum fator de agrupamento.
 */
excludedMissingFactor: number, 
/**
 * Fatos para a interpretação (textos resolvidos pela interface).
 */
facts: Array<Fact>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Solicitação de análise.
 */
export type DesignAnalysisRequest = { 
/**
 * Dados com os valores **reais** dos fatores numéricos do planejamento.
 */
dataset: Dataset, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Planejamento (níveis dos fatores e tipo).
 */
spec: DesignSpec, 
/**
 * Termos do modelo: efeitos principais e interações dos fatores do planejamento.
 */
terms: Array<TermSpec>, 
/**
 * Nível de significância (0 < α < 1).
 */
alpha: number, 
/**
 * Incluir o termo de curvatura quando houver pontos centrais.
 */
includeCurvature: boolean, };

/**
 * Resultado da análise.
 */
export type DesignAnalysisResult = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Nomes dos fatores na ordem do planejamento.
 */
factorNames: Array<string>, 
/**
 * Intercepto (média na escala codificada).
 */
intercept: Stat, 
/**
 * Erro-padrão do intercepto.
 */
interceptStdError: Stat, 
/**
 * Termos.
 */
effects: Array<EffectRow>, 
/**
 * Curvatura.
 */
curvature: CurvatureTest | null, 
/**
 * ANOVA da regressão.
 */
anova: RegressionAnova, 
/**
 * Falta de ajuste e erro puro.
 */
lackOfFit: LackOfFit | null, 
/**
 * Lenth.
 */
lenth: LenthResult | null, 
/**
 * Pareto.
 */
pareto: Pareto, 
/**
 * Efeitos principais por fator.
 */
mainEffects: Array<MainEffectSeries>, 
/**
 * Interações de dois fatores do modelo.
 */
interactions: Array<InteractionSeries>, 
/**
 * Observado × predito.
 */
observedVsPredicted: Array<ObservedPredicted>, 
/**
 * Ajuste completo (coeficientes, diagnósticos por observação, avisos do ajuste).
 */
fit: LinearFit, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Fatos para a interpretação.
 */
facts: Array<Fact>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Fator de dois níveis.
 */
export type DesignFactor = { 
/**
 * Identificador do fator no experimento.
 */
id: StableId, 
/**
 * Nome digitado.
 */
name: string, 
/**
 * Nível baixo (real).
 */
low: number, 
/**
 * Nível alto (real).
 */
high: number, 
/**
 * Unidade livre.
 */
unit: string | null, };

/**
 * Tipo de planejamento.
 */
export type DesignKind = { "type": "fullFactorial" } | { "type": "fractional", 
/**
 * Geradores, na ordem dos fatores gerados.
 */
generators: Array<string>, } | { "type": "plackettBurman", 
/**
 * Número de ensaios do planejamento básico.
 */
runs: number, } | { "type": "centralComposite", 
/**
 * Distância axial.
 */
axial: AxialKind, 
/**
 * Inscrito: os pontos **axiais** ficam nos níveis informados (±1) e a parte fatorial em
 * ±1/α. Circunscrito (padrão): fatorial em ±1 e axiais em ±α.
 */
inscribed: boolean, 
/**
 * Geradores da parte fatorial fracionária (vazio = fatorial completo).
 */
generators: Array<string>, } | { "type": "boxBehnken" };

/**
 * Lista de opções (envelope serializável do resultado).
 */
export type DesignOptions = { 
/**
 * Opções em ordem crescente de ensaios.
 */
candidates: Array<Candidate>, };

/**
 * Pedido de opções de planejamento.
 */
export type DesignRecommendRequest = { 
/**
 * Número de fatores.
 */
factors: number, 
/**
 * Orçamento de ensaios do planejamento básico, se houver.
 */
maxRuns: number | null, };

/**
 * Um ensaio.
 */
export type DesignRun = { 
/**
 * Posição de execução (1-based). Sem aleatorização, igual à ordem padrão.
 */
run: number, 
/**
 * Posição na ordem padrão (1-based).
 */
standardOrder: number, 
/**
 * Tipo de ponto.
 */
point: PointType, 
/**
 * Repetição (1-based; 0 nos pontos centrais).
 */
replicate: number, 
/**
 * Valores codificados (−1, 0, +1) por fator.
 */
coded: Array<number>, 
/**
 * Valores reais por fator.
 */
real: Array<number>, };

/**
 * Especificação do planejamento.
 */
export type DesignSpec = { 
/**
 * Tipo.
 */
kind: DesignKind, 
/**
 * Fatores, na ordem das colunas (`A`, `B`, …).
 */
factors: Array<DesignFactor>, 
/**
 * Repetições do planejamento básico (≥ 1); cada repetição é uma réplica experimental.
 */
replicates: number, 
/**
 * Pontos centrais (codificação 0), acrescentados ao final do planejamento básico.
 */
centerPoints: number, 
/**
 * Aleatorizar a ordem de execução.
 */
randomize: boolean, 
/**
 * Semente da aleatorização (registrada no resultado); inteiro de até 2⁵³ − 1 na interface.
 */
seed: number, };

/**
 * Distribuição e seus parâmetros.
 */
export type Distribution = { "type": "normal" } | { "type": "studentT", 
/**
 * Graus de liberdade (> 0).
 */
df: number, } | { "type": "chiSquare", 
/**
 * Graus de liberdade (> 0).
 */
df: number, } | { "type": "studentizedRange", 
/**
 * Número de grupos (≥ 2).
 */
groups: number, 
/**
 * Graus de liberdade do erro (> 0).
 */
df: number, } | { "type": "f", 
/**
 * Graus de liberdade do numerador (> 0).
 */
df1: number, 
/**
 * Graus de liberdade do denominador (> 0).
 */
df2: number, };

/**
 * Função avaliada.
 */
export type DistributionFunction = "cdf" | "sf" | "quantileUpper" | "quantileLower";

/**
 * Solicitação.
 */
export type DistributionRequest = { 
/**
 * Distribuição.
 */
distribution: Distribution, 
/**
 * Função.
 */
function: DistributionFunction, 
/**
 * Argumentos (`x` para `cdf` e `sf`; probabilidade para os quantis).
 */
values: Array<number>, };

/**
 * Resultado: um valor por argumento, na mesma ordem.
 */
export type DistributionResult = { 
/**
 * Valores.
 */
values: Array<Stat>, };

/**
 * Limite real de um fator no domínio da busca.
 */
export type DomainRange = { 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Nome.
 */
name: string, 
/**
 * Menor valor real do domínio.
 */
min: number, 
/**
 * Maior valor real do domínio.
 */
max: number, 
/**
 * Menor valor real da região experimental.
 */
regionMin: number, 
/**
 * Maior valor real da região experimental.
 */
regionMax: number, };

/**
 * Domínio da busca.
 */
export type DomainSpec = { "type": "region" } | { "type": "extended", 
/**
 * Limites por fator (fatores ausentes mantêm o intervalo observado).
 */
bounds: Array<FactorBounds>, };

/**
 * Termo estimado.
 */
export type EffectRow = { 
/**
 * Rótulo (`Temperatura`, `Temperatura:pH`).
 */
label: string, 
/**
 * Ordem do termo (1 = principal, 2 = interação de dois fatores…).
 */
order: number, 
/**
 * Coeficiente na escala codificada.
 */
coefficient: Stat, 
/**
 * Efeito = 2 × coeficiente (nível alto − nível baixo).
 */
effect: Stat, 
/**
 * Erro-padrão do efeito.
 */
stdError: Stat, 
/**
 * Estatística t.
 */
tValue: Stat, 
/**
 * Valor-p bilateral.
 */
pValue: Stat, 
/**
 * Limite inferior do IC do efeito.
 */
ciLower: Stat, 
/**
 * Limite superior do IC do efeito.
 */
ciUpper: Stat, 
/**
 * Ativo pelo método de Lenth (`|efeito| > ME`); `None` sem Lenth.
 */
lenthActive: boolean | null, 
/**
 * Ativo com controle simultâneo (`|efeito| > SME`).
 */
lenthSimultaneous: boolean | null, 
/**
 * Efeitos confundidos com este termo (fracionários regulares), com sinal.
 */
aliasedWith: Array<string>, };

/**
 * Tamanhos de efeito e coeficiente de variação.
 */
export type EffectSizes = { 
/**
 * `η² = SQ_entre/SQ_total`.
 */
etaSquared: Stat, 
/**
 * `ω²`, estimativa menos viesada (pode ser negativa; não é truncada).
 */
omegaSquared: Stat, 
/**
 * Coeficiente de variação em % (`100·√QME/|média geral|`).
 */
cvPercent: Stat, };

/**
 * Erro codificado, com parâmetros para a mensagem localizada.
 */
export type EngineError = { 
/**
 * Código estável.
 */
code: ErrorCode, 
/**
 * Parâmetros (por exemplo, versões esperada e recebida).
 */
params: { [key in string]: string }, 
/**
 * Diagnósticos que bloqueiam o cálculo (`invalidInput`); vazio nos demais erros.
 */
issues: Array<Issue>, };

/**
 * Resultado de `engine.info`.
 */
export type EngineInfo = { 
/**
 * Versão do motor (igual à do aplicativo).
 */
engineVersion: string, 
/**
 * Versão do protocolo.
 */
protocolVersion: number, 
/**
 * Versão do esquema do projeto.
 */
projectSchemaVersion: number, 
/**
 * Capacidades.
 */
capabilities: Capabilities, };

/**
 * Solicitação com identificador de tarefa. A interface descarta respostas
 * cujo `task_id` não seja o mais recente da sua categoria.
 */
export type EngineRequest = { 
/**
 * Versão do protocolo usada pelo cliente.
 */
protocolVersion: number, 
/**
 * Identificador da tarefa, devolvido na resposta.
 */
taskId: string, 
/**
 * Operação.
 */
operation: Operation, };

/**
 * Resposta: sempre carrega a versão do protocolo do motor.
 */
export type EngineResponse = { 
/**
 * Versão do protocolo do motor.
 */
protocolVersion: number, 
/**
 * Identificador da tarefa da solicitação; `null` se ela não pôde ser lida.
 */
taskId: string | null, 
/**
 * Desfecho.
 */
outcome: Outcome, };

/**
 * Caminho de entrada escolhido no início do experimento.
 */
export type EntryPath = "plan" | "analyze" | "compare";

/**
 * Equação nas duas escalas.
 */
export type Equation = { 
/**
 * Termos na escala codificada, na ordem do modelo (intercepto primeiro).
 */
coded: Array<EquationTerm>, 
/**
 * Termos em unidades reais: intercepto, lineares de todos os fatores, quadráticos e
 * interações presentes no modelo. `None` quando algum coeficiente não é estimável.
 */
real: Array<EquationTerm> | null, };

/**
 * Termo da equação.
 */
export type EquationTerm = { 
/**
 * Tipo.
 */
kind: EquationTermKind, 
/**
 * Índices dos fatores (0, 1 ou 2 elementos conforme o tipo).
 */
factors: Array<number>, 
/**
 * Coeficiente.
 */
coefficient: Stat, };

/**
 * Tipo do termo da equação.
 */
export type EquationTermKind = "intercept" | "linear" | "square" | "interaction";

/**
 * Código de erro do protocolo (a interface localiza a mensagem).
 */
export type ErrorCode = "invalidRequest" | "unsupportedProtocolVersion" | "invalidInput" | "invalidProject" | "invalidImport";

/**
 * Pedido de avaliação: os mesmos modelos e objetivos, em condições reais dadas.
 */
export type EvaluateRequest = { 
/**
 * Modelos e objetivos.
 */
optimization: OptimizationRequest, 
/**
 * Condições reais (um vetor por ponto, na ordem dos fatores).
 */
points: Array<Array<number>>, };

/**
 * Previsões nos pontos pedidos.
 */
export type Evaluation = { 
/**
 * Um candidato por ponto (com `rank` = posição no pedido e `starts` = 0).
 */
points: Array<OptimumCandidate>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Observação fora do ajuste.
 */
export type ExcludedObservation = { 
/**
 * Observação.
 */
observationId: StableId, 
/**
 * Motivo.
 */
reason: ExclusionReason, };

/**
 * Motivo da exclusão de uma observação do ajuste.
 */
export type ExclusionReason = "missingResponse" | "missingFactor";

/**
 * Experimento: dados com histórico de revisões, seleção de análise e análises salvas.
 */
export type Experiment = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Nome dado pelo usuário.
 */
name: string, 
/**
 * Caminho de entrada, se já escolhido.
 */
entryPath: EntryPath | null, 
/**
 * A coluna de unidade experimental está visível na grade.
 */
showUnitColumn: boolean, 
/**
 * Planejamento de dois níveis gerado para este experimento (caminho "Planejar experimento");
 * a matriz é regenerada de forma determinística a partir da especificação e da semente.
 */
design?: DesignSpec, 
/**
 * Delineamento inteiramente casualizado (um fator categórico) gerado para este experimento;
 * a ordem de execução é regenerada de forma determinística a partir da especificação.
 */
crd?: CrdSpec, 
/**
 * Delineamento em blocos completos casualizados gerado para este experimento.
 */
rcbd?: RcbdSpec, 
/**
 * Personalização gráfica por figura (chave estável da figura → ajustes).
 */
figureStyles?: Record<string, FigureStyle> | undefined, 
/**
 * Experimento de origem, quando este é uma confirmação proposta por uma otimização.
 */
origin?: ExperimentOrigin, 
/**
 * Previsões gravadas na proposta de confirmação.
 */
confirmation?: ConfirmationPlan, 
/**
 * Seleção atual de resposta e agrupamento.
 */
analysisSelection: AnalysisOptions, 
/**
 * Revisões, da mais antiga para a mais recente; a última é o estado atual dos dados.
 */
revisions: Array<Revision>, 
/**
 * Análises guardadas.
 */
analyses: Array<AnalysisRecord>, 
/**
 * Observações livres do usuário.
 */
notes: string, };

/**
 * Tabela completa de um experimento.
 */
export type ExperimentData = { 
/**
 * Fatores.
 */
factors: Array<FactorSpec>, 
/**
 * Respostas.
 */
responses: Array<ResponseSpec>, 
/**
 * Observações.
 */
rows: Array<RowRecord>, };

/**
 * Origem de um experimento derivado de outro.
 */
export type ExperimentOrigin = { 
/**
 * Experimento de origem (os modelos e a otimização).
 */
experimentId: StableId, 
/**
 * Análise de otimização que propôs os ensaios.
 */
analysisId: StableId, };

/**
 * Célula exportada.
 */
export type ExportCell = number | string | null;

/**
 * Planilha exportada.
 */
export type ExportSheet = { 
/**
 * Nome (até 31 caracteres).
 */
name: string, 
/**
 * Linhas; a primeira é o cabeçalho (em negrito).
 */
rows: Array<Array<ExportCell>>, };

/**
 * Pasta de trabalho exportada.
 */
export type ExportWorkbook = { 
/**
 * Planilhas, na ordem.
 */
sheets: Array<ExportSheet>, };

/**
 * Fato que a interface explica ao usuário.
 */
export type Fact = { 
/**
 * Chave estável, por exemplo `descriptive.missing_excluded`.
 */
key: string, 
/**
 * Parâmetros da frase.
 */
params: { [key in string]: string }, };

/**
 * Fator definido pelo usuário.
 */
export type Factor = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Nome digitado (preservado como está).
 */
name: string, 
/**
 * Quantitativo ou categórico.
 */
kind: FactorKind, 
/**
 * Unidade livre, quando houver.
 */
unit: string | null, 
/**
 * Níveis categóricos declarados, na ordem de apresentação. Vazio: os
 * níveis são os valores presentes nos dados, em ordem alfabética.
 */
levels: Array<string>, };

/**
 * Limites reais de um fator.
 */
export type FactorBounds = { 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Menor valor real.
 */
min: number, 
/**
 * Maior valor real.
 */
max: number, };

/**
 * Tipo de um fator: quantitativo (níveis numéricos) ou categórico (rótulos).
 *
 * O usuário define fatores livremente; os planejamentos verificam, em seus
 * módulos, se a natureza do fator é compatível com o método escolhido.
 */
export type FactorKind = "numeric" | "categorical";

/**
 * Intervalo experimental de um fator.
 */
export type FactorRange = { 
/**
 * Fator.
 */
id: StableId, 
/**
 * Nome.
 */
name: string, 
/**
 * Centro usado na codificação.
 */
center: number, 
/**
 * Meia-amplitude usada na codificação.
 */
halfRange: number, 
/**
 * Menor valor real observado nos ensaios usados.
 */
min: number, 
/**
 * Maior valor real observado nos ensaios usados.
 */
max: number, };

/**
 * Fator definido pelo usuário (versão textual).
 */
export type FactorSpec = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Nome digitado.
 */
name: string, 
/**
 * Quantitativo ou categórico.
 */
kind: FactorKind, 
/**
 * Unidade livre (vazio: sem unidade).
 */
unit: string, 
/**
 * Níveis categóricos declarados, separados por ponto e vírgula; vazio: os presentes nos dados.
 */
levelsText: string, };

/**
 * Valor de um fator em uma observação: número (fator quantitativo) ou
 * texto (fator categórico).
 */
export type FactorValue = number | string;

/**
 * Linha da tabela de ANOVA.
 */
export type FactorialAnovaRow = { 
/**
 * Termo (`A`, `A × B`, `Resíduo`, `Total`).
 */
term: string, 
/**
 * Fatores do termo (vazio no resíduo e no total).
 */
factors: Array<StableId>, 
/**
 * É o efeito do bloco.
 */
isBlock: boolean, 
/**
 * Graus de liberdade.
 */
df: number, 
/**
 * Soma de quadrados.
 */
sumSquares: Stat, 
/**
 * Quadrado médio.
 */
meanSquare: Stat, 
/**
 * Estatística `F`.
 */
fValue: Stat, 
/**
 * Valor-p.
 */
pValue: Stat, };

/**
 * Solicitação.
 */
export type FactorialRequest = { 
/**
 * Dados.
 */
dataset: Dataset, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Fatores de tratamento.
 */
factorIds: Array<StableId>, 
/**
 * Fator de bloco (efeito principal aditivo), se houver.
 */
blockId: StableId | null, 
/**
 * Maior ordem das interações (1 = só efeitos principais).
 */
interactionOrder: number, 
/**
 * Tipo de soma de quadrados.
 */
ssType: SumOfSquaresType, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Médias marginais pedidas.
 */
marginals: Array<MarginalRequest>, 
/**
 * Contrastes pedidos.
 */
contrasts: Array<ContrastRequest>, };

/**
 * Resultado da análise.
 */
export type FactorialResult = { 
/**
 * Tipo de soma de quadrados usado.
 */
ssType: SumOfSquaresType, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Termos do modelo.
 */
terms: Array<FactorialAnovaRow>, 
/**
 * Resíduo.
 */
residual: FactorialAnovaRow, 
/**
 * Total corrigido.
 */
total: FactorialAnovaRow, 
/**
 * `R²`.
 */
rSquared: Stat, 
/**
 * `R²` ajustado.
 */
adjustedRSquared: Stat, 
/**
 * Observações usadas.
 */
n: number, 
/**
 * Médias marginais.
 */
marginals: Array<MarginalResult>, 
/**
 * Contrastes.
 */
contrasts: Array<ContrastResult>, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Configuração da ANOVA multifatorial (tudo o que não são os dados).
 */
export type FactorialSetup = { 
/**
 * Fatores de tratamento.
 */
factorIds: Array<StableId>, 
/**
 * Fator de bloco (efeito principal aditivo), se houver.
 */
blockId: StableId | null, 
/**
 * Maior ordem das interações (1 = só efeitos principais).
 */
interactionOrder: number, 
/**
 * Tipo de soma de quadrados.
 */
ssType: SumOfSquaresType, 
/**
 * Médias marginais pedidas.
 */
marginals: Array<MarginalRequest>, 
/**
 * Contrastes pedidos.
 */
contrasts: Array<ContrastRequest>, };

/**
 * Anotação livre: texto e posição relativa (`0` = esquerda/topo, `1` = direita/base).
 */
export type FigureAnnotation = { 
/**
 * Texto.
 */
text: string, 
/**
 * Posição horizontal relativa, de 0 a 1.
 */
x: number, 
/**
 * Posição vertical relativa, de 0 a 1.
 */
y: number, };

/**
 * Ajustes de uma figura. Campos ausentes mantêm o texto ou o comportamento padrão.
 */
export type FigureStyle = { 
/**
 * Título da figura.
 */
title?: string, 
/**
 * Rótulo do eixo horizontal.
 */
xLabel?: string, 
/**
 * Rótulo do eixo vertical.
 */
yLabel?: string, 
/**
 * Exibir as letras de comparação (padrão: sim). Só altera a exibição: as comparações
 * calculadas continuam na tabela de resultados.
 */
showLetters?: boolean, 
/**
 * Escala de fonte desta figura (0,85, 1 ou 1,2); ausente: a preferência do dispositivo.
 */
fontScale?: number, 
/**
 * Letras digitadas pelo usuário, uma por grupo na ordem de exibição; substituem as calculadas
 * na figura e são identificadas como manuais na legenda.
 */
manualLetters?: Array<string>, 
/**
 * Anotações livres (texto em posição relativa da figura).
 */
annotations?: Array<FigureAnnotation>, 
/**
 * Cor principal das séries (`#RRGGBB`).
 */
primaryColor?: string, 
/**
 * Fundo da figura exportada: `white` ou `transparent`.
 */
background?: string, 
/**
 * Família da fonte: `sans`, `serif` ou `mono`.
 */
fontFamily?: string, 
/**
 * Escala do PNG exportado (1, 2 ou 3).
 */
exportScale?: number, 
/**
 * Exibir as linhas de grade (padrão: sim).
 */
showGrid?: boolean, 
/**
 * Exibir a legenda (padrão: sim).
 */
showLegend?: boolean, };

/**
 * Condição fixada, ecoada no resultado.
 */
export type FixedEcho = { 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Nome.
 */
name: string, 
/**
 * Valor real usado.
 */
value: number, 
/**
 * Valor codificado.
 */
coded: number, };

/**
 * Valor fixado de um fator (real).
 */
export type FixedValue = { 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Valor real.
 */
value: number, };

/**
 * DIC gerado.
 */
export type GeneratedCrd = { 
/**
 * Especificação usada.
 */
spec: CrdSpec, 
/**
 * Total de ensaios (`níveis × repetições`).
 */
total: number, 
/**
 * Ensaios na ordem de execução.
 */
runs: Array<CrdRun>, 
/**
 * Algoritmo de aleatorização (ou a ordem padrão, quando não aleatorizado).
 */
randomizationAlgorithm: string, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Planejamento gerado.
 */
export type GeneratedDesign = { 
/**
 * Especificação usada.
 */
spec: DesignSpec, 
/**
 * Contagem de ensaios.
 */
count: RunCount, 
/**
 * Ensaios na ordem de execução.
 */
runs: Array<DesignRun>, 
/**
 * Relação definidora (`I = ABCD`), vazia nos fatoriais completos e em PB.
 */
definingRelation: Array<string>, 
/**
 * Resolução (fracionários e PB: III).
 */
resolution: number | null, 
/**
 * Confundimento de efeitos principais e de interações de dois fatores (fracionários).
 */
aliases: Array<AliasRow>, 
/**
 * Distância axial `α` (composto central).
 */
axialDistance: number | null, 
/**
 * Colunas fictícias do Plackett–Burman.
 */
dummyColumns: number, 
/**
 * Maior correlação absoluta entre um efeito principal e uma interação de dois fatores
 * (Plackett–Burman; 0 nos fatoriais e 0 nos fracionários regulares sem confundimento parcial).
 */
maxMainVsTwoFactorCorrelation: number, 
/**
 * Algoritmo de aleatorização.
 */
randomizationAlgorithm: string, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * DBC gerado.
 */
export type GeneratedRcbd = { 
/**
 * Especificação.
 */
spec: RcbdSpec, 
/**
 * Total de ensaios (`tratamentos × blocos`).
 */
total: number, 
/**
 * Ensaios.
 */
runs: Array<RcbdRun>, 
/**
 * Algoritmo.
 */
randomizationAlgorithm: string, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Teste global que acompanha o procedimento.
 */
export type GlobalTest = { 
/**
 * `welch_anova`, `anova` ou `kruskal_wallis`.
 */
name: string, 
/**
 * Estatística (`F` ou `H`).
 */
statistic: Stat, 
/**
 * Graus de liberdade do numerador (ou do qui-quadrado).
 */
df1: Stat, 
/**
 * Graus de liberdade do denominador (indefinido no Kruskal–Wallis).
 */
df2: Stat, 
/**
 * Valor-p.
 */
pValue: Stat, };

/**
 * Objetivo de uma resposta (Derringer e Suich, 1980).
 *
 * `shape` é o expoente da função: 1 = linear; maior que 1 exige chegar mais perto do alvo; menor que
 * 1 aceita valores intermediários.
 */
export type Goal = { "type": "maximize", 
/**
 * Menor valor aceitável (desejabilidade zero abaixo dele).
 */
low: number, 
/**
 * Valor a partir do qual a desejabilidade é 1.
 */
target: number, 
/**
 * Expoente.
 */
shape: number, } | { "type": "minimize", 
/**
 * Valor até o qual a desejabilidade é 1.
 */
target: number, 
/**
 * Maior valor aceitável (desejabilidade zero a partir dele).
 */
high: number, 
/**
 * Expoente.
 */
shape: number, } | { "type": "target", 
/**
 * Limite inferior (zero abaixo dele).
 */
low: number, 
/**
 * Alvo (`d = 1`).
 */
target: number, 
/**
 * Limite superior (zero acima dele).
 */
high: number, 
/**
 * Expoente do lado inferior.
 */
shapeLow: number, 
/**
 * Expoente do lado superior.
 */
shapeHigh: number, } | { "type": "range", 
/**
 * Limite inferior.
 */
low: number, 
/**
 * Limite superior.
 */
high: number, };

/**
 * Solicitação da malha.
 */
export type GridRequest = { 
/**
 * A mesma solicitação da análise (o modelo é reajustado).
 */
surface: SurfaceRequest, 
/**
 * Fator do eixo horizontal.
 */
xFactor: StableId, 
/**
 * Fator do eixo vertical.
 */
yFactor: StableId, 
/**
 * Valores dos demais fatores (ausentes = centro dos níveis).
 */
fixed: Array<FixedValue>, 
/**
 * Passos no eixo horizontal (5 a 101).
 */
stepsX: number, 
/**
 * Passos no eixo vertical (5 a 101).
 */
stepsY: number, 
/**
 * Quantidade aproximada de curvas de nível.
 */
contourLevels: number, };

/**
 * Rótulo de um fator em um grupo.
 */
export type GroupLabel = { 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Nível, como texto (números em notação decimal mais curta que os reproduz).
 */
label: string, };

/**
 * Estatísticas de um grupo.
 */
export type GroupStats = { 
/**
 * Nível.
 */
label: string, 
/**
 * Observações usadas.
 */
n: number, 
/**
 * Média.
 */
mean: Stat, 
/**
 * Desvio-padrão amostral.
 */
sd: Stat, 
/**
 * Erro-padrão da média do grupo, `sd/√n`.
 */
stdError: Stat, 
/**
 * Limite inferior do IC da média (variância comum, `t` com os gl do erro).
 */
ciLower: Stat, 
/**
 * Limite superior do IC da média.
 */
ciUpper: Stat, 
/**
 * Barra `média − dp` (gráfico de médias com desvio-padrão).
 */
sdLower: Stat, 
/**
 * Barra `média + dp`.
 */
sdUpper: Stat, 
/**
 * Barra `média − EP` (erro-padrão da média do grupo).
 */
seLower: Stat, 
/**
 * Barra `média + EP`.
 */
seUpper: Stat, 
/**
 * Boxplot do grupo.
 */
boxplot: BoxStats | null, };

/**
 * Resumo de um grupo.
 */
export type GroupSummary = { 
/**
 * Nível de cada fator de agrupamento.
 */
labels: Array<GroupLabel>, 
/**
 * Resumo da resposta no grupo.
 */
summary: Summary, };

/**
 * Situação da implementação.
 */
export type Implementation = "implemented";

/**
 * Pedido de leitura de planilha.
 */
export type ImportXlsxRequest = { 
/**
 * Conteúdo do arquivo em base64.
 */
bytesBase64: string, 
/**
 * Planilha a ler; ausente: a primeira.
 */
sheet: string | null, };

/**
 * Médias das quatro combinações de dois fatores.
 */
export type InteractionSeries = { 
/**
 * Primeiro fator.
 */
factorA: number, 
/**
 * Segundo fator.
 */
factorB: number, 
/**
 * Médias `[(−,−), (+,−), (−,+), (+,+)]` em (A, B).
 */
cellMeans: Array<Stat>, };

/**
 * Diagnóstico: o idioma é resolvido pela interface a partir de `code`.
 */
export type Issue = { 
/**
 * Código estável, por exemplo `protocol.unsupported_version`.
 */
code: string, 
/**
 * Gravidade.
 */
severity: Severity, 
/**
 * Parâmetros usados na mensagem localizada.
 */
params: { [key in string]: string }, };

/**
 * Falta de ajuste e erro puro.
 */
export type LackOfFit = { 
/**
 * Soma de quadrados do erro puro.
 */
ssPureError: number, 
/**
 * Graus de liberdade do erro puro.
 */
dfPureError: number, 
/**
 * Soma de quadrados da falta de ajuste.
 */
ssLackOfFit: Stat, 
/**
 * Graus de liberdade da falta de ajuste.
 */
dfLackOfFit: number, 
/**
 * Estatística F.
 */
f: Stat, 
/**
 * Valor-p.
 */
pValue: Stat, };

/**
 * Método de Lenth.
 */
export type LenthResult = { 
/**
 * Erro-padrão pseudo.
 */
pse: number, 
/**
 * Graus de liberdade.
 */
df: number, 
/**
 * Margem de erro.
 */
marginOfError: number, 
/**
 * Margem simultânea.
 */
simultaneousMargin: number, };

/**
 * Letras por grupo.
 */
export type Letters = { 
/**
 * Letras de cada grupo (na ordem de entrada), por exemplo `"ab"`.
 */
letters: Array<string>, 
/**
 * Índices (0-based) das letras de cada grupo; evita ambiguidade ao separar nomes como `aa`.
 */
memberships: Array<Array<number>>, 
/**
 * Número de letras distintas usadas.
 */
nLetters: number, 
/**
 * Havia pares sem resultado, tratados como diferentes.
 */
hasUnknownPairs: boolean, };

/**
 * Resultado do ajuste.
 */
export type LinearFit = { 
/**
 * Observações usadas.
 */
nObservations: number, 
/**
 * Colunas do modelo.
 */
nColumns: number, 
/**
 * Posto numérico da matriz do modelo.
 */
rank: number, 
/**
 * Graus de liberdade residuais.
 */
dfResidual: number, 
/**
 * Nível de confiança dos intervalos.
 */
confidenceLevel: number, 
/**
 * Coeficientes, na ordem das colunas.
 */
coefficients: Array<CoefficientRow>, 
/**
 * Rótulos das colunas não estimáveis (combinações lineares das demais).
 */
aliased: Array<string>, 
/**
 * ANOVA da regressão e medidas de ajuste.
 */
anova: RegressionAnova, 
/**
 * Variância residual `σ̂²`.
 */
residualVariance: Stat, 
/**
 * Desvio-padrão residual `σ̂`.
 */
residualSd: Stat, 
/**
 * Número de condição das colunas retidas, normalizadas pela norma.
 */
conditionNumber: Stat, 
/**
 * Diagnósticos por observação.
 */
observations: Array<ObservationDiagnostics>, 
/**
 * Observações fora do ajuste (dados ausentes).
 */
excluded: Array<ExcludedObservation>, 
/**
 * Avisos do ajuste (posto, graus de liberdade, condicionamento…).
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Solicitação de ajuste linear sobre um conjunto de dados.
 */
export type LinearModelRequest = { 
/**
 * Dados.
 */
dataset: Dataset, 
/**
 * Modelo.
 */
spec: ModelSpec, };

/**
 * Médias de um fator nos níveis baixo e alto (e no centro, se houver).
 */
export type MainEffectSeries = { 
/**
 * Índice do fator (ordem do planejamento).
 */
factor: number, 
/**
 * Média da resposta no nível baixo.
 */
lowMean: Stat, 
/**
 * Média no nível alto.
 */
highMean: Stat, 
/**
 * Média nos pontos centrais, se houver.
 */
centerMean: number | null, };

/**
 * Média marginal de uma célula.
 */
export type MarginalMean = { 
/**
 * Níveis da célula, na ordem dos fatores pedidos.
 */
levels: Array<string>, 
/**
 * Estimativa.
 */
estimate: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Limite inferior do IC (nível `1 − α`, sem ajuste).
 */
ciLower: Stat, 
/**
 * Limite superior do IC.
 */
ciUpper: Stat, };

/**
 * Comparação entre duas células.
 */
export type MarginalPair = { 
/**
 * Índice da primeira célula.
 */
cellA: number, 
/**
 * Índice da segunda célula.
 */
cellB: number, 
/**
 * Diferença `a − b`.
 */
difference: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Estatística `t`.
 */
tValue: Stat, 
/**
 * Graus de liberdade (do resíduo).
 */
df: number, 
/**
 * Valor-p sem ajuste.
 */
pValue: Stat, 
/**
 * Valor-p ajustado.
 */
pAdjusted: Stat, 
/**
 * `p_adjusted < α`.
 */
significant: boolean | null, };

/**
 * Médias marginais de um subconjunto de fatores.
 */
export type MarginalRequest = { 
/**
 * Fatores que definem as células (do modelo).
 */
factors: Array<StableId>, 
/**
 * Ajuste das comparações pareadas.
 */
adjustment: PairwiseAdjustment, };

/**
 * Resultado das médias marginais de um subconjunto de fatores.
 */
export type MarginalResult = { 
/**
 * Fatores.
 */
factors: Array<StableId>, 
/**
 * Nomes dos fatores.
 */
factorNames: Array<string>, 
/**
 * Ajuste usado nas comparações.
 */
adjustment: PairwiseAdjustment, 
/**
 * Células.
 */
cells: Array<MarginalMean>, 
/**
 * Comparações pareadas.
 */
pairs: Array<MarginalPair>, 
/**
 * Letras (células ordenadas por média decrescente), quando calculáveis.
 */
letters: Letters | null, };

/**
 * Descrição de um método disponível.
 */
export type MethodInfo = { 
/**
 * Identificador `snake_case`.
 */
id: string, 
/**
 * Versão do método.
 */
version: number, 
/**
 * Situação de implementação.
 */
implementation: Implementation, 
/**
 * Situação de validação.
 */
validation: Validation, };

/**
 * Métricas de um modelo.
 */
export type ModelMetrics = { 
/**
 * Termos do modelo.
 */
terms: Array<TermSpec>, 
/**
 * Rótulos dos termos (mesma ordem).
 */
labels: Array<string>, 
/**
 * Parâmetros estimados, com o intercepto.
 */
parameters: number, 
/**
 * Graus de liberdade do resíduo.
 */
dfError: number, 
/**
 * `R²`.
 */
rSquared: Stat, 
/**
 * `R²` ajustado.
 */
adjustedRSquared: Stat, 
/**
 * `R²` predito (`1 − PRESS/SQT`).
 */
predictedRSquared: Stat, 
/**
 * Soma de quadrados dos resíduos de predição.
 */
press: Stat, 
/**
 * Raiz do quadrado médio do resíduo.
 */
rmse: Stat, 
/**
 * Valor-p do teste `F` do modelo.
 */
modelPValue: Stat, 
/**
 * Valor-p da falta de ajuste (indefinido sem erro puro).
 */
lackOfFitPValue: Stat, 
/**
 * AIC.
 */
aic: Stat, 
/**
 * AIC corrigido para amostras pequenas.
 */
aicc: Stat, 
/**
 * BIC.
 */
bic: Stat, };

/**
 * Modelo: resposta, intercepto e termos.
 */
export type ModelSpec = { 
/**
 * Resposta modelada.
 */
responseId: StableId, 
/**
 * Inclui intercepto.
 */
intercept: boolean, 
/**
 * Termos.
 */
terms: Array<TermSpec>, 
/**
 * Codificação dos fatores categóricos.
 */
coding: CategoricalCoding, 
/**
 * Nível de confiança dos intervalos (padrão 0,95).
 */
confidenceLevel: number, };

/**
 * Uma observação (linha).
 */
export type Observation = { 
/**
 * Identificador estável da observação.
 */
id: StableId, 
/**
 * Unidade experimental, se informada.
 */
unitId: StableId | null, 
/**
 * Valores dos fatores, na ordem de `Dataset::factors`; `None` = ausente.
 */
factors: Array<FactorValue | null>, 
/**
 * Valores das respostas, na ordem de `Dataset::responses`; `None` = ausente.
 */
responses: Array<number | null>, };

/**
 * Diagnóstico por observação.
 */
export type ObservationDiagnostics = { 
/**
 * Observação do conjunto de dados (ausente nos ajustes sobre matrizes).
 */
observationId: StableId | null, 
/**
 * Linha usada no ajuste (0-based).
 */
row: number, 
/**
 * Valor observado.
 */
observed: number, 
/**
 * Valor ajustado.
 */
fitted: number, 
/**
 * Resíduo `y − ŷ`.
 */
residual: number, 
/**
 * Alavancagem `hᵢᵢ`.
 */
leverage: number, 
/**
 * Resíduo internamente studentizado (padronizado).
 */
standardizedResidual: Stat, 
/**
 * Resíduo externamente studentizado (deletado).
 */
studentizedResidual: Stat, 
/**
 * Distância de Cook.
 */
cooksDistance: Stat, };

/**
 * Observado × predito de um ensaio.
 */
export type ObservedPredicted = { 
/**
 * Observação.
 */
observationId: StableId, 
/**
 * Observado.
 */
observed: number, 
/**
 * Predito pelo modelo.
 */
predicted: number, };

/**
 * Linha F do teste global.
 */
export type OneWayAnova = { 
/**
 * Entre grupos.
 */
between: AnovaRow, 
/**
 * Dentro dos grupos (erro).
 */
within: AnovaRow, 
/**
 * Total.
 */
total: AnovaRow, 
/**
 * Estatística F.
 */
f: Stat, 
/**
 * Valor-p (cauda superior de F).
 */
pValue: Stat, };

/**
 * Diagnósticos da análise.
 */
export type OneWayDiagnostics = { 
/**
 * Resíduos por observação.
 */
residuals: Array<ResidualPoint>, 
/**
 * Gráfico quantil–quantil dos resíduos padronizados.
 */
qq: Array<QqPoint>, 
/**
 * Homogeneidade das variâncias.
 */
brownForsythe: BrownForsythe, 
/**
 * Razão entre o maior e o menor desvio-padrão dos grupos (quando definida).
 */
sdRatio: Stat, };

/**
 * Solicitação.
 */
export type OneWayRequest = { 
/**
 * Dados.
 */
dataset: Dataset, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Fator que define os grupos (categórico ou quantitativo tratado como níveis).
 */
factorId: StableId, 
/**
 * Nível de significância da família (padrão 0,05).
 */
alpha: number, };

/**
 * Resultado completo.
 */
export type OneWayResult = { 
/**
 * Resposta analisada.
 */
responseId: StableId, 
/**
 * Fator.
 */
factorId: StableId, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Grupos, na ordem dos níveis.
 */
groups: Array<GroupStats>, 
/**
 * Média geral.
 */
grandMean: Stat, 
/**
 * ANOVA.
 */
anova: OneWayAnova, 
/**
 * Tamanhos de efeito e CV.
 */
effectSizes: EffectSizes, 
/**
 * Tukey/Tukey–Kramer; ausente se não houve estimativa de erro.
 */
tukey: TukeyResult | null, 
/**
 * Letras de comparação (a letra `a` é do grupo de maior média).
 */
letters: Letters | null, 
/**
 * Diagnósticos.
 */
diagnostics: OneWayDiagnostics, 
/**
 * Observações fora da análise.
 */
excluded: Array<ExcludedObservation>, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Fatos para a interpretação.
 */
facts: Array<Fact>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Operação solicitada. Cada etapa acrescenta suas variantes.
 */
export type Operation = { "type": "engineInfo" } | { "type": "descriptiveSummarize" } & DescriptiveRequest | { "type": "designRecommend" } & DesignRecommendRequest | { "type": "designCount" } & DesignSpec | { "type": "designGenerate" } & DesignSpec | { "type": "designCrdGenerate" } & CrdSpec | { "type": "designRcbdGenerate" } & RcbdSpec | { "type": "designAnalyze" } & DesignAnalysisRequest | { "type": "surfaceAnalyze" } & SurfaceRequest | { "type": "surfaceGrid" } & GridRequest | { "type": "exportXlsx" } & ExportWorkbook | { "type": "optimizationRun" } & OptimizationRequest | { "type": "optimizationEvaluate" } & EvaluateRequest | { "type": "optimizationGrid" } & OptimizationGridRequest | { "type": "comparisonOneWay" } & OneWayRequest | { "type": "comparisonProcedure" } & ProcedureRequest | { "type": "anovaFactorial" } & FactorialRequest | { "type": "surfaceSelectModel" } & SurfaceRequest | { "type": "distributionEvaluate" } & DistributionRequest | { "type": "modelFitLinear" } & LinearModelRequest | { "type": "projectEncode" } & ProjectEncodeRequest | { "type": "projectDecode" } & BytesRequest | { "type": "importXlsx" } & ImportXlsxRequest;

/**
 * Resultado de uma operação.
 */
export type OperationResult = { "type": "engineInfo" } & EngineInfo | { "type": "descriptiveSummarize" } & DescriptiveResult | { "type": "designRecommend" } & DesignOptions | { "type": "designCount" } & RunCount | { "type": "designGenerate" } & GeneratedDesign | { "type": "designCrdGenerate" } & GeneratedCrd | { "type": "designRcbdGenerate" } & GeneratedRcbd | { "type": "designAnalyze" } & DesignAnalysisResult | { "type": "surfaceAnalyze" } & SurfaceResult | { "type": "surfaceGrid" } & SurfaceGrid | { "type": "exportXlsx" } & ProjectEncodeResult | { "type": "optimizationRun" } & OptimizationResult | { "type": "optimizationEvaluate" } & Evaluation | { "type": "optimizationGrid" } & SurfaceGrid | { "type": "comparisonOneWay" } & OneWayResult | { "type": "comparisonProcedure" } & ProcedureResult | { "type": "anovaFactorial" } & FactorialResult | { "type": "surfaceSelectModel" } & SelectionResult | { "type": "distributionEvaluate" } & DistributionResult | { "type": "modelFitLinear" } & LinearFit | { "type": "projectEncode" } & ProjectEncodeResult | { "type": "projectDecode" } & ProjectDecodeResult | { "type": "importXlsx" } & SheetData;

/**
 * Pedido da malha de desejabilidade.
 */
export type OptimizationGridRequest = { 
/**
 * Modelos e objetivos.
 */
optimization: OptimizationRequest, 
/**
 * Fator do eixo horizontal.
 */
xFactor: StableId, 
/**
 * Fator do eixo vertical.
 */
yFactor: StableId, 
/**
 * Valores reais dos demais fatores (ausentes = centro dos níveis).
 */
fixed: Array<FixedValue>, 
/**
 * Passos por eixo (5 a 101).
 */
steps: number, };

/**
 * Pedido de otimização.
 */
export type OptimizationRequest = { 
/**
 * Dados com os valores reais dos fatores e as respostas.
 */
dataset: Dataset, 
/**
 * Fatores e níveis (definem a codificação).
 */
factors: Array<DesignFactor>, 
/**
 * Configuração.
 */
setup: OptimizationSetup, };

/**
 * Resultado da otimização.
 */
export type OptimizationResult = { 
/**
 * Situação.
 */
status: OptimizationStatus, 
/**
 * Candidatos viáveis, do melhor ao pior.
 */
candidates: Array<OptimumCandidate>, 
/**
 * Compromissos: melhor desejabilidade individual de cada resposta isolada.
 */
tradeOffs: Array<ResponseTradeOff>, 
/**
 * Convergência.
 */
convergence: ConvergenceReport, 
/**
 * Nomes dos fatores.
 */
factorNames: Array<string>, 
/**
 * Domínio da busca por fator.
 */
domain: Array<DomainRange>, 
/**
 * A busca estendeu o domínio além da região experimental por escolha explícita.
 */
extended: boolean, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Fatos para a interpretação.
 */
facts: Array<Fact>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Configuração da otimização (guardada no projeto para restaurar a tela).
 */
export type OptimizationSetup = { 
/**
 * Objetivos por resposta (ao menos um).
 */
responses: Array<ResponseGoal>, 
/**
 * Limites obrigatórios sobre as respostas previstas.
 */
limits: Array<ResponseLimit>, 
/**
 * Domínio da busca.
 */
domain: DomainSpec, 
/**
 * Opções da busca.
 */
search: SearchOptions, 
/**
 * Nível de significância dos intervalos de predição (`0 < α < 1`).
 */
alpha: number, };

/**
 * Situação da busca.
 */
export type OptimizationStatus = "found" | "onlyZeroDesirability" | "infeasible";

/**
 * Solução candidata.
 */
export type OptimumCandidate = { 
/**
 * Posição na ordenação (1 = melhor).
 */
rank: number, 
/**
 * Valores codificados dos fatores.
 */
coded: Array<number>, 
/**
 * Valores reais dos fatores.
 */
real: Array<number>, 
/**
 * Desejabilidade global.
 */
globalDesirability: number, 
/**
 * Previsões por resposta.
 */
predictions: Array<ResponsePrediction>, 
/**
 * Fora da região experimental (intervalo observado ou extrapolação oculta).
 */
extrapolated: boolean, 
/**
 * Alavancagem relativa máxima (`1` = igual à maior dos ensaios).
 */
leverageRatio: number, 
/**
 * Fatores (índices) que estão em um limite do domínio.
 */
atBounds: Array<number>, 
/**
 * Quantos inícios convergiram para esta solução.
 */
starts: number, 
/**
 * Violação máxima das restrições (≤ tolerância registrada).
 */
violation: number, };

/**
 * Sucesso ou falha.
 */
export type Outcome = { "status": "ok", 
/**
 * Resultado.
 */
result: OperationResult, } | { "status": "error", 
/**
 * Erro codificado.
 */
error: EngineError, };

/**
 * Ponto fora das cercas.
 */
export type Outlier = { 
/**
 * Observação.
 */
observationId: StableId, 
/**
 * Valor.
 */
value: number, };

/**
 * Comparação de um par.
 */
export type PairComparison = { 
/**
 * Índice do primeiro grupo.
 */
groupA: number, 
/**
 * Índice do segundo grupo.
 */
groupB: number, 
/**
 * Diferença `ȳ_a − ȳ_b`.
 */
difference: Stat, 
/**
 * Erro-padrão da diferença.
 */
stdError: Stat, 
/**
 * Estatística `q` (valor absoluto).
 */
qStatistic: Stat, 
/**
 * Valor-p ajustado pela família.
 */
pAdjusted: Stat, 
/**
 * Limite inferior do intervalo simultâneo.
 */
ciLower: Stat, 
/**
 * Limite superior do intervalo simultâneo.
 */
ciUpper: Stat, 
/**
 * Diferença detectada (`p_ajustado < α`); `None` quando o par não pôde ser testado.
 */
significant: boolean | null, };

/**
 * Ajuste das comparações entre médias marginais.
 */
export type PairwiseAdjustment = "tukey" | "none" | "bonferroni" | "holm";

/**
 * Pareto de efeitos.
 */
export type Pareto = { 
/**
 * Base das barras.
 */
basis: ParetoBasis, 
/**
 * Linha de referência.
 */
reference: number | null, 
/**
 * Barras em ordem decrescente.
 */
bars: Array<ParetoBar>, };

/**
 * Barra do Pareto.
 */
export type ParetoBar = { 
/**
 * Termo.
 */
label: string, 
/**
 * Valor (conforme a base).
 */
value: number, 
/**
 * Acima da referência.
 */
significant: boolean | null, };

/**
 * Referência da barra do Pareto.
 */
export type ParetoBasis = "tStatistic" | "lenthEffect" | "effectOnly";

/**
 * Tipo de ponto.
 */
export type PointType = "factorial" | "center" | "axial";

/**
 * Predição para uma linha.
 */
export type Prediction = { 
/**
 * Valor ajustado `x₀ᵀβ̂`.
 */
fitted: Stat, 
/**
 * Erro-padrão da média prevista, `σ̂·√(x₀ᵀ(XᵀX)⁻¹x₀)`.
 */
meanStdError: Stat, 
/**
 * Limite inferior do intervalo de confiança da média.
 */
meanLower: Stat, 
/**
 * Limite superior do intervalo de confiança da média.
 */
meanUpper: Stat, 
/**
 * Limite inferior do intervalo de predição de uma nova observação.
 */
predictionLower: Stat, 
/**
 * Limite superior do intervalo de predição de uma nova observação.
 */
predictionUpper: Stat, };

/**
 * Procedimento solicitado.
 */
export type Procedure = { "type": "gamesHowell" } | { "type": "dunnett", 
/**
 * Rótulo do nível de controle.
 */
control: string, } | { "type": "bonferroni" } | { "type": "holm" } | { "type": "kruskalDunn", 
/**
 * Ajuste dos valores-p de Dunn.
 */
adjustment: Adjustment, };

/**
 * Resumo de um grupo.
 */
export type ProcedureGroup = { 
/**
 * Nível.
 */
label: string, 
/**
 * Observações.
 */
n: number, 
/**
 * Média.
 */
mean: Stat, 
/**
 * Desvio-padrão.
 */
sd: Stat, 
/**
 * Mediana.
 */
median: Stat, 
/**
 * Posto médio (só Kruskal–Wallis).
 */
meanRank: Stat, };

/**
 * Uma comparação.
 */
export type ProcedurePair = { 
/**
 * Índice do primeiro grupo em `groups`.
 */
groupA: number, 
/**
 * Índice do segundo grupo (o controle, no Dunnett).
 */
groupB: number, 
/**
 * Diferença de médias (de postos médios no Kruskal–Wallis), `a − b`.
 */
difference: Stat, 
/**
 * Erro-padrão da diferença (indefinido quando não se aplica).
 */
stdError: Stat, 
/**
 * Estatística do teste (`t`, `q/√2` ou `z`).
 */
statistic: Stat, 
/**
 * Graus de liberdade da estatística.
 */
df: Stat, 
/**
 * Valor-p sem ajuste.
 */
pValue: Stat, 
/**
 * Valor-p ajustado pela família.
 */
pAdjusted: Stat, 
/**
 * Limite inferior do intervalo simultâneo (quando existe).
 */
ciLower: Stat, 
/**
 * Limite superior do intervalo simultâneo (quando existe).
 */
ciUpper: Stat, 
/**
 * `p_adjusted < alpha`; `None` se o valor-p não é definido.
 */
significant: boolean | null, };

/**
 * Solicitação.
 */
export type ProcedureRequest = { 
/**
 * Dados.
 */
dataset: Dataset, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Fator que define os grupos.
 */
factorId: StableId, 
/**
 * Nível de significância da família.
 */
alpha: number, 
/**
 * Procedimento.
 */
procedure: Procedure, };

/**
 * Resultado.
 */
export type ProcedureResult = { 
/**
 * Procedimento executado.
 */
procedure: Procedure, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Teste global.
 */
globalTest: GlobalTest, 
/**
 * Grupos, na ordem de aparição dos níveis.
 */
groups: Array<ProcedureGroup>, 
/**
 * Comparações.
 */
pairs: Array<ProcedurePair>, 
/**
 * Letras (não há no Dunnett: as comparações são com o controle).
 */
letters: Letters | null, 
/**
 * Índice do controle (Dunnett).
 */
control: number | null, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Projeto lido.
 */
export type ProjectDecodeResult = { 
/**
 * Documento no esquema atual.
 */
document: ProjectDocument, 
/**
 * Versão de esquema de origem, se houve migração.
 */
migratedFrom: number | null, 
/**
 * Avisos que não impediram a abertura.
 */
warnings: Array<Issue>, };

/**
 * Projeto: vários experimentos em um arquivo `.enzitag`.
 */
export type ProjectDocument = { 
/**
 * Versão do esquema com que o documento foi escrito.
 */
schemaVersion: number, 
/**
 * Identificador estável do projeto.
 */
projectId: StableId, 
/**
 * Nome dado pelo usuário (preservado como digitado).
 */
name: string, 
/**
 * Criação (RFC 3339).
 */
createdAt: string, 
/**
 * Última modificação (RFC 3339).
 */
modifiedAt: string, 
/**
 * Versão do aplicativo que escreveu o arquivo.
 */
appVersion: string, 
/**
 * Experimentos.
 */
experiments: Array<Experiment>, };

/**
 * Pedido de codificação de projeto.
 */
export type ProjectEncodeRequest = { 
/**
 * Documento a codificar.
 */
document: ProjectDocument, };

/**
 * Bytes `.enzitag` produzidos.
 */
export type ProjectEncodeResult = { 
/**
 * Conteúdo do arquivo em base64.
 */
bytesBase64: string, 
/**
 * Tamanho em bytes.
 */
size: bigint, 
/**
 * SHA-256 hexadecimal do arquivo inteiro.
 */
sha256: string, };

/**
 * Origem de um resultado. Resultados guardam método, versões e (a partir da
 * ET03) a revisão dos dados e as opções usadas.
 */
export type Provenance = { 
/**
 * Identificador do método no registro (`snake_case`).
 */
methodId: string, 
/**
 * Versão do método.
 */
methodVersion: number, 
/**
 * Versão do núcleo que calculou.
 */
engineVersion: string, };

/**
 * Ponto do gráfico quantil–quantil.
 */
export type QqPoint = { 
/**
 * Quantil teórico da normal padrão.
 */
theoretical: number, 
/**
 * Resíduo padronizado ordenado.
 */
sample: number, };

/**
 * Um ensaio.
 */
export type RcbdRun = { 
/**
 * Posição global de execução (blocos em ordem, ordem sorteada dentro de cada um).
 */
run: number, 
/**
 * Índice do bloco.
 */
blockIndex: number, 
/**
 * Bloco.
 */
block: string, 
/**
 * Posição dentro do bloco (1-based).
 */
position: number, 
/**
 * Índice do tratamento.
 */
levelIndex: number, 
/**
 * Tratamento.
 */
level: string, };

/**
 * Especificação do DBC.
 */
export type RcbdSpec = { 
/**
 * Fator de tratamento.
 */
factorId: StableId, 
/**
 * Nome do fator de tratamento.
 */
factorName: string, 
/**
 * Tratamentos.
 */
levels: Array<string>, 
/**
 * Nome do fator de bloco.
 */
blockName: string, 
/**
 * Blocos (por exemplo, dia, lote ou operador).
 */
blocks: Array<string>, 
/**
 * Aleatorizar a ordem dentro de cada bloco.
 */
randomize: boolean, 
/**
 * Semente da aleatorização.
 */
seed: number, };

/**
 * Tabela da ANOVA da regressão e medidas de ajuste.
 */
export type RegressionAnova = { 
/**
 * Soma centrada na média (com intercepto) ou não centrada (sem intercepto).
 */
centered: boolean, 
/**
 * Modelo.
 */
model: AnovaRow, 
/**
 * Resíduo.
 */
residual: AnovaRow, 
/**
 * Total.
 */
total: AnovaRow, 
/**
 * Estatística F global.
 */
f: Stat, 
/**
 * Valor-p do teste F global.
 */
pValue: Stat, 
/**
 * Coeficiente de determinação.
 */
rSquared: Stat, 
/**
 * Coeficiente de determinação ajustado.
 */
adjustedRSquared: Stat, };

/**
 * Resíduo de uma observação.
 */
export type ResidualPoint = { 
/**
 * Observação.
 */
observationId: StableId, 
/**
 * Índice do grupo.
 */
group: number, 
/**
 * Valor ajustado (média do grupo).
 */
fitted: number, 
/**
 * Resíduo.
 */
residual: number, 
/**
 * Resíduo padronizado.
 */
standardized: Stat, };

/**
 * Resposta medida.
 */
export type Response = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Nome digitado.
 */
name: string, 
/**
 * Unidade livre, quando houver.
 */
unit: string | null, };

/**
 * Objetivo de uma resposta, com o modelo e a importância.
 */
export type ResponseGoal = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Termos do modelo de segunda ordem; vazio = modelo completo.
 */
terms: Array<TermSpec>, 
/**
 * Objetivo.
 */
goal: Goal, 
/**
 * Importância relativa (peso da média geométrica); 1 por padrão.
 */
importance: number, };

/**
 * Limite **obrigatório** sobre o valor previsto de uma resposta (distinto da preferência).
 */
export type ResponseLimit = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Valor previsto mínimo, se houver.
 */
min: number | null, 
/**
 * Valor previsto máximo, se houver.
 */
max: number | null, };

/**
 * Previsão de uma resposta em um candidato.
 */
export type ResponsePrediction = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Nome da resposta.
 */
name: string, 
/**
 * Valor previsto e intervalos (de confiança da média e de predição de uma nova observação).
 */
prediction: Prediction, 
/**
 * Desejabilidade individual no valor previsto.
 */
desirability: number, 
/**
 * Perda em relação à melhor desejabilidade individual obtida buscando só esta resposta
 * (compromisso entre respostas); `None` quando a busca individual não foi feita.
 */
lossVsBestAlone: number | null, };

/**
 * Resposta medida (versão textual).
 */
export type ResponseSpec = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Nome digitado.
 */
name: string, 
/**
 * Unidade livre.
 */
unit: string, };

/**
 * Melhor desejabilidade individual de uma resposta buscada isoladamente.
 */
export type ResponseTradeOff = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Nome.
 */
name: string, 
/**
 * Melhor desejabilidade individual viável (busca isolada); `None` se não houve ponto viável.
 */
bestAlone: number | null, 
/**
 * Condições reais em que ela ocorre.
 */
real: Array<number>, };

/**
 * Instantâneo imutável dos dados.
 */
export type Revision = { 
/**
 * Identificador estável.
 */
id: StableId, 
/**
 * Revisão da qual esta partiu.
 */
parent: StableId | null, 
/**
 * Instante (RFC 3339), informado pela interface: o núcleo não lê o relógio.
 */
createdAt: string, 
/**
 * Motivo.
 */
reason: RevisionReason, 
/**
 * Dados.
 */
data: ExperimentData, 
/**
 * Resumo SHA-256 dos dados. A interface pode enviar vazio: o `encode` o recalcula.
 */
contentHash: string, };

/**
 * Motivo da revisão.
 */
export type RevisionReason = "created" | "edit" | "import" | "analysis" | "manualSave" | "restore" | "design";

/**
 * Uma linha de observação, com o texto de cada célula.
 */
export type RowRecord = { 
/**
 * Identificador estável da observação.
 */
id: StableId, 
/**
 * Unidade experimental informada (vazio: não informada).
 */
unitId: string, 
/**
 * Texto dos fatores, na ordem de `ExperimentData::factors`.
 */
factors: Array<string>, 
/**
 * Texto das respostas, na ordem de `ExperimentData::responses`.
 */
responses: Array<string>, };

/**
 * Contagem de ensaios, antes de gerar.
 */
export type RunCount = { 
/**
 * Ensaios do planejamento básico (uma repetição).
 */
baseRuns: number, 
/**
 * Ensaios fatoriais, com as repetições.
 */
factorialRuns: number, 
/**
 * Pontos axiais incluídos em `factorial_runs` (composto central; 0 nos demais).
 */
axialRuns: number, 
/**
 * Pontos centrais.
 */
centerRuns: number, 
/**
 * Total.
 */
total: number, };

/**
 * Opções da busca.
 */
export type SearchOptions = { 
/**
 * Inícios (1 a 5000).
 */
starts: number, 
/**
 * Semente do hipercubo latino (PCG32).
 */
seed: number, 
/**
 * Candidatos devolvidos (1 a 20).
 */
maxCandidates: number, 
/**
 * Distância codificada abaixo da qual dois ótimos locais são a mesma solução.
 */
clusterTolerance: number, };

/**
 * Segmento de uma curva de nível, em coordenadas reais dos eixos.
 */
export type Segment = { 
/**
 * Extremo inicial, eixo horizontal.
 */
x1: number, 
/**
 * Extremo inicial, eixo vertical.
 */
y1: number, 
/**
 * Extremo final, eixo horizontal.
 */
x2: number, 
/**
 * Extremo final, eixo vertical.
 */
y2: number, };

/**
 * Resultado.
 */
export type SelectionResult = { 
/**
 * Nível de significância usado na eliminação.
 */
alpha: number, 
/**
 * Modelo completo de segunda ordem.
 */
full: ModelMetrics, 
/**
 * Sequência: o primeiro passo é o modelo atual; o último é o recomendado.
 */
steps: Array<SelectionStep>, 
/**
 * Por que a eliminação parou (`no_candidate`, `hierarchy`, `no_degrees_of_freedom`).
 */
stoppedBecause: string, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Passo da sequência de eliminação.
 */
export type SelectionStep = { 
/**
 * Termo removido neste passo (`None` no passo inicial, o modelo atual).
 */
removed: string | null, 
/**
 * Valor-p do termo removido no modelo anterior.
 */
removedPValue: Stat, 
/**
 * Métricas do modelo resultante.
 */
metrics: ModelMetrics, };

/**
 * Gravidade de um diagnóstico.
 */
export type Severity = "error" | "warning" | "info";

/**
 * Conteúdo lido de uma planilha.
 */
export type SheetData = { 
/**
 * Nomes de todas as planilhas do arquivo, na ordem do arquivo.
 */
sheets: Array<string>, 
/**
 * Planilha lida.
 */
selected: string, 
/**
 * Linhas × colunas, em texto; células vazias são `""`.
 */
rows: Array<Array<string>>, 
/**
 * Avisos (`import.*`) com contagens.
 */
warnings: Array<Issue>, };

/**
 * Identificador estável: texto não vazio, ASCII, sem espaços.
 */
export type StableId = string;

/**
 * Estatística definida ou explicitamente indefinida.
 */
export type Stat = { "status": "defined", 
/**
 * Valor.
 */
value: number, } | { "status": "undefined", 
/**
 * Motivo.
 */
reason: UndefinedReason, };

/**
 * Tipo de soma de quadrados.
 */
export type SumOfSquaresType = "typeI" | "typeII" | "typeIII";

/**
 * Resumo de uma coluna.
 */
export type Summary = { 
/**
 * Observações consideradas (válidas + ausentes).
 */
nTotal: number, 
/**
 * Observações sem valor.
 */
nMissing: number, 
/**
 * Observações com valor.
 */
nValid: number, 
/**
 * Média aritmética.
 */
mean: Stat, 
/**
 * Variância amostral (denominador n − 1).
 */
variance: Stat, 
/**
 * Desvio-padrão amostral.
 */
sd: Stat, 
/**
 * Mínimo.
 */
min: Stat, 
/**
 * Máximo.
 */
max: Stat, };

/**
 * Observado × predito.
 */
export type SurfaceFitPoint = { 
/**
 * Observação.
 */
observationId: StableId, 
/**
 * Observado.
 */
observed: number, 
/**
 * Predito.
 */
predicted: number, 
/**
 * Resíduo.
 */
residual: number, 
/**
 * Alavancagem.
 */
leverage: number, };

/**
 * Malha de predições.
 */
export type SurfaceGrid = { 
/**
 * Fator do eixo horizontal.
 */
xFactor: StableId, 
/**
 * Nome do fator horizontal.
 */
xName: string, 
/**
 * Fator do eixo vertical.
 */
yFactor: StableId, 
/**
 * Nome do fator vertical.
 */
yName: string, 
/**
 * Valores reais do eixo horizontal.
 */
x: Array<number>, 
/**
 * Valores reais do eixo vertical.
 */
y: Array<number>, 
/**
 * Predições `z[iy][ix]`.
 */
z: Array<Array<Stat>>, 
/**
 * Extrapolação `[iy][ix]`.
 */
extrapolated: Array<Array<boolean>>, 
/**
 * Menor predição definida.
 */
zMin: number | null, 
/**
 * Maior predição definida.
 */
zMax: number | null, 
/**
 * Condições fixadas dos demais fatores.
 */
fixed: Array<FixedEcho>, 
/**
 * Curvas de nível.
 */
contours: Array<ContourLevel>, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Solicitação de análise de superfície de resposta.
 */
export type SurfaceRequest = { 
/**
 * Dados com os valores **reais** dos fatores numéricos.
 */
dataset: Dataset, 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Fatores e seus níveis (`low`/`high` definem a codificação).
 */
factors: Array<DesignFactor>, 
/**
 * Termos do modelo; vazio = modelo completo de segunda ordem.
 */
terms: Array<TermSpec>, 
/**
 * Nível de significância (0 < α < 1).
 */
alpha: number, };

/**
 * Resultado da análise.
 */
export type SurfaceResult = { 
/**
 * Resposta.
 */
responseId: StableId, 
/**
 * Nível de significância.
 */
alpha: number, 
/**
 * Nomes dos fatores.
 */
factorNames: Array<string>, 
/**
 * Intercepto.
 */
intercept: SurfaceTermRow, 
/**
 * Termos do modelo (na ordem pedida).
 */
terms: Array<SurfaceTermRow>, 
/**
 * ANOVA da regressão, com `R²` e `R²` ajustado.
 */
anova: RegressionAnova, 
/**
 * Falta de ajuste e erro puro (apenas quando há réplicas verdadeiras e graus de liberdade).
 */
lackOfFit: LackOfFit | null, 
/**
 * Equação nas escalas codificada e real.
 */
equation: Equation, 
/**
 * Intervalo experimental de cada fator.
 */
ranges: Array<FactorRange>, 
/**
 * Maior alavancagem entre os ensaios (referência da extrapolação oculta).
 */
maxLeverage: number, 
/**
 * Observado × predito.
 */
fitPoints: Array<SurfaceFitPoint>, 
/**
 * Termos sem hierarquia (quadrático ou interação sem os principais).
 */
hierarchyGaps: Array<string>, 
/**
 * Ajuste completo (diagnósticos por observação).
 */
fit: LinearFit, 
/**
 * Avisos.
 */
issues: Array<Issue>, 
/**
 * Fatos para a interpretação.
 */
facts: Array<Fact>, 
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Termo do modelo na escala codificada.
 */
export type SurfaceTermRow = { 
/**
 * Rótulo (`A`, `A²`, `A:B`).
 */
label: string, 
/**
 * Estimativa na escala codificada.
 */
estimate: Stat, 
/**
 * Erro-padrão.
 */
stdError: Stat, 
/**
 * Estatística t.
 */
tValue: Stat, 
/**
 * Valor-p bilateral.
 */
pValue: Stat, 
/**
 * Limite inferior do IC.
 */
ciLower: Stat, 
/**
 * Limite superior do IC.
 */
ciUpper: Stat, };

/**
 * Termo do modelo.
 */
export type TermSpec = { "type": "main", 
/**
 * Fator.
 */
factorId: StableId, } | { "type": "interaction", 
/**
 * Fatores.
 */
factorIds: Array<StableId>, } | { "type": "power", 
/**
 * Fator quantitativo.
 */
factorId: StableId, 
/**
 * Grau (≥ 2).
 */
degree: number, };

/**
 * Resultado das comparações.
 */
export type TukeyResult = { 
/**
 * Variante.
 */
variant: TukeyVariant, 
/**
 * Nível de significância da família.
 */
alpha: number, 
/**
 * Número de grupos (tamanho da família de médias).
 */
groups: number, 
/**
 * Número de comparações.
 */
comparisonsCount: number, 
/**
 * Graus de liberdade do erro.
 */
dfError: number, 
/**
 * Quantil crítico `q_crit`.
 */
criticalValue: Stat, 
/**
 * Pares, em ordem `(0,1), (0,2), …, (k−2,k−1)`.
 */
comparisons: Array<PairComparison>, };

/**
 * Variante aplicada.
 */
export type TukeyVariant = "tukey" | "tukeyKramer";

/**
 * Motivo pelo qual uma estatística não está definida.
 */
export type UndefinedReason = "noValidObservations" | "fewerThanTwoObservations" | "nonFiniteResult" | "notEstimable" | "noResidualDegreesOfFreedom" | "constantResponse" | "zeroMean" | "outOfDomain" | "noModelTerms";

/**
 * Situação da validação numérica.
 */
export type Validation = "notValidated" | "numericallyValidated" | "validated";
