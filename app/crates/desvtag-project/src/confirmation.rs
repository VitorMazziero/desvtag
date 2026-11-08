//! Ensaios de confirmação: experimento vinculado ao de origem e as previsões que serão conferidas.

use desvtag_core::domain::StableId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Origem de um experimento derivado de outro.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExperimentOrigin {
    /// Experimento de origem (os modelos e a otimização).
    pub experiment_id: StableId,
    /// Análise de otimização que propôs os ensaios.
    pub analysis_id: StableId,
}

/// Previsão de uma resposta em um ensaio de confirmação (intervalo de predição de uma nova observação).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ConfirmationPrediction {
    /// Observação (linha) do experimento de confirmação.
    pub row_id: StableId,
    /// Resposta.
    pub response_id: StableId,
    /// Valor previsto.
    pub predicted: f64,
    /// Limite inferior do intervalo de predição.
    pub lower: Option<f64>,
    /// Limite superior do intervalo de predição.
    pub upper: Option<f64>,
}

/// Proposta de confirmação: previsões gravadas no momento da proposta, para comparação posterior
/// com o observado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ConfirmationPlan {
    /// Fixed block assumed by the predictions; a future unknown block is not included in the IP.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<desvtag_core::surface::model::SurfaceBlockContext>,
    /// Nível de confiança dos intervalos de predição.
    pub confidence_level: f64,
    /// Previsões por ensaio e resposta.
    pub predictions: Vec<ConfirmationPrediction>,
}
