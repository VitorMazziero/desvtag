//! Análises salvas, vinculadas à revisão dos dados que as geraram.

use optima_core::descriptive::DescriptiveResult;
use optima_core::domain::StableId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Opções da análise.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnalysisOptions {
    /// Resposta analisada (vazio se ainda não escolhida na seleção do experimento).
    pub response_id: Option<StableId>,
    /// Fatores de agrupamento.
    pub group_by: Vec<StableId>,
}

/// Resultado guardado, por método.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum AnalysisResult {
    /// Resumo descritivo.
    Descriptive(DescriptiveResult),
}

/// Análise guardada. Reabrir um projeto **não recalcula**: o resultado é o que foi guardado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnalysisRecord {
    /// Identificador estável.
    pub id: StableId,
    /// Instante (RFC 3339) informado pela interface.
    pub created_at: String,
    /// Revisão de dados usada.
    pub revision_id: StableId,
    /// Assinatura opaca dos dados e opções (para detectar resultado obsoleto).
    pub signature: String,
    /// Método (`snake_case`).
    pub method_id: String,
    /// Versão do método.
    pub method_version: u32,
    /// Versão do motor que calculou.
    pub engine_version: String,
    /// Opções usadas.
    pub options: AnalysisOptions,
    /// Resultado.
    pub result: AnalysisResult,
}
