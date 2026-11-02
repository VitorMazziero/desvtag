//! Comparação de **amostras pareadas**: teste t pareado e teste dos postos sinalizados de Wilcoxon.
//!
//! As diferenças são `d = primeiro − segundo` (o `primeiro` é a condição 1). **t pareado:**
//! `t = d̄/(s_d/√n)` com `n − 1` graus de liberdade, intervalo de confiança da média das diferenças
//! e `d_z = d̄/s_d`. **Wilcoxon** (`zero_method = wilcox`, o padrão do SciPy): diferenças nulas são
//! descartadas; os postos de `|d|` recebem postos médios nos empates; `W₊` e `W₋` são as somas dos
//! postos positivos e negativos e a estatística é `mín(W₊, W₋)`. Com `n ≤ 50` e sem empates, o
//! valor-p é **exato** (distribuição por contagem de somas de subconjuntos de `1..n`; bilateral
//! `min(1, 2·P(W ≤ w))`); nos demais casos, a aproximação normal com correção de empates, sem
//! correção de continuidade.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::{normal, student_t};
use crate::errors::CoreError;
use crate::inference::intervals::t_critical;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "paired_comparison";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Maior `n` com valor-p exato do Wilcoxon.
pub const EXACT_LIMIT: usize = 50;

/// Pares de observações.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PairedRequest {
    /// Primeira condição (uma observação por par).
    pub first: Vec<f64>,
    /// Segunda condição (mesma ordem de pares).
    pub second: Vec<f64>,
    /// Nível de significância (`1 − α` de confiança).
    pub alpha: f64,
}

/// Teste t pareado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PairedT {
    /// Média das diferenças `primeiro − segundo`.
    pub mean_difference: Stat,
    /// Desvio-padrão das diferenças.
    pub sd_difference: Stat,
    /// Erro-padrão da média das diferenças.
    pub std_error: Stat,
    /// Estatística t.
    pub t: Stat,
    /// Graus de liberdade (`n − 1`).
    pub df: u32,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do intervalo de confiança.
    pub ci_lower: Stat,
    /// Limite superior do intervalo de confiança.
    pub ci_upper: Stat,
    /// Tamanho de efeito `d_z = d̄/s_d`.
    pub effect_size: Stat,
}

/// Teste dos postos sinalizados de Wilcoxon.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Wilcoxon {
    /// Pares com diferença não nula (usados no teste).
    pub n_used: u32,
    /// Pares com diferença nula (descartados).
    pub n_zero: u32,
    /// Soma dos postos das diferenças positivas.
    pub w_plus: f64,
    /// Soma dos postos das diferenças negativas.
    pub w_minus: f64,
    /// Estatística `mín(W₊, W₋)`.
    pub statistic: f64,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// `exact` ou `normalApproximation`.
    pub method: String,
    /// Há empates entre os valores absolutos das diferenças.
    pub has_ties: bool,
}

/// Resultado da comparação pareada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PairedResult {
    /// Pares.
    pub n: u32,
    /// Média da primeira condição.
    pub mean_first: f64,
    /// Média da segunda condição.
    pub mean_second: f64,
    /// Teste t pareado.
    pub t_test: PairedT,
    /// Teste de Wilcoxon (indefinido se todas as diferenças forem nulas).
    pub wilcoxon: Option<Wilcoxon>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn stat(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}

/// Postos médios de `values` (1-based) e a correção de empates `Σ (t³ − t)`.
fn midranks(values: &[f64]) -> (Vec<f64>, f64, bool) {
    let mut order: Vec<usize> = (0..values.len()).collect();
    order.sort_by(|&a, &b| values[a].total_cmp(&values[b]));
    let mut ranks = vec![0.0; values.len()];
    let mut tie_term = 0.0;
    let mut has_ties = false;
    let mut i = 0;
    while i < order.len() {
        let mut j = i;
        while j + 1 < order.len() && values[order[j + 1]] == values[order[i]] {
            j += 1;
        }
        let rank = (i + j) as f64 / 2.0 + 1.0;
        for &k in &order[i..=j] {
            ranks[k] = rank;
        }
        let t = (j - i + 1) as f64;
        if t > 1.0 {
            has_ties = true;
            tie_term += t * t * t - t;
        }
        i = j + 1;
    }
    (ranks, tie_term, has_ties)
}

/// `P(W ≤ w)` da estatística de postos sinalizados com `n` pares (sem empates).
fn exact_cdf(n: usize, w: f64) -> f64 {
    let max = n * (n + 1) / 2;
    let mut counts = vec![0.0_f64; max + 1];
    counts[0] = 1.0;
    for k in 1..=n {
        for s in (k..=max).rev() {
            counts[s] += counts[s - k];
        }
    }
    let total: f64 = counts.iter().sum();
    let upto = (w.floor() as usize).min(max);
    counts[..=upto].iter().sum::<f64>() / total
}

fn wilcoxon(differences: &[f64]) -> Option<Wilcoxon> {
    let nonzero: Vec<f64> = differences.iter().copied().filter(|d| *d != 0.0).collect();
    let n_zero = differences.len() - nonzero.len();
    if nonzero.is_empty() {
        return None;
    }
    let absolute: Vec<f64> = nonzero.iter().map(|d| d.abs()).collect();
    let (ranks, tie_term, has_ties) = midranks(&absolute);
    let w_plus: f64 = nonzero
        .iter()
        .zip(&ranks)
        .filter(|(d, _)| **d > 0.0)
        .map(|(_, r)| r)
        .sum();
    let n = nonzero.len();
    let total = n as f64 * (n as f64 + 1.0) / 2.0;
    let w_minus = total - w_plus;
    let statistic = w_plus.min(w_minus);
    let exact = n <= EXACT_LIMIT && !has_ties && n_zero == 0;
    let (p, method) = if exact {
        ((2.0 * exact_cdf(n, statistic)).min(1.0), "exact")
    } else {
        let mean = n as f64 * (n as f64 + 1.0) / 4.0;
        let variance =
            n as f64 * (n as f64 + 1.0) * (2.0 * n as f64 + 1.0) / 24.0 - tie_term / 48.0;
        let z = (w_plus - mean) / variance.sqrt();
        ((2.0 * normal::sf(z.abs())).min(1.0), "normalApproximation")
    };
    Some(Wilcoxon {
        n_used: u32::try_from(n).unwrap_or(u32::MAX),
        n_zero: u32::try_from(n_zero).unwrap_or(u32::MAX),
        w_plus,
        w_minus,
        statistic,
        p_value: stat(p),
        method: method.to_string(),
        has_ties,
    })
}

/// Compara as duas condições pareadas.
///
/// # Errors
/// [`CoreError::InvalidInput`] para tamanhos diferentes, menos de 2 pares, valores não finitos ou
/// nível de significância inválido.
pub fn compare(request: &PairedRequest) -> Result<PairedResult, CoreError> {
    let mut issues = Vec::new();
    if request.first.len() != request.second.len() {
        issues.push(error("paired.length_mismatch"));
    }
    if request.first.len() < 2 {
        issues.push(error("paired.too_few_pairs"));
    }
    if request
        .first
        .iter()
        .chain(&request.second)
        .any(|v| !v.is_finite())
    {
        issues.push(error("model.non_finite_input"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("model.invalid_confidence_level"));
    }
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let n = request.first.len();
    let nf = n as f64;
    let d: Vec<f64> = request
        .first
        .iter()
        .zip(&request.second)
        .map(|(a, b)| a - b)
        .collect();
    let mean = d.iter().sum::<f64>() / nf;
    let ss: f64 = d.iter().map(|v| (v - mean).powi(2)).sum();
    let sd = (ss / (nf - 1.0)).sqrt();
    let se = sd / nf.sqrt();
    let df = nf - 1.0;
    let t_test = if sd > 0.0 {
        let t = mean / se;
        let crit = t_critical(1.0 - request.alpha, df).unwrap_or(f64::NAN);
        PairedT {
            mean_difference: stat(mean),
            sd_difference: stat(sd),
            std_error: stat(se),
            t: stat(t),
            df: u32::try_from(n - 1).unwrap_or(u32::MAX),
            p_value: stat((2.0 * student_t::sf(t.abs(), df)).min(1.0)),
            ci_lower: stat(mean - crit * se),
            ci_upper: stat(mean + crit * se),
            effect_size: stat(mean / sd),
        }
    } else {
        let undefined = Stat::undefined(UndefinedReason::ConstantResponse);
        PairedT {
            mean_difference: stat(mean),
            sd_difference: stat(sd),
            std_error: stat(se),
            t: undefined,
            df: u32::try_from(n - 1).unwrap_or(u32::MAX),
            p_value: undefined,
            ci_lower: undefined,
            ci_upper: undefined,
            effect_size: undefined,
        }
    };
    let mut notes = Vec::new();
    if n < 6 {
        notes.push(Issue::new("paired.few_pairs", Severity::Warning));
    }
    Ok(PairedResult {
        n: u32::try_from(n).unwrap_or(u32::MAX),
        mean_first: request.first.iter().sum::<f64>() / nf,
        mean_second: request.second.iter().sum::<f64>() / nf,
        t_test,
        wilcoxon: wilcoxon(&d),
        issues: notes,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn request(a: &[f64], b: &[f64]) -> PairedRequest {
        PairedRequest {
            first: a.to_vec(),
            second: b.to_vec(),
            alpha: 0.05,
        }
    }

    #[test]
    fn paired_t_matches_a_hand_computation() {
        // d = [1, 2, 3, 4, 5]: média 3, s = √2,5 ≈ 1,5811; t = 3/(1,5811/√5) = 4,2426; gl = 4.
        let r = compare(&request(
            &[2.0, 4.0, 6.0, 8.0, 10.0],
            &[1.0, 2.0, 3.0, 4.0, 5.0],
        ))
        .expect("t pareado");
        assert!((r.t_test.t.value().expect("t") - 4.242_640_687).abs() < 1e-8);
        assert_eq!(r.t_test.df, 4);
        assert!(r.t_test.p_value.value().expect("p") < 0.02);
        assert!((r.t_test.mean_difference.value().expect("d") - 3.0).abs() < 1e-12);
    }

    #[test]
    fn wilcoxon_exact_counts_the_subset_sums() {
        // n = 5, todas as diferenças positivas e sem empates: W₋ = 0 → p = 2/32 = 0,0625.
        let r = compare(&request(
            &[2.0, 4.0, 6.0, 8.0, 10.5],
            &[1.0, 2.0, 3.0, 4.0, 5.0],
        ))
        .expect("wilcoxon");
        let w = r.wilcoxon.expect("wilcoxon");
        assert_eq!(w.method, "exact");
        assert_eq!(w.statistic, 0.0);
        assert!((w.p_value.value().expect("p") - 0.0625).abs() < 1e-12);
    }

    #[test]
    fn zeros_and_ties_use_the_normal_approximation_with_the_tie_correction() {
        let r = compare(&request(
            &[5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0],
            &[5.0, 5.0, 6.0, 7.0, 7.0, 11.0, 10.0],
        ))
        .expect("wilcoxon");
        let w = r.wilcoxon.expect("wilcoxon");
        assert_eq!(w.n_zero, 1);
        assert_eq!(w.method, "normalApproximation");
        assert!(w.has_ties);
    }

    #[test]
    fn constant_differences_have_an_undefined_t_and_all_zero_has_no_wilcoxon() {
        let r = compare(&request(&[3.0, 4.0, 5.0], &[3.0, 4.0, 5.0])).expect("zeros");
        assert!(r.wilcoxon.is_none());
        assert!(r.t_test.t.value().is_none());
    }

    #[test]
    fn invalid_requests_are_rejected() {
        assert!(compare(&request(&[1.0, 2.0], &[1.0])).is_err());
        assert!(compare(&request(&[1.0], &[2.0])).is_err());
        assert!(compare(&request(&[1.0, f64::NAN], &[1.0, 2.0])).is_err());
    }
}
