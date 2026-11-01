//! Resumo descritivo de uma coluna numérica.
//!
//! **Algoritmo.** Sejam `x₁…xₙ` os valores válidos (não ausentes).
//!
//! 1. `média = Σxᵢ / n`, com soma compensada de Neumaier.
//! 2. Desvios `dᵢ = xᵢ − média` (cada subtração é exata quando `xᵢ` e a média
//!    estão a menos de um fator 2 uma da outra, caso típico de dados com grande
//!    deslocamento).
//! 3. `variância = (Σdᵢ² − (Σdᵢ)² / n) / (n − 1)`: segunda passagem **corrigida**
//!    (Chan, Golub e LeVeque, 1983), que remove o erro de arredondamento da média.
//!    Ambas as somas usam soma compensada.
//!
//! O denominador é `n − 1` (variância amostral). Estados indefinidos são
//! explícitos em [`Stat::Undefined`]; nunca `NaN`, infinito ou zero substituto.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::numeric::CompensatedSum;

/// Motivo pelo qual uma estatística não está definida.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum UndefinedReason {
    /// Não há observação válida.
    NoValidObservations,
    /// A variância amostral exige ao menos duas observações válidas.
    FewerThanTwoObservations,
    /// O resultado não é representável em 64 bits (estouro ou entrada extrema).
    NonFiniteResult,
}

/// Estatística definida ou explicitamente indefinida.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "status", rename_all = "camelCase")]
#[ts(export)]
pub enum Stat {
    /// Valor finito.
    Defined {
        /// Valor.
        value: f64,
    },
    /// Sem valor, com o motivo.
    Undefined {
        /// Motivo.
        reason: UndefinedReason,
    },
}

impl Stat {
    fn finite(value: f64) -> Self {
        if value.is_finite() {
            Self::Defined { value }
        } else {
            Self::Undefined {
                reason: UndefinedReason::NonFiniteResult,
            }
        }
    }

    const fn undefined(reason: UndefinedReason) -> Self {
        Self::Undefined { reason }
    }

    /// Valor, se definido.
    #[must_use]
    pub const fn value(&self) -> Option<f64> {
        match self {
            Self::Defined { value } => Some(*value),
            Self::Undefined { .. } => None,
        }
    }
}

/// Resumo de uma coluna.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Summary {
    /// Observações consideradas (válidas + ausentes).
    pub n_total: u32,
    /// Observações sem valor.
    pub n_missing: u32,
    /// Observações com valor.
    pub n_valid: u32,
    /// Média aritmética.
    pub mean: Stat,
    /// Variância amostral (denominador n − 1).
    pub variance: Stat,
    /// Desvio-padrão amostral.
    pub sd: Stat,
    /// Mínimo.
    pub min: Stat,
    /// Máximo.
    pub max: Stat,
}

/// Resume uma sequência de valores, em que `None` é um valor ausente.
pub fn summarize_column(values: impl IntoIterator<Item = Option<f64>>) -> Summary {
    let mut valid: Vec<f64> = Vec::new();
    let mut n_total: u32 = 0;
    for value in values {
        n_total = n_total.saturating_add(1);
        if let Some(x) = value {
            valid.push(x);
        }
    }
    let n_valid = u32::try_from(valid.len()).unwrap_or(u32::MAX);
    let n_missing = n_total - n_valid.min(n_total);

    let (mean, variance, sd, min, max) = if valid.is_empty() {
        let none = Stat::undefined(UndefinedReason::NoValidObservations);
        (none, none, none, none, none)
    } else {
        let n = valid.len() as f64;
        let mean_value = valid.iter().copied().collect::<CompensatedSum>().total() / n;
        let (variance, sd) = if valid.len() < 2 {
            let reason = Stat::undefined(UndefinedReason::FewerThanTwoObservations);
            (reason, reason)
        } else {
            let variance = corrected_variance(&valid, mean_value);
            let sd = variance
                .value()
                .map_or(variance, |v| Stat::finite(v.sqrt()));
            (variance, sd)
        };
        let min = valid.iter().copied().fold(f64::INFINITY, f64::min);
        let max = valid.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        (
            Stat::finite(mean_value),
            variance,
            sd,
            Stat::finite(min),
            Stat::finite(max),
        )
    };

    Summary {
        n_total,
        n_missing,
        n_valid,
        mean,
        variance,
        sd,
        min,
        max,
    }
}

/// Variância amostral por segunda passagem corrigida (ver o cabeçalho do módulo).
fn corrected_variance(values: &[f64], mean: f64) -> Stat {
    let mut sum_d = CompensatedSum::new();
    let mut sum_d2 = CompensatedSum::new();
    for &x in values {
        let d = x - mean;
        sum_d.add(d);
        sum_d2.add(d * d);
    }
    let n = values.len() as f64;
    let correction = sum_d.total();
    let sum_squares = sum_d2.total() - correction * correction / n;
    // Erros de arredondamento podem produzir um valor negativo da ordem de 1e-16·Σd²
    // quando todos os valores são iguais; a variância verdadeira nunca é negativa.
    let raw = sum_squares / (n - 1.0);
    if !raw.is_finite() {
        // `f64::max` descartaria um NaN e o transformaria em 0.0: tratar antes.
        return Stat::finite(raw);
    }
    Stat::finite(raw.max(0.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(values: &[Option<f64>]) -> Summary {
        summarize_column(values.iter().copied())
    }

    fn v(stat: Stat) -> f64 {
        stat.value().unwrap_or(f64::NAN)
    }

    #[test]
    fn small_case_that_can_be_checked_by_hand() {
        // 2, 4, 4, 4, 5, 5, 7, 9 : média 5, Σ(x−5)² = 32, variância amostral 32/7.
        let r = s(&[2., 4., 4., 4., 5., 5., 7., 9.].map(Some));
        assert_eq!((r.n_total, r.n_missing, r.n_valid), (8, 0, 8));
        assert_eq!(v(r.mean), 5.0);
        assert!((v(r.variance) - 32.0 / 7.0).abs() < 1e-15);
        assert!((v(r.sd) - (32.0_f64 / 7.0).sqrt()).abs() < 1e-15);
        assert_eq!((v(r.min), v(r.max)), (2.0, 9.0));
    }

    #[test]
    fn missing_values_are_counted_not_substituted() {
        let r = s(&[Some(1.0), None, Some(3.0), None]);
        assert_eq!((r.n_total, r.n_missing, r.n_valid), (4, 2, 2));
        assert_eq!(v(r.mean), 2.0);
        assert_eq!(v(r.variance), 2.0);
    }

    #[test]
    fn empty_and_all_missing_are_undefined_with_a_reason() {
        for r in [s(&[]), s(&[None, None])] {
            for stat in [r.mean, r.variance, r.sd, r.min, r.max] {
                assert_eq!(stat, Stat::undefined(UndefinedReason::NoValidObservations));
            }
        }
    }

    #[test]
    fn one_value_has_mean_but_no_variance() {
        let r = s(&[Some(7.0)]);
        assert_eq!(v(r.mean), 7.0);
        assert_eq!(
            r.variance,
            Stat::undefined(UndefinedReason::FewerThanTwoObservations)
        );
        assert_eq!(
            r.sd,
            Stat::undefined(UndefinedReason::FewerThanTwoObservations)
        );
        assert_eq!((v(r.min), v(r.max)), (7.0, 7.0));
    }

    #[test]
    fn constant_data_has_zero_variance_not_nan() {
        let r = s(&[Some(3.3); 10]);
        assert_eq!(v(r.variance), 0.0);
        assert_eq!(v(r.sd), 0.0);
    }

    #[test]
    fn large_offset_keeps_the_small_spread() {
        // Variância ingênua (Σx² − nx̄²) perde todos os dígitos aqui.
        let r = s(&[10_000_000.1, 10_000_000.2, 10_000_000.3].map(Some));
        assert!((v(r.sd) - 0.1).abs() < 1e-8);
    }

    #[test]
    fn extreme_magnitudes_become_an_explicit_state() {
        let r = s(&[Some(f64::MAX), Some(f64::MAX)]);
        assert_eq!(r.mean, Stat::undefined(UndefinedReason::NonFiniteResult));
        let r = s(&[Some(1e200), Some(-1e200)]);
        assert_eq!(
            r.variance,
            Stat::undefined(UndefinedReason::NonFiniteResult)
        );
    }

    #[test]
    fn serializes_status_tagged_stats() {
        let json = serde_json::to_value(Stat::Defined { value: 1.5 }).unwrap_or_default();
        assert_eq!(json["status"], "defined");
        let json = serde_json::to_value(Stat::undefined(UndefinedReason::NoValidObservations))
            .unwrap_or_default();
        assert_eq!(json["reason"], "noValidObservations");
    }
}
