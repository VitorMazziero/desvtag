//! Falta de ajuste e erro puro.
//!
//! Com réplicas verdadeiras (ensaios no mesmo ajuste dos fatores), `SQ_puro = Σ_g Σ_i (y − ȳ_g)²`
//! com `n − m` graus de liberdade (`m` = ajustes distintos); `SQ_falta = SQE − SQ_puro` com
//! `gl_res − (n − m)` graus; `F = (SQ_falta/gl_falta)/(SQ_puro/gl_puro)`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::f;
use crate::numeric::CompensatedSum;

/// Falta de ajuste e erro puro.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LackOfFit {
    /// Soma de quadrados do erro puro.
    pub ss_pure_error: f64,
    /// Graus de liberdade do erro puro.
    pub df_pure_error: u32,
    /// Soma de quadrados da falta de ajuste.
    pub ss_lack_of_fit: Stat,
    /// Graus de liberdade da falta de ajuste.
    pub df_lack_of_fit: u32,
    /// Estatística F.
    pub f: Stat,
    /// Valor-p.
    pub p_value: Stat,
}

/// Calcula a falta de ajuste: `groups` = respostas em cada ajuste distinto dos fatores.
///
/// `None` sem graus de liberdade de erro puro (nenhuma réplica).
#[must_use]
pub fn lack_of_fit(groups: &[Vec<f64>], ss_residual: f64, df_residual: usize) -> Option<LackOfFit> {
    let n: usize = groups.iter().map(Vec::len).sum();
    let df_pure = n - groups.len();
    if df_pure == 0 {
        return None;
    }
    let mut ss_pure = CompensatedSum::new();
    for g in groups.iter().filter(|g| g.len() > 1) {
        let mean = g.iter().sum::<f64>() / g.len() as f64;
        let mut inner = CompensatedSum::new();
        g.iter().for_each(|v| inner.add((v - mean) * (v - mean)));
        ss_pure.add(inner.total());
    }
    let ss_pure = ss_pure.total();
    let df_lof = df_residual.saturating_sub(df_pure);
    let to_u32 = |v: usize| u32::try_from(v).unwrap_or(u32::MAX);
    if df_lof == 0 {
        let u = Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom);
        return Some(LackOfFit {
            ss_pure_error: ss_pure,
            df_pure_error: to_u32(df_pure),
            ss_lack_of_fit: Stat::finite((ss_residual - ss_pure).max(0.0)),
            df_lack_of_fit: 0,
            f: u,
            p_value: u,
        });
    }
    let ss_lof = (ss_residual - ss_pure).max(0.0);
    let (f_stat, p) = if ss_pure > 0.0 {
        let value = (ss_lof / df_lof as f64) / (ss_pure / df_pure as f64);
        (
            Stat::finite(value),
            Stat::finite(f::sf(value, df_lof as f64, df_pure as f64)),
        )
    } else {
        let u = Stat::undefined(UndefinedReason::ConstantResponse);
        (u, u)
    };
    Some(LackOfFit {
        ss_pure_error: ss_pure,
        df_pure_error: to_u32(df_pure),
        ss_lack_of_fit: Stat::finite(ss_lof),
        df_lack_of_fit: to_u32(df_lof),
        f: f_stat,
        p_value: p,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_the_residual_into_pure_error_and_lack_of_fit() {
        // Dois ajustes com 3 réplicas cada; modelo com 1 parâmetro ⇒ gl_res = 5; erro puro: 4 gl.
        let groups = vec![vec![1.0, 2.0, 3.0], vec![10.0, 12.0, 14.0]];
        // SQ puro = 2 + 8 = 10; suponha SQE = 14 ⇒ SQ falta = 4 com 1 gl; F = 4/(10/4) = 1,6.
        let l = lack_of_fit(&groups, 14.0, 5).unwrap_or_else(|| unreachable!());
        assert_eq!((l.df_pure_error, l.df_lack_of_fit), (4, 1));
        assert!((l.ss_pure_error - 10.0).abs() < 1e-13);
        assert!((l.f.value().unwrap_or(f64::NAN) - 1.6).abs() < 1e-12);
    }

    #[test]
    fn needs_replicates_and_flags_a_saturated_split() {
        assert!(lack_of_fit(&[vec![1.0], vec![2.0]], 0.5, 1).is_none());
        let l = lack_of_fit(&[vec![1.0, 3.0]], 2.0, 1).unwrap_or_else(|| unreachable!());
        assert_eq!(l.df_lack_of_fit, 0);
        assert_eq!(
            l.f,
            Stat::Undefined {
                reason: UndefinedReason::NoResidualDegreesOfFreedom
            }
        );
    }
}
