//! Comparações múltiplas de Tukey (HSD) e Tukey–Kramer.
//!
//! **Família:** todos os `k(k − 1)/2` pares de médias de um fator, com nível de confiança
//! simultâneo `1 − α`. Para o par `(i, j)`:
//!
//! `d = ȳᵢ − ȳⱼ`, `EP = √(QME/2 · (1/nᵢ + 1/nⱼ))`, `q = |d|/EP`, valor-p ajustado
//! `P(Q(k, gl) > q)` (amplitude studentizada) e intervalo simultâneo `d ± q_crit · EP`, com
//! `q_crit` o quantil superior `α`. Com grupos de mesmo tamanho é o Tukey original; com tamanhos
//! diferentes é a extensão de Kramer, conservadora.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::studentized_range::StudentizedRange;

/// Variante aplicada.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum TukeyVariant {
    /// Grupos do mesmo tamanho.
    Tukey,
    /// Grupos de tamanhos diferentes.
    TukeyKramer,
}

/// Comparação de um par.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PairComparison {
    /// Índice do primeiro grupo.
    pub group_a: u32,
    /// Índice do segundo grupo.
    pub group_b: u32,
    /// Diferença `ȳ_a − ȳ_b`.
    pub difference: Stat,
    /// Erro-padrão da diferença.
    pub std_error: Stat,
    /// Estatística `q` (valor absoluto).
    pub q_statistic: Stat,
    /// Valor-p ajustado pela família.
    pub p_adjusted: Stat,
    /// Limite inferior do intervalo simultâneo.
    pub ci_lower: Stat,
    /// Limite superior do intervalo simultâneo.
    pub ci_upper: Stat,
    /// Diferença detectada (`p_ajustado < α`); `None` quando o par não pôde ser testado.
    pub significant: Option<bool>,
}

/// Resultado das comparações.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TukeyResult {
    /// Variante.
    pub variant: TukeyVariant,
    /// Nível de significância da família.
    pub alpha: f64,
    /// Número de grupos (tamanho da família de médias).
    pub groups: u32,
    /// Número de comparações.
    pub comparisons_count: u32,
    /// Graus de liberdade do erro.
    pub df_error: u32,
    /// Quantil crítico `q_crit`.
    pub critical_value: Stat,
    /// Pares, em ordem `(0,1), (0,2), …, (k−2,k−1)`.
    pub comparisons: Vec<PairComparison>,
}

/// Executa todas as comparações.
///
/// `means` e `sizes` seguem a mesma ordem; `mse` é o quadrado médio do erro e `df_error` seus
/// graus de liberdade. Devolve `None` se `k < 2`, `df_error = 0` ou `mse ≤ 0` (nenhuma estimativa
/// de erro utilizável).
#[must_use]
pub fn compare(
    means: &[f64],
    sizes: &[usize],
    mse: f64,
    df_error: usize,
    alpha: f64,
) -> Option<TukeyResult> {
    let k = means.len();
    if k < 2
        || sizes.len() != k
        || df_error == 0
        || mse.is_nan()
        || mse <= 0.0
        || alpha.is_nan()
        || alpha <= 0.0
        || alpha >= 1.0
    {
        return None;
    }
    let kernel = StudentizedRange::tabulated(k, df_error as f64).ok()?;
    let critical = kernel.quantile_upper(alpha).ok();
    let balanced = sizes.iter().all(|&s| s == sizes[0]);
    let mut comparisons = Vec::with_capacity(k * (k - 1) / 2);
    for a in 0..k {
        for b in (a + 1)..k {
            let difference = means[a] - means[b];
            let se = (0.5 * mse * (1.0 / sizes[a] as f64 + 1.0 / sizes[b] as f64)).sqrt();
            let q = difference.abs() / se;
            let p = kernel.sf(q);
            let ci = critical.map(|c| (difference - c * se, difference + c * se));
            let stat_of = |v: Option<f64>| {
                v.map_or(
                    Stat::undefined(UndefinedReason::NonFiniteResult),
                    Stat::finite,
                )
            };
            comparisons.push(PairComparison {
                group_a: u32::try_from(a).unwrap_or(u32::MAX),
                group_b: u32::try_from(b).unwrap_or(u32::MAX),
                difference: Stat::finite(difference),
                std_error: Stat::finite(se),
                q_statistic: Stat::finite(q),
                p_adjusted: stat_of(p.is_finite().then_some(p)),
                ci_lower: stat_of(ci.map(|c| c.0)),
                ci_upper: stat_of(ci.map(|c| c.1)),
                significant: p.is_finite().then_some(p < alpha),
            });
        }
    }
    Some(TukeyResult {
        variant: if balanced {
            TukeyVariant::Tukey
        } else {
            TukeyVariant::TukeyKramer
        },
        alpha,
        groups: u32::try_from(k).unwrap_or(u32::MAX),
        comparisons_count: u32::try_from(comparisons.len()).unwrap_or(u32::MAX),
        df_error: u32::try_from(df_error).unwrap_or(u32::MAX),
        critical_value: stat_of_critical(critical),
        comparisons,
    })
}

fn stat_of_critical(value: Option<f64>) -> Stat {
    value.map_or(
        Stat::undefined(UndefinedReason::NonFiniteResult),
        Stat::finite,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balanced_and_unbalanced_variants_are_chosen_by_group_sizes() {
        let r = compare(&[10.0, 12.0, 15.0], &[5, 5, 5], 4.0, 12, 0.05)
            .unwrap_or_else(|| unreachable!());
        assert_eq!(r.variant, TukeyVariant::Tukey);
        assert_eq!(r.comparisons_count, 3);
        let r = compare(&[10.0, 12.0, 15.0], &[5, 6, 5], 4.0, 13, 0.05)
            .unwrap_or_else(|| unreachable!());
        assert_eq!(r.variant, TukeyVariant::TukeyKramer);
    }

    #[test]
    fn significance_agrees_with_the_simultaneous_interval() {
        let r = compare(&[10.0, 11.0, 14.5, 10.2], &[6, 6, 6, 6], 1.5, 20, 0.05)
            .unwrap_or_else(|| unreachable!());
        for c in &r.comparisons {
            let (lo, hi) = (
                c.ci_lower.value().unwrap_or(f64::NAN),
                c.ci_upper.value().unwrap_or(f64::NAN),
            );
            let excludes_zero = lo > 0.0 || hi < 0.0;
            assert_eq!(c.significant, Some(excludes_zero), "{c:?}");
        }
        // Erro-padrão balanceado: √(QME/n) = √(1,5/6).
        let se = r.comparisons[0].std_error.value().unwrap_or(f64::NAN);
        assert!((se - (1.5_f64 / 6.0).sqrt()).abs() < 1e-14);
    }

    #[test]
    fn no_error_estimate_means_no_comparison() {
        assert!(compare(&[1.0, 2.0], &[1, 1], 1.0, 0, 0.05).is_none());
        assert!(compare(&[1.0, 2.0], &[2, 2], 0.0, 2, 0.05).is_none());
        assert!(compare(&[1.0], &[2], 1.0, 2, 0.05).is_none());
        assert!(compare(&[1.0, 2.0], &[2, 2], 1.0, 2, 1.5).is_none());
    }
}
