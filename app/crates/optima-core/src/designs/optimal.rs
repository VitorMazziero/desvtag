//! Planejamentos **D-ótimos e I-ótimos** por troca de Fedorov sobre um conjunto candidato, com
//! restrições lineares entre os fatores e **ampliação sequencial** (ensaios já realizados
//! permanecem no planejamento e entram na matriz de informação).
//!
//! **Modelo** em fatores codificados em `[−1, 1]`: linear (`1 + xᵢ`), com interações de dois
//! fatores (`+ xᵢxⱼ`) ou quadrático completo (`+ xᵢ²`). **Candidatos:** malha de `levels` níveis por
//! fator (3 ou 5), filtrada por restrições `Σ aᵢ·xᵢ ≤ b` em unidades reais.
//! **Critérios** (com `M = XᵀX`): D maximiza `ln|M|`; I minimiza `tr(M⁻¹W)`, com `W` o momento médio
//! `xxᵀ` sobre os candidatos (variância média de predição na região).
//!
//! **Troca.** Para cada ensaio livre `o` e cada candidato `c`, o valor do critério após trocar `o`
//! por `c` sai de atualizações de posto 1 de `M⁻¹` (identidade do determinante e de
//! Sherman–Morrison), sem refatorar a matriz a cada tentativa. A melhor troca que melhora o critério
//! é aplicada e a busca repete até não haver melhora. Vários inícios aleatórios (PCG32, semente
//! registrada) reduzem o risco de ótimo local; **não há garantia de ótimo global**.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::randomization::{ALGORITHM, permutation};
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "optimal_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Máximo de fatores.
pub const MAX_FACTORS: usize = 5;
/// Máximo de candidatos depois do filtro.
pub const MAX_CANDIDATES: usize = 1500;
/// Máximo de ensaios (livres + fixos).
pub const MAX_RUNS: u32 = 60;
/// Máximo de inícios.
pub const MAX_STARTS: u32 = 50;
/// Máximo de passagens de troca por início.
const MAX_PASSES: usize = 60;

/// Modelo a estimar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum OptimalModel {
    /// Intercepto e efeitos principais.
    Linear,
    /// Linear mais interações de dois fatores.
    Interactions,
    /// Interações e termos quadráticos.
    Quadratic,
}

/// Critério de otimalidade.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum OptimalCriterion {
    /// D: maximiza `ln|XᵀX|`.
    D,
    /// I: minimiza a variância média de predição na região.
    I,
}

/// Fator quantitativo com faixa.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalFactor {
    /// Identificador do fator no experimento.
    pub id: StableId,
    /// Nome do fator.
    pub name: String,
    /// Limite inferior (unidade real).
    pub low: f64,
    /// Limite superior (unidade real).
    pub high: f64,
}

/// Restrição linear `Σ coeficienteᵢ · xᵢ ≤ limite` em unidades reais.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LinearConstraint {
    /// Coeficiente de cada fator (mesma ordem de `factors`).
    pub coefficients: Vec<f64>,
    /// Limite superior da combinação.
    pub upper: f64,
}

/// Especificação do planejamento ótimo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalSpec {
    /// Fatores (1 a 5).
    pub factors: Vec<OptimalFactor>,
    /// Modelo.
    pub model: OptimalModel,
    /// Critério.
    pub criterion: OptimalCriterion,
    /// Total de ensaios, **incluindo** os já realizados.
    pub runs: u32,
    /// Níveis por fator na malha de candidatos (3 ou 5).
    pub levels: u32,
    /// Restrições lineares.
    pub constraints: Vec<LinearConstraint>,
    /// Ensaios já realizados (unidades reais, mesma ordem dos fatores), mantidos no planejamento.
    pub fixed_runs: Vec<Vec<f64>>,
    /// Inícios aleatórios (1 a 50).
    pub starts: u32,
    /// Aleatorizar a ordem de execução dos ensaios novos.
    pub randomize: bool,
    /// Semente (inteiro de até 2⁵³ − 1 na interface).
    #[ts(type = "number")]
    pub seed: u64,
}

/// Um ensaio do resultado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalRun {
    /// Posição (1-based): primeiro os já realizados, depois os novos.
    pub run: u32,
    /// Já realizado (mantido).
    pub fixed: bool,
    /// Níveis em unidades reais.
    pub real: Vec<f64>,
    /// Níveis codificados.
    pub coded: Vec<f64>,
}

/// Valores dos critérios para um planejamento.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalMetrics {
    /// Número de parâmetros do modelo.
    pub parameters: u32,
    /// `ln|XᵀX|`; indefinido (`null`) se a matriz for singular.
    pub log_det: Option<f64>,
    /// Eficiência D por ensaio: `|XᵀX|^(1/p) / n`.
    pub d_efficiency: Option<f64>,
    /// Eficiência A: `p / (n·tr((XᵀX)⁻¹))`.
    pub a_efficiency: Option<f64>,
    /// Eficiência G: `p / (n·máx d(x))` sobre os candidatos.
    pub g_efficiency: Option<f64>,
    /// Variância média de predição escalada `n·tr((XᵀX)⁻¹W)` sobre os candidatos.
    pub i_average: Option<f64>,
}

/// Planejamento gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedOptimal {
    /// Especificação usada.
    pub spec: OptimalSpec,
    /// Candidatos (depois das restrições).
    pub candidates: u32,
    /// Ensaios (já realizados primeiro).
    pub runs: Vec<OptimalRun>,
    /// Critérios do planejamento final.
    pub metrics: OptimalMetrics,
    /// Inícios executados.
    pub starts_run: u32,
    /// Inícios que chegaram ao melhor valor (a menos de 1e-9 relativo).
    pub starts_reaching_best: u32,
    /// Algoritmo.
    pub algorithm: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn parameter_count(k: usize, model: OptimalModel) -> usize {
    match model {
        OptimalModel::Linear => 1 + k,
        OptimalModel::Interactions => 1 + k + k * (k - 1) / 2,
        OptimalModel::Quadratic => 1 + 2 * k + k * (k - 1) / 2,
    }
}

/// Linha do modelo para um ponto codificado.
fn model_row(x: &[f64], model: OptimalModel) -> Vec<f64> {
    let k = x.len();
    let mut row = Vec::with_capacity(parameter_count(k, model));
    row.push(1.0);
    row.extend_from_slice(x);
    if matches!(model, OptimalModel::Interactions | OptimalModel::Quadratic) {
        for i in 0..k {
            for j in (i + 1)..k {
                row.push(x[i] * x[j]);
            }
        }
    }
    if model == OptimalModel::Quadratic {
        row.extend(x.iter().map(|v| v * v));
    }
    row
}

fn validate(spec: &OptimalSpec) -> Vec<Issue> {
    let mut issues = Vec::new();
    let k = spec.factors.len();
    if k == 0 || k > MAX_FACTORS {
        issues.push(error("design.optimal_invalid_factor_count").with_param("max", &MAX_FACTORS));
        return issues;
    }
    if spec
        .factors
        .iter()
        .any(|f| !f.low.is_finite() || !f.high.is_finite() || f.low >= f.high)
    {
        issues.push(error("design.optimal_invalid_range"));
    }
    if spec.model != OptimalModel::Linear && k < 2 && spec.model == OptimalModel::Interactions {
        issues.push(error("design.optimal_interactions_need_two"));
    }
    if !matches!(spec.levels, 3 | 5) {
        issues.push(error("design.optimal_invalid_levels"));
    }
    if spec.model == OptimalModel::Quadratic && spec.levels < 3 {
        issues.push(error("design.optimal_invalid_levels"));
    }
    if spec.starts == 0 || spec.starts > MAX_STARTS {
        issues.push(error("design.optimal_invalid_starts").with_param("max", &MAX_STARTS));
    }
    if spec.runs == 0 || spec.runs > MAX_RUNS {
        issues.push(error("design.optimal_invalid_runs").with_param("max", &MAX_RUNS));
    }
    for c in &spec.constraints {
        if c.coefficients.len() != k
            || c.coefficients.iter().any(|v| !v.is_finite())
            || !c.upper.is_finite()
        {
            issues.push(error("design.optimal_invalid_constraint"));
            break;
        }
    }
    for run in &spec.fixed_runs {
        if run.len() != k || run.iter().any(|v| !v.is_finite()) {
            issues.push(error("design.optimal_invalid_fixed_run"));
            break;
        }
    }
    if issues.is_empty() {
        let p = parameter_count(k, spec.model);
        if (spec.runs as usize) < p {
            issues.push(
                error("design.optimal_too_few_runs")
                    .with_param("runs", &spec.runs)
                    .with_param("parameters", &p),
            );
        }
        if spec.fixed_runs.len() > spec.runs as usize {
            issues.push(error("design.optimal_more_fixed_than_runs"));
        }
    }
    issues
}

fn to_coded(spec: &OptimalSpec, real: &[f64]) -> Vec<f64> {
    spec.factors
        .iter()
        .zip(real)
        .map(|(f, v)| (v - (f.low + f.high) / 2.0) / ((f.high - f.low) / 2.0))
        .collect()
}

fn to_real(spec: &OptimalSpec, coded: &[f64]) -> Vec<f64> {
    spec.factors
        .iter()
        .zip(coded)
        .map(|(f, c)| (f.low + f.high) / 2.0 + c * (f.high - f.low) / 2.0)
        .collect()
}

/// Candidatos codificados dentro das restrições.
fn candidates(spec: &OptimalSpec) -> Vec<Vec<f64>> {
    let k = spec.factors.len();
    let levels: Vec<f64> = (0..spec.levels)
        .map(|i| -1.0 + 2.0 * f64::from(i) / f64::from(spec.levels - 1))
        .collect();
    let total = levels.len().pow(u32::try_from(k).unwrap_or(1));
    let mut out = Vec::new();
    for index in 0..total {
        let mut rest = index;
        let coded: Vec<f64> = (0..k)
            .map(|_| {
                let v = levels[rest % levels.len()];
                rest /= levels.len();
                v
            })
            .collect();
        let real = to_real(spec, &coded);
        let ok = spec.constraints.iter().all(|c| {
            c.coefficients
                .iter()
                .zip(&real)
                .map(|(a, x)| a * x)
                .sum::<f64>()
                <= c.upper + 1e-9
        });
        if ok {
            out.push(coded);
        }
    }
    out
}

// --- álgebra de matrizes simétricas pequenas (planas, linha a linha) ---

fn cholesky(a: &[f64], p: usize) -> Option<Vec<f64>> {
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
    Some(l)
}

/// Inversa e `ln|A|` de uma matriz simétrica positiva definida.
fn spd_inverse(a: &[f64], p: usize) -> Option<(Vec<f64>, f64)> {
    let l = cholesky(a, p)?;
    let log_det = 2.0 * (0..p).map(|i| l[i * p + i].ln()).sum::<f64>();
    let mut inv = vec![0.0; p * p];
    for col in 0..p {
        // resolve L y = e_col e Lᵀ x = y
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

fn information(rows: &[Vec<f64>], p: usize) -> Vec<f64> {
    let mut m = vec![0.0; p * p];
    for r in rows {
        for i in 0..p {
            for j in 0..p {
                m[i * p + j] += r[i] * r[j];
            }
        }
    }
    m
}

fn mat_vec(a: &[f64], x: &[f64], p: usize) -> Vec<f64> {
    (0..p)
        .map(|i| (0..p).map(|j| a[i * p + j] * x[j]).sum())
        .collect()
}

fn quad(a: &[f64], x: &[f64], p: usize) -> f64 {
    mat_vec(a, x, p).iter().zip(x).map(|(u, v)| u * v).sum()
}

fn trace_product(a: &[f64], b: &[f64], p: usize) -> f64 {
    (0..p)
        .map(|i| (0..p).map(|j| a[i * p + j] * b[j * p + i]).sum::<f64>())
        .sum()
}

fn mat_mul(a: &[f64], b: &[f64], p: usize) -> Vec<f64> {
    let mut c = vec![0.0; p * p];
    for i in 0..p {
        for k in 0..p {
            let aik = a[i * p + k];
            for j in 0..p {
                c[i * p + j] += aik * b[k * p + j];
            }
        }
    }
    c
}

struct Region {
    /// Linhas do modelo dos candidatos.
    rows: Vec<Vec<f64>>,
    /// Momento médio `W = média de x·xᵀ`.
    moment: Vec<f64>,
}

fn region(rows: Vec<Vec<f64>>, p: usize) -> Region {
    let mut w = information(&rows, p);
    let n = rows.len().max(1) as f64;
    for v in &mut w {
        *v /= n;
    }
    Region { rows, moment: w }
}

fn objective(criterion: OptimalCriterion, m: &[f64], w: &[f64], p: usize) -> Option<f64> {
    let (inv, log_det) = spd_inverse(m, p)?;
    Some(match criterion {
        OptimalCriterion::D => log_det,
        OptimalCriterion::I => -trace_product(&inv, w, p), // maximizar = minimizar o traço
    })
}

/// Troca de Fedorov a partir de `design` (índices dos candidatos para os ensaios livres).
fn exchange(
    criterion: OptimalCriterion,
    region: &Region,
    fixed: &[Vec<f64>],
    free: &mut [usize],
    p: usize,
) -> Option<f64> {
    let rows = &region.rows;
    for _ in 0..MAX_PASSES {
        let mut all: Vec<&Vec<f64>> = fixed.iter().collect();
        all.extend(free.iter().map(|&i| &rows[i]));
        let m = information(&all.iter().map(|r| (*r).clone()).collect::<Vec<_>>(), p);
        let (minv, log_det) = spd_inverse(&m, p)?;
        let current = match criterion {
            OptimalCriterion::D => log_det,
            OptimalCriterion::I => -trace_product(&minv, &region.moment, p),
        };
        let tr_w = trace_product(&minv, &region.moment, p);
        let mut best: Option<(usize, usize, f64)> = None; // (posição livre, candidato, valor)
        for (slot, &out_index) in free.iter().enumerate() {
            let xo = &rows[out_index];
            let mo = mat_vec(&minv, xo, p);
            let d_out: f64 = mo.iter().zip(xo).map(|(u, v)| u * v).sum();
            let denom = 1.0 - d_out;
            if denom <= 1e-9 {
                continue; // remover este ensaio tornaria a matriz singular
            }
            // M1⁻¹ = M⁻¹ + (M⁻¹xₒ)(M⁻¹xₒ)ᵀ / (1 − dₒ)
            let mut m1inv = minv.clone();
            for i in 0..p {
                for j in 0..p {
                    m1inv[i * p + j] += mo[i] * mo[j] / denom;
                }
            }
            let log_det1 = log_det + denom.ln();
            let (tr1, s_matrix) = if criterion == OptimalCriterion::I {
                let t = mat_mul(&region.moment, &m1inv, p);
                let s = mat_mul(&m1inv, &t, p);
                (trace_product(&m1inv, &region.moment, p), Some(s))
            } else {
                (0.0, None)
            };
            let _ = tr_w;
            for (c, xc) in rows.iter().enumerate() {
                if c == out_index {
                    continue;
                }
                let v = mat_vec(&m1inv, xc, p);
                let d_in: f64 = v.iter().zip(xc).map(|(a, b)| a * b).sum();
                let value = match criterion {
                    OptimalCriterion::D => log_det1 + (1.0 + d_in).ln(),
                    OptimalCriterion::I => {
                        let sxx = quad(s_matrix.as_deref().unwrap_or(&[]), xc, p);
                        -(tr1 - sxx / (1.0 + d_in))
                    }
                };
                if value.is_finite() && best.is_none_or(|(_, _, b)| value > b) {
                    best = Some((slot, c, value));
                }
            }
        }
        match best {
            Some((slot, c, value)) if value > current + 1e-10 * (1.0 + current.abs()) => {
                free[slot] = c;
            }
            _ => return Some(current),
        }
    }
    let mut all: Vec<Vec<f64>> = fixed.to_vec();
    all.extend(free.iter().map(|&i| rows[i].clone()));
    objective(criterion, &information(&all, p), &region.moment, p)
}

/// Critérios de uma lista de ensaios (unidades reais) para a especificação dada.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando a especificação é inválida.
pub fn evaluate(spec: &OptimalSpec, runs_real: &[Vec<f64>]) -> Result<OptimalMetrics, CoreError> {
    let issues = validate(&OptimalSpec {
        runs: u32::try_from(runs_real.len()).unwrap_or(u32::MAX).max(1),
        fixed_runs: Vec::new(),
        ..spec.clone()
    });
    // Só a parte estrutural importa aqui; o número de ensaios é o da lista.
    let structural: Vec<Issue> = issues
        .into_iter()
        .filter(|i| i.code != "design.optimal_too_few_runs")
        .collect();
    if !structural.is_empty() {
        return Err(CoreError::InvalidInput(structural));
    }
    let k = spec.factors.len();
    let p = parameter_count(k, spec.model);
    let cands = candidates(spec);
    let rows: Vec<Vec<f64>> = runs_real
        .iter()
        .map(|r| model_row(&to_coded(spec, r), spec.model))
        .collect();
    let reg = region(cands.iter().map(|c| model_row(c, spec.model)).collect(), p);
    Ok(metrics_of(&rows, &reg, p))
}

fn metrics_of(rows: &[Vec<f64>], reg: &Region, p: usize) -> OptimalMetrics {
    let n = rows.len() as f64;
    let m = information(rows, p);
    let parameters = u32::try_from(p).unwrap_or(u32::MAX);
    match spd_inverse(&m, p) {
        None => OptimalMetrics {
            parameters,
            log_det: None,
            d_efficiency: None,
            a_efficiency: None,
            g_efficiency: None,
            i_average: None,
        },
        Some((inv, log_det)) => {
            let max_d = reg
                .rows
                .iter()
                .map(|x| quad(&inv, x, p))
                .fold(0.0_f64, f64::max);
            OptimalMetrics {
                parameters,
                log_det: Some(log_det),
                d_efficiency: Some((log_det / p as f64).exp() / n),
                a_efficiency: Some(p as f64 / (n * (0..p).map(|i| inv[i * p + i]).sum::<f64>())),
                g_efficiency: (max_d > 0.0).then(|| p as f64 / (n * max_d)),
                i_average: Some(n * trace_product(&inv, &reg.moment, p)),
            }
        }
    }
}

/// Gera o planejamento ótimo.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou região vazia.
pub fn generate(spec: &OptimalSpec) -> Result<GeneratedOptimal, CoreError> {
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let k = spec.factors.len();
    let p = parameter_count(k, spec.model);
    let cands = candidates(spec);
    if cands.is_empty() {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_empty_region",
        )]));
    }
    if cands.len() > MAX_CANDIDATES {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_too_many_candidates")
                .with_param("candidates", &cands.len())
                .with_param("max", &MAX_CANDIDATES),
        ]));
    }
    let reg = region(cands.iter().map(|c| model_row(c, spec.model)).collect(), p);
    let fixed_rows: Vec<Vec<f64>> = spec
        .fixed_runs
        .iter()
        .map(|r| model_row(&to_coded(spec, r), spec.model))
        .collect();
    let free_count = spec.runs as usize - spec.fixed_runs.len();

    let mut results: Vec<(f64, Vec<usize>)> = Vec::new();
    for start in 0..spec.starts {
        let order = permutation(cands.len(), spec.seed.wrapping_add(u64::from(start)));
        let mut free: Vec<usize> = (0..free_count).map(|i| order[i % order.len()]).collect();
        // Início singular: o ridge implícito não existe; tenta trocar para obter posto completo.
        let value = exchange(spec.criterion, &reg, &fixed_rows, &mut free, p).or_else(|| {
            // Reforça o início com os candidatos de maior alavancagem acumulada e tenta de novo.
            let mut spread: Vec<usize> = (0..cands.len()).collect();
            spread.sort_by(|&a, &b| {
                let na: f64 = reg.rows[a].iter().map(|v| v.abs()).sum();
                let nb: f64 = reg.rows[b].iter().map(|v| v.abs()).sum();
                nb.total_cmp(&na)
            });
            for (slot, c) in free
                .iter_mut()
                .zip(spread.iter().cycle().skip(start as usize))
            {
                *slot = *c;
            }
            exchange(spec.criterion, &reg, &fixed_rows, &mut free, p)
        });
        if let Some(v) = value {
            results.push((v, free));
        }
    }
    let Some(best) = results
        .iter()
        .map(|(v, _)| *v)
        .fold(None, |acc: Option<f64>, v| {
            Some(acc.map_or(v, |a| a.max(v)))
        })
    else {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_singular",
        )]));
    };
    let reached = results
        .iter()
        .filter(|(v, _)| (best - v).abs() <= 1e-9 * (1.0 + best.abs()))
        .count();
    let (_, chosen) = results
        .iter()
        .find(|(v, _)| (best - v).abs() <= 1e-9 * (1.0 + best.abs()))
        .cloned()
        .unwrap_or_default();

    // Execução: ensaios já realizados primeiro; os novos, em ordem aleatorizada (ou a da busca).
    let order: Vec<usize> = if spec.randomize {
        permutation(chosen.len(), spec.seed)
    } else {
        (0..chosen.len()).collect()
    };
    let mut runs: Vec<OptimalRun> = spec
        .fixed_runs
        .iter()
        .map(|r| OptimalRun {
            run: 0,
            fixed: true,
            real: r.clone(),
            coded: to_coded(spec, r),
        })
        .collect();
    for &slot in &order {
        let coded = cands[chosen[slot]].clone();
        runs.push(OptimalRun {
            run: 0,
            fixed: false,
            real: to_real(spec, &coded),
            coded,
        });
    }
    for (i, r) in runs.iter_mut().enumerate() {
        r.run = u32::try_from(i + 1).unwrap_or(u32::MAX);
    }
    let all_rows: Vec<Vec<f64>> = runs
        .iter()
        .map(|r| model_row(&r.coded, spec.model))
        .collect();
    let metrics = metrics_of(&all_rows, &reg, p);
    let mut notes = Vec::new();
    if reached == 1 && spec.starts > 1 {
        notes.push(Issue::new(
            "design.optimal_single_best_start",
            Severity::Warning,
        ));
    }
    if free_count == 0 {
        notes.push(Issue::new(
            "design.optimal_nothing_to_choose",
            Severity::Warning,
        ));
    }
    Ok(GeneratedOptimal {
        spec: spec.clone(),
        candidates: u32::try_from(cands.len()).unwrap_or(u32::MAX),
        runs,
        metrics,
        starts_run: u32::try_from(results.len()).unwrap_or(u32::MAX),
        starts_reaching_best: u32::try_from(reached).unwrap_or(u32::MAX),
        algorithm: format!("fedorov-exchange/{ALGORITHM}"),
        issues: notes,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn spec(k: usize, model: OptimalModel, criterion: OptimalCriterion, runs: u32) -> OptimalSpec {
        OptimalSpec {
            factors: (0..k)
                .map(|i| OptimalFactor {
                    id: StableId::new(format!("f{}", i + 1)).expect("id"),
                    name: format!("X{}", i + 1),
                    low: 10.0,
                    high: 30.0,
                })
                .collect(),
            model,
            criterion,
            runs,
            levels: 3,
            constraints: Vec::new(),
            fixed_runs: Vec::new(),
            starts: 12,
            randomize: false,
            seed: 7,
        }
    }

    #[test]
    fn the_full_factorial_is_d_optimal_for_three_factors_with_interactions() {
        // Ótimo conhecido: o fatorial 2³ (8 ensaios) tem M = 8·I₇ e ln|M| = 7·ln 8.
        let g = generate(&spec(3, OptimalModel::Interactions, OptimalCriterion::D, 8))
            .expect("planejamento");
        let want = 7.0 * 8.0_f64.ln();
        assert!((g.metrics.log_det.expect("ln det") - want).abs() < 1e-9);
        assert!((g.metrics.d_efficiency.expect("D") - 1.0).abs() < 1e-9);
        assert!(
            g.runs
                .iter()
                .all(|r| r.coded.iter().all(|v| v.abs() == 1.0))
        );
    }

    #[test]
    fn constraints_are_respected_and_the_region_can_be_empty() {
        let mut s = spec(2, OptimalModel::Linear, OptimalCriterion::D, 5);
        s.constraints = vec![LinearConstraint {
            coefficients: vec![1.0, 1.0],
            upper: 40.0, // x1 + x2 ≤ 40 (os cantos 30+30 e 30+10... ficam fora ou dentro)
        }];
        let g = generate(&s).expect("restrito");
        for r in &g.runs {
            assert!(r.real[0] + r.real[1] <= 40.0 + 1e-9);
        }
        s.constraints[0].upper = 5.0;
        assert!(generate(&s).is_err());
    }

    #[test]
    fn augmentation_keeps_the_fixed_runs_and_improves_the_criterion() {
        let mut s = spec(2, OptimalModel::Interactions, OptimalCriterion::D, 8);
        s.fixed_runs = vec![vec![10.0, 10.0], vec![30.0, 10.0], vec![20.0, 20.0]];
        let g = generate(&s).expect("ampliação");
        assert_eq!(g.runs.iter().filter(|r| r.fixed).count(), 3);
        assert_eq!(g.runs[0].real, vec![10.0, 10.0]);
        assert_eq!(g.runs.len(), 8);
        let fixed_only = evaluate(&s, &s.fixed_runs).expect("só os fixos");
        assert!(fixed_only.log_det.is_none() || g.metrics.log_det > fixed_only.log_det);
    }

    #[test]
    fn i_optimal_runs_and_reports_the_average_prediction_variance() {
        let g =
            generate(&spec(2, OptimalModel::Quadratic, OptimalCriterion::I, 9)).expect("I-ótimo");
        assert!(g.metrics.i_average.expect("I") > 0.0);
        assert_eq!(g.metrics.parameters, 6);
        assert!(g.starts_reaching_best >= 1);
    }

    #[test]
    fn invalid_specifications_are_rejected() {
        assert!(generate(&spec(3, OptimalModel::Quadratic, OptimalCriterion::D, 5)).is_err());
        let mut bad = spec(2, OptimalModel::Linear, OptimalCriterion::D, 6);
        bad.levels = 4;
        assert!(generate(&bad).is_err());
        let mut range = spec(2, OptimalModel::Linear, OptimalCriterion::D, 6);
        range.factors[0].high = range.factors[0].low;
        assert!(generate(&range).is_err());
        let mut many = spec(2, OptimalModel::Linear, OptimalCriterion::D, 70);
        many.runs = 70;
        assert!(generate(&many).is_err());
    }

    #[test]
    fn same_seed_same_design() {
        let a = generate(&spec(
            3,
            OptimalModel::Interactions,
            OptimalCriterion::D,
            10,
        ))
        .expect("a");
        let b = generate(&spec(
            3,
            OptimalModel::Interactions,
            OptimalCriterion::D,
            10,
        ))
        .expect("b");
        assert_eq!(a.runs, b.runs);
    }
}
