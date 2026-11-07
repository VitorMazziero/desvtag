//! Desirability search by feasible pair transfers on a bounded mixture simplex.
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::candidates::ResponsePrediction;
use super::desirability::{global, individual};
use super::objective::{DomainSpec, MAX_IMPORTANCE, OptimizationSetup};
use super::optimize::OptimizationStatus;
use crate::designs::mixture::{MixtureRegion, region};
use crate::designs::randomization::{Pcg32, permutation};
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::models::covariance::quadratic_form;
use crate::models::linear::LinearModel;
use crate::models::mixture::{self, MixtureAnalysisRequest, MixtureModel};
use crate::models::prediction::predict_row;
use crate::numeric::qr::default_rank_tolerance;
use crate::numeric::{Matrix, QrDecomposition};
use crate::validation::{Issue, Severity};

/// Conservative initial limits, qualified and revisited by ET25 T10.
pub const MAX_STARTS: u32 = 128;
/// Maximum combined search objective evaluations.
pub const MAX_EVALUATIONS: u32 = 100_000;
/// Maximum evaluations for one start.
pub const MAX_START_EVALUATIONS: u32 = 2_000;
/// Bound the fit work before allocating additional model matrices.
pub const MAX_FIT_WORK: u64 = 10_000_000;
/// Smallest pair transfer step (real mixture fractions).
pub const STEP_TOLERANCE: f64 = 1e-7;
/// Hard-limit tolerance in units of the observed response range.
pub const FEASIBILITY_TOLERANCE: f64 = 1e-9;

/// One response's exact numeric observations.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureResponseData {
    /// Stable response identity.
    pub response_id: StableId,
    /// Saved display name, including units when supplied.
    pub name: String,
    /// Real compositions for the retained observations.
    pub proportions: Vec<Vec<f64>>,
    /// Observed response values, in the same order.
    pub response: Vec<f64>,
}

/// Optional mixture optimization, using the selected Scheffe model for each response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureOptimizationSpec {
    /// Shared goal functions, weights, hard limits and search configuration.
    pub setup: OptimizationSetup,
    /// One observation set per included response.
    pub data: Vec<MixtureResponseData>,
}

/// Why a local start ended; tolerance does not establish a global optimum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum MixtureStartStop {
    /// No improving tested transfer remained at the step tolerance.
    StepTolerance,
    /// This start reached its own evaluation allocation.
    StartBudget,
    /// The combined search budget was reached.
    EvaluationBudget,
    /// The admissible region consists of one composition.
    PointRegion,
}

/// Work performed by one local search.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureStartReport {
    /// Termination condition.
    pub stop: MixtureStartStop,
    /// Objective evaluations, including the initial composition.
    pub evaluations: u32,
    /// Complete or partial pair-transfer sweeps.
    pub sweeps: u32,
}

/// A feasible mixture candidate and its model predictions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureOptimum {
    /// Display rank (one is best).
    pub rank: u32,
    /// Real fractions.
    pub proportions: Vec<f64>,
    /// Lower-bound pseudocomponents.
    pub pseudo: Vec<f64>,
    /// Weighted geometric mean of individual desirabilities.
    pub desirability: f64,
    /// Predictions and intervals at this composition.
    pub predictions: Vec<ResponsePrediction>,
    /// Number of local search endpoints grouped here.
    pub starts: u32,
}

/// Saved optimization result; all scientific values originate in Rust.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureOptimizationResult {
    /// Whether a positive, zero-only, or no feasible solution was found.
    pub status: OptimizationStatus,
    /// Feasible candidates ordered by desirability.
    pub candidates: Vec<MixtureOptimum>,
    /// Algorithm and revision.
    pub algorithm: String,
    /// Requested number of starts.
    pub requested_starts: u32,
    /// Actual local-search reports, including limited starts.
    pub starts: Vec<MixtureStartReport>,
    /// Combined objective evaluations (not fitting or interval calculation).
    pub evaluations: u32,
    /// Combined objective evaluation limit.
    pub evaluation_budget: u32,
    /// Whether the combined budget stopped the requested search.
    pub budget_reached: bool,
    /// Resolved affine dimension of the region.
    pub dimension: u32,
    /// Geometry of the domain used for the search.
    pub region: MixtureRegion,
    /// Explicit diagnostics, including partial search.
    pub issues: Vec<Issue>,
}

fn error(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![Issue::new(code, Severity::Error)])
}

fn response_request(
    context: &MixtureAnalysisRequest,
    data: &MixtureResponseData,
) -> MixtureAnalysisRequest {
    MixtureAnalysisRequest {
        component_names: context.component_names.clone(),
        lower_bounds: context.lower_bounds.clone(),
        upper_bounds: context.upper_bounds.clone(),
        cox_reference: None,
        optimization: None,
        proportions: data.proportions.clone(),
        response: data.response.clone(),
        model: context.model,
        alpha: context.alpha,
    }
}

/// Validate the optional extension without fitting models or executing a search.
pub fn validate(
    context: &MixtureAnalysisRequest,
    spec: &MixtureOptimizationSpec,
) -> Result<(), CoreError> {
    if !(2..=8).contains(&context.component_names.len()) {
        return Err(error("mixture.invalid_component_count"));
    }
    let setup = &spec.setup;
    if setup.responses.is_empty()
        || setup.responses.len() > 8
        || spec.data.len() != setup.responses.len()
    {
        return Err(error("mixture.optimization_responses"));
    }
    if !matches!(setup.domain, DomainSpec::Region)
        || setup.responses.iter().any(|g| !g.terms.is_empty())
    {
        return Err(error("mixture.optimization_configuration"));
    }
    if setup.alpha != context.alpha || setup.search.starts > MAX_STARTS {
        return Err(error("mixture.optimization_configuration"));
    }
    setup
        .search
        .validate()
        .map_err(|issue| CoreError::InvalidInput(vec![issue]))?;
    let q = context.component_names.len();
    let columns = match context.model {
        MixtureModel::Linear => q,
        MixtureModel::Quadratic => q * (q + 1) / 2,
        MixtureModel::SpecialCubic => q * (q + 1) / 2 + q * (q - 1) * (q - 2) / 6,
    };
    let mut work = 0_u64;
    for (i, goal) in setup.responses.iter().enumerate() {
        goal.goal
            .validate()
            .map_err(|issue| CoreError::InvalidInput(vec![issue]))?;
        if !goal.importance.is_finite()
            || goal.importance <= 0.0
            || goal.importance > MAX_IMPORTANCE
            || setup.responses[..i]
                .iter()
                .any(|g| g.response_id == goal.response_id)
        {
            return Err(error("mixture.optimization_responses"));
        }
        let matching: Vec<_> = spec
            .data
            .iter()
            .filter(|data| data.response_id == goal.response_id)
            .collect();
        if matching.len() != 1 {
            return Err(error("mixture.optimization_responses"));
        }
        let data = matching[0];
        if data.name.trim().is_empty() || data.response.len() > 4096 {
            return Err(error("mixture.optimization_fit_budget"));
        }
        work = work.saturating_add(data.response.len() as u64 * (columns as u64).pow(2));
        if work > MAX_FIT_WORK {
            return Err(error("mixture.optimization_fit_budget"));
        }
        let issues = mixture::validate(&response_request(context, data));
        if !issues.is_empty() {
            return Err(CoreError::InvalidInput(issues));
        }
    }
    for (i, limit) in setup.limits.iter().enumerate() {
        if !setup
            .responses
            .iter()
            .any(|g| g.response_id == limit.response_id)
            || setup.limits[..i]
                .iter()
                .any(|l| l.response_id == limit.response_id)
            || limit.min.is_some_and(|v| !v.is_finite())
            || limit.max.is_some_and(|v| !v.is_finite())
            || matches!((limit.min,limit.max),(Some(a),Some(b)) if a > b)
        {
            return Err(error("optimization.invalid_limit"));
        }
    }
    Ok(())
}

struct Model {
    data: MixtureResponseData,
    model: LinearModel,
    scale: f64,
}
#[derive(Clone)]
struct Eval {
    individual: Vec<f64>,
    desirability: f64,
    violation: f64,
    score: f64,
}
struct Endpoint {
    x: Vec<f64>,
    evaluation: Eval,
    report: MixtureStartReport,
}

fn evaluate(
    context: &MixtureAnalysisRequest,
    spec: &MixtureOptimizationSpec,
    models: &[Model],
    x: &[f64],
) -> Result<Eval, CoreError> {
    let row = mixture::columns(&mixture::pseudo_components(context, x), context.model);
    let mut ds = Vec::with_capacity(models.len());
    let mut violation = 0.0_f64;
    for (model, goal) in models.iter().zip(&spec.setup.responses) {
        let value: f64 = row
            .iter()
            .zip(model.model.coefficients())
            .filter_map(|(r, b)| b.map(|b| r * b))
            .sum();
        if !value.is_finite() {
            return Err(error("mixture.optimization_non_finite"));
        }
        if let Some(limit) = spec
            .setup
            .limits
            .iter()
            .find(|l| l.response_id == goal.response_id)
        {
            if let Some(min) = limit.min {
                violation += ((min - value) / model.scale).max(0.0);
            }
            if let Some(max) = limit.max {
                violation += ((value - max) / model.scale).max(0.0);
            }
        }
        ds.push(individual(&goal.goal, value));
    }
    if !violation.is_finite() {
        return Err(error("mixture.optimization_non_finite"));
    }
    if violation <= FEASIBILITY_TOLERANCE {
        violation = 0.0;
    }
    let weights: Vec<_> = spec.setup.responses.iter().map(|g| g.importance).collect();
    let desirability = global(&ds, &weights);
    let score = if violation > 0.0 {
        2.0 + violation
    } else if desirability > 0.0 {
        -desirability
    } else {
        ds.iter().map(|d| 1.0 - d).sum::<f64>() / ds.len() as f64
    };
    Ok(Eval {
        individual: ds,
        desirability,
        violation,
        score,
    })
}

// A degree-d polynomial restricted to an affine space is determined by its degree-d simplex lattice.
fn domain_probes(
    context: &MixtureAnalysisRequest,
    region: &MixtureRegion,
    mean: &[f64],
) -> Result<Vec<Vec<f64>>, CoreError> {
    if region.dimension == 0 {
        return Ok(vec![mean.to_vec()]);
    }
    let differences: Vec<Vec<f64>> = region
        .vertices
        .iter()
        .map(|v| v.iter().zip(mean).map(|(a, b)| a - b).collect())
        .collect();
    let matrix = Matrix::from_rows(&differences)
        .ok_or_else(|| error("mixture.optimization_region_unresolved"))?
        .transpose();
    let qr = QrDecomposition::new(
        &matrix,
        default_rank_tolerance(matrix.rows(), matrix.cols()),
    );
    if qr.rank != region.dimension as usize {
        return Err(error("mixture.optimization_region_unresolved"));
    }
    let mut simplex = vec![mean.to_vec()];
    for &index in qr.perm.iter().take(qr.rank) {
        simplex.push(
            mean.iter()
                .zip(&region.vertices[index])
                .map(|(a, b)| 0.5 * a + 0.5 * b)
                .collect(),
        );
    }
    let degree = match context.model {
        MixtureModel::Linear => 1,
        MixtureModel::Quadratic => 2,
        MixtureModel::SpecialCubic => 3,
    };
    fn combinations(
        simplex: &[Vec<f64>],
        degree: usize,
        remaining: usize,
        index: usize,
        weights: &mut Vec<usize>,
        out: &mut Vec<Vec<f64>>,
    ) {
        if index + 1 == simplex.len() {
            weights.push(remaining);
            out.push(
                (0..simplex[0].len())
                    .map(|j| {
                        weights
                            .iter()
                            .zip(simplex)
                            .map(|(w, v)| *w as f64 / degree as f64 * v[j])
                            .sum()
                    })
                    .collect(),
            );
            weights.pop();
        } else {
            for n in 0..=remaining {
                weights.push(n);
                combinations(simplex, degree, remaining - n, index + 1, weights, out);
                weights.pop();
            }
        }
    }
    let mut points = Vec::new();
    combinations(&simplex, degree, degree, 0, &mut Vec::new(), &mut points);
    Ok(points)
}

fn local_search(
    context: &MixtureAnalysisRequest,
    spec: &MixtureOptimizationSpec,
    models: &[Model],
    upper: &[f64],
    start: &[f64],
    total: &mut u32,
    point_region: bool,
) -> Result<Endpoint, CoreError> {
    let mut x = start.to_vec();
    let mut best = evaluate(context, spec, models, &x)?;
    *total += 1;
    let mut report = MixtureStartReport {
        stop: MixtureStartStop::StepTolerance,
        evaluations: 1,
        sweeps: 0,
    };
    if point_region {
        report.stop = MixtureStartStop::PointRegion;
        return Ok(Endpoint {
            x,
            evaluation: best,
            report,
        });
    }
    let mut step = 0.25;
    let mut previous = x.clone();
    'search: while step > STEP_TOLERANCE {
        report.sweeps += 1;
        let mut next = x.clone();
        let mut next_value = best.clone();
        for i in 0..x.len() {
            for j in 0..x.len() {
                if i == j {
                    continue;
                }
                let transfer = step
                    .min(upper[i] - x[i])
                    .min(x[j] - context.lower_bounds[j]);
                if transfer <= 1e-14 {
                    continue;
                }
                if *total >= MAX_EVALUATIONS {
                    report.stop = MixtureStartStop::EvaluationBudget;
                    x = next;
                    best = next_value;
                    break 'search;
                }
                if report.evaluations >= MAX_START_EVALUATIONS {
                    report.stop = MixtureStartStop::StartBudget;
                    x = next;
                    best = next_value;
                    break 'search;
                }
                let mut proposal = x.clone();
                proposal[i] += transfer;
                proposal[j] -= transfer;
                let value = evaluate(context, spec, models, &proposal)?;
                *total += 1;
                report.evaluations += 1;
                if value.score < next_value.score - 1e-12 * (1.0 + next_value.score.abs()) {
                    next = proposal;
                    next_value = value;
                }
            }
        }
        if next_value.score < best.score - 1e-12 * (1.0 + best.score.abs()) {
            // Combine successive transfers to follow a ridge instead of repeatedly
            // zigzagging across it. Every extrapolation consumes the same budget.
            let direction: Vec<f64> = next.iter().zip(&previous).map(|(a, b)| a - b).collect();
            previous = x;
            x = next;
            best = next_value;
            let origin = x.clone();
            let mut maximum = f64::INFINITY;
            for (i, &delta) in direction.iter().enumerate() {
                if delta > 0.0 {
                    maximum = maximum.min((upper[i] - origin[i]) / delta);
                } else if delta < 0.0 {
                    maximum = maximum.min((context.lower_bounds[i] - origin[i]) / delta);
                }
            }
            let pivot = direction
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.abs().total_cmp(&b.1.abs()))
                .map(|(i, _)| i);
            let mut distance = 1.0_f64.min(maximum);
            while maximum.is_finite() && distance > 1e-12 {
                if *total >= MAX_EVALUATIONS {
                    report.stop = MixtureStartStop::EvaluationBudget;
                    break 'search;
                }
                if report.evaluations >= MAX_START_EVALUATIONS {
                    report.stop = MixtureStartStop::StartBudget;
                    break 'search;
                }
                let mut proposal: Vec<f64> = origin
                    .iter()
                    .zip(&direction)
                    .map(|(a, d)| a + distance * d)
                    .collect();
                if let Some(pivot) = pivot {
                    // Reconstruct one free coordinate, preventing amplification of
                    // roundoff in the zero-sum direction during a long extrapolation.
                    proposal[pivot] = 1.0
                        - proposal
                            .iter()
                            .enumerate()
                            .filter(|(i, _)| *i != pivot)
                            .map(|(_, v)| v)
                            .sum::<f64>();
                }
                if proposal.iter().enumerate().any(|(i, v)| {
                    !v.is_finite() || *v < context.lower_bounds[i] - 1e-12 || *v > upper[i] + 1e-12
                }) {
                    break;
                }
                let value = evaluate(context, spec, models, &proposal)?;
                *total += 1;
                report.evaluations += 1;
                if value.score >= best.score - 1e-12 * (1.0 + best.score.abs()) {
                    break;
                }
                x = proposal;
                best = value;
                if distance >= maximum {
                    break;
                }
                distance = (distance * 2.0).min(maximum);
            }
        } else {
            step *= 0.5;
            previous = x.clone();
        }
    }
    Ok(Endpoint {
        x,
        evaluation: best,
        report,
    })
}

/// Optimize with shared desirability formulas inside the exact bounded mixture domain.
pub fn optimize(
    context: &MixtureAnalysisRequest,
    spec: &MixtureOptimizationSpec,
) -> Result<MixtureOptimizationResult, CoreError> {
    let mut validation_context = context.clone();
    validation_context.optimization = None;
    let issues = mixture::validate(&validation_context);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    validate(context, spec)?;
    let q = context.component_names.len();
    let upper = context.upper_bounds.clone().unwrap_or_else(|| vec![1.0; q]);
    let region = region::geometry(&context.lower_bounds, &upper);
    if region.vertices.is_empty() {
        return Err(error("mixture.optimization_region_unresolved"));
    }
    let mean: Vec<f64> = (0..q)
        .map(|j| region.vertices.iter().map(|v| v[j]).sum::<f64>() / region.vertices.len() as f64)
        .collect();
    let probes = domain_probes(context, &region, &mean)?;
    let mut models = Vec::with_capacity(spec.data.len());
    for goal in &spec.setup.responses {
        let data = spec
            .data
            .iter()
            .find(|d| d.response_id == goal.response_id)
            .ok_or_else(|| error("mixture.optimization_responses"))?;
        let fit = mixture::fit_for_prediction(&response_request(context, data))?;
        for probe in &probes {
            let row = mixture::columns(&mixture::pseudo_components(context, probe), context.model);
            if quadratic_form(fit.model.factorization(), &row).is_none() {
                return Err(CoreError::InvalidInput(vec![
                    Issue::new("optimization.model_not_estimable", Severity::Error)
                        .with_param("id", &goal.response_id),
                ]));
            }
        }
        let min = data.response.iter().copied().fold(f64::INFINITY, f64::min);
        let max = data
            .response
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max);
        if !(max - min).is_finite() {
            return Err(error("mixture.optimization_non_finite"));
        }
        models.push(Model {
            data: data.clone(),
            model: fit.model,
            scale: if max > min { max - min } else { 1.0 },
        });
    }
    let order = permutation(region.vertices.len(), spec.setup.search.seed);
    let mut rng = Pcg32::new(spec.setup.search.seed);
    let mut total = 0;
    let mut endpoints = Vec::new();
    let requested = if region.dimension == 0 {
        1
    } else {
        spec.setup.search.starts
    };
    for index in 0..requested {
        if total >= MAX_EVALUATIONS {
            break;
        }
        let mut start = if index == 0 {
            mean.clone()
        } else if (index as usize) <= order.len() {
            region.vertices[order[index as usize - 1]].clone()
        } else {
            mean.clone()
        };
        if index as usize > order.len() {
            for _ in 0..q * 16 {
                let i = rng.bounded(q as u32) as usize;
                let j = rng.bounded(q as u32) as usize;
                if i == j {
                    continue;
                }
                let lo = (context.lower_bounds[i] - start[i]).max(start[j] - upper[j]);
                let hi = (upper[i] - start[i]).min(start[j] - context.lower_bounds[j]);
                if hi <= lo {
                    continue;
                }
                let fraction = f64::from(rng.next_u32()) / 4_294_967_296.0;
                let transfer = lo + (hi - lo) * fraction;
                start[i] += transfer;
                start[j] -= transfer;
            }
        }
        endpoints.push(local_search(
            context,
            spec,
            &models,
            &upper,
            &start,
            &mut total,
            region.dimension == 0,
        )?);
    }
    let reports = endpoints
        .iter()
        .map(|endpoint| endpoint.report.clone())
        .collect();
    let budget_reached = endpoints.len() < requested as usize
        || endpoints
            .iter()
            .any(|endpoint| endpoint.report.stop == MixtureStartStop::EvaluationBudget);
    let mut feasible: Vec<_> = endpoints
        .iter()
        .filter(|e| e.evaluation.violation == 0.0)
        .collect();
    feasible.sort_by(|a, b| a.evaluation.score.total_cmp(&b.evaluation.score));
    let scale = 1.0 - context.lower_bounds.iter().sum::<f64>();
    let mut clusters: Vec<(&Endpoint, u32)> = Vec::new();
    for endpoint in feasible {
        if let Some(cluster) = clusters.iter_mut().find(|(other, _)| {
            endpoint
                .x
                .iter()
                .zip(&other.x)
                .map(|(a, b)| ((a - b) / scale).powi(2))
                .sum::<f64>()
                .sqrt()
                <= spec.setup.search.cluster_tolerance
        }) {
            cluster.1 += 1;
        } else {
            clusters.push((endpoint, 1));
        }
    }
    let candidates: Vec<_> = clusters
        .into_iter()
        .take(spec.setup.search.max_candidates as usize)
        .enumerate()
        .map(|(i, (endpoint, count))| {
            let pseudo = mixture::pseudo_components(context, &endpoint.x);
            let row = mixture::columns(&pseudo, context.model);
            let predictions = models
                .iter()
                .enumerate()
                .map(|(j, model)| ResponsePrediction {
                    response_id: model.data.response_id.clone(),
                    name: model.data.name.clone(),
                    prediction: predict_row(&model.model, &row, 1.0 - spec.setup.alpha),
                    desirability: endpoint.evaluation.individual[j],
                    loss_vs_best_alone: None,
                })
                .collect();
            MixtureOptimum {
                rank: i as u32 + 1,
                proportions: endpoint.x.clone(),
                pseudo,
                desirability: endpoint.evaluation.desirability,
                predictions,
                starts: count,
            }
        })
        .collect();
    let status = match candidates.first() {
        None => OptimizationStatus::Infeasible,
        Some(c) if c.desirability > 0.0 => OptimizationStatus::Found,
        Some(_) => OptimizationStatus::OnlyZeroDesirability,
    };
    let mut issues = Vec::new();
    let limited = endpoints
        .iter()
        .filter(|endpoint| endpoint.report.stop == MixtureStartStop::StartBudget)
        .count();
    if limited > 0 {
        issues.push(
            Issue::new("mixture.optimization_starts_limited", Severity::Warning)
                .with_param("count", &limited),
        );
    }
    if budget_reached {
        issues.push(Issue::new(
            "mixture.optimization_search_budget",
            Severity::Warning,
        ));
    }
    Ok(MixtureOptimizationResult {
        status,
        candidates,
        algorithm: "pair-transfer-pattern/2".into(),
        requested_starts: spec.setup.search.starts,
        starts: reports,
        evaluations: total,
        evaluation_budget: MAX_EVALUATIONS,
        budget_reached,
        dimension: region.dimension,
        region,
        issues,
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    #[test]
    fn a_partial_sweep_preserves_the_best_already_evaluated_transfer() {
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../../validation/cases/mixture_model/optimization.json"
        ))
        .expect("fixture");
        let mut request: MixtureAnalysisRequest =
            serde_json::from_value(fixture["cases"][1]["request"].clone()).expect("request");
        let mut spec = request.optimization.take().expect("spec");
        spec.setup.responses[0].goal = super::super::objective::Goal::Minimize {
            target: 0.0,
            high: 40.0,
            shape: 1.0,
        };
        let data = spec.data[0].clone();
        let model = mixture::fit_for_prediction(&response_request(&request, &data))
            .expect("fit")
            .model;
        let models = vec![Model {
            data,
            model,
            scale: 20.0,
        }];
        let start = vec![0.25, 0.35, 0.4];
        let original = evaluate(&request, &spec, &models, &start).expect("evaluation");
        let mut total = MAX_EVALUATIONS - 2;
        let result = local_search(
            &request,
            &spec,
            &models,
            &[0.6, 0.65, 0.7],
            &start,
            &mut total,
            false,
        )
        .expect("search");
        assert_eq!(result.report.stop, MixtureStartStop::EvaluationBudget);
        assert_eq!(result.report.evaluations, 2);
        assert!(result.evaluation.desirability > original.desirability);
        assert_eq!(total, MAX_EVALUATIONS);
    }
}
