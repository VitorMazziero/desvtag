// GERADO por scripts/gen-contracts.mjs a partir dos tipos Rust (ts-rs).
// NÃO EDITAR. Regenerar com `npm run gen:contracts`.

/** Versão do protocolo interface↔motor (optima-engine). */
export const PROTOCOL_VERSION = 1;

/** Versão do esquema do documento do projeto (optima-project). */
export const PROJECT_SCHEMA_VERSION = 1;

/**
 * Capacidades do motor: hoje, apenas a lista de métodos.
 */
export type Capabilities = { 
/**
 * Métodos disponíveis, com situação de implementação e validação.
 */
methods: Array<MethodInfo>, };

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
params: { [key in string]: string }, };

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
 * Código de erro do protocolo (a interface localiza a mensagem).
 */
export type ErrorCode = "invalidRequest" | "unsupportedProtocolVersion";

/**
 * Tipo de um fator: quantitativo (níveis numéricos) ou categórico (rótulos).
 *
 * O usuário define fatores livremente; os planejamentos verificam, em seus
 * módulos, se a natureza do fator é compatível com o método escolhido.
 */
export type FactorKind = "numeric" | "categorical";

/**
 * Situação da implementação.
 */
export type Implementation = "implemented";

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
 * Operação solicitada. Cada etapa acrescenta suas variantes.
 */
export type Operation = { "type": "engineInfo" };

/**
 * Resultado de uma operação.
 */
export type OperationResult = { "type": "engineInfo" } & EngineInfo;

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
 * Projeto: contêiner de experimentos. Sem credenciais de qualquer serviço.
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
name: string, };

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
 * Gravidade de um diagnóstico.
 */
export type Severity = "error" | "warning" | "info";

/**
 * Identificador estável: texto não vazio, ASCII, sem espaços.
 */
export type StableId = string;

/**
 * Situação da validação numérica.
 */
export type Validation = "notValidated" | "validated";
