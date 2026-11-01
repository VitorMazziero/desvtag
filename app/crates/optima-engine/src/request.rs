//! Solicitações da interface ao motor.

use optima_core::descriptive::DescriptiveRequest;
use optima_core::distributions::DistributionRequest;
use optima_core::models::LinearModelRequest;
use optima_project::ProjectDocument;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Versão do protocolo interface↔motor. Independente da versão do aplicativo
/// e do esquema do projeto (DT-0002). Incrementar em mudança incompatível.
pub const PROTOCOL_VERSION: u32 = 1;

/// Operação solicitada. Cada etapa acrescenta suas variantes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Operation {
    /// Versões e capacidades do motor (`engine.info`).
    EngineInfo,
    /// Resumo descritivo de uma resposta, geral e por grupo (`descriptive.summarize`).
    DescriptiveSummarize(DescriptiveRequest),
    /// Avaliação em lote de `cdf`, cauda superior e quantis (`distribution.evaluate`).
    DistributionEvaluate(DistributionRequest),
    /// Ajuste de modelo linear com ANOVA, intervalos e diagnósticos (`model.fitLinear`).
    ModelFitLinear(Box<LinearModelRequest>),
    /// Codifica um documento de projeto em bytes `.enzitag` (`project.encode`).
    ProjectEncode(ProjectEncodeRequest),
    /// Lê bytes `.enzitag` e devolve o documento no esquema atual (`project.decode`).
    ProjectDecode(BytesRequest),
    /// Lê os valores armazenados de uma planilha XLSX como texto (`import.xlsx`).
    ImportXlsx(ImportXlsxRequest),
}

/// Pedido de codificação de projeto.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectEncodeRequest {
    /// Documento a codificar.
    pub document: ProjectDocument,
}

/// Pedido que carrega bytes (em base64, para trafegar em JSON).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BytesRequest {
    /// Conteúdo do arquivo em base64.
    pub bytes_base64: String,
}

/// Pedido de leitura de planilha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImportXlsxRequest {
    /// Conteúdo do arquivo em base64.
    pub bytes_base64: String,
    /// Planilha a ler; ausente: a primeira.
    pub sheet: Option<String>,
}

/// Solicitação com identificador de tarefa. A interface descarta respostas
/// cujo `task_id` não seja o mais recente da sua categoria.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
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
