//! Structural checks only: opening a project never runs an analysis.
use std::collections::HashSet;

use desvtag_core::domain::StableId;
use desvtag_core::models::terms::TermSpec;
use desvtag_core::provenance::Provenance;
use desvtag_core::validation::{Issue, Severity};
use serde::{Serialize, de::DeserializeOwned};

use crate::Experiment;
use crate::experiment::ExperimentData;
use crate::families::{AnalysisFamily, RepeatedInputSnapshot, RepeatedOutput};

fn issue(issues: &mut Vec<Issue>, code: &str, id: &StableId) {
    issues.push(Issue::new(code, Severity::Error).with_param("id", id));
}

// serde_json's float_roundtrip feature is enabled workspace-wide. A non-finite f64 becomes null
// on serialization; decoding either rejects it or differs from the original Option/Stat. This
// catches non-finite values anywhere in nested records without redoing scientific calculations.
fn finite_round_trip<T: Serialize + DeserializeOwned + PartialEq>(value: &T) -> bool {
    serde_json::to_vec(value)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<T>(&bytes).ok())
        .is_some_and(|restored| restored == *value)
}

fn method(provenance: &Provenance, expected: &str) -> bool {
    provenance.method_id == expected
        && provenance.method_version > 0
        && !provenance.engine_version.is_empty()
}

fn header<'a>(
    exp: &'a Experiment,
    id: &'a StableId,
    revision: &StableId,
    created: &str,
    signature: &str,
    ids: &mut HashSet<&'a str>,
    issues: &mut Vec<Issue>,
) -> Option<&'a ExperimentData> {
    if !ids.insert(id.as_str()) {
        issue(issues, "project.duplicate_analysis_id", id);
    }
    if created.is_empty() || created.len() > 100 || signature.is_empty() {
        issue(issues, "project.invalid_family_result", id);
    }
    let data = exp
        .revisions
        .iter()
        .find(|r| r.id == *revision)
        .map(|r| &r.data);
    if data.is_none() {
        issue(issues, "project.analysis_unknown_revision", id);
    }
    data
}

fn factor(data: &ExperimentData, id: &StableId) -> bool {
    data.factors.iter().any(|f| f.id == *id)
}

fn response(data: &ExperimentData, id: &StableId) -> bool {
    data.responses.iter().any(|r| r.id == *id)
}

fn unit(data: &ExperimentData, id: &Option<StableId>) -> bool {
    id.as_ref().is_none_or(|id| factor(data, id))
}

fn term(data: &ExperimentData, term: &TermSpec) -> bool {
    match term {
        TermSpec::Main { factor_id } | TermSpec::Power { factor_id, .. } => factor(data, factor_id),
        TermSpec::Interaction { factor_ids } => factor_ids.iter().all(|id| factor(data, id)),
    }
}

/// Extends the shared analysis-id set so review comments can refer to every retained record.
pub(crate) fn validate_families<'a>(
    exp: &'a Experiment,
    ids: &mut HashSet<&'a str>,
    issues: &mut Vec<Issue>,
) {
    macro_rules! header {
        ($r:expr) => {
            header(
                exp,
                &$r.id,
                &$r.revision_id,
                &$r.created_at,
                &$r.signature,
                ids,
                issues,
            )
        };
    }
    if let Some(saved) = &exp.mixture_result {
        if !finite_round_trip(saved) {
            issue(issues, "project.invalid_family_result", &exp.id);
        }
        for record in &saved.records {
            if let Some(data) = header!(record) {
                let input = &record.input;
                let distinct: HashSet<_> = input.component_ids.iter().collect();
                if !response(data, &input.response_id)
                    || !input.component_ids.iter().all(|id| factor(data, id))
                    || distinct.len() != input.component_ids.len()
                    || input.component_ids.len() != input.request.component_names.len()
                    || input.request.component_names.len() != input.request.lower_bounds.len()
                    || input.request.proportions.len() != input.request.response.len()
                    || record.result.model != input.request.model
                    || !desvtag_core::models::mixture::validate(&input.request).is_empty()
                    || !valid_mixture_region(&input.request, &record.result)
                    || !valid_mixture_optimum(&input.request, &record.result)
                    || input.request.optimization.as_ref().is_some_and(|spec| {
                        spec.data
                            .iter()
                            .any(|source| !response(data, &source.response_id))
                    })
                    || !method(&record.result.provenance, "mixture_model")
                {
                    issue(issues, "project.invalid_family_result", &record.id);
                }
            }
        }
    }
    if let Some(saved) = &exp.nonlinear_result {
        if !finite_round_trip(saved) {
            issue(issues, "project.invalid_family_result", &exp.id);
        }
        for record in &saved.records {
            if let Some(data) = header!(record) {
                let input = &record.input;
                if !factor(data, &input.factor_id)
                    || !response(data, &input.response_id)
                    || input.request.x.len() != input.request.y.len()
                    || input.request.x.len() != record.result.n as usize
                    || input.request.y.len() != record.result.residuals.len()
                    || record.result.model != input.request.model
                    || !method(&record.result.provenance, "nonlinear_saturation_fit")
                    || !crate::family_nonlinear_validation::valid(&input.request, &record.result)
                {
                    issue(issues, "project.invalid_family_result", &record.id);
                }
            }
        }
    }
    if let Some(saved) = &exp.mixed_model_result {
        if !finite_round_trip(saved) {
            issue(issues, "project.invalid_family_result", &exp.id);
        }
        for record in &saved.records {
            if let Some(data) = header!(record) {
                let valid = match (&record.input, &record.result) {
                    (
                        RepeatedInputSnapshot::Paired {
                            response_id,
                            factor_id,
                            unit_source,
                            unit_labels,
                            pairing,
                            request,
                        },
                        RepeatedOutput::Paired(result),
                    ) => {
                        response(data, response_id)
                            && factor(data, factor_id)
                            && unit(data, unit_source)
                            && valid_unit_labels(unit_labels)
                            && request.first.len() == request.second.len()
                            && pairing.units.len() == request.first.len()
                            && method(&result.provenance, "paired_comparison")
                    }
                    (
                        RepeatedInputSnapshot::Mixed {
                            unit_source,
                            unit_labels,
                            request,
                        },
                        RepeatedOutput::Mixed(result),
                    ) => {
                        let row_ids: HashSet<_> = data.rows.iter().map(|r| &r.id).collect();
                        unit(data, unit_source)
                            && valid_unit_labels(unit_labels)
                            && response(data, &request.spec.response_id)
                            && request.spec.terms.iter().all(|t| term(data, t))
                            && request.dataset.factors.iter().all(|f| factor(data, &f.id))
                            && request
                                .dataset
                                .responses
                                .iter()
                                .all(|r| response(data, &r.id))
                            && request
                                .dataset
                                .observations
                                .iter()
                                .all(|o| row_ids.contains(&o.id))
                            && method(&result.provenance, "linear_mixed_model")
                            && crate::family_mixed_validation::valid(request, result)
                    }
                    _ => false,
                };
                if !valid {
                    issue(issues, "project.invalid_family_result", &record.id);
                }
            }
        }
    }
    if let Some(saved) = &exp.power_result {
        if !finite_round_trip(saved) {
            issue(issues, "project.invalid_family_result", &exp.id);
        }
        for record in &saved.records {
            let _ = header!(record);
            if !method(&record.result.provenance, "power_analysis")
                || !crate::family_power_validation::valid(&record.input, &record.result)
            {
                issue(issues, "project.invalid_family_result", &record.id);
            }
        }
    }
    let selected_has_result = match exp.active_family {
        None | Some(AnalysisFamily::Legacy) => true,
        Some(AnalysisFamily::Mixture) => exp
            .mixture_result
            .as_ref()
            .is_some_and(|s| !s.records.is_empty()),
        Some(AnalysisFamily::Repeated) => exp
            .mixed_model_result
            .as_ref()
            .is_some_and(|s| !s.records.is_empty()),
        Some(AnalysisFamily::Nonlinear) => exp
            .nonlinear_result
            .as_ref()
            .is_some_and(|s| !s.records.is_empty()),
        Some(AnalysisFamily::Power) => exp
            .power_result
            .as_ref()
            .is_some_and(|s| !s.records.is_empty()),
    };
    if !selected_has_result {
        issue(issues, "project.invalid_family_result", &exp.id);
    }
}

fn valid_mixture_region(
    request: &desvtag_core::models::mixture::MixtureAnalysisRequest,
    result: &desvtag_core::models::mixture::MixtureAnalysis,
) -> bool {
    let q = request.component_names.len();
    let feasible = |point: &[f64]| {
        point.len() == q
            && point.iter().all(|x| x.is_finite())
            && (point.iter().sum::<f64>() - 1.0).abs() <= 1e-6
            && point
                .iter()
                .zip(&request.lower_bounds)
                .all(|(x, l)| *x >= l - 1e-9)
            && request
                .upper_bounds
                .as_ref()
                .is_none_or(|upper| point.iter().zip(upper).all(|(x, u)| *x <= u + 1e-9))
    };
    let scale = 1.0 - request.lower_bounds.iter().sum::<f64>();
    let grid_valid = result.grid.iter().all(|point| {
        feasible(&point.proportions)
            && point.pseudo.len() == q
            && point
                .pseudo
                .iter()
                .zip(&point.proportions)
                .zip(&request.lower_bounds)
                .all(|((pseudo, real), lower)| (lower + scale * pseudo - real).abs() <= 1e-9)
    });
    let region_valid = result.region.as_ref().is_none_or(|region| {
        !region.vertices.is_empty()
            && region.dimension < q as u32
            && region.vertices.iter().all(|point| feasible(point))
            && region.edges.iter().all(|[a, b]| {
                a != b
                    && (*a as usize) < region.vertices.len()
                    && (*b as usize) < region.vertices.len()
            })
    });
    let bounded_metadata = request.upper_bounds.is_none()
        || (result.region.is_some() && (q != 3 || result.grid_divisions.is_some()));
    grid_valid
        && region_valid
        && bounded_metadata
        && valid_cox_trace(request, result)
        && result
            .grid_divisions
            .is_none_or(|n| n > 0 && n <= desvtag_core::models::mixture::GRID_DIVISIONS as u32)
}

fn valid_cox_trace(
    request: &desvtag_core::models::mixture::MixtureAnalysisRequest,
    result: &desvtag_core::models::mixture::MixtureAnalysis,
) -> bool {
    let (reference, trace) = match (&request.cox_reference, &result.cox_trace) {
        (None, None) => return true,
        (Some(reference), Some(trace)) => (reference, trace),
        _ => return false,
    };
    let q = request.component_names.len();
    let sum = reference.iter().sum::<f64>();
    let scale = 1.0 - request.lower_bounds.iter().sum::<f64>();
    if result.provenance.method_version < 3
        || trace.reference.len() != q
        || trace.series.len() != q
        || trace
            .reference
            .iter()
            .zip(reference)
            .any(|(a, b)| (a - b / sum).abs() > 1e-12)
    {
        return false;
    }
    trace.series.iter().enumerate().all(|(i, series)| {
        if series.component as usize != i {
            return false;
        }
        let remaining: f64 = trace
            .reference
            .iter()
            .enumerate()
            .filter(|(j, _)| *j != i)
            .map(|(_, r)| r)
            .sum();
        let Some([lo, hi]) = series.interval else {
            return remaining == 0.0 && series.points.is_empty();
        };
        lo.is_finite()
            && hi.is_finite()
            && lo <= hi
            && remaining > 0.0
            && lo >= -1e-12
            && hi <= 1.0 + 1e-12
            && !series.points.is_empty()
            && series.points.len() <= 52
            && series.points.first().is_some_and(|p| {
                p.proportions
                    .get(i)
                    .is_some_and(|v| (v - lo).abs() <= 1e-12)
            })
            && series.points.last().is_some_and(|p| {
                p.proportions
                    .get(i)
                    .is_some_and(|v| (v - hi).abs() <= 1e-12)
            })
            && series.points.iter().any(|point| point.delta == 0.0)
            && series
                .points
                .windows(2)
                .all(|pair| pair[0].delta < pair[1].delta)
            && series.points.iter().all(|point| {
                point.proportions.len() == q
                    && point.pseudo.len() == q
                    && (point.proportions.iter().sum::<f64>() - 1.0).abs() <= 1e-9
                    && (point.delta - (point.proportions[i] - trace.reference[i])).abs() <= 1e-12
                    && point.proportions.iter().enumerate().all(|(j, x)| {
                        *x >= request.lower_bounds[j] - 1e-9
                            && request
                                .upper_bounds
                                .as_ref()
                                .is_none_or(|u| *x <= u[j] + 1e-9)
                            && (request.lower_bounds[j] + scale * point.pseudo[j] - x).abs() <= 1e-9
                            && (j == i
                                || (*x
                                    - (1.0 - point.proportions[i]) * trace.reference[j]
                                        / remaining)
                                    .abs()
                                    <= 1e-9)
                    })
            })
    })
}

fn valid_mixture_optimum(
    request: &desvtag_core::models::mixture::MixtureAnalysisRequest,
    result: &desvtag_core::models::mixture::MixtureAnalysis,
) -> bool {
    use desvtag_core::optimization::{
        desirability, mixture as search, optimize::OptimizationStatus,
    };
    let (spec, result) = match (&request.optimization, &result.optimum) {
        (None, None) => return true,
        (Some(spec), Some(optimum)) if result.provenance.method_version >= 4 => (spec, optimum),
        _ => return false,
    };
    let q = request.component_names.len();
    let feasible = |point: &[f64]| {
        point.len() == q
            && (point.iter().sum::<f64>() - 1.0).abs() <= 1e-9
            && point.iter().enumerate().all(|(i, x)| {
                *x >= request.lower_bounds[i] - 1e-9
                    && request
                        .upper_bounds
                        .as_ref()
                        .is_none_or(|upper| *x <= upper[i] + 1e-9)
            })
    };
    let actual = if result.dimension == 0 {
        1
    } else {
        spec.setup.search.starts as usize
    };
    if !matches!(
        result.algorithm.as_str(),
        "pair-transfer-pattern/1" | "pair-transfer-pattern/2"
    ) || result.requested_starts != spec.setup.search.starts
        || result.evaluation_budget != search::MAX_EVALUATIONS
        || result.evaluations > result.evaluation_budget
        || result.starts.is_empty()
        || result.starts.len() > actual
        || result
            .starts
            .iter()
            .map(|start| u64::from(start.evaluations))
            .sum::<u64>()
            != u64::from(result.evaluations)
        || result.budget_reached
            != (result.starts.len() < actual
                || result
                    .starts
                    .iter()
                    .any(|start| start.stop == search::MixtureStartStop::EvaluationBudget))
        || (result.budget_reached && result.evaluations != result.evaluation_budget)
        || result.dimension >= q as u32
        || result.dimension != result.region.dimension
        || result.region.vertices.is_empty()
        || !result.region.vertices.iter().all(|point| feasible(point))
        || !result.region.edges.iter().all(|[a, b]| {
            a != b
                && (*a as usize) < result.region.vertices.len()
                && (*b as usize) < result.region.vertices.len()
        })
        || result.candidates.len() > spec.setup.search.max_candidates as usize
        || result.starts.iter().any(|start| {
            start.evaluations == 0 || start.evaluations > search::MAX_START_EVALUATIONS
        })
    {
        return false;
    }
    let status = match result.candidates.first() {
        None => OptimizationStatus::Infeasible,
        Some(candidate) if candidate.desirability > 0.0 => OptimizationStatus::Found,
        Some(_) => OptimizationStatus::OnlyZeroDesirability,
    };
    if result.status != status
        || result
            .candidates
            .windows(2)
            .any(|pair| pair[0].desirability < pair[1].desirability - 1e-12)
    {
        return false;
    }
    let scale = 1.0 - request.lower_bounds.iter().sum::<f64>();
    result
        .candidates
        .iter()
        .enumerate()
        .all(|(index, candidate)| {
            if candidate.rank != index as u32 + 1
                || !feasible(&candidate.proportions)
                || candidate.pseudo.len() != q
                || candidate.starts == 0
                || candidate.starts as usize > result.starts.len()
                || candidate.predictions.len() != spec.setup.responses.len()
                || candidate
                    .pseudo
                    .iter()
                    .zip(&candidate.proportions)
                    .zip(&request.lower_bounds)
                    .any(|((p, x), l)| (l + scale * p - x).abs() > 1e-9)
            {
                return false;
            }
            let mut ds = Vec::new();
            let mut weights = Vec::new();
            let mut violation = 0.0;
            for (prediction, goal) in candidate.predictions.iter().zip(&spec.setup.responses) {
                let Some(value) = prediction.prediction.fitted.value() else {
                    return false;
                };
                let Some(source) = spec
                    .data
                    .iter()
                    .find(|data| data.response_id == goal.response_id)
                else {
                    return false;
                };
                if prediction.response_id != goal.response_id
                    || prediction.name != source.name
                    || prediction.loss_vs_best_alone.is_some()
                {
                    return false;
                }
                let d = desirability::individual(&goal.goal, value);
                if (d - prediction.desirability).abs() > 1e-10 {
                    return false;
                }
                ds.push(d);
                weights.push(goal.importance);
                let min = source
                    .response
                    .iter()
                    .copied()
                    .fold(f64::INFINITY, f64::min);
                let max = source
                    .response
                    .iter()
                    .copied()
                    .fold(f64::NEG_INFINITY, f64::max);
                let range = if max > min { max - min } else { 1.0 };
                if let Some(limit) = spec
                    .setup
                    .limits
                    .iter()
                    .find(|limit| limit.response_id == goal.response_id)
                {
                    if let Some(min) = limit.min {
                        violation += ((min - value) / range).max(0.0);
                    }
                    if let Some(max) = limit.max {
                        violation += ((value - max) / range).max(0.0);
                    }
                }
            }
            violation <= search::FEASIBILITY_TOLERANCE
                && (candidate.desirability - desirability::global(&ds, &weights)).abs() <= 1e-10
        })
}

fn valid_unit_labels(labels: &Option<std::collections::BTreeMap<String, String>>) -> bool {
    labels.as_ref().is_none_or(|labels| {
        labels.iter().all(|(id, label)| {
            desvtag_core::domain::StableId::new(id).is_ok() && !label.trim().is_empty()
        })
    })
}
