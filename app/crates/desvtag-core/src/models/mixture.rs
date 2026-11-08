//! Modelos de Scheffé para misturas: ajuste **sem intercepto** nos pseudocomponentes.
//!
//! `E(y) = Σ βᵢ xᵢ′` (linear), `+ Σ βᵢⱼ xᵢ′xⱼ′` (quadrático) e `+ Σ βᵢⱼₖ xᵢ′xⱼ′xₖ′` (cúbico
//! especial). Como os componentes somam 1, o intercepto está embutido nos termos lineares. A
//! ANOVA usa a soma total **centrada na média** (`n − 1` graus de liberdade; modelo com
//! `posto − 1`), a convenção de Cornell; `R²` e `R²` ajustado seguem a mesma partição.
//!
//! Para três componentes o resultado inclui uma malha de previsões sobre o triângulo (para o
//! gráfico ternário).

mod cox;
pub use cox::{CoxTrace, CoxTracePoint, CoxTraceSeries};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::linear::{LinearFit, fit_matrix};
use crate::errors::CoreError;
use crate::inference::regression_anova::{self, Partition};
use crate::numeric::Matrix;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "mixture_model";
/// Versão do método.
pub const METHOD_VERSION: u32 = 5;
/// Subdivisões de cada lado do triângulo da malha ternária.
pub const GRID_DIVISIONS: usize = 24;

/// Modelo de Scheffé.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum MixtureModel {
    /// Só os termos lineares.
    Linear,
    /// Lineares e produtos de dois componentes.
    Quadratic,
    /// Quadrático e produtos de três componentes.
    SpecialCubic,
}

/// Solicitação de análise de uma mistura.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureAnalysisRequest {
    /// Nomes dos componentes (2 a 8).
    pub component_names: Vec<String>,
    /// Limites inferiores (mesma ordem; 0 se não houver).
    pub lower_bounds: Vec<f64>,
    /// Limites superiores opcionais, na mesma ordem (1 quando ausentes).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub upper_bounds: Option<Vec<f64>>,
    /// Composição real de referência opcional para o traço de Cox.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub cox_reference: Option<Vec<f64>>,
    /// Otimização opcional com os objetivos e dados completos das respostas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimization: Option<crate::optimization::mixture::MixtureOptimizationSpec>,
    /// Proporções reais de cada ensaio (uma linha por ensaio, somando 1).
    pub proportions: Vec<Vec<f64>>,
    /// Resposta de cada ensaio.
    pub response: Vec<f64>,
    /// Modelo.
    pub model: MixtureModel,
    /// Nível de significância dos intervalos (`1 − α` de confiança).
    pub alpha: f64,
}

/// Ponto da malha ternária.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureGridPoint {
    /// Pseudocomponentes (somam 1).
    pub pseudo: Vec<f64>,
    /// Proporções reais.
    pub proportions: Vec<f64>,
    /// Resposta prevista.
    pub value: f64,
}

/// Resultado da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureAnalysis {
    /// Modelo ajustado.
    pub model: MixtureModel,
    /// Ajuste: coeficientes, ANOVA centrada, resíduos e diagnósticos.
    pub fit: LinearFit,
    /// Previsões sobre o triângulo (só com três componentes; vazio nos demais casos).
    pub grid: Vec<MixtureGridPoint>,
    /// Subdivisões da malha ternária, inclusive quando há previsões omitidas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub grid_divisions: Option<u32>,
    /// Geometria do domínio limitado em proporções reais.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub region: Option<crate::designs::mixture::MixtureRegion>,
    /// Traços opcionais em torno da referência real solicitada.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub cox_trace: Option<CoxTrace>,
    /// Candidatos e diagnóstico da otimização solicitada, quando presente.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimum: Option<crate::optimization::mixture::MixtureOptimizationResult>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Rótulos e colunas do modelo para um ponto em pseudocomponentes.
pub(crate) fn columns(pseudo: &[f64], model: MixtureModel) -> Vec<f64> {
    let q = pseudo.len();
    let mut out: Vec<f64> = pseudo.to_vec();
    if matches!(model, MixtureModel::Quadratic | MixtureModel::SpecialCubic) {
        for i in 0..q {
            for j in (i + 1)..q {
                out.push(pseudo[i] * pseudo[j]);
            }
        }
    }
    if model == MixtureModel::SpecialCubic {
        for i in 0..q {
            for j in (i + 1)..q {
                for k in (j + 1)..q {
                    out.push(pseudo[i] * pseudo[j] * pseudo[k]);
                }
            }
        }
    }
    out
}

fn labels(names: &[String], model: MixtureModel) -> Vec<String> {
    let q = names.len();
    let mut out: Vec<String> = names.to_vec();
    if matches!(model, MixtureModel::Quadratic | MixtureModel::SpecialCubic) {
        for i in 0..q {
            for j in (i + 1)..q {
                out.push(format!("{}·{}", names[i], names[j]));
            }
        }
    }
    if model == MixtureModel::SpecialCubic {
        for i in 0..q {
            for j in (i + 1)..q {
                for k in (j + 1)..q {
                    out.push(format!("{}·{}·{}", names[i], names[j], names[k]));
                }
            }
        }
    }
    out
}

/// An exact fixed component has zero pseudocomponent, including input roundoff.
pub(crate) fn pseudo_components(request: &MixtureAnalysisRequest, row: &[f64]) -> Vec<f64> {
    let scale = 1.0 - request.lower_bounds.iter().sum::<f64>();
    row.iter()
        .zip(&request.lower_bounds)
        .enumerate()
        .map(|(i, (x, l))| {
            if request.upper_bounds.as_ref().is_some_and(|u| u[i] == *l) {
                0.0
            } else {
                ((x - l) / scale).max(0.0)
            }
        })
        .collect()
}

/// Valida domínio, dimensões e entradas sem executar o ajuste.
#[must_use]
pub fn validate(request: &MixtureAnalysisRequest) -> Vec<Issue> {
    let mut issues = Vec::new();
    let q = request.component_names.len();
    if !(2..=8).contains(&q) {
        issues.push(error("mixture.invalid_component_count").with_param("count", &q));
    }
    if request.lower_bounds.len() != q
        || request
            .lower_bounds
            .iter()
            .any(|l| !l.is_finite() || *l < 0.0 || *l >= 1.0)
        || request.lower_bounds.iter().sum::<f64>() >= 1.0 - 1e-9
    {
        issues.push(error("mixture.invalid_lower_bounds"));
    }
    if request.model == MixtureModel::SpecialCubic && q < 3 {
        issues.push(error("mixture.special_cubic_needs_three"));
    }
    if let Some(upper) = &request.upper_bounds
        && !crate::designs::mixture::region::valid_upper_bounds(&request.lower_bounds, upper)
    {
        issues.push(error("mixture.invalid_upper_bounds"));
    }
    if let Some(reference) = &request.cox_reference
        && !cox::valid_reference(request, reference)
    {
        issues.push(error("mixture.invalid_cox_reference"));
    }
    if request.proportions.len() != request.response.len() || request.response.is_empty() {
        issues.push(error("mixture.invalid_dimensions"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("model.invalid_confidence_level"));
    }
    for (i, row) in request.proportions.iter().enumerate() {
        let bad_sum = (row.iter().sum::<f64>() - 1.0).abs() > 1e-6;
        let below = row
            .iter()
            .zip(&request.lower_bounds)
            .any(|(x, l)| !x.is_finite() || *x < l - 1e-9);
        let above = request
            .upper_bounds
            .as_ref()
            .is_some_and(|upper| row.iter().zip(upper).any(|(x, u)| *x > u + 1e-9));
        if row.len() != q || bad_sum || below || above {
            issues.push(error("mixture.invalid_proportions").with_param("row", &(i + 1)));
            break;
        }
    }
    if request.response.iter().any(|v| !v.is_finite()) {
        issues.push(error("model.non_finite_input"));
    }
    if issues.is_empty()
        && let Some(spec) = &request.optimization
        && let Err(CoreError::InvalidInput(extra)) =
            crate::optimization::mixture::validate(request, spec)
    {
        issues.extend(extra);
    }
    issues
}

/// Fit used by mixture analysis and desirability, without plotting work.
pub(crate) fn fit_for_prediction(
    request: &MixtureAnalysisRequest,
) -> Result<super::linear::MatrixFit, CoreError> {
    let rows: Vec<Vec<f64>> = request
        .proportions
        .iter()
        .map(|r| columns(&pseudo_components(request, r), request.model))
        .collect();
    let names = labels(&request.component_names, request.model);
    let x = Matrix::from_rows(&rows)
        .ok_or_else(|| CoreError::InvalidInput(vec![error("mixture.invalid_dimensions")]))?;
    let fit = fit_matrix(&x, &request.response, &names, false, 1.0 - request.alpha)
        .map_err(CoreError::InvalidInput)?;

    Ok(fit)
}

/// Ajusta o modelo de Scheffé.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados inválidos ou ajuste impossível.
pub fn analyze(request: &MixtureAnalysisRequest) -> Result<MixtureAnalysis, CoreError> {
    let issues = validate(request);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let q = request.component_names.len();
    let scale = 1.0 - request.lower_bounds.iter().sum::<f64>();
    let mut fit = fit_for_prediction(request)?;

    // ANOVA centrada na média (convenção dos modelos de mistura).
    let n = request.response.len();
    let mean = request.response.iter().sum::<f64>() / n as f64;
    let ss_total: f64 = request.response.iter().map(|v| (v - mean).powi(2)).sum();
    let ss_residual = fit.report.anova.residual.sum_squares.value().unwrap_or(0.0);
    let df_residual = n - fit.report.rank as usize;
    fit.report.anova = regression_anova::build(Partition {
        ss_model: (ss_total - ss_residual).max(0.0),
        ss_residual,
        ss_total,
        df_model: (fit.report.rank as usize).saturating_sub(1),
        df_residual,
        df_total: n - 1,
        centered: true,
    });

    // Malha ternária (três componentes).
    let mut grid = Vec::new();
    let mut unavailable_predictions = 0_u32;
    if q == 3 {
        let coefficients = fit.model.coefficients();
        let m = GRID_DIVISIONS;
        for a in 0..=m {
            for b in 0..=(m - a) {
                let pseudo = vec![
                    a as f64 / m as f64,
                    b as f64 / m as f64,
                    (m - a - b) as f64 / m as f64,
                ];
                let proportions: Vec<_> = pseudo
                    .iter()
                    .zip(&request.lower_bounds)
                    .map(|(p, l)| l + scale * p)
                    .collect();
                if request
                    .upper_bounds
                    .as_ref()
                    .is_some_and(|upper| proportions.iter().zip(upper).any(|(x, u)| *x > u + 1e-12))
                {
                    continue;
                }
                let model_row = columns(&pseudo, request.model);
                if super::covariance::quadratic_form(fit.model.factorization(), &model_row)
                    .is_none()
                {
                    unavailable_predictions += 1;
                    continue;
                }
                let value: f64 = model_row
                    .iter()
                    .zip(coefficients)
                    .filter_map(|(c, beta)| beta.map(|b| b * c))
                    .sum();
                grid.push(MixtureGridPoint {
                    proportions,
                    pseudo,
                    value,
                });
            }
        }
    }
    let mut issues = Vec::new();
    if unavailable_predictions > 0 {
        issues.push(
            Issue::new("mixture.predictions_not_estimable", Severity::Warning)
                .with_param("count", &unavailable_predictions),
        );
    }
    if q == 3 && grid.is_empty() && request.upper_bounds.is_some() {
        issues.push(Issue::new(
            "mixture.prediction_grid_empty",
            Severity::Warning,
        ));
    }
    let cox_trace = request
        .cox_reference
        .as_ref()
        .map(|reference| cox::build(request, &fit.model, reference, &mut issues));
    let optimum = request
        .optimization
        .as_ref()
        .map(|spec| crate::optimization::mixture::optimize(request, spec))
        .transpose()?;
    Ok(MixtureAnalysis {
        optimum,
        cox_trace,
        model: request.model,
        fit: fit.report,
        grid,
        grid_divisions: (q == 3).then_some(GRID_DIVISIONS as u32),
        region: request
            .upper_bounds
            .as_ref()
            .map(|upper| crate::designs::mixture::region::geometry(&request.lower_bounds, upper)),
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn request(model: MixtureModel, y: &[f64]) -> MixtureAnalysisRequest {
        // Simplex-lattice {3,2} mais o centroide: 7 pontos.
        let pts: Vec<Vec<f64>> = vec![
            vec![1.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
            vec![0.0, 0.0, 1.0],
            vec![0.5, 0.5, 0.0],
            vec![0.5, 0.0, 0.5],
            vec![0.0, 0.5, 0.5],
            vec![1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0],
        ];
        MixtureAnalysisRequest {
            optimization: None,
            cox_reference: None,
            upper_bounds: None,
            component_names: vec!["A".into(), "B".into(), "C".into()],
            lower_bounds: vec![0.0; 3],
            proportions: pts,
            response: y.to_vec(),
            model,
            alpha: 0.05,
        }
    }

    #[test]
    fn the_linear_model_recovers_exact_vertex_coefficients() {
        // y = 10·A + 20·B + 30·C exatamente.
        let y = [10.0, 20.0, 30.0, 15.0, 20.0, 25.0, 20.0];
        let r = analyze(&request(MixtureModel::Linear, &y)).expect("ajuste");
        let b: Vec<f64> = r
            .fit
            .coefficients
            .iter()
            .map(|c| c.estimate.value().expect("b"))
            .collect();
        for (got, want) in b.iter().zip([10.0, 20.0, 30.0]) {
            assert!((got - want).abs() < 1e-9, "{got} ≠ {want}");
        }
        assert_eq!(r.fit.anova.total.df, 6);
        assert!(r.fit.anova.centered);
        assert_eq!(
            r.grid.len(),
            (GRID_DIVISIONS + 1) * (GRID_DIVISIONS + 2) / 2
        );
    }

    #[test]
    fn the_quadratic_model_has_six_columns_and_the_blend_term_is_estimated() {
        // y = 10A + 20B + 30C + 8AB (sinergia entre A e B).
        let ab = |x: f64, z: f64| 8.0 * x * z;
        let y = [
            10.0,
            20.0,
            30.0,
            15.0 + ab(0.5, 0.5),
            20.0,
            25.0,
            10.0 / 3.0 + 20.0 / 3.0 + 10.0 + ab(1.0 / 3.0, 1.0 / 3.0),
        ];
        let r = analyze(&request(MixtureModel::Quadratic, &y)).expect("ajuste");
        assert_eq!(r.fit.coefficients.len(), 6);
        let ab_coef = r.fit.coefficients[3].estimate.value().expect("AB");
        assert!((ab_coef - 8.0).abs() < 1e-8, "AB = {ab_coef}");
        // 7 pontos, 6 parâmetros: 1 grau de liberdade residual.
        assert_eq!(r.fit.df_residual, 1);
    }

    #[test]
    fn invalid_inputs_are_refused() {
        let mut bad = request(MixtureModel::Linear, &[1.0; 7]);
        bad.proportions[0] = vec![0.5, 0.5, 0.5];
        assert!(analyze(&bad).is_err());
        let mut two = request(MixtureModel::SpecialCubic, &[1.0; 7]);
        two.component_names.truncate(2);
        assert!(analyze(&two).is_err());
        let mut short = request(MixtureModel::Linear, &[1.0; 7]);
        short.response.pop();
        assert!(analyze(&short).is_err());
    }
}
