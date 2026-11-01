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
groupBy: Array<StableId>, };

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
export type AnalysisResult = { "type": "descriptive" } & DescriptiveResult;

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
 * Operação solicitada. Cada etapa acrescenta suas variantes.
 */
export type Operation = { "type": "engineInfo" } | { "type": "descriptiveSummarize" } & DescriptiveRequest | { "type": "projectEncode" } & ProjectEncodeRequest | { "type": "projectDecode" } & BytesRequest | { "type": "importXlsx" } & ImportXlsxRequest;

/**
 * Resultado de uma operação.
 */
export type OperationResult = { "type": "engineInfo" } & EngineInfo | { "type": "descriptiveSummarize" } & DescriptiveResult | { "type": "projectEncode" } & ProjectEncodeResult | { "type": "projectDecode" } & ProjectDecodeResult | { "type": "importXlsx" } & SheetData;

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
 * Motivo pelo qual uma estatística não está definida.
 */
export type UndefinedReason = "noValidObservations" | "fewerThanTwoObservations" | "nonFiniteResult";

/**
 * Situação da validação numérica.
 */
export type Validation = "notValidated" | "numericallyValidated" | "validated";
