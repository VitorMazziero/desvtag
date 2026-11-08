use super::model::{jacobian_into, predict, residual_sum};
use super::{MAX_ITERATIONS, NonlinearRequest, SaturationModel};
use crate::models::resource_budget::WorkBudget;
use crate::numeric::Matrix;
pub(super) fn solve_spd(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>> {
    let p = b.len();
    let mut l = vec![vec![0.0; p]; p];
    for i in 0..p {
        for j in 0..=i {
            let mut sum = a[i][j];
            sum -= l[i][..j]
                .iter()
                .zip(&l[j][..j])
                .map(|(x, y)| x * y)
                .sum::<f64>();
            if i == j {
                if sum <= 0.0 || !sum.is_finite() {
                    return None;
                }
                l[i][i] = sum.sqrt();
            } else {
                l[i][j] = sum / l[j][j];
            }
        }
    }
    let mut y = vec![0.0; p];
    for i in 0..p {
        let mut s = b[i];
        for k in 0..i {
            s -= l[i][k] * y[k];
        }
        y[i] = s / l[i][i];
    }
    let mut x = vec![0.0; p];
    for i in (0..p).rev() {
        let mut s = y[i];
        for k in (i + 1)..p {
            s -= l[k][i] * x[k];
        }
        x[i] = s / l[i][i];
    }
    Some(x)
}

pub(super) fn inverse_spd(a: &[Vec<f64>]) -> Option<Vec<Vec<f64>>> {
    let p = a.len();
    let columns: Option<Vec<Vec<f64>>> = (0..p)
        .map(|c| {
            let e: Vec<f64> = (0..p).map(|i| f64::from(u8::from(i == c))).collect();
            solve_spd(a, &e)
        })
        .collect();
    let columns = columns?;
    Some(
        (0..p)
            .map(|i| (0..p).map(|j| columns[j][i]).collect())
            .collect(),
    )
}

pub(super) struct Bounds {
    pub(super) lower: Vec<f64>,
    pub(super) upper: Vec<f64>,
}

pub(super) fn clamp(theta: &mut [f64], bounds: &Bounds) {
    for (i, v) in theta.iter_mut().enumerate() {
        *v = v.clamp(bounds.lower[i], bounds.upper[i]);
    }
}

/// Levenberg–Marquardt projetado a partir de `start`.
pub(super) fn levenberg_marquardt(
    request: &NonlinearRequest,
    bounds: &Bounds,
    start: &[f64],
    fixed: Option<(usize, f64)>,
    budget: &WorkBudget,
) -> (Vec<f64>, f64, bool, usize) {
    record_work!("nonlinear.lm_runs", 1);
    let p = start.len();
    let mut theta = start.to_vec();
    clamp(&mut theta, bounds);
    if let Some((i, value)) = fixed {
        theta[i] = value;
    }
    let rows = request.x.len() as u64;
    if !budget.charge(rows) {
        return (theta, f64::INFINITY, false, 0);
    }
    let mut sse = residual_sum(request, &theta);
    let mut mu = 1e-3;
    record_work!("nonlinear.jacobian_allocations", 1);
    record_work!("nonlinear.solver_buffer_sets", 1);
    let mut j = Matrix::zeros(request.x.len(), p);
    let mut r = vec![0.0; request.x.len()];
    let mut jtj = vec![vec![0.0; p]; p];
    let mut jtr = vec![0.0; p];
    let mut damped = jtj.clone();
    let mut trial = vec![0.0; p];
    for iteration in 0..MAX_ITERATIONS {
        if !budget.charge(2 * rows) {
            return (theta, sse, false, iteration);
        }
        record_work!("nonlinear.lm_iterations", 1);
        jacobian_into(request, &theta, &mut j);
        for ((residual, &s), &y) in r.iter_mut().zip(&request.x).zip(&request.y) {
            *residual = y - predict(request.model, &theta, s);
        }
        for row in &mut jtj {
            row.fill(0.0);
        }
        jtr.fill(0.0);
        for (row, ri) in r.iter().enumerate() {
            for a in 0..p {
                jtr[a] += j[(row, a)] * ri;
                for b in 0..p {
                    jtj[a][b] += j[(row, a)] * j[(row, b)];
                }
            }
        }
        let projected_gradient = (0..p)
            .filter(|i| fixed.is_none_or(|(f, _)| f != *i))
            .map(|i| {
                let g = if (theta[i] <= bounds.lower[i] && jtr[i] < 0.0)
                    || (theta[i] >= bounds.upper[i] && jtr[i] > 0.0)
                {
                    0.0
                } else {
                    jtr[i]
                };
                g.abs() / (jtj[i][i].sqrt() * sse.sqrt()).max(1e-100)
            })
            .fold(0.0_f64, f64::max);
        if projected_gradient < 1e-8 || sse < 1e-28 {
            return (theta, sse, true, iteration + 1);
        }
        if let Some((i, _)) = fixed {
            jtj[i].fill(0.0);
            for row in &mut jtj {
                row[i] = 0.0;
            }
            jtj[i][i] = 1.0;
            jtr[i] = 0.0;
        }
        let mut improved = false;
        for _ in 0..30 {
            damped.clone_from(&jtj);
            for a in 0..p {
                damped[a][a] += mu * jtj[a][a].max(1e-12);
            }
            let Some(step) = solve_spd(&damped, &jtr) else {
                mu *= 10.0;
                continue;
            };
            for ((value, t), d) in trial.iter_mut().zip(&theta).zip(&step) {
                *value = t + d;
            }
            clamp(&mut trial, bounds);
            if let Some((i, value)) = fixed {
                trial[i] = value;
            }
            if !budget.charge(rows) {
                return (theta, sse, false, iteration + 1);
            }
            let trial_sse = residual_sum(request, &trial);
            if trial_sse.is_finite() && trial_sse < sse {
                let reduction = (sse - trial_sse) / sse.max(1e-300);
                let moved = trial
                    .iter()
                    .zip(&theta)
                    .map(|(a, b)| ((a - b) / (b.abs() + 1e-12)).abs())
                    .fold(0.0_f64, f64::max);
                std::mem::swap(&mut theta, &mut trial);
                sse = trial_sse;
                mu = (mu / 5.0).max(1e-12);
                improved = true;
                if reduction < 1e-13 && moved < 1e-9 {
                    return (theta, sse, true, iteration + 1);
                }
                break;
            }
            mu *= 5.0;
        }
        if !improved {
            // Failure to decrease alone does not certify convergence.
            return (theta, sse, projected_gradient < 1e-6, iteration + 1);
        }
    }
    (theta, sse, false, MAX_ITERATIONS)
}

/// Inícios automáticos a partir dos dados.
pub(super) fn starts(request: &NonlinearRequest) -> Vec<Vec<f64>> {
    record_work!("nonlinear.start_preparations", 1);
    let y_max = request.y.iter().copied().fold(f64::MIN, f64::max).max(1e-9);
    let s_max = request.x.iter().copied().fold(f64::MIN, f64::max).max(1e-9);
    let mut sorted = request.x.clone();
    sorted.sort_by(f64::total_cmp);
    let s_mid = sorted[sorted.len() / 2].max(1e-9);
    let mut out = Vec::new();
    for ya in [1.0, 1.5, 3.0] {
        for sb in [s_mid * 0.25, s_mid, s_max, s_max * 4.0] {
            let a = y_max * ya;
            out.push(match request.model {
                SaturationModel::Monod => vec![a, sb],
                SaturationModel::Haldane => vec![a * 2.0, sb, s_max * 2.0],
                SaturationModel::Hill => vec![a, sb, 1.0],
            });
            if request.model == SaturationModel::Hill {
                out.push(vec![a, sb, 2.0]);
            }
            if request.model == SaturationModel::Haldane {
                out.push(vec![a * 2.0, sb, s_max * 10.0]);
            }
        }
    }
    out
}
