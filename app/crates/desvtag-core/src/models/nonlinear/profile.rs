//! Finite-domain likelihood profiles with explicit endpoint and shape diagnostics.
use super::optimizer::{Bounds, levenberg_marquardt, starts};
use super::*;
use crate::distributions::chi_square;
use crate::models::resource_budget::WorkBudget;

fn constrained(
    request: &NonlinearRequest,
    bounds: &Bounds,
    candidates: &[Vec<f64>],
    index: usize,
    value: f64,
    budget: &WorkBudget,
) -> Option<f64> {
    record_work!("profile.constrained_calls", 1);
    let minimum = candidates
        .iter()
        .filter_map(|initial| {
            let (_, sse, converged, _) =
                levenberg_marquardt(request, bounds, initial, Some((index, value)), budget);
            (converged && sse.is_finite() && sse > 0.0).then_some(sse)
        })
        .min_by(f64::total_cmp);
    if budget.exhausted() { None } else { minimum }
}
struct Trace<'a> {
    request: &'a NonlinearRequest,
    bounds: &'a Bounds,
    theta: &'a [f64],
    candidates: &'a [Vec<f64>],
    index: usize,
    minimum: f64,
    cutoff: f64,
    points: Vec<ProfilePoint>,
    valid: bool,
    budget: &'a WorkBudget,
}
impl Trace<'_> {
    fn at(&mut self, value: f64) -> Option<f64> {
        if let Some(point) = self
            .points
            .iter()
            .skip(1)
            .find(|point| point.value == value)
        {
            record_work!("profile.cache_hits", 1);
            return Some(point.likelihood_ratio);
        }
        let sse = constrained(
            self.request,
            self.bounds,
            self.candidates,
            self.index,
            value,
            self.budget,
        )?;
        let lr = self.request.x.len() as f64 * (sse / self.minimum).ln();
        if !lr.is_finite() {
            return None;
        }
        if lr < -1e-5 {
            self.valid = false;
        }
        self.points.push(ProfilePoint {
            value,
            likelihood_ratio: lr.max(0.0),
        });
        Some(lr.max(0.0))
    }
    fn side(&mut self, direction: f64, step: f64) -> (Stat, ProfileEndpointStatus) {
        let center = self.theta[self.index];
        let limit = if direction < 0.0 {
            self.bounds.lower[self.index]
        } else {
            self.bounds.upper[self.index]
        };
        let mut previous = center;
        let mut previous_lr = 0.0_f64;
        let mut endpoint = None;
        let mut after_crossing = 0;
        let mut distance = step;
        for _ in 0..52 {
            let log_value = center.ln() + direction * distance.min(32.0);
            let value = log_value
                .exp()
                .clamp(self.bounds.lower[self.index], self.bounds.upper[self.index]);
            if !value.is_finite() || value == previous {
                break;
            }
            let Some(lr) = self.at(value) else {
                self.valid = false;
                return (
                    Stat::undefined(UndefinedReason::NotEstimable),
                    if self.budget.exhausted() {
                        ProfileEndpointStatus::ResourceLimit
                    } else {
                        ProfileEndpointStatus::Failed
                    },
                );
            };
            if lr + 1e-4 * previous_lr.max(1.0) < previous_lr {
                self.valid = false;
            }
            if endpoint.is_none() && lr >= self.cutoff {
                let (mut inside, mut outside) = (previous, value);
                for _ in 0..36 {
                    let mid = (0.5 * inside.ln() + 0.5 * outside.ln()).exp();
                    let Some(middle_lr) = self.at(mid) else {
                        self.valid = false;
                        return (
                            Stat::undefined(UndefinedReason::NotEstimable),
                            if self.budget.exhausted() {
                                ProfileEndpointStatus::ResourceLimit
                            } else {
                                ProfileEndpointStatus::Failed
                            },
                        );
                    };
                    if middle_lr < self.cutoff {
                        inside = mid;
                    } else {
                        outside = mid;
                    }
                }
                endpoint = Some((inside + outside) / 2.0);
            } else if endpoint.is_some() {
                after_crossing += 1;
            }
            if after_crossing >= 3 || value == limit || distance >= 32.0 {
                break;
            }
            previous = value;
            previous_lr = lr;
            distance *= 1.55;
        }
        if let Some(value) = endpoint {
            (Stat::finite(value), ProfileEndpointStatus::Crossing)
        } else if center == limit || self.points.last().is_some_and(|p| p.value == limit) {
            (
                Stat::undefined(UndefinedReason::NotEstimable),
                ProfileEndpointStatus::DomainBound,
            )
        } else {
            (
                Stat::undefined(UndefinedReason::NotEstimable),
                ProfileEndpointStatus::SearchLimit,
            )
        }
    }
}
pub(super) fn compute(
    request: &NonlinearRequest,
    bounds: &Bounds,
    theta: &[f64],
    sse: f64,
    converged: bool,
    parameters: &[NonlinearParameter],
    budget: &WorkBudget,
) -> Result<Vec<ParameterProfile>, CoreError> {
    let cutoff = chi_square::quantile_upper(request.alpha, 1.0).map_err(|_| {
        CoreError::InvalidInput(vec![error("nonlinear.profile_cutoff_unavailable")])
    })?;
    let mut candidates = starts(request);
    candidates.push(theta.to_vec());
    Ok(theta
        .iter()
        .enumerate()
        .map(|(index, &estimate)| {
            let mut trace = Trace {
                request,
                bounds,
                theta,
                candidates: &candidates,
                index,
                minimum: sse,
                cutoff,
                points: vec![ProfilePoint {
                    value: estimate,
                    likelihood_ratio: 0.0,
                }],
                valid: true,
                budget,
            };
            let step = (parameters[index]
                .std_error
                .value()
                .unwrap_or(estimate * 0.1)
                / estimate
                * 0.5)
                .clamp(0.005, 0.5);
            let ((mut lower, mut lower_status), (mut upper, mut upper_status)) =
                if converged && sse > 1e-24 {
                    let low = trace.side(-1.0, step);
                    let high = trace.side(1.0, step);
                    (low, high)
                } else {
                    trace.valid = false;
                    (
                        (
                            Stat::undefined(UndefinedReason::NotEstimable),
                            ProfileEndpointStatus::Failed,
                        ),
                        (
                            Stat::undefined(UndefinedReason::NotEstimable),
                            ProfileEndpointStatus::Failed,
                        ),
                    )
                };
            trace.points.sort_by(|a, b| a.value.total_cmp(&b.value));
            trace.points.dedup_by(|a, b| a.value == b.value);
            for pair in trace.points.windows(2) {
                let (a, b) = (&pair[0], &pair[1]);
                let invalid = if b.value <= estimate {
                    b.likelihood_ratio > a.likelihood_ratio + 1e-3 * a.likelihood_ratio.max(1.0)
                } else if a.value >= estimate {
                    a.likelihood_ratio > b.likelihood_ratio + 1e-3 * b.likelihood_ratio.max(1.0)
                } else {
                    false
                };
                if invalid {
                    trace.valid = false;
                }
            }
            if !trace.valid {
                lower = Stat::undefined(UndefinedReason::NotEstimable);
                upper = lower;
                lower_status = if budget.exhausted() {
                    ProfileEndpointStatus::ResourceLimit
                } else {
                    ProfileEndpointStatus::Failed
                };
                upper_status = lower_status;
            }
            ParameterProfile {
                parameter: parameters[index].name.clone(),
                cutoff,
                lower,
                upper,
                lower_status,
                upper_status,
                unimodal_in_examined_range: trace.valid,
                points: trace.points,
            }
        })
        .collect())
}
