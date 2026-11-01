//! Solicitações da interface ao motor.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Versão do protocolo interface↔motor. Independente da versão do aplicativo
/// e do esquema do projeto (DT-0002). Incrementar em mudança incompatível.
pub const PROTOCOL_VERSION: u32 = 1;

/// Operação solicitada. Cada etapa acrescenta suas variantes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Operation {
    /// Versões e capacidades do motor (`engine.info`).
    EngineInfo,
}

/// Solicitação com identificador de tarefa. A interface descarta respostas
/// cujo `task_id` não seja o mais recente da sua categoria.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EngineRequest {
    /// Versão do protocolo usada pelo cliente.
    pub protocol_version: u32,
    /// Identificador da tarefa, devolvido na resposta.
    pub task_id: String,
    /// Operação.
    pub operation: Operation,
}
