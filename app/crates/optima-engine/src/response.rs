//! Respostas do motor à interface.

use std::collections::BTreeMap;

use optima_core::registry::Capabilities;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Código de erro do protocolo (a interface localiza a mensagem).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ErrorCode {
    /// O texto recebido não é uma solicitação válida.
    InvalidRequest,
    /// A versão do protocolo do cliente difere da do motor.
    UnsupportedProtocolVersion,
}

/// Erro codificado, com parâmetros para a mensagem localizada.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineError {
    /// Código estável.
    pub code: ErrorCode,
    /// Parâmetros (por exemplo, versões esperada e recebida).
    pub params: BTreeMap<String, String>,
}

/// Resultado de `engine.info`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineInfo {
    /// Versão do motor (igual à do aplicativo).
    pub engine_version: String,
    /// Versão do protocolo.
    pub protocol_version: u32,
    /// Versão do esquema do projeto.
    pub project_schema_version: u32,
    /// Capacidades.
    pub capabilities: Capabilities,
}

/// Resultado de uma operação.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum OperationResult {
    /// Resultado de `engine.info`.
    EngineInfo(EngineInfo),
}

/// Sucesso ou falha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "status", rename_all = "camelCase")]
#[ts(export)]
pub enum Outcome {
    /// Operação concluída.
    Ok {
        /// Resultado.
        result: OperationResult,
    },
    /// Operação recusada ou falha.
    Error {
        /// Erro codificado.
        error: EngineError,
    },
}

/// Resposta: sempre carrega a versão do protocolo do motor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineResponse {
    /// Versão do protocolo do motor.
    pub protocol_version: u32,
    /// Identificador da tarefa da solicitação; `null` se ela não pôde ser lida.
    pub task_id: Option<String>,
    /// Desfecho.
    pub outcome: Outcome,
}
