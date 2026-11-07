//! ANOVA da regressão: modelo, resíduo e total.
//!
//! Com intercepto, a soma total é centrada na média (`gl_total = n − 1`, `gl_modelo = posto − 1`).
//! Sem intercepto, a convenção é a não centrada usada pelo NIST StRD (`SQ_total = Σy²`,
//! `gl_modelo = posto`). A escolha é informada em [`RegressionAnova::centered`].

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::f;

/// Linha da tabela.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AnovaRow {
    /// Graus de liberdade.
    pub df: u32,
    /// Soma de quadrados.
    pub sum_squares: Stat,
    /// Quadrado médio.
    pub mean_square: Stat,
}

/// Tabela da ANOVA da regressão e medidas de ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RegressionAnova {
    /// Soma centrada na média (com intercepto) ou não centrada (sem intercepto).
    pub centered: bool,
    /// Modelo.
    pub model: AnovaRow,
    /// Resíduo.
    pub residual: AnovaRow,
    /// Total.
    pub total: AnovaRow,
    /// Estatística F global.
    pub f: Stat,
    /// Valor-p do teste F global.
    pub p_value: Stat,
    /// Coeficiente de determinação.
    pub r_squared: Stat,
    /// Coeficiente de determinação ajustado.
    pub adjusted_r_squared: Stat,
}

/// Somas de quadrados e graus de liberdade de entrada.
#[derive(Debug, Clone, Copy)]
pub struct Partition {
    /// Soma de quadrados do modelo.
    pub ss_model: f64,
    /// Soma de quadrados residual.
    pub ss_residual: f64,
    /// Soma de quadrados total.
    pub ss_total: f64,
    /// Graus de liberdade do modelo.
    pub df_model: usize,
    /// Graus de liberdade residuais.
    pub df_residual: usize,
    /// Graus de liberdade totais.
    pub df_total: usize,
    /// A soma total é centrada.
    pub centered: bool,
}

fn row(df: usize, ss: f64, undefined_ms: Option<UndefinedReason>) -> AnovaRow {
    let mean_square = match undefined_ms {
        Some(reason) => Stat::undefined(reason),
        None if df > 0 => Stat::finite(ss / df as f64),
        None => Stat::undefined(UndefinedReason::NoModelTerms),
    };
    AnovaRow {
        df: u32::try_from(df).unwrap_or(u32::MAX),
        sum_squares: Stat::finite(ss),
        mean_square,
    }
}

/// Monta a tabela, `R²`, `R²` ajustado, `F` e valor-p.
#[must_use]
pub fn build(p: Partition) -> RegressionAnova {
    let residual_reason =
        (p.df_residual == 0).then_some(UndefinedReason::NoResidualDegreesOfFreedom);
    let model = row(p.df_model, p.ss_model, None);
    let residual = row(p.df_residual, p.ss_residual, residual_reason);
    let total = row(p.df_total, p.ss_total, None);

    let (f_stat, p_value) = if p.df_model == 0 {
        let u = Stat::undefined(UndefinedReason::NoModelTerms);
        (u, u)
    } else if p.df_residual == 0 {
        let u = Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom);
        (u, u)
    } else if p.ss_total <= 0.0 {
        let u = Stat::undefined(UndefinedReason::ConstantResponse);
        (u, u)
    } else {
        let value = (p.ss_model / p.df_model as f64) / (p.ss_residual / p.df_residual as f64);
        if value.is_finite() {
            (
                Stat::finite(value),
                Stat::finite(f::sf(value, p.df_model as f64, p.df_residual as f64)),
            )
        } else {
            let u = Stat::undefined(UndefinedReason::NonFiniteResult);
            (u, u)
        }
    };

    let (r_squared, adjusted) = if p.ss_total <= 0.0 {
        let u = Stat::undefined(UndefinedReason::ConstantResponse);
        (u, u)
    } else {
        let r2 = 1.0 - p.ss_residual / p.ss_total;
        let adjusted = if p.df_residual == 0 {
            Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom)
        } else {
            Stat::finite(1.0 - (1.0 - r2) * p.df_total as f64 / p.df_residual as f64)
        };
        (Stat::finite(r2), adjusted)
    };

    RegressionAnova {
        centered: p.centered,
        model,
        residual,
        total,
        f: f_stat,
        p_value,
        r_squared,
        adjusted_r_squared: adjusted,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classic_example_matches_hand_calculation() {
        // y = 1,3,2,5,4 em x = 1..5: Sxy = 8, Sxx = 10, SQT = 10, SQM = 6,4, SQE = 3,6.
        let table = build(Partition {
            ss_model: 6.4,
            ss_residual: 3.6,
            ss_total: 10.0,
            df_model: 1,
            df_residual: 3,
            df_total: 4,
            centered: true,
        });
        let f = table.f.value().unwrap_or(f64::NAN);
        assert!((f - 16.0 / 3.0).abs() < 1e-12);
        assert!((table.r_squared.value().unwrap_or(f64::NAN) - 0.64).abs() < 1e-12);
        let adj = table.adjusted_r_squared.value().unwrap_or(f64::NAN);
        assert!((adj - 0.52).abs() < 1e-12);
        // scipy.stats.f.sf(16/3, 1, 3)
        let p = table.p_value.value().unwrap_or(f64::NAN);
        assert!((p - 0.104_088_038_661_827_85).abs() < 1e-12, "{p}");
    }

    #[test]
    fn degenerate_cases_are_explicit_states() {
        let saturated = build(Partition {
            ss_model: 5.0,
            ss_residual: 0.0,
            ss_total: 5.0,
            df_model: 2,
            df_residual: 0,
            df_total: 2,
            centered: true,
        });
        assert_eq!(
            saturated.f,
            Stat::Undefined {
                reason: UndefinedReason::NoResidualDegreesOfFreedom
            }
        );
        let constant = build(Partition {
            ss_model: 0.0,
            ss_residual: 0.0,
            ss_total: 0.0,
            df_model: 1,
            df_residual: 3,
            df_total: 4,
            centered: true,
        });
        assert_eq!(
            constant.r_squared,
            Stat::Undefined {
                reason: UndefinedReason::ConstantResponse
            }
        );
        let only_intercept = build(Partition {
            ss_model: 0.0,
            ss_residual: 2.0,
            ss_total: 2.0,
            df_model: 0,
            df_residual: 3,
            df_total: 3,
            centered: true,
        });
        assert_eq!(
            only_intercept.f,
            Stat::Undefined {
                reason: UndefinedReason::NoModelTerms
            }
        );
    }
}
