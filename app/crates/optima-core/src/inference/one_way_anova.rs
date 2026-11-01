//! ANOVA de um fator (delineamento inteiramente casualizado).
//!
//! **Pergunta.** As médias dos `k` grupos são todas iguais? Pressupõe observações independentes,
//! resíduos de média zero e variância comum; o motor **calcula** e mostra evidências, mas não
//! declara que os pressupostos valem nem que as linhas sejam réplicas independentes.
//!
//! **Fórmulas** (`nᵍ` observações no grupo `g`, `N = Σ nᵍ`):
//! `SQE = Σ_g Σ_i (y − ȳ_g)²`, `SQT_ent = Σ_g nᵍ (ȳ_g − ȳ)²`, `gl = k − 1` e `N − k`,
//! `F = (SQ_ent/(k−1)) / (SQE/(N−k))`, `η² = SQ_ent/SQT`, `ω² = (SQ_ent − (k−1)QME)/(SQT + QME)`,
//! `CV = 100·√QME/|ȳ|`.
//!
//! **Algoritmo.** Todos os dados são deslocados por um valor de referência (o primeiro) antes das
//! somas — a subtração é exata para dados próximos — e as somas de quadrados usam a segunda
//! passagem corrigida, de modo que grandes deslocamentos (NIST SmLs09) não destroem a precisão.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::regression_anova::AnovaRow;
use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::f;
use crate::numeric::CompensatedSum;

/// Partição das somas de quadrados (valores brutos, sem estados indefinidos).
#[derive(Debug, Clone, PartialEq)]
pub struct Partition {
    /// Número de grupos.
    pub k: usize,
    /// Total de observações.
    pub n: usize,
    /// Média geral.
    pub grand_mean: f64,
    /// Média de cada grupo.
    pub group_means: Vec<f64>,
    /// Soma de quadrados entre grupos.
    pub ss_between: f64,
    /// Soma de quadrados dentro dos grupos.
    pub ss_within: f64,
    /// Soma de quadrados total.
    pub ss_total: f64,
}

fn corrected_sum_of_squares(values: &[f64]) -> (f64, f64) {
    // Devolve (média, Σ(x − média)² corrigida), sobre valores já deslocados.
    let n = values.len() as f64;
    let mut sum = CompensatedSum::new();
    values.iter().for_each(|v| sum.add(*v));
    let mean = sum.total() / n;
    let (mut ss, mut dev) = (CompensatedSum::new(), CompensatedSum::new());
    for v in values {
        let d = v - mean;
        ss.add(d * d);
        dev.add(d);
    }
    let correction = dev.total() * dev.total() / n;
    (mean, (ss.total() - correction).max(0.0))
}

/// Calcula a partição para os grupos dados (cada um com ao menos uma observação finita).
#[must_use]
pub fn partition(groups: &[&[f64]]) -> Option<Partition> {
    let shift = *groups.iter().flat_map(|g| g.iter()).next()?;
    let shifted: Vec<Vec<f64>> = groups
        .iter()
        .map(|g| g.iter().map(|v| v - shift).collect())
        .collect();
    let all: Vec<f64> = shifted.iter().flatten().copied().collect();
    let n = all.len();
    let (grand_shifted, ss_total) = corrected_sum_of_squares(&all);
    let (mut ss_within, mut ss_between) = (CompensatedSum::new(), CompensatedSum::new());
    let mut group_means = Vec::with_capacity(groups.len());
    for g in &shifted {
        let (mean, ss) = corrected_sum_of_squares(g);
        ss_within.add(ss);
        let d = mean - grand_shifted;
        ss_between.add(g.len() as f64 * d * d);
        group_means.push(shift + mean);
    }
    let result = Partition {
        k: groups.len(),
        n,
        grand_mean: shift + grand_shifted,
        group_means,
        ss_between: ss_between.total(),
        ss_within: ss_within.total(),
        ss_total,
    };
    (result.ss_between.is_finite() && result.ss_within.is_finite() && result.ss_total.is_finite())
        .then_some(result)
}

/// Linha F do teste global.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OneWayAnova {
    /// Entre grupos.
    pub between: AnovaRow,
    /// Dentro dos grupos (erro).
    pub within: AnovaRow,
    /// Total.
    pub total: AnovaRow,
    /// Estatística F.
    pub f: Stat,
    /// Valor-p (cauda superior de F).
    pub p_value: Stat,
}

/// Tamanhos de efeito e coeficiente de variação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EffectSizes {
    /// `η² = SQ_entre/SQ_total`.
    pub eta_squared: Stat,
    /// `ω²`, estimativa menos viesada (pode ser negativa; não é truncada).
    pub omega_squared: Stat,
    /// Coeficiente de variação em % (`100·√QME/|média geral|`).
    pub cv_percent: Stat,
}

fn row(df: usize, ss: f64) -> AnovaRow {
    AnovaRow {
        df: u32::try_from(df).unwrap_or(u32::MAX),
        sum_squares: Stat::finite(ss),
        mean_square: if df > 0 {
            Stat::finite(ss / df as f64)
        } else {
            Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom)
        },
    }
}

/// Tabela da ANOVA e tamanhos de efeito a partir da partição.
#[must_use]
pub fn table(p: &Partition) -> (OneWayAnova, EffectSizes) {
    let df_between = p.k - 1;
    let df_within = p.n - p.k;
    let mse = (df_within > 0).then(|| p.ss_within / df_within as f64);
    let msb = p.ss_between / df_between.max(1) as f64;
    let (f_stat, p_value) = match mse {
        None => {
            let u = Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom);
            (u, u)
        }
        Some(mse) if mse <= 0.0 => {
            let u = Stat::undefined(UndefinedReason::ConstantResponse);
            (u, u)
        }
        Some(mse) => {
            let value = msb / mse;
            if value.is_finite() {
                (
                    Stat::finite(value),
                    Stat::finite(f::sf(value, df_between as f64, df_within as f64)),
                )
            } else {
                let u = Stat::undefined(UndefinedReason::NonFiniteResult);
                (u, u)
            }
        }
    };
    let anova = OneWayAnova {
        between: row(df_between, p.ss_between),
        within: row(df_within, p.ss_within),
        total: row(p.n - 1, p.ss_total),
        f: f_stat,
        p_value,
    };
    let effect = match mse {
        _ if p.ss_total <= 0.0 => {
            let u = Stat::undefined(UndefinedReason::ConstantResponse);
            EffectSizes {
                eta_squared: u,
                omega_squared: u,
                cv_percent: if p.grand_mean == 0.0 {
                    Stat::undefined(UndefinedReason::ZeroMean)
                } else {
                    Stat::finite(0.0)
                },
            }
        }
        None => EffectSizes {
            eta_squared: Stat::finite(p.ss_between / p.ss_total),
            omega_squared: Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom),
            cv_percent: Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom),
        },
        Some(mse) => EffectSizes {
            eta_squared: Stat::finite(p.ss_between / p.ss_total),
            omega_squared: Stat::finite(
                (p.ss_between - df_between as f64 * mse) / (p.ss_total + mse),
            ),
            cv_percent: if p.grand_mean == 0.0 {
                Stat::undefined(UndefinedReason::ZeroMean)
            } else {
                Stat::finite(100.0 * mse.sqrt() / p.grand_mean.abs())
            },
        },
    };
    (anova, effect)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classic_three_group_example() {
        // Grupos (1,2,3), (2,3,4), (5,6,7): médias 2, 3, 6; média geral 11/3.
        let g: [&[f64]; 3] = [&[1.0, 2.0, 3.0], &[2.0, 3.0, 4.0], &[5.0, 6.0, 7.0]];
        let p = partition(&g).unwrap_or_else(|| unreachable!());
        assert_eq!(p.group_means, [2.0, 3.0, 6.0]);
        // SQE = 2+2+2 = 6 ; SQ_ent = 3[(2−11/3)²+(3−11/3)²+(6−11/3)²] = 3·(25/9+4/9+49/9) = 26
        assert!((p.ss_within - 6.0).abs() < 1e-13);
        assert!((p.ss_between - 26.0).abs() < 1e-12);
        assert!((p.ss_total - 32.0).abs() < 1e-12);
        let (anova, effect) = table(&p);
        // F = (26/2)/(6/6) = 13
        assert!((anova.f.value().unwrap_or(f64::NAN) - 13.0).abs() < 1e-12);
        assert!((effect.eta_squared.value().unwrap_or(f64::NAN) - 26.0 / 32.0).abs() < 1e-13);
        // ω² = (26 − 2·1)/(32 + 1) = 24/33
        assert!((effect.omega_squared.value().unwrap_or(f64::NAN) - 24.0 / 33.0).abs() < 1e-12);
        // CV = 100·√1/(11/3)
        assert!((effect.cv_percent.value().unwrap_or(f64::NAN) - 100.0 * 3.0 / 11.0).abs() < 1e-10);
    }

    #[test]
    fn large_offset_does_not_destroy_precision() {
        let shift = 1e12;
        let g: [&[f64]; 2] = [
            &[shift + 1.0, shift + 2.0, shift + 3.0],
            &[shift + 2.0, shift + 4.0, shift + 6.0],
        ];
        let p = partition(&g).unwrap_or_else(|| unreachable!());
        assert!((p.ss_within - (2.0 + 8.0)).abs() < 1e-9, "{}", p.ss_within);
        assert!((p.ss_between - 6.0).abs() < 1e-9, "{}", p.ss_between); // 3·1² + 3·1²
    }

    #[test]
    fn degenerate_cases_are_explicit() {
        let one: [&[f64]; 2] = [&[1.0], &[3.0]];
        let (a, e) = table(&partition(&one).unwrap_or_else(|| unreachable!()));
        assert_eq!(
            a.f,
            Stat::Undefined {
                reason: UndefinedReason::NoResidualDegreesOfFreedom
            }
        );
        assert_eq!(
            e.cv_percent,
            Stat::Undefined {
                reason: UndefinedReason::NoResidualDegreesOfFreedom
            }
        );
        let same: [&[f64]; 2] = [&[2.0, 2.0], &[2.0, 2.0]];
        let (a, e) = table(&partition(&same).unwrap_or_else(|| unreachable!()));
        assert_eq!(
            a.f,
            Stat::Undefined {
                reason: UndefinedReason::ConstantResponse
            }
        );
        assert_eq!(
            e.eta_squared,
            Stat::Undefined {
                reason: UndefinedReason::ConstantResponse
            }
        );
    }
}
