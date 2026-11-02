//! Modelo linear **misto** com **intercepto aleatório por unidade experimental**, estimado por
//! **REML**: `y = Xβ + Zu + ε`, `u ~ N(0, σᵤ² I)`, `ε ~ N(0, σₑ² I)`.
//!
//! Cobre medidas repetidas da mesma unidade (estrutura de **simetria composta**), lotes, dias e
//! operadores como efeito aleatório. A unidade vem de `Observation::unit_id`.
//!
//! **Estimação.** Com `λ = σᵤ²/σₑ²`, cada grupo `g` de `nᵍ` observações tem
//! `V₀⁻¹ = I − (λ/(1 + nᵍλ))·11ᵀ`. Os termos de `XᵀWX`, `XᵀWy` e `yᵀWy` saem de somas por grupo, sem
//! formar `Z`. O REML perfilado em `λ` é `−½[(n − p)·ln σ̂ₑ² + Σ ln(1 + nᵍλ) + ln|XᵀWX|]`, maximizado
//! por busca em grade logarítmica e refinamento por seção áurea, com o limite `λ = 0` examinado à parte
//! (variância de unidade na fronteira → modelo sem efeito aleatório, informado).
//! **Inferência.** `β̂ = (XᵀWX)⁻¹XᵀWy`, `Var(β̂) = σₑ²(XᵀWX)⁻¹`; graus de liberdade de
//! **Satterthwaite** por coeficiente, `ν = 2·Var²/(gᵀAg)`, com `g` o gradiente de `Var(β̂ⱼ)` em
//! `θ = (σᵤ², σₑ²)` e `A` a inversa da informação observada do REML (derivadas numéricas). Em
//! dados balanceados coincide com os graus de liberdade exatos da ANOVA de medidas repetidas.
//! **Previsão dos efeitos aleatórios (BLUP):** `ûᵍ = λ/(1 + nᵍλ)·Σᵢ∈g (yᵢ − xᵢβ̂)`.
//!
//! Estruturas de covariância além da simetria composta (AR(1), não estruturada) e vários efeitos
//! aleatórios **não** estão nesta versão.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::design_matrix::{ExcludedObservation, build};
use super::terms::ModelSpec;
use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::student_t;
use crate::domain::Dataset;
use crate::errors::CoreError;
use crate::inference::intervals::t_critical;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "linear_mixed_model";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// `λ` abaixo do qual a variância da unidade é considerada nula.
const BOUNDARY: f64 = 1e-8;

/// Solicitação: dados (com a unidade experimental de cada observação) e efeitos fixos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedModelRequest {
    /// Dados; toda observação usada precisa ter `unit_id`.
    pub dataset: Dataset,
    /// Resposta, termos dos efeitos fixos, codificação e nível de confiança.
    pub spec: ModelSpec,
}

/// Coeficiente dos efeitos fixos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedCoefficient {
    /// Rótulo da coluna.
    pub label: String,
    /// Estimativa.
    pub estimate: f64,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Graus de liberdade (Satterthwaite).
    pub df: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do intervalo de confiança.
    pub ci_lower: Stat,
    /// Limite superior do intervalo de confiança.
    pub ci_upper: Stat,
}

/// Efeito aleatório previsto (BLUP) de uma unidade.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RandomEffect {
    /// Unidade experimental.
    pub unit: String,
    /// Observações da unidade usadas no ajuste.
    pub observations: u32,
    /// Efeito previsto.
    pub blup: f64,
}

/// Resultado do ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedModelResult {
    /// Observações usadas.
    pub n_observations: u32,
    /// Unidades (grupos).
    pub n_groups: u32,
    /// Efeitos fixos.
    pub coefficients: Vec<MixedCoefficient>,
    /// Variância entre unidades `σᵤ²`.
    pub variance_unit: Stat,
    /// Variância residual `σₑ²`.
    pub variance_residual: Stat,
    /// Correlação intraclasse `σᵤ²/(σᵤ² + σₑ²)`.
    pub icc: Stat,
    /// `σᵤ²` na fronteira (zero): o modelo se reduz ao sem efeito aleatório.
    pub boundary: bool,
    /// Valor do REML perfilado (sem constantes) no ótimo.
    pub reml_profile: f64,
    /// Efeitos aleatórios previstos.
    pub random_effects: Vec<RandomEffect>,
    /// Observações fora do ajuste.
    pub excluded: Vec<ExcludedObservation>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn finite_or(value: f64, reason: UndefinedReason) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(reason)
    }
}

struct Data {
    rows: Vec<Vec<f64>>,
    y: Vec<f64>,
    groups: Vec<Vec<usize>>,
    p: usize,
}

struct Solution {
    beta: Vec<f64>,
    /// `(XᵀWX)⁻¹`, plana.
    inverse: Vec<f64>,
    log_det: f64,
    rss: f64,
}

fn cholesky_inverse(a: &[f64], p: usize) -> Option<(Vec<f64>, f64)> {
    let mut l = vec![0.0; p * p];
    for i in 0..p {
        for j in 0..=i {
            let mut sum = a[i * p + j];
            for k in 0..j {
                sum -= l[i * p + k] * l[j * p + k];
            }
            if i == j {
                if sum <= 1e-12 * (1.0 + a[i * p + i].abs()) {
                    return None;
                }
                l[i * p + i] = sum.sqrt();
            } else {
                l[i * p + j] = sum / l[j * p + j];
            }
        }
    }
    let log_det = 2.0 * (0..p).map(|i| l[i * p + i].ln()).sum::<f64>();
    let mut inv = vec![0.0; p * p];
    for col in 0..p {
        let mut y = vec![0.0; p];
        for i in 0..p {
            let mut s = f64::from(u8::from(i == col));
            for k in 0..i {
                s -= l[i * p + k] * y[k];
            }
            y[i] = s / l[i * p + i];
        }
        for i in (0..p).rev() {
            let mut s = y[i];
            for k in (i + 1)..p {
                s -= l[k * p + i] * inv[k * p + col];
            }
            inv[i * p + col] = s / l[i * p + i];
        }
    }
    Some((inv, log_det))
}

/// Soluciona o sistema ponderado para um `λ`.
fn solve(data: &Data, lambda: f64) -> Option<Solution> {
    let p = data.p;
    let mut xtwx = vec![0.0; p * p];
    let mut xtwy = vec![0.0; p];
    let mut ytwy = 0.0;
    for group in &data.groups {
        let n = group.len() as f64;
        let k = lambda / (1.0 + n * lambda);
        let mut s = vec![0.0; p];
        let mut t = 0.0;
        for &r in group {
            let row = &data.rows[r];
            for i in 0..p {
                s[i] += row[i];
                for j in 0..p {
                    xtwx[i * p + j] += row[i] * row[j];
                }
                xtwy[i] += row[i] * data.y[r];
            }
            t += data.y[r];
            ytwy += data.y[r] * data.y[r];
        }
        for i in 0..p {
            for j in 0..p {
                xtwx[i * p + j] -= k * s[i] * s[j];
            }
            xtwy[i] -= k * s[i] * t;
        }
        ytwy -= k * t * t;
    }
    let (inverse, log_det) = cholesky_inverse(&xtwx, p)?;
    let beta: Vec<f64> = (0..p)
        .map(|i| (0..p).map(|j| inverse[i * p + j] * xtwy[j]).sum())
        .collect();
    let rss = ytwy - beta.iter().zip(&xtwy).map(|(b, v)| b * v).sum::<f64>();
    Some(Solution {
        beta,
        inverse,
        log_det,
        rss,
    })
}

fn log_det_v0(data: &Data, lambda: f64) -> f64 {
    data.groups
        .iter()
        .map(|g| (1.0 + g.len() as f64 * lambda).ln())
        .sum()
}

/// REML perfilado em `λ`: `(valor, σₑ²)`.
fn profile(data: &Data, lambda: f64) -> Option<(f64, f64)> {
    let s = solve(data, lambda)?;
    let df = (data.y.len() - data.p) as f64;
    let sigma2 = s.rss / df;
    if !(sigma2.is_finite() && sigma2 > 0.0) {
        return None;
    }
    Some((
        -0.5 * (df * sigma2.ln() + log_det_v0(data, lambda) + s.log_det),
        sigma2,
    ))
}

/// REML em `θ = (σᵤ², σₑ²)` (sem constantes).
fn reml_theta(data: &Data, su: f64, se: f64) -> Option<f64> {
    if se <= 0.0 || su < 0.0 {
        return None;
    }
    let lambda = su / se;
    let s = solve(data, lambda)?;
    let df = (data.y.len() - data.p) as f64;
    Some(-0.5 * (df * se.ln() + log_det_v0(data, lambda) + s.log_det + s.rss / se))
}

fn optimize(data: &Data) -> Option<f64> {
    let mut best: Option<(f64, f64)> = profile(data, 0.0).map(|(v, _)| (v, 0.0));
    // Grade logarítmica de λ e refinamento por seção áurea em torno do melhor ponto.
    let grid: Vec<f64> = (0..=240)
        .map(|i| 10.0_f64.powf(-8.0 + 16.0 * f64::from(i) / 240.0))
        .collect();
    let mut best_index: Option<usize> = None;
    for (i, &lambda) in grid.iter().enumerate() {
        if let Some((v, _)) = profile(data, lambda)
            && best.is_none_or(|(b, _)| v > b)
        {
            best = Some((v, lambda));
            best_index = Some(i);
        }
    }
    let (_, mut lambda) = best?;
    if let Some(i) = best_index {
        let lo = grid[i.saturating_sub(1)].ln();
        let hi = grid[(i + 1).min(grid.len() - 1)].ln();
        let (mut a, mut b) = (lo, hi);
        let phi = (5.0_f64.sqrt() - 1.0) / 2.0;
        for _ in 0..80 {
            let c = b - phi * (b - a);
            let d = a + phi * (b - a);
            let fc = profile(data, c.exp()).map_or(f64::NEG_INFINITY, |v| v.0);
            let fd = profile(data, d.exp()).map_or(f64::NEG_INFINITY, |v| v.0);
            if fc > fd {
                b = d;
            } else {
                a = c;
            }
        }
        let refined = ((a + b) / 2.0).exp();
        if let (Some(r), Some(prev)) = (profile(data, refined), profile(data, lambda))
            && r.0 >= prev.0
        {
            lambda = refined;
        }
    }
    Some(lambda)
}

/// Variância de `β̂ⱼ` em `θ`.
fn var_beta(data: &Data, su: f64, se: f64, j: usize) -> Option<f64> {
    let s = solve(data, su / se)?;
    Some(se * s.inverse[j * data.p + j])
}

/// Graus de liberdade de Satterthwaite do coeficiente `j`.
fn satterthwaite(data: &Data, su: f64, se: f64, j: usize) -> Option<f64> {
    let hu = 1e-3 * su;
    let he = 1e-3 * se;
    // gradiente de Var(β̂ⱼ)
    let g = [
        (var_beta(data, su + hu, se, j)? - var_beta(data, su - hu, se, j)?) / (2.0 * hu),
        (var_beta(data, su, se + he, j)? - var_beta(data, su, se - he, j)?) / (2.0 * he),
    ];
    // Hessiana do REML por diferenças centrais.
    let f = |u: f64, e: f64| reml_theta(data, u, e);
    let f0 = f(su, se)?;
    let huu = (f(su + hu, se)? - 2.0 * f0 + f(su - hu, se)?) / (hu * hu);
    let hee = (f(su, se + he)? - 2.0 * f0 + f(su, se - he)?) / (he * he);
    let hue = (f(su + hu, se + he)? - f(su + hu, se - he)? - f(su - hu, se + he)?
        + f(su - hu, se - he)?)
        / (4.0 * hu * he);
    // informação observada = −Hessiana; A = informação⁻¹
    let (i11, i12, i22) = (-huu, -hue, -hee);
    let det = i11 * i22 - i12 * i12;
    if det <= 0.0 || !det.is_finite() {
        return None;
    }
    let a = [[i22 / det, -i12 / det], [-i12 / det, i11 / det]];
    let quad = g[0] * (a[0][0] * g[0] + a[0][1] * g[1]) + g[1] * (a[1][0] * g[0] + a[1][1] * g[1]);
    let variance = var_beta(data, su, se, j)?;
    let df = 2.0 * variance * variance / quad;
    (quad > 0.0 && df.is_finite() && df > 0.0).then_some(df)
}

/// Ajusta o modelo misto.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados inválidos, observações sem unidade, menos de duas unidades,
/// matriz de efeitos fixos sem posto completo ou ajuste impossível.
pub fn fit(request: &MixedModelRequest) -> Result<MixedModelResult, CoreError> {
    let design = build(&request.dataset, &request.spec).map_err(CoreError::InvalidInput)?;
    let n = design.y.len();
    let p = design.x.cols();
    let by_id: BTreeMap<&str, Option<&str>> = request
        .dataset
        .observations
        .iter()
        .map(|o| (o.id.as_str(), o.unit_id.as_ref().map(|u| u.as_str())))
        .collect();
    let mut units: Vec<String> = Vec::new();
    let mut group_of: Vec<usize> = Vec::with_capacity(n);
    let mut missing = 0_usize;
    for id in &design.observation_ids {
        match by_id.get(id.as_str()).copied().flatten() {
            Some(unit) => {
                let index = units.iter().position(|u| u == unit).unwrap_or_else(|| {
                    units.push(unit.to_string());
                    units.len() - 1
                });
                group_of.push(index);
            }
            None => {
                missing += 1;
                group_of.push(usize::MAX);
            }
        }
    }
    let mut issues = Vec::new();
    if missing > 0 {
        issues.push(error("mixed.missing_unit").with_param("count", &missing));
    }
    if units.len() < 2 {
        issues.push(error("mixed.too_few_units").with_param("count", &units.len()));
    }
    if n <= p + 1 {
        issues.push(
            error("mixed.too_few_observations")
                .with_param("observations", &n)
                .with_param("parameters", &p),
        );
    }
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let mut groups: Vec<Vec<usize>> = vec![Vec::new(); units.len()];
    for (row, &g) in group_of.iter().enumerate() {
        groups[g].push(row);
    }
    if groups.iter().all(|g| g.len() == 1) {
        return Err(CoreError::InvalidInput(vec![error(
            "mixed.no_repeated_units",
        )]));
    }
    let data = Data {
        rows: (0..n)
            .map(|i| (0..p).map(|j| design.x[(i, j)]).collect())
            .collect(),
        y: design.y.clone(),
        groups,
        p,
    };

    let lambda = optimize(&data)
        .ok_or_else(|| CoreError::InvalidInput(vec![error("model.rank_deficient")]))?;
    let boundary = lambda < BOUNDARY;
    let lambda = if boundary { 0.0 } else { lambda };
    let (reml, se) = profile(&data, lambda)
        .ok_or_else(|| CoreError::InvalidInput(vec![error("model.rank_deficient")]))?;
    let su = lambda * se;
    let solution = solve(&data, lambda)
        .ok_or_else(|| CoreError::InvalidInput(vec![error("model.rank_deficient")]))?;

    let level = request.spec.confidence_level;
    let mut fallback_df = false;
    let coefficients: Vec<MixedCoefficient> = (0..p)
        .map(|j| {
            let variance = se * solution.inverse[j * p + j];
            let std_error = variance.sqrt();
            let df = if boundary {
                Some((n - p) as f64)
            } else {
                satterthwaite(&data, su, se, j)
            };
            let df_value = df.unwrap_or_else(|| {
                fallback_df = true;
                (n - p) as f64
            });
            let estimate = solution.beta[j];
            let t = estimate / std_error;
            let crit = t_critical(level, df_value).unwrap_or(f64::NAN);
            MixedCoefficient {
                label: design.labels[j].clone(),
                estimate,
                std_error: finite_or(std_error, UndefinedReason::NonFiniteResult),
                df: finite_or(df_value, UndefinedReason::NonFiniteResult),
                t_value: finite_or(t, UndefinedReason::NonFiniteResult),
                p_value: finite_or(
                    (2.0 * student_t::sf(t.abs(), df_value)).min(1.0),
                    UndefinedReason::NonFiniteResult,
                ),
                ci_lower: finite_or(
                    estimate - crit * std_error,
                    UndefinedReason::NonFiniteResult,
                ),
                ci_upper: finite_or(
                    estimate + crit * std_error,
                    UndefinedReason::NonFiniteResult,
                ),
            }
        })
        .collect();
    if boundary {
        issues.push(Issue::new("mixed.boundary_variance", Severity::Warning));
    }
    if fallback_df {
        issues.push(Issue::new("mixed.df_fallback", Severity::Warning));
    }
    let sizes: Vec<usize> = data.groups.iter().map(Vec::len).collect();
    if sizes.iter().min() != sizes.iter().max() {
        issues.push(Issue::new("mixed.unbalanced", Severity::Info));
    }

    // BLUP de cada unidade.
    let random_effects: Vec<RandomEffect> = data
        .groups
        .iter()
        .enumerate()
        .map(|(g, rows)| {
            let k = lambda / (1.0 + rows.len() as f64 * lambda);
            let residual_sum: f64 = rows
                .iter()
                .map(|&r| {
                    data.y[r]
                        - data.rows[r]
                            .iter()
                            .zip(&solution.beta)
                            .map(|(x, b)| x * b)
                            .sum::<f64>()
                })
                .sum();
            RandomEffect {
                unit: units[g].clone(),
                observations: u32::try_from(rows.len()).unwrap_or(u32::MAX),
                blup: k * residual_sum,
            }
        })
        .collect();

    Ok(MixedModelResult {
        n_observations: u32::try_from(n).unwrap_or(u32::MAX),
        n_groups: u32::try_from(units.len()).unwrap_or(u32::MAX),
        coefficients,
        variance_unit: Stat::finite(su),
        variance_residual: Stat::finite(se),
        icc: finite_or(su / (su + se), UndefinedReason::NonFiniteResult),
        boundary,
        reml_profile: reml,
        random_effects,
        excluded: design.excluded,
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
