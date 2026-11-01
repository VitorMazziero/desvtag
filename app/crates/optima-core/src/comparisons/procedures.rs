//! C09b — procedimentos de comparação múltipla além de Tukey.
//!
//! - **Games–Howell** (variâncias desiguais): ANOVA de Welch + pares com graus de liberdade de
//!   Welch–Satterthwaite e amplitude studentizada;
//! - **Dunnett**: cada tratamento contra um controle, valor-p ajustado exato (ver
//!   [`crate::distributions::dunnett`]);
//! - **Bonferroni** e **Holm**: testes *t* pareados com desvio-padrão combinado, ajustados;
//! - **Kruskal–Wallis/Dunn**: não paramétrico por postos, com correção de empates, e comparações
//!   de Dunn ajustadas por Bonferroni ou Holm.
//!
//! Especificações em `docs/metodos/procedimentos-comparacao-multipla.md`, `dunnett.md` e
//! `kruskal-wallis-dunn.md`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::groups::{self, GroupData};
use super::letters::{self, Letters, Relation};
use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::dunnett::Dunnett;
use crate::distributions::studentized_range::StudentizedRange;
use crate::distributions::{chi_square, f, normal, student_t};
use crate::domain::{Dataset, StableId};
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "multiple_comparison_procedures";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

/// Ajuste dos valores-p de comparações pareadas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Adjustment {
    /// `min(1, m·p)`.
    Bonferroni,
    /// Holm (passo descendente, uniformemente mais poderoso que Bonferroni).
    Holm,
}

/// Procedimento solicitado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Procedure {
    /// ANOVA de Welch e Games–Howell.
    GamesHowell,
    /// Dunnett contra o controle de rótulo `control`.
    #[serde(rename_all = "camelCase")]
    Dunnett {
        /// Rótulo do nível de controle.
        control: String,
    },
    /// Testes *t* pareados (variância combinada) ajustados por Bonferroni.
    Bonferroni,
    /// Testes *t* pareados (variância combinada) ajustados por Holm.
    Holm,
    /// Kruskal–Wallis e comparações de Dunn.
    #[serde(rename_all = "camelCase")]
    KruskalDunn {
        /// Ajuste dos valores-p de Dunn.
        adjustment: Adjustment,
    },
}

/// Solicitação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProcedureRequest {
    /// Dados.
    pub dataset: Dataset,
    /// Resposta.
    pub response_id: StableId,
    /// Fator que define os grupos.
    pub factor_id: StableId,
    /// Nível de significância da família.
    pub alpha: f64,
    /// Procedimento.
    pub procedure: Procedure,
}

/// Teste global que acompanha o procedimento.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GlobalTest {
    /// `welch_anova`, `anova` ou `kruskal_wallis`.
    pub name: String,
    /// Estatística (`F` ou `H`).
    pub statistic: Stat,
    /// Graus de liberdade do numerador (ou do qui-quadrado).
    pub df1: Stat,
    /// Graus de liberdade do denominador (indefinido no Kruskal–Wallis).
    pub df2: Stat,
    /// Valor-p.
    pub p_value: Stat,
}

/// Resumo de um grupo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProcedureGroup {
    /// Nível.
    pub label: String,
    /// Observações.
    pub n: u32,
    /// Média.
    pub mean: Stat,
    /// Desvio-padrão.
    pub sd: Stat,
    /// Mediana.
    pub median: Stat,
    /// Posto médio (só Kruskal–Wallis).
    pub mean_rank: Stat,
}

/// Uma comparação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProcedurePair {
    /// Índice do primeiro grupo em `groups`.
    pub group_a: u32,
    /// Índice do segundo grupo (o controle, no Dunnett).
    pub group_b: u32,
    /// Diferença de médias (de postos médios no Kruskal–Wallis), `a − b`.
    pub difference: Stat,
    /// Erro-padrão da diferença (indefinido quando não se aplica).
    pub std_error: Stat,
    /// Estatística do teste (`t`, `q/√2` ou `z`).
    pub statistic: Stat,
    /// Graus de liberdade da estatística.
    pub df: Stat,
    /// Valor-p sem ajuste.
    pub p_value: Stat,
    /// Valor-p ajustado pela família.
    pub p_adjusted: Stat,
    /// Limite inferior do intervalo simultâneo (quando existe).
    pub ci_lower: Stat,
    /// Limite superior do intervalo simultâneo (quando existe).
    pub ci_upper: Stat,
    /// `p_adjusted < alpha`; `None` se o valor-p não é definido.
    pub significant: Option<bool>,
}

/// Resultado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProcedureResult {
    /// Procedimento executado.
    pub procedure: Procedure,
    /// Nível de significância.
    pub alpha: f64,
    /// Teste global.
    pub global_test: GlobalTest,
    /// Grupos, na ordem de aparição dos níveis.
    pub groups: Vec<ProcedureGroup>,
    /// Comparações.
    pub pairs: Vec<ProcedurePair>,
    /// Letras (não há no Dunnett: as comparações são com o controle).
    pub letters: Option<Letters>,
    /// Índice do controle (Dunnett).
    pub control: Option<u32>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn invalid(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn stat(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}

fn not_applicable() -> Stat {
    Stat::undefined(UndefinedReason::NotEstimable)
}

fn mean(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

fn variance(values: &[f64]) -> Option<f64> {
    let n = values.len();
    if n < 2 {
        return None;
    }
    let m = mean(values);
    Some(values.iter().map(|v| (v - m).powi(2)).sum::<f64>() / (n - 1) as f64)
}

fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let n = sorted.len();
    if n % 2 == 1 {
        sorted[n / 2]
    } else {
        0.5 * (sorted[n / 2 - 1] + sorted[n / 2])
    }
}

/// Ajuste de valores-p (Bonferroni ou Holm), na ordem original.
#[must_use]
pub fn adjust_p(p: &[f64], method: Adjustment) -> Vec<f64> {
    let m = p.len();
    match method {
        Adjustment::Bonferroni => p.iter().map(|v| (v * m as f64).min(1.0)).collect(),
        Adjustment::Holm => {
            let mut order: Vec<usize> = (0..m).collect();
            order.sort_by(|&a, &b| p[a].total_cmp(&p[b]));
            let mut out = vec![0.0; m];
            let mut running = 0.0_f64;
            for (rank, &i) in order.iter().enumerate() {
                running = running.max(((m - rank) as f64 * p[i]).min(1.0));
                out[i] = running;
            }
            out
        }
    }
}

/// Postos médios (empates recebem o posto médio) e `Σ(t³ − t)` dos empates.
fn mid_ranks(values: &[f64]) -> (Vec<f64>, f64) {
    let n = values.len();
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by(|&a, &b| values[a].total_cmp(&values[b]));
    let mut ranks = vec![0.0; n];
    let mut tie_sum = 0.0;
    let mut start = 0;
    while start < n {
        let mut end = start;
        while end + 1 < n && values[order[end + 1]] == values[order[start]] {
            end += 1;
        }
        let rank = 0.5 * ((start + 1) + (end + 1)) as f64;
        for &i in &order[start..=end] {
            ranks[i] = rank;
        }
        let t = (end - start + 1) as f64;
        tie_sum += t * t * t - t;
        start = end + 1;
    }
    (ranks, tie_sum)
}

struct Prepared {
    groups: Vec<GroupData>,
    n_total: usize,
    means: Vec<f64>,
    vars: Vec<Option<f64>>,
}

fn pair_indices(k: usize) -> Vec<(usize, usize)> {
    (0..k)
        .flat_map(|i| ((i + 1)..k).map(move |j| (i, j)))
        .collect()
}

fn finish_pair(
    a: usize,
    b: usize,
    difference: f64,
    parts: (f64, f64, Option<f64>),
    p: (f64, f64),
    ci: Option<(f64, f64)>,
    alpha: f64,
) -> ProcedurePair {
    let (std_error, statistic, df) = parts;
    ProcedurePair {
        group_a: u32::try_from(a).unwrap_or(u32::MAX),
        group_b: u32::try_from(b).unwrap_or(u32::MAX),
        difference: stat(difference),
        std_error: if std_error.is_nan() {
            not_applicable()
        } else {
            stat(std_error)
        },
        statistic: stat(statistic),
        df: df.map_or_else(not_applicable, stat),
        p_value: stat(p.0),
        p_adjusted: stat(p.1),
        ci_lower: ci.map_or_else(not_applicable, |c| stat(c.0)),
        ci_upper: ci.map_or_else(not_applicable, |c| stat(c.1)),
        significant: p.1.is_finite().then_some(p.1 < alpha),
    }
}

fn letters_from(pairs: &[ProcedurePair], k: usize, score: &[f64]) -> Option<Letters> {
    let mut relation = vec![vec![Relation::Unknown; k]; k];
    for pair in pairs {
        let r = match pair.significant {
            Some(true) => Relation::Different,
            Some(false) => Relation::NotDifferent,
            None => Relation::Unknown,
        };
        relation[pair.group_a as usize][pair.group_b as usize] = r;
        relation[pair.group_b as usize][pair.group_a as usize] = r;
    }
    let mut order: Vec<usize> = (0..k).collect();
    order.sort_by(|&a, &b| score[b].total_cmp(&score[a]));
    letters::compute(k, &order, |i, j| relation[i][j])
}

/// Executa o procedimento.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados, fator, controle ou `alpha` inválidos, ou quando o
/// procedimento exige variância positiva em cada grupo (Games–Howell).
pub fn compare(request: &ProcedureRequest) -> Result<ProcedureResult, CoreError> {
    let dataset = &request.dataset;
    let mut issues = validate_dataset(dataset);
    let response = dataset.response_index(&request.response_id);
    let factor = dataset.factor_index(&request.factor_id);
    if response.is_none() {
        issues.push(invalid("request.unknown_response").with_param("id", &request.response_id));
    }
    if factor.is_none() {
        issues.push(invalid("request.unknown_group_factor").with_param("id", &request.factor_id));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(invalid("comparison.invalid_alpha"));
    }
    let (Some(response), Some(factor)) = (response, factor) else {
        return Err(CoreError::InvalidInput(issues));
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let (groups, _excluded) = groups::group_by_factor(dataset, response, factor);
    let k = groups.len();
    if k < 2 {
        return Err(CoreError::InvalidInput(vec![
            invalid("comparison.too_few_groups").with_param("groups", &k),
        ]));
    }
    let prepared = Prepared {
        n_total: groups.iter().map(|g| g.values.len()).sum(),
        means: groups.iter().map(|g| mean(&g.values)).collect(),
        vars: groups.iter().map(|g| variance(&g.values)).collect(),
        groups,
    };
    let result = match &request.procedure {
        Procedure::GamesHowell => games_howell(&prepared, request.alpha)?,
        Procedure::Dunnett { control } => dunnett(&prepared, control, request.alpha)?,
        Procedure::Bonferroni => pooled_t(&prepared, request.alpha, Adjustment::Bonferroni)?,
        Procedure::Holm => pooled_t(&prepared, request.alpha, Adjustment::Holm)?,
        Procedure::KruskalDunn { adjustment } => {
            kruskal_dunn(&prepared, request.alpha, *adjustment)?
        }
    };
    let (global_test, pairs, ranks, control) = result;
    let group_rows = prepared
        .groups
        .iter()
        .enumerate()
        .map(|(i, g)| ProcedureGroup {
            label: g.label.clone(),
            n: u32::try_from(g.values.len()).unwrap_or(u32::MAX),
            mean: stat(prepared.means[i]),
            sd: prepared.vars[i].map_or_else(
                || Stat::undefined(UndefinedReason::FewerThanTwoObservations),
                |v| stat(v.sqrt()),
            ),
            median: stat(median(&g.values)),
            mean_rank: ranks.as_ref().map_or_else(not_applicable, |r| stat(r[i])),
        })
        .collect();
    let letters = if control.is_some() {
        None
    } else {
        let score = ranks.as_deref().unwrap_or(&prepared.means);
        let l = letters_from(&pairs, k, score);
        if l.is_none() {
            issues.push(Issue::new(
                "comparison.letters_unavailable",
                Severity::Warning,
            ));
        }
        l
    };
    Ok(ProcedureResult {
        procedure: request.procedure.clone(),
        alpha: request.alpha,
        global_test,
        groups: group_rows,
        pairs,
        letters,
        control,
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

type Outcome = (
    GlobalTest,
    Vec<ProcedurePair>,
    Option<Vec<f64>>,
    Option<u32>,
);

fn games_howell(p: &Prepared, alpha: f64) -> Result<Outcome, CoreError> {
    let k = p.groups.len();
    let mut v = Vec::with_capacity(k);
    for (i, g) in p.groups.iter().enumerate() {
        match p.vars[i] {
            Some(var) if var > 0.0 => v.push((var, g.values.len() as f64)),
            _ => {
                return Err(CoreError::InvalidInput(vec![
                    invalid("comparison.procedure_needs_variance").with_param("level", &g.label),
                ]));
            }
        }
    }
    // ANOVA de Welch.
    let w: Vec<f64> = v.iter().map(|(var, n)| n / var).collect();
    let w_sum: f64 = w.iter().sum();
    let weighted_mean: f64 = w.iter().zip(&p.means).map(|(wi, m)| wi * m).sum::<f64>() / w_sum;
    let a: f64 = w
        .iter()
        .zip(&p.means)
        .map(|(wi, m)| wi * (m - weighted_mean).powi(2))
        .sum::<f64>()
        / (k as f64 - 1.0);
    let lam: f64 = w
        .iter()
        .zip(&v)
        .map(|(wi, (_, n))| (1.0 - wi / w_sum).powi(2) / (n - 1.0))
        .sum();
    let b = 1.0 + 2.0 * (k as f64 - 2.0) / ((k * k) as f64 - 1.0) * lam;
    let statistic = a / b;
    let df1 = k as f64 - 1.0;
    let df2 = ((k * k) as f64 - 1.0) / (3.0 * lam);
    let global = GlobalTest {
        name: "welch_anova".to_string(),
        statistic: stat(statistic),
        df1: stat(df1),
        df2: stat(df2),
        p_value: stat(f::sf(statistic, df1, df2)),
    };
    let pairs = pair_indices(k)
        .into_iter()
        .map(|(i, j)| {
            let (vi, vj) = (v[i].0 / v[i].1, v[j].0 / v[j].1);
            let se = (vi + vj).sqrt();
            let df = (vi + vj).powi(2) / (vi * vi / (v[i].1 - 1.0) + vj * vj / (v[j].1 - 1.0));
            let diff = p.means[i] - p.means[j];
            let t = diff / se;
            let q = t.abs() * std::f64::consts::SQRT_2;
            let kernel = StudentizedRange::tabulated(k, df).ok();
            let p_adj = kernel.as_ref().map_or(f64::NAN, |d| d.sf(q));
            let ci = kernel.and_then(|d| d.quantile_upper(alpha).ok()).map(|qc| {
                (
                    diff - qc * se / std::f64::consts::SQRT_2,
                    diff + qc * se / std::f64::consts::SQRT_2,
                )
            });
            finish_pair(i, j, diff, (se, t, Some(df)), (p_adj, p_adj), ci, alpha)
        })
        .collect();
    Ok((global, pairs, None, None))
}

fn anova_global(p: &Prepared) -> (GlobalTest, f64, f64) {
    let k = p.groups.len();
    let df_error = (p.n_total - k) as f64;
    let grand: f64 = p.groups.iter().flat_map(|g| &g.values).sum::<f64>() / p.n_total as f64;
    let ss_between: f64 = p
        .groups
        .iter()
        .zip(&p.means)
        .map(|(g, m)| g.values.len() as f64 * (m - grand).powi(2))
        .sum();
    let ss_within: f64 = p
        .groups
        .iter()
        .zip(&p.means)
        .map(|(g, m)| g.values.iter().map(|v| (v - m).powi(2)).sum::<f64>())
        .sum();
    let mse = ss_within / df_error;
    let df1 = k as f64 - 1.0;
    let fvalue = (ss_between / df1) / mse;
    (
        GlobalTest {
            name: "anova".to_string(),
            statistic: stat(fvalue),
            df1: stat(df1),
            df2: stat(df_error),
            p_value: stat(f::sf(fvalue, df1, df_error)),
        },
        mse,
        df_error,
    )
}

fn needs_error(p: &Prepared) -> Result<(), CoreError> {
    if p.n_total <= p.groups.len() {
        return Err(CoreError::InvalidInput(vec![invalid(
            "comparison.no_error_degrees_of_freedom",
        )]));
    }
    Ok(())
}

fn pooled_t(p: &Prepared, alpha: f64, method: Adjustment) -> Result<Outcome, CoreError> {
    needs_error(p)?;
    let (global, mse, df) = anova_global(p);
    if mse.is_nan() || mse <= 0.0 {
        return Err(CoreError::InvalidInput(vec![invalid(
            "comparison.no_error_degrees_of_freedom",
        )]));
    }
    let idx = pair_indices(p.groups.len());
    let rows: Vec<(f64, f64, f64, f64)> = idx
        .iter()
        .map(|&(i, j)| {
            let se = (mse
                * (1.0 / p.groups[i].values.len() as f64 + 1.0 / p.groups[j].values.len() as f64))
                .sqrt();
            let diff = p.means[i] - p.means[j];
            let t = diff / se;
            (diff, se, t, 2.0 * student_t::sf(t.abs(), df))
        })
        .collect();
    let raw: Vec<f64> = rows.iter().map(|r| r.3).collect();
    let adjusted = adjust_p(&raw, method);
    let m = rows.len() as f64;
    let t_crit = (method == Adjustment::Bonferroni)
        .then(|| student_t::quantile_upper((alpha / (2.0 * m)).max(1e-10), df).ok())
        .flatten();
    let pairs = idx
        .iter()
        .zip(&rows)
        .zip(&adjusted)
        .map(|((&(i, j), &(diff, se, t, praw)), &padj)| {
            let ci = t_crit.map(|c| (diff - c * se, diff + c * se));
            finish_pair(i, j, diff, (se, t, Some(df)), (praw, padj), ci, alpha)
        })
        .collect();
    Ok((global, pairs, None, None))
}

fn dunnett(p: &Prepared, control: &str, alpha: f64) -> Result<Outcome, CoreError> {
    needs_error(p)?;
    let Some(c) = p.groups.iter().position(|g| g.label == control) else {
        return Err(CoreError::InvalidInput(vec![
            invalid("comparison.unknown_control").with_param("level", &control),
        ]));
    };
    let (global, mse, df) = anova_global(p);
    if mse.is_nan() || mse <= 0.0 {
        return Err(CoreError::InvalidInput(vec![invalid(
            "comparison.no_error_degrees_of_freedom",
        )]));
    }
    let others: Vec<usize> = (0..p.groups.len()).filter(|&i| i != c).collect();
    let sizes: Vec<usize> = others.iter().map(|&i| p.groups[i].values.len()).collect();
    let kernel = Dunnett::new(&sizes, p.groups[c].values.len(), df).ok();
    let critical = kernel.as_ref().and_then(|d| d.quantile_upper(alpha).ok());
    let pairs = others
        .iter()
        .map(|&i| {
            let se = (mse
                * (1.0 / p.groups[i].values.len() as f64 + 1.0 / p.groups[c].values.len() as f64))
                .sqrt();
            let diff = p.means[i] - p.means[c];
            let t = diff / se;
            let raw = 2.0 * student_t::sf(t.abs(), df);
            let adj = kernel.as_ref().map_or(f64::NAN, |d| d.sf(t.abs()));
            let ci = critical.map(|cv| (diff - cv * se, diff + cv * se));
            finish_pair(i, c, diff, (se, t, Some(df)), (raw, adj), ci, alpha)
        })
        .collect();
    Ok((global, pairs, None, u32::try_from(c).ok()))
}

fn kruskal_dunn(p: &Prepared, alpha: f64, adjustment: Adjustment) -> Result<Outcome, CoreError> {
    let k = p.groups.len();
    let n = p.n_total as f64;
    let all: Vec<f64> = p
        .groups
        .iter()
        .flat_map(|g| g.values.iter().copied())
        .collect();
    let (ranks, tie_sum) = mid_ranks(&all);
    let mut offset = 0;
    let mut rank_sums = Vec::with_capacity(k);
    for g in &p.groups {
        let len = g.values.len();
        rank_sums.push(ranks[offset..offset + len].iter().sum::<f64>());
        offset += len;
    }
    let mean_ranks: Vec<f64> = rank_sums
        .iter()
        .zip(&p.groups)
        .map(|(r, g)| r / g.values.len() as f64)
        .collect();
    let h_raw = 12.0 / (n * (n + 1.0))
        * rank_sums
            .iter()
            .zip(&p.groups)
            .map(|(r, g)| r * r / g.values.len() as f64)
            .sum::<f64>()
        - 3.0 * (n + 1.0);
    let tie_correction = 1.0 - tie_sum / (n * n * n - n);
    let h = if tie_correction > 0.0 {
        h_raw / tie_correction
    } else {
        f64::NAN
    };
    let df1 = k as f64 - 1.0;
    let global = GlobalTest {
        name: "kruskal_wallis".to_string(),
        statistic: stat(h),
        df1: stat(df1),
        df2: not_applicable(),
        p_value: stat(chi_square::sf(h, df1)),
    };
    let sigma2 = n * (n + 1.0) / 12.0 - tie_sum / (12.0 * (n - 1.0));
    let idx = pair_indices(k);
    let rows: Vec<(f64, f64, f64, f64)> = idx
        .iter()
        .map(|&(i, j)| {
            let (ni, nj) = (
                p.groups[i].values.len() as f64,
                p.groups[j].values.len() as f64,
            );
            let se = (sigma2 * (1.0 / ni + 1.0 / nj)).sqrt();
            let diff = mean_ranks[i] - mean_ranks[j];
            let z = diff / se;
            (diff, se, z, 2.0 * normal::sf(z.abs()))
        })
        .collect();
    let raw: Vec<f64> = rows.iter().map(|r| r.3).collect();
    let adjusted = adjust_p(&raw, adjustment);
    let pairs = idx
        .iter()
        .zip(&rows)
        .zip(&adjusted)
        .map(|((&(i, j), &(diff, se, z, praw)), &padj)| {
            finish_pair(i, j, diff, (se, z, None), (praw, padj), None, alpha)
        })
        .collect();
    Ok((global, pairs, Some(mean_ranks), None))
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn holm_and_bonferroni_adjustments_match_the_definition() {
        let p = [0.01, 0.04, 0.03, 0.005];
        let bonf = adjust_p(&p, Adjustment::Bonferroni);
        assert!((bonf[0] - 0.04).abs() < 1e-15 && (bonf[3] - 0.02).abs() < 1e-15);
        // Holm: ordem crescente 0.005, 0.01, 0.03, 0.04 → 0.02, 0.03, 0.06, 0.06 (máximo acumulado).
        let holm = adjust_p(&p, Adjustment::Holm);
        let expected = [0.03, 0.06, 0.06, 0.02];
        for (a, b) in holm.iter().zip(expected) {
            assert!((a - b).abs() < 1e-15, "{holm:?}");
        }
    }

    #[test]
    fn mid_ranks_average_the_ties() {
        let (ranks, tie_sum) = mid_ranks(&[3.0, 1.0, 3.0, 2.0, 3.0]);
        assert_eq!(ranks, [4.0, 1.0, 4.0, 2.0, 4.0]);
        assert!((tie_sum - 24.0).abs() < 1e-15);
    }

    #[test]
    fn median_handles_even_and_odd_sizes() {
        assert!((median(&[3.0, 1.0, 2.0]) - 2.0).abs() < 1e-15);
        assert!((median(&[4.0, 1.0, 2.0, 3.0]) - 2.5).abs() < 1e-15);
    }
}
