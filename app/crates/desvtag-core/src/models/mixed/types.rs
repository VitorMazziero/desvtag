//! Contratos científicos persistidos do modelo misto.
use super::super::{design_matrix::ExcludedObservation, terms::ModelSpec};
use crate::{descriptive::Stat, domain::Dataset, provenance::Provenance, validation::Issue};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Solicitação: dados (com a unidade experimental de cada observação) e efeitos fixos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedModelRequest {
    /// Dados; toda observação usada precisa ter `unit_id`.
    pub dataset: Dataset,
    /// Resposta, termos dos efeitos fixos, codificação e nível de confiança.
    pub spec: ModelSpec,
    /// Extensão v2; ausência preserva integralmente o percurso legado.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub advanced: Option<super::AdvancedMixedSpec>,
}

/// Coeficiente dos efeitos fixos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedCoefficient {
    /// Rótulo da coluna.
    pub label: String,
    /// Estimativa.
    pub estimate: f64,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Graus de liberdade (Satterthwaite).
    pub df: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do intervalo de confiança.
    pub ci_lower: Stat,
    /// Limite superior do intervalo de confiança.
    pub ci_upper: Stat,
}

/// Efeito aleatório previsto (BLUP) de uma unidade.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RandomEffect {
    /// Unidade experimental.
    pub unit: String,
    /// Observações da unidade usadas no ajuste.
    pub observations: u32,
    /// Efeito previsto.
    pub blup: f64,
}

/// Resultado do ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedModelResult {
    /// Observações usadas.
    pub n_observations: u32,
    /// Unidades (grupos).
    pub n_groups: u32,
    /// Efeitos fixos.
    pub coefficients: Vec<MixedCoefficient>,
    /// Variância entre unidades `σᵤ²`.
    pub variance_unit: Stat,
    /// Variância residual `σₑ²`.
    pub variance_residual: Stat,
    /// Correlação intraclasse `σᵤ²/(σᵤ² + σₑ²)`.
    pub icc: Stat,
    /// `σᵤ²` na fronteira (zero): o modelo se reduz ao sem efeito aleatório.
    pub boundary: bool,
    /// Valor do REML perfilado (sem constantes) no ótimo.
    pub reml_profile: f64,
    /// Efeitos aleatórios previstos.
    pub random_effects: Vec<RandomEffect>,
    /// Observações fora do ajuste.
    pub excluded: Vec<ExcludedObservation>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
    /// Saídas v2; ausente nos resultados antigos.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub advanced: Option<super::AdvancedMixedResult>,
}
