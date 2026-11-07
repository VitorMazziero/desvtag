//! Séries dos gráficos de efeitos principais e de interações de dois fatores.
//!
//! As médias usam só os ensaios nos níveis ±1 (pontos centrais ficam à parte). Em planejamentos
//! fracionários as médias refletem o confundimento do desenho.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};

/// Médias de um fator nos níveis baixo e alto (e no centro, se houver).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MainEffectSeries {
    /// Índice do fator (ordem do planejamento).
    pub factor: u32,
    /// Média da resposta no nível baixo.
    pub low_mean: Stat,
    /// Média no nível alto.
    pub high_mean: Stat,
    /// Média nos pontos centrais, se houver.
    pub center_mean: Option<f64>,
}

/// Médias das quatro combinações de dois fatores.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct InteractionSeries {
    /// Primeiro fator.
    pub factor_a: u32,
    /// Segundo fator.
    pub factor_b: u32,
    /// Médias `[(−,−), (+,−), (−,+), (+,+)]` em (A, B).
    pub cell_means: Vec<Stat>,
}

const CENTER_TOLERANCE: f64 = 1e-9;

fn mean(values: &[f64]) -> Stat {
    if values.is_empty() {
        Stat::undefined(UndefinedReason::NoValidObservations)
    } else {
        Stat::finite(values.iter().sum::<f64>() / values.len() as f64)
    }
}

fn level(coded: f64) -> Option<bool> {
    if coded.abs() < CENTER_TOLERANCE {
        None
    } else {
        Some(coded > 0.0)
    }
}

/// Efeito principal do fator `factor`.
#[must_use]
pub fn main_effect(coded: &[Vec<f64>], y: &[f64], factor: usize) -> MainEffectSeries {
    let (mut low, mut high, mut center) = (Vec::new(), Vec::new(), Vec::new());
    for (row, value) in coded.iter().zip(y) {
        if row.iter().all(|c| c.abs() < CENTER_TOLERANCE) {
            center.push(*value);
            continue;
        }
        match row.get(factor).copied().and_then(level) {
            Some(true) => high.push(*value),
            Some(false) => low.push(*value),
            None => {}
        }
    }
    MainEffectSeries {
        factor: u32::try_from(factor).unwrap_or(u32::MAX),
        low_mean: mean(&low),
        high_mean: mean(&high),
        center_mean: mean(&center).value(),
    }
}

/// Interação entre `a` e `b`.
#[must_use]
pub fn interaction(coded: &[Vec<f64>], y: &[f64], a: usize, b: usize) -> InteractionSeries {
    let mut cells: [Vec<f64>; 4] = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];
    for (row, value) in coded.iter().zip(y) {
        if let (Some(la), Some(lb)) = (
            row.get(a).copied().and_then(level),
            row.get(b).copied().and_then(level),
        ) {
            cells[usize::from(la) + 2 * usize::from(lb)].push(*value);
        }
    }
    InteractionSeries {
        factor_a: u32::try_from(a).unwrap_or(u32::MAX),
        factor_b: u32::try_from(b).unwrap_or(u32::MAX),
        cell_means: cells.iter().map(|c| mean(c)).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn means_per_level_and_per_cell_with_center_apart() {
        // 2² com um ponto central: y = 10 + 3A + 2B + 1AB (efeitos conhecidos), centro = 10,5.
        let coded = vec![
            vec![-1.0, -1.0],
            vec![1.0, -1.0],
            vec![-1.0, 1.0],
            vec![1.0, 1.0],
            vec![0.0, 0.0],
        ];
        let y = vec![
            10.0 - 3.0 - 2.0 + 1.0,
            10.0 + 3.0 - 2.0 - 1.0,
            10.0 - 3.0 + 2.0 - 1.0,
            10.0 + 3.0 + 2.0 + 1.0,
            10.5,
        ];
        let m = main_effect(&coded, &y, 0);
        assert_eq!(m.low_mean.value(), Some(10.0 - 3.0 + 0.0)); // (6 + 8)/2 = 7
        assert_eq!(m.high_mean.value(), Some(13.0)); // (10+16)/2
        assert_eq!(m.center_mean, Some(10.5));
        let i = interaction(&coded, &y, 0, 1);
        let cells: Vec<f64> = i
            .cell_means
            .iter()
            .map(|c| c.value().unwrap_or(f64::NAN))
            .collect();
        assert_eq!(cells, [6.0, 10.0, 8.0, 16.0]);
    }

    #[test]
    fn empty_levels_are_explicit() {
        let m = main_effect(&[vec![1.0, 1.0]], &[5.0], 0);
        assert_eq!(
            m.low_mean,
            Stat::Undefined {
                reason: UndefinedReason::NoValidObservations
            }
        );
        assert_eq!(m.center_mean, None);
    }
}
