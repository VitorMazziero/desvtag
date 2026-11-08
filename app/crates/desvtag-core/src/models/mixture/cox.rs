//! Cox paths in real proportions, restricted to the declared box/simplex domain.
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::MixtureAnalysisRequest;
use crate::descriptive::{Stat, UndefinedReason};
use crate::models::linear::LinearModel;
use crate::validation::{Issue, Severity};

const DIVISIONS: usize = 50;
const TOLERANCE: f64 = 1e-12;

/// One evaluated location along a Cox path.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CoxTracePoint {
    /// Change in the selected component's real fraction from the reference.
    pub delta: f64,
    /// Real mixture fractions, in component order.
    pub proportions: Vec<f64>,
    /// Lower-bound pseudocomponents used by the fitted model.
    pub pseudo: Vec<f64>,
    /// Mean prediction, or an explicit non-estimable/non-finite state.
    pub value: Stat,
}

/// One component's feasible direction; absent interval means an undefined direction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CoxTraceSeries {
    /// Index into the saved component names and reference.
    pub component: u32,
    /// Feasible interval of the component's real fraction (not delta).
    pub interval: Option<[f64; 2]>,
    /// Ordered samples, including the exact reference.
    pub points: Vec<CoxTracePoint>,
}

/// All requested Cox directions relative to an explicit real reference blend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CoxTrace {
    /// Actual reference after rounding-error-only sum normalization.
    pub reference: Vec<f64>,
    /// One entry per component, in request order.
    pub series: Vec<CoxTraceSeries>,
}

pub(super) fn valid_reference(request: &MixtureAnalysisRequest, reference: &[f64]) -> bool {
    let sum = reference.iter().sum::<f64>();
    reference.len() == request.component_names.len()
        && request.lower_bounds.len() == reference.len()
        && sum.is_finite()
        && (sum - 1.0).abs() <= 1e-9
        && reference.iter().enumerate().all(|(i, r)| {
            r.is_finite()
                && *r >= 0.0
                && *r <= 1.0
                && r / sum >= request.lower_bounds[i] - TOLERANCE
                && request
                    .upper_bounds
                    .as_ref()
                    .is_none_or(|upper| upper.get(i).is_some_and(|u| r / sum <= u + TOLERANCE))
        })
}

pub(super) fn build(
    request: &MixtureAnalysisRequest,
    model: &LinearModel,
    reference: &[f64],
    issues: &mut Vec<Issue>,
) -> CoxTrace {
    let sum = reference.iter().sum::<f64>();
    let reference: Vec<f64> = reference.iter().map(|r| r / sum).collect();
    let q = reference.len();
    let mut series = Vec::with_capacity(q);
    let mut unavailable = 0_u32;
    for i in 0..q {
        let remaining: f64 = reference
            .iter()
            .enumerate()
            .filter(|(j, _)| *j != i)
            .map(|(_, r)| r)
            .sum();
        if remaining == 0.0 {
            issues.push(
                Issue::new("mixture.cox_direction_undefined", Severity::Warning)
                    .with_param("component", &request.component_names[i]),
            );
            series.push(CoxTraceSeries {
                component: i as u32,
                interval: None,
                points: Vec::new(),
            });
            continue;
        }
        let mut lo = request.lower_bounds[i];
        let mut hi = request.upper_bounds.as_ref().map_or(1.0, |u| u[i]);
        for (j, r) in reference.iter().enumerate() {
            if j == i || *r == 0.0 {
                continue;
            }
            let ratio = r / remaining;
            hi = hi.min(1.0 - request.lower_bounds[j] / ratio);
            let upper = request.upper_bounds.as_ref().map_or(1.0, |u| u[j]);
            lo = lo.max(1.0 - upper / ratio);
        }
        // A valid reference belongs to its path; contain only rounding at active faces.
        lo = lo.min(reference[i]).max(0.0);
        hi = hi.max(reference[i]).min(1.0);
        let mut locations: Vec<f64> = if hi - lo <= TOLERANCE {
            vec![reference[i]]
        } else {
            (0..=DIVISIONS)
                .map(|step| lo + (hi - lo) * step as f64 / DIVISIONS as f64)
                .collect()
        };
        // Replace an almost-identical grid location so the reference itself is retained.
        locations.retain(|t| (*t - reference[i]).abs() > TOLERANCE);
        locations.push(reference[i]);
        locations.sort_by(f64::total_cmp);
        let points = locations
            .into_iter()
            .map(|t| {
                let proportions: Vec<f64> = if t == reference[i] {
                    reference.clone()
                } else {
                    reference
                        .iter()
                        .enumerate()
                        .map(|(j, r)| {
                            if i == j {
                                t
                            } else {
                                (1.0 - t) * (r / remaining)
                            }
                        })
                        .collect()
                };
                let pseudo = super::pseudo_components(request, &proportions);
                let row = super::columns(&pseudo, request.model);
                let value =
                    if crate::models::covariance::quadratic_form(model.factorization(), &row)
                        .is_some()
                    {
                        Stat::finite(
                            row.iter()
                                .zip(model.coefficients())
                                .filter_map(|(x, b)| b.map(|b| x * b))
                                .sum(),
                        )
                    } else {
                        unavailable += 1;
                        Stat::undefined(UndefinedReason::NotEstimable)
                    };
                CoxTracePoint {
                    delta: proportions[i] - reference[i],
                    proportions,
                    pseudo,
                    value,
                }
            })
            .collect();
        series.push(CoxTraceSeries {
            component: i as u32,
            interval: Some([lo, hi]),
            points,
        });
    }
    if unavailable > 0 {
        issues.push(
            Issue::new("mixture.cox_predictions_not_estimable", Severity::Warning)
                .with_param("count", &unavailable),
        );
    }
    CoxTrace { reference, series }
}
