//! Fits exactly the declared mixed optimal model using the shared QR engine.
//! Numeric surface consumers cannot silently discard nominal treatment effects.
use super::*;
use crate::descriptive::{Stat, UndefinedReason};
use crate::domain::{Dataset, FactorKind, FactorValue};
use crate::models::covariance::quadratic_form;
use crate::models::design_matrix::{ExcludedObservation, ExclusionReason};
use crate::models::linear::{LinearFit, fit_matrix};
use crate::numeric::Matrix;
use crate::validation::validate_dataset;

/// Identity of this explicit mixed-model analysis; the inner fitter remains linear_model.
pub const MODEL_METHOD_ID: &str = "optimal_model";
/// First version of the exact nominal/numeric optimal-model analysis.
pub const MODEL_METHOD_VERSION: u32 = 1;
/// Matrix envelope shared with other bounded v0.4 model operations; timing qualification is ET25 T10.
pub const MAX_MODEL_CELLS: usize = 262_144;

/// Analysis of collected responses under an explicitly declared optimal-design model.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalModelRequest {
    /// Actual data; incomplete response/factor rows are listed as excluded.
    pub dataset: Dataset,
    /// Model, coding and admissible region. No search is executed.
    pub spec: OptimalSpec,
    /// Selected response.
    pub response_id: StableId,
    /// Explicit data column containing the declared execution-block labels.
    pub block_factor_id: Option<StableId>,
    /// Significance level for coefficient inference and confidence intervals.
    pub alpha: f64,
}

/// Saved fit of the exact declared optimal model.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalModelResult {
    /// Complete original model/coding, independent of later edits to the planner.
    pub spec: OptimalSpec,
    /// Fitted response.
    pub response_id: StableId,
    /// Execution-block column used in the actual data.
    pub block_factor_id: Option<StableId>,
    /// QR fit, ANOVA and individual observation diagnostics.
    pub fit: LinearFit,
    /// Model identity, distinct from a numeric-only surface.
    pub provenance: Provenance,
}

fn invalid(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![error(code)])
}

fn column_labels(spec: &OptimalSpec) -> Vec<String> {
    let mut factors = spec
        .factors
        .iter()
        .enumerate()
        .map(|(i, f)| vec![format!("z{}({})", i + 1, f.name)])
        .collect::<Vec<_>>();
    if let Some(categories) = &spec.categories {
        factors.extend(categories.factors.iter().map(|f| {
            f.levels[..f.levels.len() - 1]
                .iter()
                .map(|level| format!("{}[{level}]", f.name))
                .collect::<Vec<_>>()
        }));
    }
    let mut labels = vec!["Intercept".to_string()];
    labels.extend(factors.iter().flatten().cloned());
    if spec.model != OptimalModel::Linear {
        for (i, a) in factors.iter().enumerate() {
            for b in &factors[i + 1..] {
                for x in a {
                    for y in b {
                        labels.push(format!("{x} × {y}"));
                    }
                }
            }
        }
    }
    if spec.model == OptimalModel::Quadratic {
        labels.extend(
            factors[..spec.factors.len()]
                .iter()
                .map(|f| format!("{}²", f[0])),
        );
    }
    if let Some(blocks) = &spec.blocks {
        labels.extend(
            blocks.labels[..blocks.labels.len() - 1]
                .iter()
                .map(|label| format!("Block[{label}]")),
        );
    }
    labels
}

/// Fits the complete mixed optimal model without another design search.
/// # Errors
/// Invalid model, data roles/associations, out-of-domain complete rows, empty sample or matrix budget.
pub fn analyze(request: &OptimalModelRequest) -> Result<OptimalModelResult, CoreError> {
    let spec = &request.spec;
    categorical::validate_categories(spec, false)?;
    let mut issues = validate(spec);
    issues.extend(validate_dataset(&request.dataset));
    if !(request.alpha > 0. && request.alpha < 1.) {
        issues.push(error("comparison.invalid_alpha"));
    }
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let dataset = &request.dataset;
    let response = dataset
        .response_index(&request.response_id)
        .ok_or_else(|| invalid("request.unknown_response"))?;
    let numeric = spec
        .factors
        .iter()
        .map(|f| {
            dataset
                .factor_index(&f.id)
                .filter(|&i| dataset.factors[i].kind == FactorKind::Numeric)
                .ok_or_else(|| invalid("design.optimal_model_factor_mismatch"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let categories = spec
        .categories
        .as_ref()
        .ok_or_else(|| invalid("design.optimal_invalid_categories"))?;
    let nominal = categories
        .factors
        .iter()
        .map(|f| {
            dataset
                .factor_index(&f.id)
                .filter(|&i| dataset.factors[i].kind == FactorKind::Categorical)
                .ok_or_else(|| invalid("design.optimal_model_factor_mismatch"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let block = match (&spec.blocks, &request.block_factor_id) {
        (None, None) => None,
        (Some(blocks), Some(id))
            if blocked::valid_labels(blocks)
                && !spec.factors.iter().any(|f| &f.id == id)
                && !categories.factors.iter().any(|f| &f.id == id) =>
        {
            Some(
                dataset
                    .factor_index(id)
                    .filter(|&i| dataset.factors[i].kind == FactorKind::Categorical)
                    .ok_or_else(|| invalid("design.optimal_model_factor_mismatch"))?,
            )
        }
        _ => return Err(invalid("design.optimal_invalid_evaluation_block")),
    };
    let p = categorical::model_parameters(spec);
    let mut rows = Vec::new();
    let mut y = Vec::new();
    let mut ids = Vec::new();
    let mut excluded = Vec::new();
    for (i, observation) in dataset.observations.iter().enumerate() {
        let Some(value) = observation.responses[response] else {
            excluded.push(ExcludedObservation {
                observation_id: observation.id.clone(),
                reason: ExclusionReason::MissingResponse,
            });
            continue;
        };
        let real = numeric
            .iter()
            .map(|&index| match &observation.factors[index] {
                Some(FactorValue::Number(x)) => Some(*x),
                _ => None,
            })
            .collect::<Option<Vec<_>>>();
        let labels = nominal
            .iter()
            .map(|&index| match &observation.factors[index] {
                Some(FactorValue::Text(label)) => Some(label.clone()),
                _ => None,
            })
            .collect::<Option<Vec<_>>>();
        let block_label = block.and_then(|index| observation.factors[index].as_ref());
        let (Some(real), Some(labels)) = (real, labels) else {
            excluded.push(ExcludedObservation {
                observation_id: observation.id.clone(),
                reason: ExclusionReason::MissingFactor,
            });
            continue;
        };
        if block.is_some() && block_label.is_none() {
            excluded.push(ExcludedObservation {
                observation_id: observation.id.clone(),
                reason: ExclusionReason::MissingFactor,
            });
            continue;
        }
        let b = match (&spec.blocks, block_label) {
            (None, _) => 0,
            (Some(blocks), Some(FactorValue::Text(label))) => blocks
                .labels
                .iter()
                .position(|l| l == label)
                .ok_or_else(|| invalid("design.optimal_invalid_evaluation_block"))?
                as u32,
            _ => return Err(invalid("design.optimal_invalid_evaluation_block")),
        };
        if (rows.len() + 1).saturating_mul(p) > MAX_MODEL_CELLS {
            return Err(invalid("design.optimal_model_budget"));
        }
        let point = categorical::checked_point(spec, &real, &labels, i)?;
        rows.push(categorical::row(spec, &point, b));
        y.push(value);
        ids.push(observation.id.clone());
    }
    let x = Matrix::from_rows(&rows).ok_or_else(|| invalid("model.invalid_dimensions"))?;
    let mut fitted = fit_matrix(&x, &y, &column_labels(spec), true, 1. - request.alpha)
        .map_err(CoreError::InvalidInput)?;
    // A retained pivot is an internal representative, not necessarily a unique coefficient.
    let qr = fitted.model.factorization();
    fitted.report.aliased.clear();
    for (i, coefficient) in fitted.report.coefficients.iter_mut().enumerate() {
        let mut unit = vec![0.; p];
        unit[i] = 1.;
        if quadratic_form(qr, &unit).is_none() {
            let unavailable = Stat::undefined(UndefinedReason::NotEstimable);
            coefficient.estimate = unavailable;
            coefficient.std_error = unavailable;
            coefficient.t_value = unavailable;
            coefficient.p_value = unavailable;
            coefficient.ci_lower = unavailable;
            coefficient.ci_upper = unavailable;
            fitted.report.aliased.push(coefficient.label.clone());
        }
    }
    for issue in &mut fitted.report.issues {
        if issue.code == "model.rank_deficient" {
            issue
                .params
                .insert("aliased".to_string(), fitted.report.aliased.join(", "));
        }
    }
    for (observation, id) in fitted.report.observations.iter_mut().zip(ids) {
        observation.observation_id = Some(id);
    }
    fitted.report.excluded = excluded;
    if !fitted.report.excluded.is_empty() {
        fitted.report.issues.push(
            Issue::new("model.excluded_observations", Severity::Warning)
                .with_param("count", &fitted.report.excluded.len()),
        );
    }
    Ok(OptimalModelResult {
        spec: spec.clone(),
        response_id: request.response_id.clone(),
        block_factor_id: request.block_factor_id.clone(),
        fit: fitted.report,
        provenance: Provenance::current(MODEL_METHOD_ID, MODEL_METHOD_VERSION),
    })
}
