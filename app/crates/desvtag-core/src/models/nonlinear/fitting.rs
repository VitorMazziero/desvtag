use super::model::{gradient, jacobian, predict};
use super::optimizer::{Bounds, inverse_spd, levenberg_marquardt, starts};
use super::*;
use crate::distributions::student_t;
use crate::inference::intervals::t_critical;
use crate::models::resource_budget::WorkBudget;
use crate::numeric::{Matrix, svd};
fn validate(request: &NonlinearRequest) -> Vec<Issue> {
    if request.x.len().max(request.y.len()) > MAX_OBSERVATIONS {
        return vec![error("nonlinear.row_budget").with_param("maxRows", &MAX_OBSERVATIONS)];
    }
    let mut issues = Vec::new();
    let p = request.model.names().len();
    if request.x.len() != request.y.len() || request.x.is_empty() {
        issues.push(error("nonlinear.invalid_dimensions"));
    }
    if request.x.len() <= p {
        issues.push(
            error("nonlinear.too_few_observations")
                .with_param("observations", &request.x.len())
                .with_param("parameters", &p),
        );
    }
    if request.x.iter().chain(&request.y).any(|v| !v.is_finite())
        || request.x.iter().any(|v| *v < 0.0)
    {
        issues.push(error("nonlinear.invalid_values"));
    }
    if request.model == SaturationModel::Hill && request.x.iter().any(|v| *v <= 0.0) {
        issues.push(error("nonlinear.hill_needs_positive_substrate"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("model.invalid_confidence_level"));
    }
    for given in [&request.initial] {
        if let Some(v) = given
            && (v.len() != p || v.iter().any(|x| !x.is_finite()))
        {
            issues.push(error("nonlinear.invalid_initial"));
        }
    }
    for b in [&request.lower, &request.upper].into_iter().flatten() {
        if b.len() != p {
            issues.push(error("nonlinear.invalid_bounds"));
        }
    }
    if request.lower.as_ref().is_none_or(|v| v.len() == p)
        && request.upper.as_ref().is_none_or(|v| v.len() == p)
    {
        for i in 0..p {
            let lo = request.lower.as_ref().and_then(|v| v[i]).unwrap_or(1e-12);
            let hi = request
                .upper
                .as_ref()
                .and_then(|v| v[i])
                .unwrap_or(f64::INFINITY);
            if !lo.is_finite()
                || lo <= 0.0
                || hi <= lo
                || (request.upper.as_ref().and_then(|v| v[i]).is_some() && !hi.is_finite())
            {
                issues.push(error("nonlinear.invalid_bounds"));
            }
            if let Some(initial) = &request.initial
                && let Some(&value) = initial.get(i)
                && (!value.is_finite() || value < lo || value > hi)
            {
                issues.push(error("nonlinear.invalid_initial"));
            }
        }
    }
    issues
}

/// Ajusta o modelo de saturação.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados inválidos ou quando nenhum início produz um ajuste.
pub fn fit(request: &NonlinearRequest) -> Result<NonlinearResult, CoreError> {
    fit_with_budget(
        request,
        WorkBudget::new(MAX_ROW_WORK, "budget.nonlinear_units"),
    )
}

pub(super) fn fit_with_budget(
    request: &NonlinearRequest,
    budget: WorkBudget,
) -> Result<NonlinearResult, CoreError> {
    let issues = validate(request);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let model = request.model;
    let p = model.names().len();
    let n = request.x.len();
    // Reserve bounded covariance/curve/residual presentation work before the optional profile.
    if !budget.charge(2 * n as u64 + 2 * CURVE_POINTS as u64) {
        return Err(CoreError::InvalidInput(vec![
            error("nonlinear.work_budget").with_param("maxWork", &budget.limit()),
        ]));
    }
    // Limites: por padrão, parâmetros estritamente positivos.
    let default_lower = 1e-12;
    let bounds = Bounds {
        lower: (0..p)
            .map(|i| {
                request
                    .lower
                    .as_ref()
                    .and_then(|v| v[i])
                    .unwrap_or(default_lower)
            })
            .collect(),
        upper: (0..p)
            .map(|i| {
                request
                    .upper
                    .as_ref()
                    .and_then(|v| v[i])
                    .unwrap_or(f64::INFINITY)
            })
            .collect(),
    };
    let candidates: Vec<Vec<f64>> = match &request.initial {
        Some(v) => vec![v.clone()],
        None => starts(request),
    };
    let mut runs: Vec<(Vec<f64>, f64, bool, usize)> = candidates
        .iter()
        .map(|s| levenberg_marquardt(request, &bounds, s, None, &budget))
        .filter(|(_, sse, _, _)| sse.is_finite())
        .collect();
    if budget.exhausted() {
        return Err(CoreError::InvalidInput(vec![
            error("nonlinear.work_budget").with_param("maxWork", &budget.limit()),
        ]));
    }
    if runs.is_empty() {
        return Err(CoreError::InvalidInput(vec![error("nonlinear.no_fit")]));
    }
    runs.sort_by(|a, b| a.1.total_cmp(&b.1));
    let best_sse = runs[0].1;
    let reached = runs
        .iter()
        .filter(|r| (r.1 - best_sse).abs() <= 1e-8 * best_sse.max(1e-300))
        .count();
    let (theta, sse, converged, iterations) = runs.remove(0);
    let starts_run = candidates.len();

    let df = (n - p) as f64;
    let sigma2 = sse / df;
    let j = jacobian(request, &theta);
    let mut jtj = vec![vec![0.0; p]; p];
    for row in 0..n {
        for a in 0..p {
            for b in 0..p {
                jtj[a][b] += j[(row, a)] * j[(row, b)];
            }
        }
    }
    let covariance = inverse_spd(&jtj).map(|inv| {
        inv.iter()
            .map(|r| r.iter().map(|v| v * sigma2).collect::<Vec<f64>>())
            .collect::<Vec<_>>()
    });
    let covariance = covariance
        .filter(|c| converged && sigma2 > 0.0 && c.iter().flatten().all(|v| v.is_finite()));
    let inference = |value| {
        if covariance.is_none() {
            Stat::undefined(UndefinedReason::CovarianceInformationUnavailable)
        } else {
            finite_or(value)
        }
    };
    let crit = t_critical(1.0 - request.alpha, df).unwrap_or(f64::NAN);
    let parameters: Vec<NonlinearParameter> = (0..p)
        .map(|i| {
            let se = covariance
                .as_ref()
                .map_or(f64::NAN, |c| c[i][i].max(0.0).sqrt());
            let t = theta[i] / se;
            NonlinearParameter {
                name: model.names()[i].to_string(),
                estimate: theta[i],
                std_error: inference(se),
                t_value: inference(t),
                p_value: inference(if t.is_nan() {
                    f64::NAN
                } else {
                    (2.0 * student_t::sf(t.abs(), df)).min(1.0)
                }),
                ci_lower: inference(theta[i] - crit * se),
                ci_upper: inference(theta[i] + crit * se),
                at_bound: (theta[i] - bounds.lower[i]).abs() <= 1e-9 * (1.0 + theta[i].abs())
                    || (theta[i] - bounds.upper[i]).abs() <= 1e-9 * (1.0 + theta[i].abs()),
            }
        })
        .collect();

    let correlation: Vec<Vec<f64>> = covariance
        .as_ref()
        .filter(|c| (0..p).all(|i| c[i][i].is_finite() && c[i][i] > 0.0))
        .map_or_else(Vec::new, |c| {
            (0..p)
                .map(|a| {
                    (0..p)
                        .map(|b| (c[a][b] / c[a][a].sqrt()) / c[b][b].sqrt())
                        .collect()
                })
                .collect()
        });
    let correlation = if correlation.iter().flatten().all(|v| v.is_finite()) {
        correlation
    } else {
        Vec::new()
    };
    // Condição de J com colunas normalizadas.
    let norms: Vec<f64> = (0..p)
        .map(|c| {
            (0..n)
                .map(|r| j[(r, c)].powi(2))
                .sum::<f64>()
                .sqrt()
                .max(1e-300)
        })
        .collect();
    let normalized: Vec<Vec<f64>> = (0..n)
        .map(|r| (0..p).map(|c| j[(r, c)] / norms[c]).collect())
        .collect();
    let condition = Matrix::from_rows(&normalized)
        .and_then(|m| svd::condition_number(&m))
        .unwrap_or(f64::INFINITY);

    let mean = request.y.iter().sum::<f64>() / n as f64;
    let sst: f64 = request.y.iter().map(|v| (v - mean).powi(2)).sum();
    let mut notes = Vec::new();
    if !converged {
        notes.push(warning("nonlinear.not_converged"));
    }
    if parameters.iter().any(|q| q.at_bound) {
        notes.push(warning("nonlinear.parameter_at_bound"));
    }
    if !converged || sigma2 == 0.0 {
        notes.push(warning("nonlinear.inference_unavailable"));
    }
    if (covariance.is_none() && sigma2 > 0.0 && converged) || condition > 1e8 {
        notes.push(warning("nonlinear.ill_conditioned"));
    }
    if correlation
        .iter()
        .enumerate()
        .any(|(a, r)| r.iter().enumerate().any(|(b, v)| a != b && v.abs() > 0.99))
    {
        notes.push(warning("nonlinear.highly_correlated"));
    }
    if parameters.iter().any(|q| {
        q.std_error
            .value()
            .is_some_and(|s| s > 10.0 * q.estimate.abs().max(1e-12))
    }) {
        notes.push(warning("nonlinear.imprecise_parameter"));
    }
    if df < 3.0 {
        notes.push(warning("nonlinear.few_degrees_of_freedom"));
    }
    if reached == 1 && starts_run > 1 {
        notes.push(warning("nonlinear.single_start_best"));
    }

    // Curva e faixa de confiança (método delta).
    let s_min = request.x.iter().copied().fold(f64::MAX, f64::min);
    let s_max = request.x.iter().copied().fold(f64::MIN, f64::max);
    let curve: Vec<CurvePoint> = (0..CURVE_POINTS)
        .map(|k| {
            let s = s_min + (s_max - s_min) * k as f64 / (CURVE_POINTS - 1) as f64;
            let y = predict(model, &theta, s);
            let (lower, upper) = covariance.as_ref().map_or((f64::NAN, f64::NAN), |c| {
                let g = gradient(model, &theta, s);
                let var: f64 = (0..p)
                    .map(|a| (0..p).map(|b| g[a] * c[a][b] * g[b]).sum::<f64>())
                    .sum();
                let half = crit * var.max(0.0).sqrt();
                (y - half, y + half)
            });
            CurvePoint {
                x: s,
                y,
                lower: inference(lower),
                upper: inference(upper),
            }
        })
        .collect();

    let profiles = request
        .profile
        .filter(|enabled| *enabled)
        .map(|_| {
            super::profile::compute(
                request,
                &bounds,
                &theta,
                sse,
                converged,
                &parameters,
                &budget,
            )
        })
        .transpose()?;
    if budget.exhausted() {
        notes.push(warning("nonlinear.profile_budget").with_param("maxWork", &budget.limit()));
    }
    Ok(NonlinearResult {
        model,
        n: u32::try_from(n).unwrap_or(u32::MAX),
        parameters,
        sse,
        sigma: finite_or(sigma2.sqrt()),
        r_squared: if sst > 0.0 {
            Stat::finite(1.0 - sse / sst)
        } else {
            Stat::undefined(UndefinedReason::ConstantResponse)
        },
        correlation,
        condition_number: finite_or(condition),
        converged,
        iterations: u32::try_from(iterations).unwrap_or(u32::MAX),
        starts_run: u32::try_from(starts_run).unwrap_or(u32::MAX),
        starts_reaching_best: u32::try_from(reached).unwrap_or(u32::MAX),
        residuals: request
            .x
            .iter()
            .zip(&request.y)
            .map(|(&s, &y)| y - predict(model, &theta, s))
            .collect(),
        curve,
        issues: notes,
        provenance: Provenance::current(
            METHOD_ID,
            if profiles.is_some() {
                METHOD_VERSION
            } else {
                1
            },
        ),
        profiles,
    })
}
