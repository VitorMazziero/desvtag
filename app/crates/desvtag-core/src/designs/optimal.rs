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
//! Sherman–Morrison). Se a remoção isolada for singular, avalia a matriz da troca conjunta por
//! Cholesky. A melhor troca que melhora o critério
//! é aplicada e a busca repete até não haver melhora. Vários inícios aleatórios (PCG32, semente
//! registrada) reduzem o risco de ótimo local; **não há garantia de ótimo global**.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::coding::Levels;
use super::randomization::{ALGORITHM, permutation};
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::models::resource_budget::WorkBudget;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

mod blocked;
pub mod categorical;
pub mod model;
pub use categorical::{OptimalCategoricalFactor, OptimalCategories, evaluate_with_categories};
pub mod variance;
pub use blocked::{OptimalBlocks, evaluate_with_blocks};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "optimal_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 5;
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
/// Orçamento compartilhado entre todos os inícios, em milhões de produtos matriciais estimados.
const WORK_LIMIT: u32 = 20_000;

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
    /// Nominal treatment factors and explicit categorical domain/associations; absent in numeric-only designs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub categories: Option<OptimalCategories>,
    /// Optional fixed additive blocks and prescribed augmentation counts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub blocks: Option<OptimalBlocks>,
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
    /// Nominal treatment levels, in spec.categories.factors order; never numeric doses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub categories: Option<Vec<String>>,
    /// Zero-based block identity in `spec.blocks.labels`, when blocking is declared.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<u32>,
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

/// Motivo de término de uma tentativa da busca.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum OptimalStop {
    /// Nenhuma troca admissível melhora o critério na tolerância declarada.
    NoImprovingExchange,
    /// O limite de passagens foi atingido antes de uma varredura sem melhora.
    PassLimit,
    /// A varredura foi interrompida pelo orçamento acumulado.
    WorkLimit,
    /// Não foi possível fatorar a informação do desenho.
    Singular,
}

/// Diagnóstico da busca, incluindo tentativas sem resultado utilizável.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalSearch {
    /// Inícios solicitados e efetivamente tentados, sem contar recuperação como novo início.
    pub starts_attempted: u32,
    /// Inícios que terminaram com desenho de posto completo.
    pub starts_succeeded: u32,
    /// Inícios aleatórios singulares antes da recuperação.
    pub singular_initial_starts: u32,
    /// Reinicializações de recuperação tentadas.
    pub recovery_attempts: u32,
    /// Inícios que falharam mesmo após recuperação.
    pub starts_failed: u32,
    /// Inícios utilizáveis encerrados pelo limite de passagens.
    pub starts_limited: u32,
    /// Pares ensaio/candidato avaliados, incluindo propostas singulares.
    #[ts(type = "number")]
    pub evaluations: u64,
    /// Varreduras da vizinhança, somadas sobre inícios e recuperações.
    pub passes: u32,
    /// Causa de término do desenho escolhido.
    pub selected_stop: OptimalStop,
    /// Limite em milhões de produtos estimados, presente se interrompeu a busca.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub work_limit: Option<u32>,
}

impl OptimalSearch {
    fn work_warning(&self, requested: u32) -> Option<Issue> {
        self.work_limit.map(|_| {
            Issue::new("design.optimal_work_limit", Severity::Warning)
                .with_param("attempted", &self.starts_attempted)
                .with_param("requested", &requested)
        })
    }
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
    /// Inícios tentados, inclusive os que falharam.
    pub starts_run: u32,
    /// Inícios que chegaram ao melhor valor (a menos de 1e-9 relativo).
    pub starts_reaching_best: u32,
    /// Diagnóstico aditivo, ausente em resultados anteriores à versão 2 do método.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub search: Option<OptimalSearch>,
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
        OptimalModel::Interactions => 1 + k + k * k.saturating_sub(1) / 2,
        OptimalModel::Quadratic => 1 + 2 * k + k * k.saturating_sub(1) / 2,
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
    let total = k + spec.categories.as_ref().map_or(0, |c| c.factors.len());
    if total == 0 || total > MAX_FACTORS {
        issues.push(error("design.optimal_invalid_factor_count").with_param("max", &MAX_FACTORS));
        return issues;
    }
    if spec.factors.iter().any(|f| {
        !(Levels {
            low: f.low,
            high: f.high,
        })
        .valid()
    }) {
        issues.push(error("design.optimal_invalid_range"));
    }
    if spec.model != OptimalModel::Linear && total < 2 && spec.model == OptimalModel::Interactions {
        issues.push(error("design.optimal_interactions_need_more_factors"));
    }
    if !matches!(spec.levels, 3 | 5) {
        issues.push(error("design.optimal_invalid_levels"));
    } else if issues.is_empty() {
        for factor in &spec.factors {
            let coding = Levels {
                low: factor.low,
                high: factor.high,
            };
            let mut previous = f64::NEG_INFINITY;
            for coded in coded_levels(spec.levels) {
                let real = coding.decode(coded);
                let encoded = coding.encode(real);
                if !real.is_finite()
                    || real <= previous
                    || !encoded.is_finite()
                    || (encoded - coded).abs() > 1e-12
                {
                    issues.push(
                        error("design.optimal_unresolved_grid").with_param("factor", &factor.name),
                    );
                    break;
                }
                previous = real;
            }
        }
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
        let p = categorical::parameter_count(spec);
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
        .map(|(f, v)| {
            Levels {
                low: f.low,
                high: f.high,
            }
            .encode(*v)
        })
        .collect()
}

fn to_real(spec: &OptimalSpec, coded: &[f64]) -> Vec<f64> {
    spec.factors
        .iter()
        .zip(coded)
        .map(|(f, c)| {
            Levels {
                low: f.low,
                high: f.high,
            }
            .decode(*c)
        })
        .collect()
}

/// Candidatos codificados dentro das restrições.
fn coded_levels(count: u32) -> impl Iterator<Item = f64> {
    (0..count).map(move |i| -1.0 + 2.0 * f64::from(i) / f64::from(count - 1))
}

fn candidates(spec: &OptimalSpec) -> Vec<Vec<f64>> {
    let k = spec.factors.len();
    let levels: Vec<f64> = coded_levels(spec.levels).collect();
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

fn log_determinant(factor: &[f64], p: usize) -> f64 {
    2.0 * (0..p).map(|i| factor[i * p + i].ln()).sum::<f64>()
}

/// Inversa e `ln|A|` de uma matriz simétrica positiva definida.
fn spd_inverse(a: &[f64], p: usize) -> Option<(Vec<f64>, f64)> {
    let l = cholesky(a, p)?;
    let log_det = log_determinant(&l, p);
    let mut inv = vec![0.0; p * p];
    let mut y = vec![0.0; p];
    for col in 0..p {
        // resolve L y = e_col e Lᵀ x = y
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

fn information<'a>(rows: impl IntoIterator<Item = &'a [f64]>, p: usize) -> Vec<f64> {
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
    a.chunks_exact(p)
        .zip(x)
        .map(|(row, &coordinate)| {
            let product = row.iter().zip(x).map(|(u, v)| u * v).sum::<f64>();
            product * coordinate
        })
        .sum()
}

// With finite matrix entries and coordinates, zero terms contribute nothing.
// Iterate the remaining indices in model-column order to retain the dense sums.
fn sparse_quad(a: &[f64], nonzero: &[(usize, f64)], p: usize) -> f64 {
    nonzero
        .iter()
        .map(|&(i, x)| {
            let row = &a[i * p..(i + 1) * p];
            x * nonzero.iter().map(|&(j, y)| row[j] * y).sum::<f64>()
        })
        .sum()
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
    /// Rows are ordered by block, with an equally sized candidate region in each block.
    candidates_per_block: usize,
}

fn region(rows: Vec<Vec<f64>>, p: usize) -> Region {
    let mut w = information(rows.iter().map(Vec::as_slice), p);
    let n = rows.len().max(1) as f64;
    for v in &mut w {
        *v /= n;
    }
    Region {
        candidates_per_block: rows.len(),
        rows,
        moment: w,
    }
}

fn objective(criterion: OptimalCriterion, m: &[f64], w: &[f64], p: usize) -> Option<f64> {
    match criterion {
        OptimalCriterion::D => cholesky(m, p).map(|factor| log_determinant(&factor, p)),
        OptimalCriterion::I => {
            let (inv, _) = spd_inverse(m, p)?;
            Some(-trace_product(&inv, w, p)) // maximizar = minimizar o traço
        }
    }
}

struct ExchangeOutcome {
    value: Option<f64>,
    stop: OptimalStop,
    passes: u32,
    evaluations: u64,
}

/// Troca de Fedorov a partir dos índices dos ensaios livres.
fn exchange(
    criterion: OptimalCriterion,
    region: &Region,
    fixed: &[Vec<f64>],
    free: &mut [usize],
    p: usize,
    max_passes: usize,
    budget: &WorkBudget,
) -> ExchangeOutcome {
    let mut outcome = ExchangeOutcome {
        value: None,
        stop: OptimalStop::Singular,
        passes: 0,
        evaluations: 0,
    };
    let rows = &region.rows;
    // Sparse nominal and interaction rows are common in wider models. Keep the
    // dense kernel for narrow models and nearly full rows.
    let support = (p >= 12 && fixed.len() + free.len() > p).then(|| {
        rows.iter()
            .map(|row| {
                let count = row.iter().filter(|&&value| value != 0.0).count();
                (count * 4 <= p * 3).then(|| {
                    row.iter()
                        .copied()
                        .enumerate()
                        .filter(|&(_, value)| value != 0.0)
                        .collect::<Vec<_>>()
                })
            })
            .collect::<Vec<_>>()
    });
    let count = region.candidates_per_block;
    let p2 = (p * p) as u64;
    let p3 = p2 * p as u64;
    let criterion_cost = if criterion == OptimalCriterion::I {
        2
    } else {
        1
    };
    for _ in 0..max_passes {
        let all = fixed.iter().chain(free.iter().map(|&i| &rows[i]));
        let m = information(all.map(Vec::as_slice), p);
        let Some((minv, log_det)) = spd_inverse(&m, p) else {
            return outcome;
        };
        let current = match criterion {
            OptimalCriterion::D => log_det,
            OptimalCriterion::I => -trace_product(&minv, &region.moment, p),
        };
        if !current.is_finite() {
            return outcome;
        }
        let mut best: Option<(usize, usize, f64)> = None; // (posição livre, candidato, valor)
        for (slot, &out_index) in free.iter().enumerate() {
            let xo = &rows[out_index];
            let mo = mat_vec(&minv, xo, p);
            let d_out: f64 = mo.iter().zip(xo).map(|(u, v)| u * v).sum();
            let denom = 1.0 - d_out;
            // Cobre a varredura inteira da posição. A reconstrução direta pesa mais
            // que a atualização; o custo denso mantém o orçamento independente da esparsidade.
            let cost = if denom <= 1e-9 {
                (count - 1) as u64 * ((fixed.len() + free.len()) as u64 * p2 + criterion_cost * p3)
            } else {
                (count - 1) as u64 * criterion_cost * p2 + (criterion_cost - 1) * 2 * p3
            };
            if !budget.charge(cost + 2 * p2) {
                // Nenhuma troca de uma varredura parcial é aplicada.
                outcome.value = Some(current);
                outcome.stop = OptimalStop::WorkLimit;
                return outcome;
            }
            let block_start = out_index / count * count;
            let block = &rows[block_start..block_start + count];
            let candidates = block
                .iter()
                .enumerate()
                .map(|(i, row)| (block_start + i, row));
            if denom <= 1e-9 {
                // A remoção pode ser singular mesmo que a troca conjunta tenha posto completo
                // (em particular, n=p). Reconstruir o desenho evita subtrair informação quase
                // igual e permite avaliar a troca sem inverter a remoção isolada.
                for (c, xc) in candidates {
                    if c == out_index {
                        continue;
                    }
                    outcome.evaluations += 1;
                    let replacement =
                        fixed
                            .iter()
                            .chain(free.iter().enumerate().map(|(position, &index)| {
                                if position == slot { xc } else { &rows[index] }
                            }));
                    let m = information(replacement.map(Vec::as_slice), p);
                    if let Some(value) = objective(criterion, &m, &region.moment, p)
                        && value.is_finite()
                        && best.is_none_or(|(_, _, b)| value > b)
                    {
                        best = Some((slot, c, value));
                    }
                }
                continue;
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
            let sparse_is_finite = support.is_some()
                && m1inv.iter().all(|value| value.is_finite())
                && s_matrix
                    .as_ref()
                    .is_none_or(|matrix| matrix.iter().all(|value| value.is_finite()));
            for (c, xc) in candidates {
                if c == out_index {
                    continue;
                }
                outcome.evaluations += 1;
                let nonzero = if sparse_is_finite {
                    support.as_ref().and_then(|all| all[c].as_deref())
                } else {
                    None
                };
                let quadratic = |matrix| match nonzero {
                    Some(entries) => sparse_quad(matrix, entries, p),
                    None => quad(matrix, xc, p),
                };
                let d_in = quadratic(&m1inv);
                let value = match criterion {
                    OptimalCriterion::D => log_det1 + (1.0 + d_in).ln(),
                    OptimalCriterion::I => {
                        let sxx = quadratic(s_matrix.as_deref().unwrap_or(&[]));
                        -(tr1 - sxx / (1.0 + d_in))
                    }
                };
                if value.is_finite() && best.is_none_or(|(_, _, b)| value > b) {
                    best = Some((slot, c, value));
                }
            }
        }
        outcome.passes += 1;
        match best {
            Some((slot, c, value)) if value > current + 1e-10 * (1.0 + current.abs()) => {
                free[slot] = c;
            }
            _ => {
                outcome.value = Some(current);
                outcome.stop = OptimalStop::NoImprovingExchange;
                return outcome;
            }
        }
    }
    let all = fixed.iter().chain(free.iter().map(|&i| &rows[i]));
    let m = information(all.map(Vec::as_slice), p);
    outcome.value = objective(criterion, &m, &region.moment, p).filter(|v| v.is_finite());
    if outcome.value.is_some() {
        outcome.stop = OptimalStop::PassLimit;
    }
    outcome
}

/// Shared stratified Fedorov search; candidate groups remain fixed for each free slot.
fn search(
    spec: &OptimalSpec,
    reg: &Region,
    fixed: &[Vec<f64>],
    count: usize,
    new_runs: &[u32],
) -> Result<(Vec<usize>, OptimalSearch, usize), CoreError> {
    let p = reg.rows.first().map_or(0, Vec::len);
    let allocation = new_runs
        .iter()
        .enumerate()
        .flat_map(|(b, &n)| std::iter::repeat_n(b, n as usize))
        .collect::<Vec<_>>();
    let budget = WorkBudget::new(u64::from(WORK_LIMIT) * 1_000_000, "optimal.exchange");
    let mut search = OptimalSearch {
        starts_attempted: 0,
        starts_succeeded: 0,
        singular_initial_starts: 0,
        recovery_attempts: 0,
        starts_failed: 0,
        starts_limited: 0,
        evaluations: 0,
        passes: 0,
        selected_stop: OptimalStop::Singular,
        work_limit: None,
    };
    let mut results = Vec::new();
    for start in 0..spec.starts {
        search.starts_attempted += 1;
        let mut free = Vec::with_capacity(allocation.len());
        for (b, &n) in new_runs.iter().enumerate() {
            let order = permutation(
                count,
                spec.seed
                    .wrapping_add(u64::from(start).wrapping_mul(new_runs.len() as u64))
                    .wrapping_add(b as u64),
            );
            free.extend((0..n as usize).map(|i| b * count + order[i % count]));
        }
        let mut outcome = exchange(
            spec.criterion,
            reg,
            fixed,
            &mut free,
            p,
            MAX_PASSES,
            &budget,
        );
        search.evaluations += outcome.evaluations;
        search.passes += outcome.passes;
        if outcome.value.is_none() {
            search.singular_initial_starts += 1;
            search.recovery_attempts += 1;
            let mut spread = (0..count).collect::<Vec<_>>();
            spread.sort_by(|&a, &b| {
                reg.rows[b]
                    .iter()
                    .map(|v| v.abs())
                    .sum::<f64>()
                    .total_cmp(&reg.rows[a].iter().map(|v| v.abs()).sum::<f64>())
            });
            let mut slots = vec![0; new_runs.len()];
            for (index, &b) in allocation.iter().enumerate() {
                free[index] = b * count + spread[(slots[b] + start as usize) % count];
                slots[b] += 1;
            }
            outcome = exchange(
                spec.criterion,
                reg,
                fixed,
                &mut free,
                p,
                MAX_PASSES,
                &budget,
            );
            search.evaluations += outcome.evaluations;
            search.passes += outcome.passes;
        }
        if let Some(value) = outcome.value {
            search.starts_succeeded += 1;
            search.starts_limited += u32::from(outcome.stop == OptimalStop::PassLimit);
            results.push((value, free, outcome.stop));
        } else {
            search.starts_failed += 1;
        }
        if budget.exhausted() {
            search.work_limit = Some(WORK_LIMIT);
            break;
        }
    }
    let Some(best) = results
        .iter()
        .map(|(value, _, _)| *value)
        .max_by(f64::total_cmp)
    else {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_singular")
                .with_param("attempted", &search.starts_attempted)
                .with_param("failed", &search.starts_failed)
                .with_param("recoveries", &search.recovery_attempts),
        ]));
    };
    let matching = |value: f64| (best - value).abs() <= 1e-9 * (1.0 + best.abs());
    let reached = results
        .iter()
        .filter(|(value, _, _)| matching(*value))
        .count();
    let Some((_, chosen, stop)) = results.iter().find(|(value, _, _)| matching(*value)) else {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_singular",
        )]));
    };
    search.selected_stop = *stop;
    Ok((chosen.clone(), search, reached))
}

/// Critérios de uma lista de ensaios (unidades reais) para a especificação dada.
/// Aceita pontos fora da malha, mas dentro das faixas e restrições. Desenhos válidos
/// de posto deficiente retornam métricas indefinidas. A lista substitui `fixed_runs`.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando a especificação, região ou lista é inválida.
pub fn evaluate(spec: &OptimalSpec, runs_real: &[Vec<f64>]) -> Result<OptimalMetrics, CoreError> {
    if spec.categories.is_some() {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_category_association_required",
        )]));
    }
    if spec.blocks.is_some() {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_block_association_required",
        )]));
    }
    let issues = validate(&OptimalSpec {
        runs: u32::try_from(runs_real.len()).unwrap_or(u32::MAX),
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
    for (index, run) in runs_real.iter().enumerate() {
        let valid = run.len() == k
            && run.iter().zip(&spec.factors).all(|(value, factor)| {
                value.is_finite() && *value >= factor.low && *value <= factor.high
            })
            && spec.constraints.iter().all(|constraint| {
                constraint
                    .coefficients
                    .iter()
                    .zip(run)
                    .map(|(a, x)| a * x)
                    .sum::<f64>()
                    <= constraint.upper + 1e-9
            })
            && to_coded(spec, run).iter().all(|value| value.is_finite());
        if !valid {
            return Err(CoreError::InvalidInput(vec![
                error("design.optimal_invalid_evaluation_run").with_param("row", &(index + 1)),
            ]));
        }
    }
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
    let rows: Vec<Vec<f64>> = runs_real
        .iter()
        .map(|r| model_row(&to_coded(spec, r), spec.model))
        .collect();
    let reg = region(cands.iter().map(|c| model_row(c, spec.model)).collect(), p);
    Ok(metrics_of(&rows, &reg, p))
}

fn metrics_of(rows: &[Vec<f64>], reg: &Region, p: usize) -> OptimalMetrics {
    let n = rows.len() as f64;
    let m = information(rows.iter().map(Vec::as_slice), p);
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
    if spec.categories.is_some() {
        return categorical::generate(spec);
    }
    if spec.blocks.is_some() {
        return blocked::generate(spec);
    }
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

    let (chosen, search, reached) =
        search(spec, &reg, &fixed_rows, cands.len(), &[free_count as u32])?;

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
            categories: None,
            block: None,
            run: 0,
            fixed: true,
            real: r.clone(),
            coded: to_coded(spec, r),
        })
        .collect();
    for &slot in &order {
        let coded = cands[chosen[slot]].clone();
        runs.push(OptimalRun {
            categories: None,
            block: None,
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
    let mut notes: Vec<_> = search.work_warning(spec.starts).into_iter().collect();
    if reached == 1 && search.starts_attempted > 1 && search.work_limit.is_none() {
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
        starts_run: search.starts_attempted,
        starts_reaching_best: u32::try_from(reached).unwrap_or(u32::MAX),
        search: Some(search),
        algorithm: format!("fedorov-exchange/{ALGORITHM}"),
        issues: notes,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn search_distinguishes_budget_stationarity_and_singular_starts() {
        let reg = region(vec![vec![1.0, -1.0], vec![1.0, 0.0], vec![1.0, 1.0]], 2);
        let mut free = vec![1, 2];
        let budget = WorkBudget::new(10_000, "test.optimal");
        let limited = exchange(OptimalCriterion::D, &reg, &[], &mut free, 2, 1, &budget);
        assert_eq!(limited.stop, OptimalStop::PassLimit);
        assert_eq!(limited.passes, 1);
        assert_eq!(limited.evaluations, 4);
        assert!((limited.value.expect("value") - 4.0_f64.ln()).abs() < 1e-12);
        let local = exchange(
            OptimalCriterion::D,
            &reg,
            &[],
            &mut free,
            2,
            MAX_PASSES,
            &budget,
        );
        assert_eq!(local.stop, OptimalStop::NoImprovingExchange);
        assert_eq!(local.passes, 1);
        assert_eq!(local.evaluations, 4);
        let failed = exchange(
            OptimalCriterion::D,
            &reg,
            &[],
            &mut [1, 1],
            2,
            MAX_PASSES,
            &budget,
        );
        assert_eq!(failed.stop, OptimalStop::Singular);
        assert_eq!(failed.passes, 0);
        assert_eq!(failed.evaluations, 0);
        assert!(failed.value.is_none());
    }

    #[test]
    fn exhausted_budget_does_not_apply_a_partially_scanned_exchange() {
        let reg = region(vec![vec![1.0, -1.0], vec![1.0, 0.0], vec![1.0, 1.0]], 2);
        let mut free = [1, 2];
        // This covers just the first saturated slot, which contains an improving exchange.
        let budget = WorkBudget::new(40, "test.optimal");
        let result = exchange(
            OptimalCriterion::D,
            &reg,
            &[],
            &mut free,
            2,
            MAX_PASSES,
            &budget,
        );
        assert_eq!(result.stop, OptimalStop::WorkLimit);
        assert_eq!(result.passes, 0);
        assert_eq!(result.evaluations, 2);
        assert_eq!(free, [1, 2]);
        assert!(result.value.expect("valid starting design").abs() < 1e-12);
    }

    fn spec(k: usize, model: OptimalModel, criterion: OptimalCriterion, runs: u32) -> OptimalSpec {
        OptimalSpec {
            categories: None,
            blocks: None,
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
