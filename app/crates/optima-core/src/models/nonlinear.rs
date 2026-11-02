//! Ajuste **não linear** por mínimos quadrados (Levenberg–Marquardt com limites): modelos de
//! saturação de uma variável `S` (substrato): **Monod / Michaelis–Menten**, **Haldane (Andrews)** e
//! **Hill**.
//!
//! - Monod: `y = a·S/(b + S)` (`a = μmax`, `b = Ks`; em enzimologia, `Vmax` e `Km`).
//! - Haldane: `y = a·S/(b + S + S²/c)` (inibição pelo substrato, `c = Ki`).
//! - Hill: `y = a·S^n/(bⁿ + Sⁿ)` (`b` = `K`, `n` = coeficiente de Hill).
//!
//! **Algoritmo.** Jacobiana analítica; passo `(JᵀJ + μ·diag(JᵀJ))δ = Jᵀr` por Cholesky, com `μ`
//! ajustado pela razão entre a redução real e a prevista; projeção nos limites; parada por redução
//! relativa da soma de quadrados < 1e-12 com passo pequeno, ou 500 iterações (**não convergência
//! explícita**). Sem valores iniciais, **vários inícios** deterministas (grade a partir dos dados);
//! vence a menor soma de quadrados e o resultado informa em quantos inícios ela foi alcançada.
//! **Incerteza.** `σ̂² = SQR/(n − p)`, `Cov = σ̂²(JᵀJ)⁻¹`; erros-padrão, `t`, valores-p e intervalos
//! de Wald com `n − p` graus de liberdade (não por verossimilhança perfilada), correlação entre
//! parâmetros e **diagnóstico de identificabilidade** (condição de `J` com colunas normalizadas,
//! correlações próximas de ±1, parâmetros nos limites, erros-padrão enormes). A curva ajustada traz
//! faixa de confiança pelo método delta.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::student_t;
use crate::errors::CoreError;
use crate::inference::intervals::t_critical;
use crate::numeric::{Matrix, svd};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "nonlinear_saturation_fit";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Máximo de iterações de Levenberg–Marquardt por início.
const MAX_ITERATIONS: usize = 500;
/// Pontos da curva ajustada.
pub const CURVE_POINTS: usize = 80;

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
    fn names(self) -> &'static [&'static str] {
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
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn warning(code: &str) -> Issue {
    Issue::new(code, Severity::Warning)
}

fn finite_or(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}

/// `f(S; θ)`.
fn predict(model: SaturationModel, theta: &[f64], s: f64) -> f64 {
    match model {
        SaturationModel::Monod => theta[0] * s / (theta[1] + s),
        SaturationModel::Haldane => theta[0] * s / (theta[1] + s + s * s / theta[2]),
        SaturationModel::Hill => {
            let (u, w) = (s.powf(theta[2]), theta[1].powf(theta[2]));
            theta[0] * u / (w + u)
        }
    }
}

/// Gradiente de `f` em relação aos parâmetros.
fn gradient(model: SaturationModel, theta: &[f64], s: f64) -> Vec<f64> {
    match model {
        SaturationModel::Monod => {
            let d = theta[1] + s;
            vec![s / d, -theta[0] * s / (d * d)]
        }
        SaturationModel::Haldane => {
            let d = theta[1] + s + s * s / theta[2];
            vec![
                s / d,
                -theta[0] * s / (d * d),
                theta[0] * s * s * s / (theta[2] * theta[2] * d * d),
            ]
        }
        SaturationModel::Hill => {
            let (a, b, n) = (theta[0], theta[1], theta[2]);
            let (u, w) = (s.powf(n), b.powf(n));
            let d = u + w;
            let ln_ratio = if s > 0.0 { s.ln() - b.ln() } else { 0.0 };
            vec![
                u / d,
                -a * u * n * b.powf(n - 1.0) / (d * d),
                if s > 0.0 {
                    a * u * w * ln_ratio / (d * d)
                } else {
                    0.0
                },
            ]
        }
    }
}

fn residual_sum(request: &NonlinearRequest, theta: &[f64]) -> f64 {
    request
        .x
        .iter()
        .zip(&request.y)
        .map(|(&s, &y)| {
            let r = y - predict(request.model, theta, s);
            r * r
        })
        .sum()
}

fn jacobian(request: &NonlinearRequest, theta: &[f64]) -> Matrix {
    let rows: Vec<Vec<f64>> = request
        .x
        .iter()
        .map(|&s| gradient(request.model, theta, s))
        .collect();
    Matrix::from_rows(&rows).unwrap_or_else(|| Matrix::zeros(request.x.len(), theta.len()))
}

/// Resolve o sistema simétrico positivo definido (Cholesky); `None` se não for definido positivo.
fn solve_spd(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>> {
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

fn inverse_spd(a: &[Vec<f64>]) -> Option<Vec<Vec<f64>>> {
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

struct Bounds {
    lower: Vec<f64>,
    upper: Vec<f64>,
}

fn clamp(theta: &mut [f64], bounds: &Bounds) {
    for (i, v) in theta.iter_mut().enumerate() {
        *v = v.clamp(bounds.lower[i], bounds.upper[i]);
    }
}

/// Levenberg–Marquardt projetado a partir de `start`.
fn levenberg_marquardt(
    request: &NonlinearRequest,
    bounds: &Bounds,
    start: &[f64],
) -> (Vec<f64>, f64, bool, usize) {
    let p = start.len();
    let mut theta = start.to_vec();
    clamp(&mut theta, bounds);
    let mut sse = residual_sum(request, &theta);
    let mut mu = 1e-3;
    for iteration in 0..MAX_ITERATIONS {
        let j = jacobian(request, &theta);
        let r: Vec<f64> = request
            .x
            .iter()
            .zip(&request.y)
            .map(|(&s, &y)| y - predict(request.model, &theta, s))
            .collect();
        let mut jtj = vec![vec![0.0; p]; p];
        let mut jtr = vec![0.0; p];
        for (row, ri) in r.iter().enumerate() {
            for a in 0..p {
                jtr[a] += j[(row, a)] * ri;
                for b in 0..p {
                    jtj[a][b] += j[(row, a)] * j[(row, b)];
                }
            }
        }
        let mut improved = false;
        for _ in 0..30 {
            let mut damped = jtj.clone();
            for a in 0..p {
                damped[a][a] += mu * jtj[a][a].max(1e-12);
            }
            let Some(step) = solve_spd(&damped, &jtr) else {
                mu *= 10.0;
                continue;
            };
            let mut trial: Vec<f64> = theta.iter().zip(&step).map(|(t, d)| t + d).collect();
            clamp(&mut trial, bounds);
            let trial_sse = residual_sum(request, &trial);
            if trial_sse.is_finite() && trial_sse < sse {
                let reduction = (sse - trial_sse) / sse.max(1e-300);
                let moved = trial
                    .iter()
                    .zip(&theta)
                    .map(|(a, b)| ((a - b) / (b.abs() + 1e-12)).abs())
                    .fold(0.0_f64, f64::max);
                theta = trial;
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
            // Nenhum passo reduz a soma de quadrados: ponto estacionário (ou limite).
            return (theta, sse, true, iteration + 1);
        }
    }
    (theta, sse, false, MAX_ITERATIONS)
}

/// Inícios automáticos a partir dos dados.
fn starts(request: &NonlinearRequest) -> Vec<Vec<f64>> {
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

fn validate(request: &NonlinearRequest) -> Vec<Issue> {
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
    issues
}

/// Ajusta o modelo de saturação.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados inválidos ou quando nenhum início produz um ajuste.
pub fn fit(request: &NonlinearRequest) -> Result<NonlinearResult, CoreError> {
    let issues = validate(request);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let model = request.model;
    let p = model.names().len();
    let n = request.x.len();
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
        .map(|s| levenberg_marquardt(request, &bounds, s))
        .filter(|(_, sse, _, _)| sse.is_finite())
        .collect();
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
    let starts_run = reached + runs.len();

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
                std_error: finite_or(se),
                t_value: finite_or(t),
                p_value: finite_or((2.0 * student_t::sf(t.abs(), df)).min(1.0)),
                ci_lower: finite_or(theta[i] - crit * se),
                ci_upper: finite_or(theta[i] + crit * se),
                at_bound: (theta[i] - bounds.lower[i]).abs() <= 1e-9 * (1.0 + theta[i].abs())
                    || (theta[i] - bounds.upper[i]).abs() <= 1e-9 * (1.0 + theta[i].abs()),
            }
        })
        .collect();

    let correlation: Vec<Vec<f64>> = covariance.as_ref().map_or_else(Vec::new, |c| {
        (0..p)
            .map(|a| {
                (0..p)
                    .map(|b| c[a][b] / (c[a][a] * c[b][b]).sqrt())
                    .collect()
            })
            .collect()
    });
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
    if covariance.is_none() || condition > 1e8 {
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
            .is_none_or(|s| s > 10.0 * q.estimate.abs().max(1e-12))
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
                lower: finite_or(lower),
                upper: finite_or(upper),
            }
        })
        .collect();

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
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn request(model: SaturationModel, x: &[f64], y: &[f64]) -> NonlinearRequest {
        NonlinearRequest {
            x: x.to_vec(),
            y: y.to_vec(),
            model,
            initial: None,
            lower: None,
            upper: None,
            alpha: 0.05,
        }
    }

    #[test]
    fn a_noise_free_monod_curve_is_recovered_exactly() {
        let x = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
        let y: Vec<f64> = x.iter().map(|s| 3.0 * s / (2.5 + s)).collect();
        let r = fit(&request(SaturationModel::Monod, &x, &y)).expect("ajuste");
        assert!(r.converged);
        assert!((r.parameters[0].estimate - 3.0).abs() < 1e-6);
        assert!((r.parameters[1].estimate - 2.5).abs() < 1e-6);
        assert!(r.sse < 1e-12);
        assert_eq!(r.curve.len(), CURVE_POINTS);
    }

    #[test]
    fn haldane_and_hill_recover_known_parameters() {
        let x = [0.2, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0];
        let yh: Vec<f64> = x
            .iter()
            .map(|s| 5.0 * s / (3.0 + s + s * s / 40.0))
            .collect();
        let h = fit(&request(SaturationModel::Haldane, &x, &yh)).expect("haldane");
        assert!((h.parameters[0].estimate - 5.0).abs() < 1e-4);
        assert!((h.parameters[1].estimate - 3.0).abs() < 1e-4);
        assert!((h.parameters[2].estimate - 40.0).abs() < 1e-2);
        let yn: Vec<f64> = x
            .iter()
            .map(|s| 4.0 * s.powf(2.0) / (6.0_f64.powf(2.0) + s.powf(2.0)))
            .collect();
        let n = fit(&request(SaturationModel::Hill, &x, &yn)).expect("hill");
        assert!((n.parameters[0].estimate - 4.0).abs() < 1e-5);
        assert!((n.parameters[1].estimate - 6.0).abs() < 1e-5);
        assert!((n.parameters[2].estimate - 2.0).abs() < 1e-5);
    }

    #[test]
    fn a_narrow_substrate_range_is_flagged_as_poorly_identifiable() {
        // S muito menor que Ks: a curva é quase uma reta e a e b ficam fortemente correlacionados.
        let x = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
        let y = [0.049, 0.101, 0.148, 0.205, 0.247, 0.302];
        let r = fit(&request(SaturationModel::Monod, &x, &y)).expect("ajuste");
        assert!(
            r.issues
                .iter()
                .any(|i| i.code == "nonlinear.highly_correlated"
                    || i.code == "nonlinear.ill_conditioned"
                    || i.code == "nonlinear.imprecise_parameter")
        );
    }

    #[test]
    fn invalid_requests_are_refused() {
        assert!(fit(&request(SaturationModel::Monod, &[1.0, 2.0], &[1.0, 2.0])).is_err());
        assert!(
            fit(&request(
                SaturationModel::Monod,
                &[1.0, -2.0, 3.0],
                &[1.0, 2.0, 3.0]
            ))
            .is_err()
        );
        assert!(
            fit(&request(
                SaturationModel::Hill,
                &[0.0, 1.0, 2.0, 3.0],
                &[1.0; 4]
            ))
            .is_err()
        );
        let mut bad = request(
            SaturationModel::Monod,
            &[1.0, 2.0, 3.0, 4.0],
            &[1.0, 2.0, 2.5, 2.8],
        );
        bad.initial = Some(vec![1.0]);
        assert!(fit(&bad).is_err());
    }
}
