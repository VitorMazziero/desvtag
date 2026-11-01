// GERADO por scripts/gen-contracts.mjs a partir dos tipos Rust (ts-rs).
// NÃO EDITAR. Regenerar com `npm run gen:contracts`.

/** Versão do protocolo interface↔motor (optima-engine). */
export const PROTOCOL_VERSION = 1;

/** Versão do esquema do documento do projeto (optima-project). */
export const PROJECT_SCHEMA_VERSION = 1;

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
alpha?: number, };

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
export type AnalysisResult = { "type": "descriptive" } & DescriptiveResult | { "type": "oneWayComparison" } & OneWayResult;

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
 * Código de erro do protocolo (a interface localiza a mensagem).
 */
export type ErrorCode = "invalidRequest" | "unsupportedProtocolVersion" | "invalidInput" | "invalidProject" | "invalidImport";

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
 * Tipo de um fator: quantitativo (níveis numéricos) ou categórico (rótulos).
 *
 * O usuário define fatores livremente; os planejamentos verificam, em seus
 * módulos, se a natureza do fator é compatível com o método escolhido.
 */
export type FactorKind = "numeric" | "categorical";

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
export type Operation = { "type": "engineInfo" } | { "type": "descriptiveSummarize" } & DescriptiveRequest | { "type": "comparisonOneWay" } & OneWayRequest | { "type": "distributionEvaluate" } & DistributionRequest | { "type": "modelFitLinear" } & LinearModelRequest | { "type": "projectEncode" } & ProjectEncodeRequest | { "type": "projectDecode" } & BytesRequest | { "type": "importXlsx" } & ImportXlsxRequest;

/**
 * Resultado de uma operação.
 */
export type OperationResult = { "type": "engineInfo" } & EngineInfo | { "type": "descriptiveSummarize" } & DescriptiveResult | { "type": "comparisonOneWay" } & OneWayResult | { "type": "distributionEvaluate" } & DistributionResult | { "type": "modelFitLinear" } & LinearFit | { "type": "projectEncode" } & ProjectEncodeResult | { "type": "projectDecode" } & ProjectDecodeResult | { "type": "importXlsx" } & SheetData;

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
export type RevisionReason = "created" | "edit" | "import" | "analysis" | "manualSave" | "restore";

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
