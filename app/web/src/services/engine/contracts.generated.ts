// GERADO por scripts/gen-contracts.mjs a partir dos tipos Rust (ts-rs).
// NÃO EDITAR. Regenerar com `npm run gen:contracts`.

/** Versão do protocolo interface↔motor (desvtag-engine). */
export const PROTOCOL_VERSION = 1;

/** Versão do esquema do documento do projeto (desvtag-project). */
export const PROJECT_SCHEMA_VERSION = 1;

/**
 * Ajuste dos valores-p de comparações pareadas.
 */
export type Adjustment = "bonferroni" | "holm";

/**
 * Saídas adicionais que identificam a formulação v2.
 */
export type AdvancedMixedResult = {
/**
 * Estrutura realmente ajustada.
 */
covariance: MixedCovariance,
/**
 * Efeito fixo temporal.
 */
timeEffect: MixedTimeEffect,
/**
 * Codificação da hipótese, sem rótulo genérico de ANOVA tipo III.
 */
coding: CategoricalCoding,
/**
 * Identificador do fator temporal derivado, se presente.
 */
timeFactorId: StableId | null,
/**
 * Parâmetros de covariância identificáveis.
 */
parameters: Array<MixedCovarianceParameter>,
/**
 * Ocasiões na ordem da matriz UN e dos perfis.
 */
occasions: Array<number>,
/**
 * Rótulos históricos das ocasiões, se informados.
 */
timeLabels: Array<MixedTimeLabel>,
/**
 * Matriz UN marginal plana, ou vazia nas estruturas parametrizadas CS/AR1.
 */
covarianceMatrix: Array<number>,
/**
 * Covariância dos coeficientes, por linha.
 */
fixedCovariance: Array<number>,
/**
 * Log-verossimilhança restrita, incluindo constante (n-p)log(2 pi).
 */
remlLogLikelihood: number,
/**
 * Iterações do início convergente selecionado.
 */
iterations: number,
/**
 * Norma máxima do gradiente na parametrização transformada.
 */
gradientNorm: number,
/**
 * Informação observada positiva definida para inferência.
 */
inferenceAvailable: boolean,
/**
 * Testes conjuntos por termo.
 */
termTests: Array<MixedTermTest>,
/**
 * Referência efetiva, também quando não se pede EMM.
 */
referenceGrid: MixedReferenceGrid,
/**
 * EMM por fator pedido.
 */
marginalMeans: Array<MixedMarginalMean>,
/**
 * Diferenças dentro de cada família.
 */
comparisons: Array<MixedMarginalComparison>,
/**
 * Ajuste dos valores-p (IC simultâneos sempre Bonferroni).
 */
adjustment: MixedAdjustment,
/**
 * Pontos individuais sem exclusões/imputações adicionais.
 */
profiles: Array<MixedProfilePoint>,
/**
 * Perfis agregados nas condições observadas.
 */
meanProfiles: Array<MixedMeanProfile>, };

/**
 * Configuração científica avançada (ausente no percurso v1).
 */
export type AdvancedMixedSpec = {
/**
 * Estrutura pedida, sem substituição automática.
 */
covariance: MixedCovariance,
/**
 * Índices/ocasiões na ordem de todas as observações da solicitação; ausências explícitas.
 */
times?: Array<number | null>,
/**
 * Rótulos opcionais dos índices temporais explícitos.
 */
timeLabels: Array<MixedTimeLabel>,
/**
 * Efeito fixo adicional do tempo.
 */
timeEffect: MixedTimeEffect,
/**
 * Fatores categóricos cujas EMM devem ser comparadas; vazio desativa EMM.
 */
marginalFactors: Array<StableId>,
/**
 * Família de comparações separada para cada fator.
 */
adjustment: MixedAdjustment,
/**
 * Covariáveis sem referência explícita usam a média dos casos usados.
 */
references: Array<MixedReference>,
/**
 * Incluir família de médias marginais do tempo categórico derivado.
 */
marginalTime: boolean, };

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
 * Result family selected for presentation. Absent in old documents.
 */
export type AnalysisFamily = "legacy" | "mixture" | "repeated" | "nonlinear" | "power";

/**
 * Opções da análise.
 */
export type AnalysisOptions = {
/**
 * Saved mixed optimal design whose exact model is selected.
 */
optimalDesignId?: StableId,
/**
 * Optional fixed additive block and explicit prediction reference.
 */
surfaceBlock?: SurfaceBlockSpec,
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
export type AnalysisResult = { "type": "optimalModel" } & OptimalModelResult | { "type": "descriptive" } & DescriptiveResult | { "type": "oneWayComparison" } & OneWayResult | { "type": "twoLevelDesign" } & DesignAnalysisResult | { "type": "responseSurface" } & SurfaceResult | { "type": "optimization" } & OptimizationResult | { "type": "multipleComparison" } & ProcedureResult | { "type": "factorialAnova" } & FactorialResult;

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
 * Comentário ligado a um alvo e à revisão em que foi feito.
 */
export type Comment = {
/**
 * Identificador estável.
 */
id: StableId,
/**
 * A que se refere.
 */
target: CommentTarget,
/**
 * Revisão dos dados vigente quando o comentário foi escrito.
 */
revisionId: StableId,
/**
 * Nome de quem escreveu (livre; pode ficar vazio).
 */
author?: string | undefined,
/**
 * Texto do comentário.
 */
text: string,
/**
 * Criação (RFC 3339).
 */
createdAt: string,
/**
 * Última edição do texto (RFC 3339); ausente nos comentários nunca editados.
 */
editedAt?: string,
/**
 * Momento em que foi resolvido (RFC 3339); ausente enquanto estiver aberto.
 */
resolvedAt?: string,
/**
 * Respostas, da mais antiga para a mais recente.
 */
replies?: Array<CommentReply> | undefined, };

/**
 * Resposta a um comentário.
 */
export type CommentReply = {
/**
 * Identificador estável.
 */
id: StableId,
/**
 * Nome de quem respondeu (livre; pode ficar vazio).
 */
author?: string | undefined,
/**
 * Texto da resposta.
 */
text: string,
/**
 * Criação (RFC 3339).
 */
createdAt: string, };

/**
 * Alvo do comentário.
 */
export type CommentTarget = {
/**
 * Tipo do alvo.
 */
kind: CommentTargetKind,
/**
 * Chave estável da figura ou da tabela; vazia para experimento e análise.
 */
key?: string | undefined,
/**
 * Análise a que o alvo pertence, quando houver.
 */
analysisId?: StableId, };

/**
 * A que o comentário se refere.
 */
export type CommentTargetKind = "experiment" | "analysis" | "figure" | "table";

/**
 * Batch request for confirmation comparisons.
 */
export type ConfirmationCompareRequest = {
/**
 * Unique run/response pairs, with finite numeric inputs.
 */
observations: Array<ConfirmationObservation>, };

/**
 * Scientific comparison without refitting the originating model.
 */
export type ConfirmationComparison = {
/**
 * Stable identifier of the confirmation run.
 */
rowId: StableId,
/**
 * Stable identifier of the measured response.
 */
responseId: StableId,
/**
 * Observed minus predicted, with absence and overflow explicit.
 */
difference: Stat,
/**
 * Situation relative to the prediction interval.
 */
status: ConfirmationStatus, };

/**
 * Batch response in the input order.
 */
export type ConfirmationComparisons = {
/**
 * One comparison per input run/response pair.
 */
comparisons: Array<ConfirmationComparison>, };

/**
 * Stored prediction and later observation for one response of one run.
 */
export type ConfirmationObservation = {
/**
 * Stable identifier of the confirmation run.
 */
rowId: StableId,
/**
 * Stable identifier of the measured response.
 */
responseId: StableId,
/**
 * Prediction recorded when the proposal was generated.
 */
predicted: number,
/**
 * Available lower prediction limit.
 */
lower: number | null,
/**
 * Available upper prediction limit.
 */
upper: number | null,
/**
 * Later measurement; absent when no valid value was entered.
 */
observed: number | null, };

/**
 * Proposta de confirmação: previsões gravadas no momento da proposta, para comparação posterior
 * com o observado.
 */
export type ConfirmationPlan = {
/**
 * Fixed block assumed by the predictions; a future unknown block is not included in the IP.
 */
block?: SurfaceBlockContext,
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
 * Position of an observation relative to the stored prediction interval.
 */
export type ConfirmationStatus = "missing" | "below" | "above" | "within" | "noInterval";

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
 * All requested Cox directions relative to an explicit real reference blend.
 */
export type CoxTrace = {
/**
 * Actual reference after rounding-error-only sum normalization.
 */
reference: Array<number>,
/**
 * One entry per component, in request order.
 */
series: Array<CoxTraceSeries>, };

/**
 * One evaluated location along a Cox path.
 */
export type CoxTracePoint = {
/**
 * Change in the selected component's real fraction from the reference.
 */
delta: number,
/**
 * Real mixture fractions, in component order.
 */
proportions: Array<number>,
/**
 * Lower-bound pseudocomponents used by the fitted model.
 */
pseudo: Array<number>,
/**
 * Mean prediction, or an explicit non-estimable/non-finite state.
 */
value: Stat, };

/**
 * One component's feasible direction; absent interval means an undefined direction.
 */
export type CoxTraceSeries = {
/**
 * Index into the saved component names and reference.
 */
component: number,
/**
 * Feasible interval of the component's real fraction (not delta).
 */
interval: [number, number] | null,
/**
 * Ordered samples, including the exact reference.
 */
points: Array<CoxTracePoint>, };

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
 * Ponto da curva ajustada.
 */
export type CurvePoint = {
/**
 * Substrato.
 */
x: number,
/**
 * Valor ajustado.
 */
y: number,
/**
 * Limite inferior da faixa de confiança da curva.
 */
lower: Stat,
/**
 * Limite superior da faixa de confiança da curva.
 */
upper: Stat, };

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
 * Fixed block of the saved predictions, when supplied in the request.
 */
block?: SurfaceBlockContext,
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
export type ExclusionReason = "missingResponse" | "missingFactor" | "missingTime";

/**
 * Experimento: dados com histórico de revisões, seleção de análise e análises salvas.
 */
export type Experiment = {
/**
 * Applied optimal designs, retaining numeric output and row identities without regeneration.
 */
optimalDesigns?: Array<OptimalDesignRecord> | undefined,
/**
 * Saved geometric supplements; opening never computes a variance profile.
 */
optimalVariances?: Array<OptimalVarianceRecord> | undefined,
/**
 * Independent selection of archived optimal designs and profiles for display.
 */
optimalArtifactSelection?: OptimalArtifactSelection,
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
 * Dedicated time/occasion column visibility (absent in earlier files).
 */
showTimeColumn?: boolean,
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
 * Fatorial completo de níveis mistos gerado para este experimento (v0.3).
 */
mixed?: MixedSpec,
/**
 * Planejamento de misturas gerado para este experimento (v0.3).
 */
mixture?: MixtureSpec,
/**
 * Modelo de Scheffé escolhido na análise de misturas (v0.3).
 */
mixtureModel?: MixtureModel,
/**
 * Saved mixture calculations and current editable selection (v0.4, schema 1).
 */
mixtureResult?: SavedMixture,
/**
 * Saved paired/mixed calculations and current editable selection.
 */
mixedModelResult?: SavedRepeated,
/**
 * Saved saturation calculations and current editable selection.
 */
nonlinearResult?: SavedNonlinear,
/**
 * Saved prospective power calculations and raw editable assumptions.
 */
powerResult?: SavedPower,
/**
 * Result family shown on reopening; absent uses the legacy result.
 */
activeFamily?: AnalysisFamily,
/**
 * Personalização gráfica por figura (chave estável da figura → ajustes).
 */
figureStyles?: Record<string, FigureStyle> | undefined,
/**
 * Comentários de revisão, ligados a análises, figuras e tabelas (v0.3).
 */
comments?: Array<Comment> | undefined,
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
 * A sum-coded model column; uniqueness is tested for its individual coefficient.
 */
export type FactorialColumnGeometry = {
/**
 * Factor/level labels in the original model order.
 */
label: string,
/**
 * Whether this coefficient is uniquely identified, independently of pivot selection.
 */
estimable: boolean, };

/**
 * Geometry of the actual complete rows, without requiring residual degrees of freedom.
 */
export type FactorialEstimability = {
/**
 * None: all rows with complete selected factors, regardless of their responses.
 */
responseId: StableId | null,
/**
 * Rows in the dataset.
 */
totalRows: number,
/**
 * Complete rows actually represented by this diagnosis.
 */
usedRows: number,
/**
 * Number of model parameters, including the intercept.
 */
parameters: number,
/**
 * Numerical rank of the sum-coded matrix.
 */
rank: number,
/**
 * Complete rows minus rank (geometry only, not an error-variance estimate).
 */
residualDf: number,
/**
 * Original parameter order.
 */
columns: Array<FactorialColumnGeometry>,
/**
 * Pure-term dimensions, distinct from Type I/II sequential projection tests.
 */
terms: Array<FactorialTermGeometry>,
/**
 * Basis vectors N with X N = 0, in the original column order. Each vector has max |N| = 1.
 */
nullRelations: Array<Array<number>>,
/**
 * Method identity of the diagnostic.
 */
provenance: Provenance, };

/**
 * Explicit model-geometry request, also usable before response collection.
 */
export type FactorialGeometryRequest = {
/**
 * Conditions/observations to diagnose.
 */
dataset: Dataset,
/**
 * Model, including its block and interaction order; marginal requests are not evaluated.
 */
setup: FactorialSetup,
/**
 * Optional response determines complete-response rows; None uses conditions alone.
 */
responseId: StableId | null, };

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
 * Model geometry captured with this result; absent in historical v1 results.
 */
estimability?: FactorialEstimability,
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
 * Independently identifiable dimensions within one term, conditional on all the other terms.
 */
export type FactorialTermGeometry = {
/**
 * Display name.
 */
term: string,
/**
 * Stable factor identifiers.
 */
factors: Array<StableId>,
/**
 * Nominal sum-contrast dimensions.
 */
nominalDf: number,
/**
 * Rank gained after all the other terms; does not assert that the whole effect is identified.
 */
estimableDf: number, };

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
 * Planejamento gerado.
 */
export type GeneratedMixed = {
/**
 * Especificação usada.
 */
spec: MixedSpec,
/**
 * Combinações de níveis (produto dos números de níveis).
 */
combinations: number,
/**
 * Total de ensaios (`combinações × repetições`).
 */
total: number,
/**
 * Ensaios na ordem de execução.
 */
runs: Array<MixedRun>,
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
export type GeneratedMixture = {
/**
 * Especificação usada.
 */
spec: MixtureSpec,
/**
 * Pontos distintos do planejamento (sem repetições nem centrais extras).
 */
basePoints: number,
/**
 * Total de ensaios.
 */
total: number,
/**
 * Ensaios na ordem de execução.
 */
runs: Array<MixtureRun>,
/**
 * Geometria da variante limitada, ausente em planejamentos anteriores.
 */
region?: MixtureRegion,
/**
 * Algoritmo de aleatorização (ou a ordem padrão).
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
export type GeneratedOptimal = {
/**
 * Especificação usada.
 */
spec: OptimalSpec,
/**
 * Candidatos (depois das restrições).
 */
candidates: number,
/**
 * Ensaios (já realizados primeiro).
 */
runs: Array<OptimalRun>,
/**
 * Critérios do planejamento final.
 */
metrics: OptimalMetrics,
/**
 * Inícios tentados, inclusive os que falharam.
 */
startsRun: number,
/**
 * Inícios que chegaram ao melhor valor (a menos de 1e-9 relativo).
 */
startsReachingBest: number,
/**
 * Diagnóstico aditivo, ausente em resultados anteriores à versão 2 do método.
 */
search?: OptimalSearch,
/**
 * Algoritmo.
 */
algorithm: string,
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
 * Solicitação original, que fornece condições e codificação da matriz de desenho.
 */
surface: SurfaceRequest,
/**
 * Ajuste já arquivado. Chamadores antigos podem solicitar a preparação completa.
 */
fitted?: SurfaceGridFit,
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
 * Restrição linear `Σ coeficienteᵢ · xᵢ ≤ limite` em unidades reais.
 */
export type LinearConstraint = {
/**
 * Coeficiente de cada fator (mesma ordem de `factors`).
 */
coefficients: Array<number>,
/**
 * Limite superior da combinação.
 */
upper: number, };

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
 * Ajuste da família de diferenças de médias marginais.
 */
export type MixedAdjustment = "bonferroni" | "holm";

/**
 * Raw editable advanced model options; no statistical calculation in the interface.
 */
export type MixedAdvancedSelection = {
/**
 * Covariance structure.
 */
covariance: MixedCovariance,
/**
 * None uses the dedicated time column.
 */
timeSource: StableId | null,
/**
 * Include time values for covariance, fixed effects and profiles.
 */
timeEnabled: boolean,
/**
 * Semicolon-separated explicit categorical occasion order; empty uses numeric indices.
 */
occasionOrder: string,
/**
 * Time contribution to fixed effects.
 */
timeEffect: MixedTimeEffect,
/**
 * Coding of fixed categorical factors.
 */
coding: CategoricalCoding,
/**
 * Explicit fixed interactions.
 */
interactions: Array<Array<StableId>>,
/**
 * EMM factors.
 */
marginalFactors: Array<StableId>,
/**
 * Include EMM for categorical time.
 */
marginalTime: boolean,
/**
 * Adjustment per EMM family.
 */
adjustment: MixedAdjustment,
/**
 * Raw reference values; empty selects Rust-computed means.
 */
references: Array<MixedReferenceSelection>, };

/**
 * Coeficiente dos efeitos fixos.
 */
export type MixedCoefficient = {
/**
 * Rótulo da coluna.
 */
label: string,
/**
 * Estimativa.
 */
estimate: number,
/**
 * Erro-padrão.
 */
stdError: Stat,
/**
 * Graus de liberdade (Satterthwaite).
 */
df: Stat,
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
 * Estrutura marginal dentro de cada unidade.
 */
export type MixedCovariance = "compoundSymmetry" | "ar1" | "unstructured";

/**
 * Parâmetro identificável da covariância.
 */
export type MixedCovarianceParameter = {
/**
 * Nome estável (unitVariance, residualVariance, rho).
 */
name: string,
/**
 * Estimativa.
 */
value: number, };

/**
 * Inferência de uma função linear do modelo.
 */
export type MixedEstimate = {
/**
 * Estimativa.
 */
estimate: number,
/**
 * Erro-padrão.
 */
stdError: Stat,
/**
 * Graus de liberdade de Satterthwaite.
 */
df: Stat,
/**
 * Limite inferior.
 */
ciLower: Stat,
/**
 * Limite superior.
 */
ciUpper: Stat, };

/**
 * Um fator do planejamento, com seus níveis nomeados.
 */
export type MixedFactor = {
/**
 * Identificador do fator no experimento.
 */
id: StableId,
/**
 * Nome do fator, como digitado.
 */
name: string,
/**
 * Níveis, na ordem em que foram digitados.
 */
levels: Array<string>, };

/**
 * Diferença de EMM: primeiro menos segundo.
 */
export type MixedMarginalComparison = {
/**
 * Fator da família.
 */
factorId: StableId,
/**
 * Primeiro nível.
 */
first: string,
/**
 * Segundo nível.
 */
second: string,
/**
 * Diferença com IC simultâneo Bonferroni.
 */
inference: MixedEstimate,
/**
 * Valor-p bilateral sem ajuste.
 */
pValue: Stat,
/**
 * Valor-p ajustado.
 */
adjustedPValue: Stat,
/**
 * Número de diferenças na família.
 */
familySize: number, };

/**
 * Média marginal estimada em um nível.
 */
export type MixedMarginalMean = {
/**
 * Fator da família.
 */
factorId: StableId,
/**
 * Nível.
 */
level: string,
/**
 * Resultado.
 */
inference: MixedEstimate, };

/**
 * Perfil por ocasião: mesmas condições observadas, sem imputação nem EMM implícita.
 */
export type MixedMeanProfile = {
/**
 * Ocasião.
 */
time: number,
/**
 * Observações.
 */
n: number,
/**
 * Unidades distintas.
 */
units: number,
/**
 * Média observada.
 */
observedMean: number,
/**
 * Média modelada e IC da média, não de uma nova observação.
 */
inference: MixedEstimate, };

/**
 * Solicitação: dados (com a unidade experimental de cada observação) e efeitos fixos.
 */
export type MixedModelRequest = {
/**
 * Dados; toda observação usada precisa ter `unit_id`.
 */
dataset: Dataset,
/**
 * Resposta, termos dos efeitos fixos, codificação e nível de confiança.
 */
spec: ModelSpec,
/**
 * Extensão v2; ausência preserva integralmente o percurso legado.
 */
advanced?: AdvancedMixedSpec, };

/**
 * Resultado do ajuste.
 */
export type MixedModelResult = {
/**
 * Observações usadas.
 */
nObservations: number,
/**
 * Unidades (grupos).
 */
nGroups: number,
/**
 * Efeitos fixos.
 */
coefficients: Array<MixedCoefficient>,
/**
 * Variância entre unidades `σᵤ²`.
 */
varianceUnit: Stat,
/**
 * Variância residual `σₑ²`.
 */
varianceResidual: Stat,
/**
 * Correlação intraclasse `σᵤ²/(σᵤ² + σₑ²)`.
 */
icc: Stat,
/**
 * `σᵤ²` na fronteira (zero): o modelo se reduz ao sem efeito aleatório.
 */
boundary: boolean,
/**
 * Valor do REML perfilado (sem constantes) no ótimo.
 */
remlProfile: number,
/**
 * Efeitos aleatórios previstos.
 */
randomEffects: Array<RandomEffect>,
/**
 * Observações fora do ajuste.
 */
excluded: Array<ExcludedObservation>,
/**
 * Avisos.
 */
issues: Array<Issue>,
/**
 * Proveniência.
 */
provenance: Provenance,
/**
 * Saídas v2; ausente nos resultados antigos.
 */
advanced?: AdvancedMixedResult, };

/**
 * Ponto individual histórico, calculado no motor.
 */
export type MixedProfilePoint = {
/**
 * Observação original.
 */
observationId: StableId,
/**
 * Unidade científica (rótulo conservado no projeto).
 */
unit: string,
/**
 * Ocasião; ausente quando não foi informada em CS.
 */
time: number | null,
/**
 * Resposta observada.
 */
observed: number,
/**
 * Predição populacional X beta.
 */
population: number,
/**
 * Predição condicional ao intercepto da unidade; não aplicável em UN.
 */
conditional: Stat,
/**
 * Resíduo em relação à predição populacional.
 */
residual: number, };

/**
 * Valor de referência de uma covariável.
 */
export type MixedReference = {
/**
 * Fator.
 */
factorId: StableId,
/**
 * Valor explicitamente escolhido.
 */
value: number, };

/**
 * Grade de referência efetivamente usada.
 */
export type MixedReferenceGrid = {
/**
 * Referências das covariáveis.
 */
numeric: Array<MixedReference>,
/**
 * Níveis categóricos com pesos iguais.
 */
categorical: Array<MixedReferenceLevels>,
/**
 * Quantas células existem na grade completa.
 */
cells: number, };

/**
 * Níveis igualmente ponderados de um fator.
 */
export type MixedReferenceLevels = {
/**
 * Identificador.
 */
factorId: StableId,
/**
 * Níveis usados na ordem da codificação.
 */
levels: Array<string>, };

/**
 * Incomplete text remains editable without falsifying a past result.
 */
export type MixedReferenceSelection = {
/**
 * Covariate.
 */
factorId: StableId,
/**
 * Raw numeric input.
 */
value: string, };

/**
 * Um ensaio do planejamento.
 */
export type MixedRun = {
/**
 * Posição de execução (1-based).
 */
run: number,
/**
 * Posição na ordem padrão (1-based).
 */
standardOrder: number,
/**
 * Índice (0-based) do nível de cada fator.
 */
levelIndices: Array<number>,
/**
 * Nome do nível de cada fator.
 */
levels: Array<string>,
/**
 * Repetição da combinação (1-based).
 */
replicate: number, };

/**
 * Especificação do fatorial de níveis mistos.
 */
export type MixedSpec = {
/**
 * Fatores, na ordem das colunas (o primeiro varia mais depressa).
 */
factors: Array<MixedFactor>,
/**
 * Repetições da combinação completa (≥ 1).
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
 * Teste conjunto das colunas de um termo, condicionado aos demais.
 */
export type MixedTermTest = {
/**
 * Termo e hipótese exata na codificação registrada.
 */
term: TermSpec,
/**
 * Colunas com coeficientes simultaneamente zero.
 */
columns: Array<string>,
/**
 * Graus de liberdade do numerador.
 */
numeratorDf: number,
/**
 * F calculado.
 */
fValue: Stat,
/**
 * Graus de liberdade Fai–Cornelius.
 */
denominatorDf: Stat,
/**
 * Valor-p superior.
 */
pValue: Stat, };

/**
 * Papel do tempo nos efeitos fixos, independente da covariância.
 */
export type MixedTimeEffect = "none" | "numeric" | "categorical";

/**
 * Rótulo humano de um índice temporal, sem alterar suas distâncias.
 */
export type MixedTimeLabel = {
/**
 * Índice utilizado pelo motor.
 */
index: number,
/**
 * Rótulo original da ocasião.
 */
label: string, };

/**
 * Resultado da análise.
 */
export type MixtureAnalysis = {
/**
 * Modelo ajustado.
 */
model: MixtureModel,
/**
 * Ajuste: coeficientes, ANOVA centrada, resíduos e diagnósticos.
 */
fit: LinearFit,
/**
 * Previsões sobre o triângulo (só com três componentes; vazio nos demais casos).
 */
grid: Array<MixtureGridPoint>,
/**
 * Subdivisões da malha ternária, inclusive quando há previsões omitidas.
 */
gridDivisions?: number,
/**
 * Geometria do domínio limitado em proporções reais.
 */
region?: MixtureRegion,
/**
 * Traços opcionais em torno da referência real solicitada.
 */
coxTrace?: CoxTrace,
/**
 * Candidatos e diagnóstico da otimização solicitada, quando presente.
 */
optimum?: MixtureOptimizationResult,
/**
 * Avisos.
 */
issues: Array<Issue>,
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Solicitação de análise de uma mistura.
 */
export type MixtureAnalysisRequest = {
/**
 * Nomes dos componentes (2 a 8).
 */
componentNames: Array<string>,
/**
 * Limites inferiores (mesma ordem; 0 se não houver).
 */
lowerBounds: Array<number>,
/**
 * Limites superiores opcionais, na mesma ordem (1 quando ausentes).
 */
upperBounds?: Array<number>,
/**
 * Composição real de referência opcional para o traço de Cox.
 */
coxReference?: Array<number>,
/**
 * Otimização opcional com os objetivos e dados completos das respostas.
 */
optimization?: MixtureOptimizationSpec,
/**
 * Proporções reais de cada ensaio (uma linha por ensaio, somando 1).
 */
proportions: Array<Array<number>>,
/**
 * Resposta de cada ensaio.
 */
response: Array<number>,
/**
 * Modelo.
 */
model: MixtureModel,
/**
 * Nível de significância dos intervalos (`1 − α` de confiança).
 */
alpha: number, };

/**
 * Componente da mistura.
 */
export type MixtureComponent = {
/**
 * Identificador do fator no experimento.
 */
id: StableId,
/**
 * Nome do componente.
 */
name: string,
/**
 * Limite inferior da proporção (0 ≤ L < 1).
 */
lower: number, };

/**
 * Editable goal kind, independent of its raw numeric drafts.
 */
export type MixtureGoalKind = "maximize" | "minimize" | "target" | "range";

/**
 * Ponto da malha ternária.
 */
export type MixtureGridPoint = {
/**
 * Pseudocomponentes (somam 1).
 */
pseudo: Array<number>,
/**
 * Proporções reais.
 */
proportions: Array<number>,
/**
 * Resposta prevista.
 */
value: number, };

/**
 * Exact numeric request and variable identities used for a mixture fit.
 */
export type MixtureInputSnapshot = {
/**
 * Historical response.
 */
responseId: StableId,
/**
 * Historical components, in request order.
 */
componentIds: Array<StableId>,
/**
 * Request accepted by the scientific engine.
 */
request: MixtureAnalysisRequest, };

/**
 * Tipo de planejamento de misturas.
 */
export type MixtureKind = { "type": "lattice",
/**
 * Grau `m` (1 a 6).
 */
degree: number, } | { "type": "centroid" } | { "type": "extremeVertices",
/**
 * Partes iguais por aresta (1 a 6).
 */
degree: number, };

/**
 * Modelo de Scheffé.
 */
export type MixtureModel = "linear" | "quadratic" | "specialCubic";

/**
 * Editable mixture optimization configuration; scientific requests keep parsed values separately.
 */
export type MixtureOptimizationDraft = {
/**
 * Included responses and their raw goals.
 */
responses: Array<MixtureResponseGoalDraft>,
/**
 * Requested local starts.
 */
starts: string,
/**
 * Deterministic seed.
 */
seed: string,
/**
 * Maximum returned candidates.
 */
maxCandidates: string,
/**
 * Clustering distance in pseudocomponents.
 */
clusterTolerance: string, };

/**
 * Saved optimization result; all scientific values originate in Rust.
 */
export type MixtureOptimizationResult = {
/**
 * Whether a positive, zero-only, or no feasible solution was found.
 */
status: OptimizationStatus,
/**
 * Feasible candidates ordered by desirability.
 */
candidates: Array<MixtureOptimum>,
/**
 * Algorithm and revision.
 */
algorithm: string,
/**
 * Requested number of starts.
 */
requestedStarts: number,
/**
 * Actual local-search reports, including limited starts.
 */
starts: Array<MixtureStartReport>,
/**
 * Combined objective evaluations (not fitting or interval calculation).
 */
evaluations: number,
/**
 * Combined objective evaluation limit.
 */
evaluationBudget: number,
/**
 * Whether the combined budget stopped the requested search.
 */
budgetReached: boolean,
/**
 * Resolved affine dimension of the region.
 */
dimension: number,
/**
 * Geometry of the domain used for the search.
 */
region: MixtureRegion,
/**
 * Explicit diagnostics, including partial search.
 */
issues: Array<Issue>, };

/**
 * Optional mixture optimization, using the selected Scheffe model for each response.
 */
export type MixtureOptimizationSpec = {
/**
 * Shared goal functions, weights, hard limits and search configuration.
 */
setup: OptimizationSetup,
/**
 * One observation set per included response.
 */
data: Array<MixtureResponseData>, };

/**
 * A feasible mixture candidate and its model predictions.
 */
export type MixtureOptimum = {
/**
 * Display rank (one is best).
 */
rank: number,
/**
 * Real fractions.
 */
proportions: Array<number>,
/**
 * Lower-bound pseudocomponents.
 */
pseudo: Array<number>,
/**
 * Weighted geometric mean of individual desirabilities.
 */
desirability: number,
/**
 * Predictions and intervals at this composition.
 */
predictions: Array<ResponsePrediction>,
/**
 * Number of local search endpoints grouped here.
 */
starts: number, };

/**
 * Immutable successful calculation, bound to a historical data revision.
 */
export type MixtureRecord = {
/**
 * Stable analysis identifier, also usable by review comments.
 */
id: StableId,
/**
 * Creation time in RFC 3339 form.
 */
createdAt: string,
/**
 * Revision of the experiment at calculation time.
 */
revisionId: StableId,
/**
 * Versioned opaque input signature; never a rounded output.
 */
signature: string,
/**
 * Exact input accepted by the engine.
 */
input: MixtureInputSnapshot,
/**
 * Scientific result including method/engine provenance.
 */
result: MixtureAnalysis, };

/**
 * Planejamento gerado.
 */
export type MixtureRegion = {
/**
 * Vértices em proporções reais, ordenados lexicograficamente.
 */
vertices: Array<Array<number>>,
/**
 * Pares de índices dos vértices que delimitam cada aresta.
 */
edges: Array<[number, number]>,
/**
 * Dimensão afim numericamente resolvida da região.
 */
dimension: number, };

/**
 * One response's exact numeric observations.
 */
export type MixtureResponseData = {
/**
 * Stable response identity.
 */
responseId: StableId,
/**
 * Saved display name, including units when supplied.
 */
name: string,
/**
 * Real compositions for the retained observations.
 */
proportions: Array<Array<number>>,
/**
 * Observed response values, in the same order.
 */
response: Array<number>, };

/**
 * Raw fields retained even when an edited goal is invalid.
 */
export type MixtureResponseGoalDraft = {
/**
 * Included response identity.
 */
responseId: StableId,
/**
 * Desired goal function.
 */
kind: MixtureGoalKind,
/**
 * Lower goal threshold.
 */
low: string,
/**
 * Target threshold.
 */
target: string,
/**
 * Upper goal threshold.
 */
high: string,
/**
 * Lower-side or one-sided shape exponent.
 */
shapeLow: string,
/**
 * Upper-side target shape exponent.
 */
shapeHigh: string,
/**
 * Relative importance.
 */
importance: string,
/**
 * Optional mandatory lower response bound.
 */
min: string,
/**
 * Optional mandatory upper response bound.
 */
max: string, };

/**
 * Um ensaio.
 */
export type MixtureRun = {
/**
 * Posição de execução (1-based).
 */
run: number,
/**
 * Posição na ordem padrão (1-based).
 */
standardOrder: number,
/**
 * Quantidade de componentes presentes (> 0) no ponto: 1 = vértice, 2 = aresta…
 */
support: number,
/**
 * Ponto central extra.
 */
extraCenter: boolean,
/**
 * Pseudocomponentes (somam 1).
 */
pseudo: Array<number>,
/**
 * Proporções reais (somam 1).
 */
proportions: Array<number>,
/**
 * Repetição (1-based; nos centrais extras, o número do ponto).
 */
replicate: number, };

/**
 * Response being edited; model and alpha retain their existing experiment fields.
 */
export type MixtureSelection = {
/**
 * Response, including an unresolved selection after deleting a variable.
 */
responseId: StableId | null,
/**
 * Editable real-fraction reference drafts; absent disables the Cox trace.
 */
coxReference?: Array<string>,
/**
 * Optional mixture desirability goals, edited separately from saved results.
 */
optimization?: MixtureOptimizationDraft, };

/**
 * Especificação do planejamento de misturas.
 */
export type MixtureSpec = {
/**
 * Componentes (2 a 8).
 */
components: Array<MixtureComponent>,
/**
 * Limites superiores opcionais, na ordem dos componentes (1 quando ausentes).
 */
upperBounds?: Array<number>,
/**
 * Tipo de planejamento.
 */
kind: MixtureKind,
/**
 * Repetições de todos os pontos (≥ 1).
 */
replicates: number,
/**
 * Centrais extras (centroide do simplex ou média dos vértices da região limitada).
 */
centerPoints: number,
/**
 * Aleatorizar a ordem de execução.
 */
randomize: boolean,
/**
 * Semente da aleatorização; inteiro de até 2⁵³ − 1 na interface.
 */
seed: number, };

/**
 * Work performed by one local search.
 */
export type MixtureStartReport = {
/**
 * Termination condition.
 */
stop: MixtureStartStop,
/**
 * Objective evaluations, including the initial composition.
 */
evaluations: number,
/**
 * Complete or partial pair-transfer sweeps.
 */
sweeps: number, };

/**
 * Why a local start ended; tolerance does not establish a global optimum.
 */
export type MixtureStartStop = "stepTolerance" | "startBudget" | "evaluationBudget" | "pointRegion";

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
 * Exact saturation request plus historical variable identities.
 */
export type NonlinearInputSnapshot = {
/**
 * Substrate factor.
 */
factorId: StableId,
/**
 * Response.
 */
responseId: StableId,
/**
 * Numeric scientific request, including the fitted points.
 */
request: NonlinearRequest, };

/**
 * Parâmetro estimado.
 */
export type NonlinearParameter = {
/**
 * Nome (`a`, `b`, `c` ou `n`).
 */
name: string,
/**
 * Estimativa.
 */
estimate: number,
/**
 * Erro-padrão (Wald).
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
ciUpper: Stat,
/**
 * O parâmetro terminou em um limite.
 */
atBound: boolean, };

/**
 * Immutable successful calculation, bound to a historical data revision.
 */
export type NonlinearRecord = {
/**
 * Stable analysis identifier, also usable by review comments.
 */
id: StableId,
/**
 * Creation time in RFC 3339 form.
 */
createdAt: string,
/**
 * Revision of the experiment at calculation time.
 */
revisionId: StableId,
/**
 * Versioned opaque input signature; never a rounded output.
 */
signature: string,
/**
 * Exact input accepted by the engine.
 */
input: NonlinearInputSnapshot,
/**
 * Scientific result including method/engine provenance.
 */
result: NonlinearResult, };

/**
 * Solicitação de ajuste.
 */
export type NonlinearRequest = {
/**
 * Substrato (variável independente, `S ≥ 0`).
 */
x: Array<number>,
/**
 * Resposta.
 */
y: Array<number>,
/**
 * Modelo.
 */
model: SaturationModel,
/**
 * Valores iniciais (um por parâmetro); `None` = vários inícios automáticos.
 */
initial: Array<number> | null,
/**
 * Limites inferiores por parâmetro (`None` = sem limite); padrão: parâmetros positivos.
 */
lower: Array<number | null> | null,
/**
 * Limites superiores por parâmetro (`None` = sem limite).
 */
upper: Array<number | null> | null,
/**
 * Nível de significância dos intervalos (`1 − α` de confiança).
 */
alpha: number,
/**
 * Optional likelihood profiling (absent retains the legacy Wald result).
 */
profile?: boolean, };

/**
 * Resultado do ajuste.
 */
export type NonlinearResult = {
/**
 * Modelo ajustado.
 */
model: SaturationModel,
/**
 * Observações usadas.
 */
n: number,
/**
 * Parâmetros.
 */
parameters: Array<NonlinearParameter>,
/**
 * Soma de quadrados dos resíduos.
 */
sse: number,
/**
 * Desvio-padrão residual.
 */
sigma: Stat,
/**
 * `R² = 1 − SQR/SQT` (centrada).
 */
rSquared: Stat,
/**
 * Matriz de correlação dos parâmetros (linha a linha); vazia se indefinida.
 */
correlation: Array<Array<number>>,
/**
 * Número de condição da Jacobiana com colunas normalizadas.
 */
conditionNumber: Stat,
/**
 * O ajuste convergiu.
 */
converged: boolean,
/**
 * Iterações do melhor início.
 */
iterations: number,
/**
 * Inícios executados.
 */
startsRun: number,
/**
 * Inícios que chegaram à menor soma de quadrados.
 */
startsReachingBest: number,
/**
 * Resíduos `y − ŷ`.
 */
residuals: Array<number>,
/**
 * Curva ajustada com faixa de confiança.
 */
curve: Array<CurvePoint>,
/**
 * Avisos (identificabilidade, limites, não convergência).
 */
issues: Array<Issue>,
/**
 * Proveniência.
 */
provenance: Provenance,
/**
 * Sampled likelihood profiles and explicit endpoint states.
 */
profiles?: Array<ParameterProfile>, };

/**
 * Editable saturation configuration. Text fields preserve incomplete edits.
 */
export type NonlinearSelection = {
/**
 * Substrate factor.
 */
factorId: StableId | null,
/**
 * Response.
 */
responseId: StableId | null,
/**
 * Saturation model.
 */
model: SaturationModel,
/**
 * None uses automatic starts; individual text fields may still be incomplete.
 */
initial?: Array<string>,
/**
 * None uses the default lower bounds; empty text means unspecified.
 */
lower?: Array<string>,
/**
 * None uses the default upper bounds; empty text means unspecified.
 */
upper?: Array<string>,
/**
 * Request Gaussian likelihood profiles; absent preserves old selections.
 */
profile?: boolean, };

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
export type Operation = { "type": "engineInfo" } | { "type": "descriptiveSummarize" } & DescriptiveRequest | { "type": "designRecommend" } & DesignRecommendRequest | { "type": "designCount" } & DesignSpec | { "type": "designGenerate" } & DesignSpec | { "type": "designCrdGenerate" } & CrdSpec | { "type": "designRcbdGenerate" } & RcbdSpec | { "type": "designMixedGenerate" } & MixedSpec | { "type": "designMixtureGenerate" } & MixtureSpec | { "type": "mixtureAnalyze" } & MixtureAnalysisRequest | { "type": "designOptimalGenerate" } & OptimalSpec | { "type": "designOptimalAnalyze" } & OptimalModelRequest | { "type": "designOptimalVariance" } & OptimalVarianceRequest | { "type": "comparisonPaired" } & PairedRequest | { "type": "modelMixed" } & MixedModelRequest | { "type": "modelNonlinear" } & NonlinearRequest | { "type": "powerAnalyze" } & PowerRequest | { "type": "designAnalyze" } & DesignAnalysisRequest | { "type": "surfaceAnalyze" } & SurfaceRequest | { "type": "surfaceGrid" } & GridRequest | { "type": "exportXlsx" } & ExportWorkbook | { "type": "optimizationRun" } & OptimizationRequest | { "type": "optimizationEvaluate" } & EvaluateRequest | { "type": "confirmationCompare" } & ConfirmationCompareRequest | { "type": "optimizationGrid" } & OptimizationGridRequest | { "type": "comparisonOneWay" } & OneWayRequest | { "type": "comparisonProcedure" } & ProcedureRequest | { "type": "anovaFactorial" } & FactorialRequest | { "type": "anovaFactorialGeometry" } & FactorialGeometryRequest | { "type": "surfaceSelectModel" } & SurfaceRequest | { "type": "designSelectModel" } & DesignAnalysisRequest | { "type": "distributionEvaluate" } & DistributionRequest | { "type": "modelFitLinear" } & LinearModelRequest | { "type": "projectEncode" } & ProjectEncodeRequest | { "type": "projectDecode" } & BytesRequest | { "type": "importXlsx" } & ImportXlsxRequest;

/**
 * Resultado de uma operação.
 */
export type OperationResult = { "type": "engineInfo" } & EngineInfo | { "type": "descriptiveSummarize" } & DescriptiveResult | { "type": "designRecommend" } & DesignOptions | { "type": "designCount" } & RunCount | { "type": "designGenerate" } & GeneratedDesign | { "type": "designCrdGenerate" } & GeneratedCrd | { "type": "designRcbdGenerate" } & GeneratedRcbd | { "type": "designMixedGenerate" } & GeneratedMixed | { "type": "designMixtureGenerate" } & GeneratedMixture | { "type": "mixtureAnalyze" } & MixtureAnalysis | { "type": "designOptimalGenerate" } & GeneratedOptimal | { "type": "designOptimalAnalyze" } & OptimalModelResult | { "type": "designOptimalVariance" } & OptimalVariance | { "type": "comparisonPaired" } & PairedResult | { "type": "modelMixed" } & MixedModelResult | { "type": "modelNonlinear" } & NonlinearResult | { "type": "powerAnalyze" } & PowerResult | { "type": "designAnalyze" } & DesignAnalysisResult | { "type": "surfaceAnalyze" } & SurfaceResult | { "type": "surfaceGrid" } & SurfaceGrid | { "type": "exportXlsx" } & ProjectEncodeResult | { "type": "optimizationRun" } & OptimizationResult | { "type": "optimizationEvaluate" } & Evaluation | { "type": "confirmationCompare" } & ConfirmationComparisons | { "type": "optimizationGrid" } & SurfaceGrid | { "type": "comparisonOneWay" } & OneWayResult | { "type": "comparisonProcedure" } & ProcedureResult | { "type": "anovaFactorial" } & FactorialResult | { "type": "anovaFactorialGeometry" } & FactorialEstimability | { "type": "surfaceSelectModel" } & SelectionResult | { "type": "designSelectModel" } & SelectionResult | { "type": "distributionEvaluate" } & DistributionResult | { "type": "modelFitLinear" } & LinearFit | { "type": "projectEncode" } & ProjectEncodeResult | { "type": "projectDecode" } & ProjectDecodeResult | { "type": "importXlsx" } & SheetData;

/**
 * Viewer selection, separate from the design bound to the analysis settings.
 */
export type OptimalArtifactSelection = {
/**
 * Design selected for inspection. Omitted when following the latest design.
 */
designId?: StableId,
/**
 * Explicitly selected profile per design, when not following the latest profile.
 */
varianceByDesign: { [key in StableId]: StableId }, };

/**
 * Allocation of completed and new runs to fixed additive execution blocks.
 */
export type OptimalBlocks = {
/**
 * Unique nonempty block labels, in the declared order (2–8).
 */
labels: Array<string>,
/**
 * Zero-based block index of each fixed run, in the same order.
 */
fixedBlocks: Array<number>,
/**
 * New-run count for each block; the allocation remains fixed during search.
 */
newRuns: Array<number>, };

/**
 * Nominal treatment factor, with explicitly ordered sum-contrast levels.
 */
export type OptimalCategoricalFactor = {
/**
 * Stable experiment column.
 */
id: StableId,
/**
 * Saved display name.
 */
name: string,
/**
 * Unique, nonempty labels; the last is the sum-coding baseline.
 */
levels: Array<string>, };

/**
 * Categorical domain and immutable completed-run associations.
 */
export type OptimalCategories = {
/**
 * Nominal treatment factors, separate from quantitative factors and execution blocks.
 */
factors: Array<OptimalCategoricalFactor>,
/**
 * Optional permitted tuples. Absence means the full Cartesian product, with uniform mass.
 */
combinations?: Array<Array<string>>,
/**
 * Labels for every completed numeric row, including empty numeric rows in category-only designs.
 */
fixedRuns: Array<Array<string>>, };

/**
 * Critério de otimalidade.
 */
export type OptimalCriterion = "d" | "i";

/**
 * A generated design applied to a particular data revision.
 */
export type OptimalDesignRecord = {
/**
 * Stable record identity.
 */
id: StableId,
/**
 * Creation time supplied by the app.
 */
createdAt: string,
/**
 * Whether application preserved all source rows.
 */
augment: boolean,
/**
 * Data revision before application, preserving completed observations.
 */
sourceRevisionId: StableId,
/**
 * Data revision containing the applied design.
 */
revisionId: StableId,
/**
 * Exact editable-input signature that produced the design.
 */
signature: string,
/**
 * Observation identities in generated-run order, including completed rows.
 */
rowIds: Array<StableId>,
/**
 * Applied categorical execution-block column, when declared.
 */
blockFactorId?: StableId,
/**
 * Complete saved numeric specification, design, criteria and search diagnostics.
 */
result: GeneratedOptimal, };

/**
 * Fator quantitativo com faixa.
 */
export type OptimalFactor = {
/**
 * Identificador do fator no experimento.
 */
id: StableId,
/**
 * Nome do fator.
 */
name: string,
/**
 * Limite inferior (unidade real).
 */
low: number,
/**
 * Limite superior (unidade real).
 */
high: number, };

/**
 * Valores dos critérios para um planejamento.
 */
export type OptimalMetrics = {
/**
 * Número de parâmetros do modelo.
 */
parameters: number,
/**
 * `ln|XᵀX|`; indefinido (`null`) se a matriz for singular.
 */
logDet: number | null,
/**
 * Eficiência D por ensaio: `|XᵀX|^(1/p) / n`.
 */
dEfficiency: number | null,
/**
 * Eficiência A: `p / (n·tr((XᵀX)⁻¹))`.
 */
aEfficiency: number | null,
/**
 * Eficiência G: `p / (n·máx d(x))` sobre os candidatos.
 */
gEfficiency: number | null,
/**
 * Variância média de predição escalada `n·tr((XᵀX)⁻¹W)` sobre os candidatos.
 */
iAverage: number | null, };

/**
 * Modelo a estimar.
 */
export type OptimalModel = "linear" | "interactions" | "quadratic";

/**
 * Analysis of collected responses under an explicitly declared optimal-design model.
 */
export type OptimalModelRequest = {
/**
 * Actual data; incomplete response/factor rows are listed as excluded.
 */
dataset: Dataset,
/**
 * Model, coding and admissible region. No search is executed.
 */
spec: OptimalSpec,
/**
 * Selected response.
 */
responseId: StableId,
/**
 * Explicit data column containing the declared execution-block labels.
 */
blockFactorId: StableId | null,
/**
 * Significance level for coefficient inference and confidence intervals.
 */
alpha: number, };

/**
 * Saved fit of the exact declared optimal model.
 */
export type OptimalModelResult = {
/**
 * Complete original model/coding, independent of later edits to the planner.
 */
spec: OptimalSpec,
/**
 * Fitted response.
 */
responseId: StableId,
/**
 * Execution-block column used in the actual data.
 */
blockFactorId: StableId | null,
/**
 * QR fit, ANOVA and individual observation diagnostics.
 */
fit: LinearFit,
/**
 * Model identity, distinct from a numeric-only surface.
 */
provenance: Provenance, };

/**
 * Um ensaio do resultado.
 */
export type OptimalRun = {
/**
 * Nominal treatment levels, in spec.categories.factors order; never numeric doses.
 */
categories?: Array<string>,
/**
 * Zero-based block identity in `spec.blocks.labels`, when blocking is declared.
 */
block?: number,
/**
 * Posição (1-based): primeiro os já realizados, depois os novos.
 */
run: number,
/**
 * Já realizado (mantido).
 */
fixed: boolean,
/**
 * Níveis em unidades reais.
 */
real: Array<number>,
/**
 * Níveis codificados.
 */
coded: Array<number>, };

/**
 * Diagnóstico da busca, incluindo tentativas sem resultado utilizável.
 */
export type OptimalSearch = {
/**
 * Inícios solicitados e efetivamente tentados, sem contar recuperação como novo início.
 */
startsAttempted: number,
/**
 * Inícios que terminaram com desenho de posto completo.
 */
startsSucceeded: number,
/**
 * Inícios aleatórios singulares antes da recuperação.
 */
singularInitialStarts: number,
/**
 * Reinicializações de recuperação tentadas.
 */
recoveryAttempts: number,
/**
 * Inícios que falharam mesmo após recuperação.
 */
startsFailed: number,
/**
 * Inícios utilizáveis encerrados pelo limite de passagens.
 */
startsLimited: number,
/**
 * Pares ensaio/candidato avaliados, incluindo propostas singulares.
 */
evaluations: number,
/**
 * Varreduras da vizinhança, somadas sobre inícios e recuperações.
 */
passes: number,
/**
 * Causa de término do desenho escolhido.
 */
selectedStop: OptimalStop,
/**
 * Limite em milhões de produtos estimados, presente se interrompeu a busca.
 */
workLimit?: number, };

/**
 * Especificação do planejamento ótimo.
 */
export type OptimalSpec = {
/**
 * Nominal treatment factors and explicit categorical domain/associations; absent in numeric-only designs.
 */
categories?: OptimalCategories,
/**
 * Optional fixed additive blocks and prescribed augmentation counts.
 */
blocks?: OptimalBlocks,
/**
 * Fatores (1 a 5).
 */
factors: Array<OptimalFactor>,
/**
 * Modelo.
 */
model: OptimalModel,
/**
 * Critério.
 */
criterion: OptimalCriterion,
/**
 * Total de ensaios, **incluindo** os já realizados.
 */
runs: number,
/**
 * Níveis por fator na malha de candidatos (3 ou 5).
 */
levels: number,
/**
 * Restrições lineares.
 */
constraints: Array<LinearConstraint>,
/**
 * Ensaios já realizados (unidades reais, mesma ordem dos fatores), mantidos no planejamento.
 */
fixedRuns: Array<Array<number>>,
/**
 * Inícios aleatórios (1 a 50).
 */
starts: number,
/**
 * Aleatorizar a ordem de execução dos ensaios novos.
 */
randomize: boolean,
/**
 * Semente (inteiro de até 2⁵³ − 1 na interface).
 */
seed: number, };

/**
 * Motivo de término de uma tentativa da busca.
 */
export type OptimalStop = "noImprovingExchange" | "passLimit" | "workLimit" | "singular";

/**
 * Saved geometric supplement, independent of measured responses or sigma squared.
 */
export type OptimalVariance = {
/**
 * Exact evaluated inputs, so a saved profile cannot be attached to another design.
 */
request: OptimalVarianceRequest,
/**
 * Full parameter count, including block contrasts.
 */
parameters: number,
/**
 * Actual number of design rows used in the information matrix.
 */
runs: number,
/**
 * All and only admissible spatial candidates, without random sampling.
 */
points: Array<VariancePoint>,
/**
 * First the pooled distribution, then each block when blocks are present.
 */
curves: Array<VarianceCurve>,
/**
 * Definition and engine version used for this supplement.
 */
provenance: Provenance, };

/**
 * An explicit geometric calculation supplements, rather than overwrites, a saved design.
 */
export type OptimalVarianceRecord = {
/**
 * Stable identity shared with the experiment result ledger.
 */
id: StableId,
/**
 * Time of the explicit evaluation, not of opening the file.
 */
createdAt: string,
/**
 * Applied design whose original numeric output remains intact.
 */
designId: StableId,
/**
 * Applied design data revision.
 */
revisionId: StableId,
/**
 * Visual preferences for this profile. They do not alter the saved values.
 */
view?: OptimalVarianceView,
/**
 * Inputs, finite candidate values, ordered distributions and provenance.
 */
result: OptimalVariance, };

/**
 * Explicit design to evaluate. Generator allocation is not inferred from row order.
 */
export type OptimalVarianceRequest = {
/**
 * Explicit nominal labels for every design row, mandatory when categories are declared.
 */
runCategories?: Array<Array<string>>,
/**
 * Model, coding, constraints and finite candidate grid.
 */
spec: OptimalSpec,
/**
 * Actual numeric design rows, including fixed rows.
 */
runsReal: Array<Array<number>>,
/**
 * One declared block index per row; absent for unblocked designs.
 */
runBlocks?: Array<number>, };

/**
 * Display choices for an archived geometric profile.
 */
export type OptimalVarianceView = {
/**
 * Show N times the relative prediction variance.
 */
scaled: boolean,
/**
 * Block of the distribution, or all blocks.
 */
distributionBlock?: number,
/**
 * Block of the spatial slice.
 */
mapBlock: number,
/**
 * Horizontal and vertical factor indices. Ignored when the axis is unavailable.
 */
axes: [number, number],
/**
 * Coded coordinates of the factors held fixed, keyed by their zero-based index.
 */
fixed: { [key in string]: number },
/**
 * Ordered categorical levels of the spatial slice.
 */
categorySlice: Array<string>, };

/**
 * Pedido da malha de desejabilidade.
 */
export type OptimizationGridRequest = {
/**
 * Modelos e objetivos.
 */
optimization: OptimizationRequest,
/**
 * Ajustes arquivados, na ordem dos objetivos.
 */
fitted?: Array<SurfaceGridFit>,
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
 * Optional fixed additive execution block and prediction reference.
 */
block?: SurfaceBlockSpec,
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
 * Explicit fixed-block reference used by every fitted response, when supplied.
 */
block?: SurfaceBlockContext,
/**
 * Ajustes da busca usados na malha de desejabilidade depois de salvar.
 */
gridModels?: Array<SurfaceGridFit>,
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
 * Pares de observações.
 */
export type PairedRequest = {
/**
 * Primeira condição (uma observação por par).
 */
first: Array<number>,
/**
 * Segunda condição (mesma ordem de pares).
 */
second: Array<number>,
/**
 * Nível de significância (`1 − α` de confiança).
 */
alpha: number, };

/**
 * Resultado da comparação pareada.
 */
export type PairedResult = {
/**
 * Pares.
 */
n: number,
/**
 * Média da primeira condição.
 */
meanFirst: number,
/**
 * Média da segunda condição.
 */
meanSecond: number,
/**
 * Teste t pareado.
 */
tTest: PairedT,
/**
 * Teste de Wilcoxon (indefinido se todas as diferenças forem nulas).
 */
wilcoxon: Wilcoxon | null,
/**
 * Avisos.
 */
issues: Array<Issue>,
/**
 * Proveniência.
 */
provenance: Provenance, };

/**
 * Teste t pareado.
 */
export type PairedT = {
/**
 * Média das diferenças `primeiro − segundo`.
 */
meanDifference: Stat,
/**
 * Desvio-padrão das diferenças.
 */
sdDifference: Stat,
/**
 * Erro-padrão da média das diferenças.
 */
stdError: Stat,
/**
 * Estatística t.
 */
t: Stat,
/**
 * Graus de liberdade (`n − 1`).
 */
df: number,
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
ciUpper: Stat,
/**
 * Tamanho de efeito `d_z = d̄/s_d`.
 */
effectSize: Stat, };

/**
 * Pairing information retained without storing localized prose.
 */
export type PairingSnapshot = {
/**
 * Complete experimental units, in request order.
 */
units: Array<string>,
/**
 * Units with a missing condition.
 */
incomplete: Array<string>,
/**
 * Units with duplicate measurements in a condition.
 */
duplicated: Array<string>,
/**
 * Observations with no usable experimental-unit identifier.
 */
withoutUnit: number, };

/**
 * Ajuste das comparações entre médias marginais.
 */
export type PairwiseAdjustment = "tukey" | "none" | "bonferroni" | "holm";

/**
 * One parameter's likelihood confidence limits and examined trace.
 */
export type ParameterProfile = {
/**
 * Parameter identifier.
 */
parameter: string,
/**
 * Asymptotic chi-square(1) cutoff.
 */
cutoff: number,
/**
 * Only finite when it is a valid cutoff crossing.
 */
lower: Stat,
/**
 * Only finite when it is a valid cutoff crossing.
 */
upper: Stat,
/**
 * Lower endpoint's numerical status.
 */
lowerStatus: ProfileEndpointStatus,
/**
 * Upper endpoint's numerical status.
 */
upperStatus: ProfileEndpointStatus,
/**
 * Numerically monotonic away from the optimum over the sampled domain; not a global proof.
 */
unimodalInExaminedRange: boolean,
/**
 * Full sampled trace, ordered by parameter value.
 */
points: Array<ProfilePoint>, };

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
 * Editable fixed-design power fields. Only the selected design consumes its own fields.
 */
export type PowerAdvancedSelection = {
/**
 * Predictor rows separated by newlines; cells by semicolon or tab.
 */
predictors: string,
/**
 * Expected slopes separated by semicolons.
 */
coefficients: string,
/**
 * Contrast weights.
 */
weights: string,
/**
 * Integer group allocation.
 */
allocation: string,
/**
 * Number of two-level factors.
 */
factorCount: string,
/**
 * Semicolon-separated terms, with one-based factor numbers joined by *.
 */
terms: string,
/**
 * Expected effects, one per term.
 */
effects: string,
/**
 * Selected zero-based term index.
 */
targetTerm: string, };

/**
 * Desenho cuja potência se calcula.
 */
export type PowerDesign = { "type": "anova",
/**
 * Médias esperadas dos grupos.
 */
means: Array<number>, } | { "type": "oneSampleT",
/**
 * Diferença esperada.
 */
difference: number, } | { "type": "pairedT",
/**
 * Diferença esperada.
 */
difference: number, } | { "type": "twoSampleT",
/**
 * Diferença esperada entre as médias.
 */
difference: number, } | { "type": "regression",
/**
 * Rows of predictors in the base design (without the intercept).
 */
predictors: Array<Array<number>>,
/**
 * Expected slopes in predictor units.
 */
coefficients: Array<number>, } | { "type": "contrast",
/**
 * Expected group means.
 */
means: Array<number>,
/**
 * Contrast weights, summing to zero.
 */
weights: Array<number>,
/**
 * Positive integer group counts in one base replicate.
 */
allocation: Array<number>, } | { "type": "twoLevel",
/**
 * Number of two-level factors.
 */
factors: number,
/**
 * Distinct nonempty subsets of zero-based factor indices, including fitted interactions.
 */
terms: Array<Array<number>>,
/**
 * Expected high-minus-low effects, one per term.
 */
effects: Array<number>,
/**
 * Index of the tested term in terms/effects.
 */
target: number, };

/**
 * O que calcular.
 */
export type PowerGoal = { "type": "powerAt",
/**
 * Tamanho da amostra.
 */
n: number, } | { "type": "sampleSizeFor",
/**
 * Potência-alvo (0 a 1, exclusivo).
 */
power: number, } | { "type": "precisionFor",
/**
 * Semiamplitude desejada.
 */
halfWidth: number, };

/**
 * Quantity requested from the power calculator.
 */
export type PowerGoalKind = "powerAt" | "sampleSizeFor" | "precisionFor";

/**
 * Power design selected in the calculator.
 */
export type PowerKind = "anova" | "oneSampleT" | "pairedT" | "twoSampleT" | "regression" | "contrast" | "twoLevel";

/**
 * Ponto da curva de potência.
 */
export type PowerPoint = {
/**
 * Tamanho da amostra.
 */
n: number,
/**
 * Potência.
 */
power: number, };

/**
 * Immutable successful calculation, bound to a historical data revision.
 */
export type PowerRecord = {
/**
 * Stable analysis identifier, also usable by review comments.
 */
id: StableId,
/**
 * Creation time in RFC 3339 form.
 */
createdAt: string,
/**
 * Revision of the experiment at calculation time.
 */
revisionId: StableId,
/**
 * Versioned opaque input signature; never a rounded output.
 */
signature: string,
/**
 * Exact input accepted by the engine.
 */
input: PowerRequest,
/**
 * Scientific result including method/engine provenance.
 */
result: PowerResult, };

/**
 * Solicitação.
 */
export type PowerRequest = {
/**
 * Desenho.
 */
design: PowerDesign,
/**
 * Desvio-padrão esperado do erro (σ > 0).
 */
sigma: number,
/**
 * Nível de significância (0 a 1, exclusivo).
 */
alpha: number,
/**
 * Teste bilateral (nos testes t); a ANOVA é sempre «unilateral» na cauda superior de F.
 */
twoSided: boolean,
/**
 * Objetivo.
 */
goal: PowerGoal,
/**
 * Optional reproducible Gaussian test-statistic simulation at the resulting n.
 */
simulation?: PowerSimulation, };

/**
 * Resultado.
 */
export type PowerResult = {
/**
 * `n` por grupo (ANOVA e duas amostras) ou número de unidades/pares.
 */
n: number,
/**
 * Total de observações do estudo.
 */
total: number,
/**
 * Potência em `n`.
 */
power: Stat,
/**
 * Parâmetro de não centralidade (`λ` na ANOVA, `δ` nos testes t).
 */
noncentrality: number | null,
/**
 * Graus de liberdade do numerador (ANOVA) ou do teste (t).
 */
df1: number,
/**
 * Graus de liberdade do denominador (ANOVA); 0 nos testes t.
 */
df2: number,
/**
 * Valor crítico usado.
 */
critical: number,
/**
 * Semiamplitude do intervalo de confiança em `n` (só nos testes t).
 */
halfWidth: Stat,
/**
 * Curva de potência em função de `n`.
 */
curve: Array<PowerPoint>,
/**
 * Avisos.
 */
issues: Array<Issue>,
/**
 * Proveniência.
 */
provenance: Provenance,
/**
 * Monte Carlo verification, distinct from analytical power and its curve.
 */
simulation?: PowerSimulationResult, };

/**
 * Raw editable assumptions, independent of the experiment's observations.
 */
export type PowerSelection = {
/**
 * Design.
 */
kind: PowerKind,
/**
 * Requested quantity.
 */
goal: PowerGoalKind,
/**
 * Expected group means, as entered.
 */
means: string,
/**
 * Expected difference, as entered.
 */
difference: string,
/**
 * Expected standard deviation, as entered.
 */
sigma: string,
/**
 * Significance level, as entered.
 */
alpha: string,
/**
 * Target power, as entered.
 */
target: string,
/**
 * Sample size, as entered.
 */
n: string,
/**
 * Half-width, as entered.
 */
halfWidth: string,
/**
 * Two-sided t test.
 */
twoSided: boolean,
/**
 * Raw explicit-design assumptions, including incomplete edits.
 */
advanced?: PowerAdvancedSelection,
/**
 * Raw simulation assumptions, independent of the successful request.
 */
simulation?: PowerSimulationSelection, };

/**
 * Reproducible Monte Carlo options (Gaussian fixed-design tests).
 */
export type PowerSimulation = {
/**
 * PCG32 seed; stream 54 is fixed.
 */
seed: number,
/**
 * Number of simulated studies, 1,000 through 1,000,000.
 */
replications: number, };

/**
 * Binomial uncertainty of the Monte Carlo rejection proportion.
 */
export type PowerSimulationResult = {
/**
 * Seed used for this simulation.
 */
seed: number,
/**
 * Number of simulated studies.
 */
replications: number,
/**
 * Studies rejecting the recorded null hypothesis.
 */
rejections: number,
/**
 * Empirical rejection proportion (not the analytical power).
 */
estimate: number,
/**
 * Monte Carlo standard error of that proportion.
 */
standardError: number,
/**
 * Wilson 95% binomial lower limit.
 */
ciLower: number,
/**
 * Wilson 95% binomial upper limit.
 */
ciUpper: number,
/**
 * Versioned generator/statistic algorithm identifier.
 */
algorithm: string, };

/**
 * Raw Monte Carlo controls; malformed edits must survive recovery without replacing results.
 */
export type PowerSimulationSelection = {
/**
 * Seed as entered.
 */
seed: string,
/**
 * Number of simulated studies as entered.
 */
replications: string, };

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
 * Reason that an endpoint is, or is not, an LR cutoff crossing.
 */
export type ProfileEndpointStatus = "crossing" | "domainBound" | "searchLimit" | "failed" | "resourceLimit";

/**
 * One constrained fit on a likelihood profile.
 */
export type ProfilePoint = {
/**
 * Fixed parameter value.
 */
value: number,
/**
 * Gaussian profile likelihood ratio statistic.
 */
likelihoodRatio: number, };

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
experiments: Array<Experiment>,
/**
 * Experimento ativo ao salvar; ausente nos arquivos anteriores.
 */
currentExperimentId?: StableId, };

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
 * Efeito aleatório previsto (BLUP) de uma unidade.
 */
export type RandomEffect = {
/**
 * Unidade experimental.
 */
unit: string,
/**
 * Observações da unidade usadas no ajuste.
 */
observations: number,
/**
 * Efeito previsto.
 */
blup: number, };

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
 * Exact request used for the saved dependent-observations result.
 */
export type RepeatedInputSnapshot = { "type": "paired",
/**
 * Response.
 */
responseId: StableId,
/**
 * Factor defining the two conditions.
 */
factorId: StableId,
/**
 * None uses the dedicated unit column.
 */
unitSource: StableId | null,
/**
 * Original unit labels; scientific identifiers remain distinct and stable.
 */
unitLabels?: { [key in string]: string },
/**
 * Pairing diagnostics.
 */
pairing: PairingSnapshot,
/**
 * Numeric scientific request.
 */
request: PairedRequest, } | { "type": "mixed",
/**
 * None uses the dedicated unit column.
 */
unitSource: StableId | null,
/**
 * Original unit labels; scientific identifiers remain distinct and stable.
 */
unitLabels?: { [key in string]: string },
/**
 * Numeric scientific request.
 */
request: MixedModelRequest, };

/**
 * Procedure being edited in the dependent-observations panel.
 */
export type RepeatedMethod = "paired" | "mixed";

/**
 * Saved result; its discriminant must match the input snapshot.
 */
export type RepeatedOutput = { "type": "paired" } & PairedResult | { "type": "mixed" } & MixedModelResult;

/**
 * Immutable successful calculation, bound to a historical data revision.
 */
export type RepeatedRecord = {
/**
 * Stable analysis identifier, also usable by review comments.
 */
id: StableId,
/**
 * Creation time in RFC 3339 form.
 */
createdAt: string,
/**
 * Revision of the experiment at calculation time.
 */
revisionId: StableId,
/**
 * Versioned opaque input signature; never a rounded output.
 */
signature: string,
/**
 * Exact input accepted by the engine.
 */
input: RepeatedInputSnapshot,
/**
 * Scientific result including method/engine provenance.
 */
result: RepeatedOutput, };

/**
 * Editable repeated-observations configuration; alpha is the experiment alpha.
 */
export type RepeatedSelection = {
/**
 * Procedure.
 */
method: RepeatedMethod,
/**
 * Response.
 */
responseId: StableId | null,
/**
 * None uses the grid's dedicated experimental-unit column.
 */
unitSource: StableId | null,
/**
 * Factor defining the paired conditions.
 */
pairFactor: StableId | null,
/**
 * None keeps the default fixed-factor selection.
 */
fixed: Array<StableId> | null,
/**
 * Configuration v2; absent keeps legacy files and inference unchanged.
 */
advanced?: MixedAdvancedSelection, };

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
responses: Array<string>,
/**
 * Original occasion/time cell; absent in earlier files.
 */
timeText?: string, };

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
 * Modelo de saturação.
 */
export type SaturationModel = "monod" | "haldane" | "hill";

/**
 * Current editable selection and immutable calculation history.
 */
export type SavedMixture = {
/**
 * Selection being edited; it may differ from the latest calculation.
 */
selection: MixtureSelection,
/**
 * Old records remain available to historical references and comments.
 */
records: Array<MixtureRecord>, };

/**
 * Current editable selection and immutable calculation history.
 */
export type SavedNonlinear = {
/**
 * Selection being edited; it may differ from the latest calculation.
 */
selection: NonlinearSelection,
/**
 * Old records remain available to historical references and comments.
 */
records: Array<NonlinearRecord>, };

/**
 * Current editable selection and immutable calculation history.
 */
export type SavedPower = {
/**
 * Selection being edited; it may differ from the latest calculation.
 */
selection: PowerSelection,
/**
 * Old records remain available to historical references and comments.
 */
records: Array<PowerRecord>, };

/**
 * Current editable selection and immutable calculation history.
 */
export type SavedRepeated = {
/**
 * Selection being edited; it may differ from the latest calculation.
 */
selection: RepeatedSelection,
/**
 * Old records remain available to historical references and comments.
 */
records: Array<RepeatedRecord>, };

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
 * Saved label and reference, independent of later edits to the experiment.
 */
export type SurfaceBlockContext = {
/**
 * Block column.
 */
factorId: StableId,
/**
 * Saved display name.
 */
name: string,
/**
 * Reference level (treatment coding, zero block coordinates).
 */
reference: string, };

/**
 * Block estimates relative to the prediction reference.
 */
export type SurfaceBlockResult = {
/**
 * Meaning of the equation's and figure's block coordinates.
 */
context: SurfaceBlockContext,
/**
 * Fixed additive block coefficients, with uncertainty.
 */
coefficients: Array<SurfaceTermRow>, };

/**
 * Fixed additive block and explicitly chosen prediction reference.
 */
export type SurfaceBlockSpec = {
/**
 * Categorical block column.
 */
factorId: StableId,
/**
 * Reference level for the equation, predictions and optimization.
 */
reference: string, };

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
 * Fixed additive block used for these predictions, when declared.
 */
block?: SurfaceBlockContext,
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
 * Parte do ajuste arquivado necessária para a predição, sem diagnósticos ou resíduos.
 */
export type SurfaceGridFit = {
/**
 * Identidade da resposta que produziu os coeficientes.
 */
responseId: StableId,
/**
 * Observações usadas na ordem da matriz de ajuste.
 */
observationIds: Array<StableId>,
/**
 * Coeficientes na ordem do ajuste, indefinidos nas colunas aliasadas.
 */
coefficients: Array<CoefficientRow>,
/**
 * Posto calculado e arquivado com a análise.
 */
rank: number,
/**
 * Faixas e codificação da análise.
 */
ranges: Array<FactorRange>,
/**
 * Maior alavancagem entre os ensaios.
 */
maxLeverage: number,
/**
 * Bloco de referência arquivado.
 */
block: SurfaceBlockContext | null,
/**
 * Origem do modelo preditivo.
 */
provenance: Provenance, };

/**
 * Solicitação de análise de superfície de resposta.
 */
export type SurfaceRequest = {
/**
 * Optional additive block; absent preserves the original polynomial model.
 */
block?: SurfaceBlockSpec,
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
 * Optional fixed-block estimates and prediction reference.
 */
block?: SurfaceBlockResult,
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
export type UndefinedReason = "noValidObservations" | "fewerThanTwoObservations" | "nonFiniteResult" | "notEstimable" | "noResidualDegreesOfFreedom" | "constantResponse" | "zeroMean" | "outOfDomain" | "noModelTerms" | "notApplicable" | "covarianceInformationUnavailable";

/**
 * Situação da validação numérica.
 */
export type Validation = "notValidated" | "numericallyValidated" | "validated";

/**
 * Pooled uniform candidates x blocks, or one explicitly selected block.
 */
export type VarianceCurve = {
/**
 * None means the full uniform distribution, not a mean-response variance.
 */
block?: number,
/**
 * Smallest variance over the selected candidates/blocks.
 */
minimum: VarianceValue,
/**
 * Uniform average over the selected candidates/blocks.
 */
average: VarianceValue,
/**
 * Largest variance over the selected candidates/blocks.
 */
maximum: VarianceValue,
/**
 * Sorted discrete distribution, with references to the exact source table.
 */
quantiles: Array<VarianceQuantile>, };

/**
 * A spatial candidate; values follow the declared blocks (one value without blocks).
 */
export type VariancePoint = {
/**
 * Nominal coordinates, separate from numeric real/coded coordinates.
 */
categories?: Array<string>,
/**
 * Coded coordinates in specification order.
 */
coded: Array<number>,
/**
 * Real coordinates in specification order.
 */
real: Array<number>,
/**
 * Conditional values by block; this is not the variance of a block average.
 */
values: Array<VarianceValue>, };

/**
 * One ordered value of the exact finite candidate distribution.
 */
export type VarianceQuantile = {
/**
 * Accumulated mass (i+1)/N in this finite distribution, in (0,1].
 */
fraction: number,
/**
 * Index of the spatial candidate.
 */
point: number,
/**
 * Declared block; absent when the design has no block.
 */
block?: number,
/**
 * Both displayed scales of the same value.
 */
value: VarianceValue, };

/**
 * Variance of the fitted mean divided by sigma squared, and multiplied by n.
 */
export type VarianceValue = {
/**
 * h = f' (X'X)^-1 f; no estimated error variance is introduced.
 */
relative: number,
/**
 * n*h, with n the explicit number of design rows.
 */
scaled: number, };

/**
 * Teste dos postos sinalizados de Wilcoxon.
 */
export type Wilcoxon = {
/**
 * Pares com diferença não nula (usados no teste).
 */
nUsed: number,
/**
 * Pares com diferença nula (descartados).
 */
nZero: number,
/**
 * Soma dos postos das diferenças positivas.
 */
wPlus: number,
/**
 * Soma dos postos das diferenças negativas.
 */
wMinus: number,
/**
 * Estatística `mín(W₊, W₋)`.
 */
statistic: number,
/**
 * Valor-p bilateral.
 */
pValue: Stat,
/**
 * `exact` ou `normalApproximation`.
 */
method: string,
/**
 * Há empates entre os valores absolutos das diferenças.
 */
hasTies: boolean, };
