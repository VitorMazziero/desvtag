use crate::descriptive::Stat;
use crate::provenance::Provenance;
use crate::validation::Issue;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Modelo de saturação.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum SaturationModel {
    /// Monod / Michaelis–Menten.
    Monod,
    /// Haldane (Andrews): inibição pelo substrato.
    Haldane,
    /// Hill.
    Hill,
}

impl SaturationModel {
    pub(super) fn names(self) -> &'static [&'static str] {
        match self {
            Self::Monod => &["a", "b"],
            Self::Haldane => &["a", "b", "c"],
            Self::Hill => &["a", "b", "n"],
        }
    }
}

/// Solicitação de ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NonlinearRequest {
    /// Substrato (variável independente, `S ≥ 0`).
    pub x: Vec<f64>,
    /// Resposta.
    pub y: Vec<f64>,
    /// Modelo.
    pub model: SaturationModel,
    /// Valores iniciais (um por parâmetro); `None` = vários inícios automáticos.
    pub initial: Option<Vec<f64>>,
    /// Limites inferiores por parâmetro (`None` = sem limite); padrão: parâmetros positivos.
    pub lower: Option<Vec<Option<f64>>>,
    /// Limites superiores por parâmetro (`None` = sem limite).
    pub upper: Option<Vec<Option<f64>>>,
    /// Nível de significância dos intervalos (`1 − α` de confiança).
    pub alpha: f64,
    /// Optional likelihood profiling (absent retains the legacy Wald result).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub profile: Option<bool>,
}

/// Parâmetro estimado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NonlinearParameter {
    /// Nome (`a`, `b`, `c` ou `n`).
    pub name: String,
    /// Estimativa.
    pub estimate: f64,
    /// Erro-padrão (Wald).
    pub std_error: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do intervalo de confiança.
    pub ci_lower: Stat,
    /// Limite superior do intervalo de confiança.
    pub ci_upper: Stat,
    /// O parâmetro terminou em um limite.
    pub at_bound: bool,
}

/// Ponto da curva ajustada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurvePoint {
    /// Substrato.
    pub x: f64,
    /// Valor ajustado.
    pub y: f64,
    /// Limite inferior da faixa de confiança da curva.
    pub lower: Stat,
    /// Limite superior da faixa de confiança da curva.
    pub upper: Stat,
}

/// Resultado do ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NonlinearResult {
    /// Modelo ajustado.
    pub model: SaturationModel,
    /// Observações usadas.
    pub n: u32,
    /// Parâmetros.
    pub parameters: Vec<NonlinearParameter>,
    /// Soma de quadrados dos resíduos.
    pub sse: f64,
    /// Desvio-padrão residual.
    pub sigma: Stat,
    /// `R² = 1 − SQR/SQT` (centrada).
    pub r_squared: Stat,
    /// Matriz de correlação dos parâmetros (linha a linha); vazia se indefinida.
    pub correlation: Vec<Vec<f64>>,
    /// Número de condição da Jacobiana com colunas normalizadas.
    pub condition_number: Stat,
    /// O ajuste convergiu.
    pub converged: bool,
    /// Iterações do melhor início.
    pub iterations: u32,
    /// Inícios executados.
    pub starts_run: u32,
    /// Inícios que chegaram à menor soma de quadrados.
    pub starts_reaching_best: u32,
    /// Resíduos `y − ŷ`.
    pub residuals: Vec<f64>,
    /// Curva ajustada com faixa de confiança.
    pub curve: Vec<CurvePoint>,
    /// Avisos (identificabilidade, limites, não convergência).
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
    /// Sampled likelihood profiles and explicit endpoint states.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub profiles: Option<Vec<ParameterProfile>>,
}

/// Reason that an endpoint is, or is not, an LR cutoff crossing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ProfileEndpointStatus {
    /// A bracketed LR cutoff crossing.
    Crossing,
    /// A user/default parameter domain bound is reached before the cutoff.
    DomainBound,
    /// No crossing was found in the finite numerical search.
    SearchLimit,
    /// Fit or numerical profiling failed.
    Failed,
    /// Profiling could not finish within the deterministic execution budget.
    ResourceLimit,
}
/// One constrained fit on a likelihood profile.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProfilePoint {
    /// Fixed parameter value.
    pub value: f64,
    /// Gaussian profile likelihood ratio statistic.
    pub likelihood_ratio: f64,
}
/// One parameter's likelihood confidence limits and examined trace.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ParameterProfile {
    /// Parameter identifier.
    pub parameter: String,
    /// Asymptotic chi-square(1) cutoff.
    pub cutoff: f64,
    /// Only finite when it is a valid cutoff crossing.
    pub lower: Stat,
    /// Only finite when it is a valid cutoff crossing.
    pub upper: Stat,
    /// Lower endpoint's numerical status.
    pub lower_status: ProfileEndpointStatus,
    /// Upper endpoint's numerical status.
    pub upper_status: ProfileEndpointStatus,
    /// Numerically monotonic away from the optimum over the sampled domain; not a global proof.
    pub unimodal_in_examined_range: bool,
    /// Full sampled trace, ordered by parameter value.
    pub points: Vec<ProfilePoint>,
}
