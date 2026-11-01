//! Estatísticas do boxplot de Tukey.
//!
//! Quartis pelo método 7 (interpolação linear, padrão do R): `x[⌊h⌋] + (h − ⌊h⌋)(x[⌊h⌋+1] − x[⌊h⌋])`
//! com `h = (n − 1)p`. Cercas em `Q1 − 1,5·IQR` e `Q3 + 1,5·IQR`; os bigodes vão ao menor e ao maior
//! valor dentro das cercas; o que está fora é *ponto distante*, listado com a observação.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::domain::StableId;

/// Ponto fora das cercas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Outlier {
    /// Observação.
    pub observation_id: StableId,
    /// Valor.
    pub value: f64,
}

/// Estatísticas do boxplot de um grupo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BoxStats {
    /// Mínimo.
    pub min: f64,
    /// Primeiro quartil.
    pub q1: f64,
    /// Mediana.
    pub median: f64,
    /// Terceiro quartil.
    pub q3: f64,
    /// Máximo.
    pub max: f64,
    /// Extremo inferior do bigode.
    pub whisker_low: f64,
    /// Extremo superior do bigode.
    pub whisker_high: f64,
    /// Pontos fora das cercas.
    pub outliers: Vec<Outlier>,
}

/// Quantil de uma amostra ordenada (método 7).
#[must_use]
pub fn quantile_sorted(sorted: &[f64], p: f64) -> Option<f64> {
    let n = sorted.len();
    if n == 0 {
        return None;
    }
    let h = (n - 1) as f64 * p;
    let lo = h.floor();
    let i = lo as usize;
    let frac = h - lo;
    if i + 1 >= n {
        return sorted.last().copied();
    }
    Some(sorted[i] + frac * (sorted[i + 1] - sorted[i]))
}

/// Calcula as estatísticas do boxplot; `None` para grupo vazio.
#[must_use]
pub fn box_stats(values: &[f64], ids: &[StableId]) -> Option<BoxStats> {
    if values.is_empty() || values.len() != ids.len() {
        return None;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let q1 = quantile_sorted(&sorted, 0.25)?;
    let median = quantile_sorted(&sorted, 0.5)?;
    let q3 = quantile_sorted(&sorted, 0.75)?;
    let iqr = q3 - q1;
    let (low_fence, high_fence) = (q1 - 1.5 * iqr, q3 + 1.5 * iqr);
    let mut inside = sorted
        .iter()
        .copied()
        .filter(|v| *v >= low_fence && *v <= high_fence);
    let whisker_low = inside.clone().next().unwrap_or(sorted[0]);
    let whisker_high = inside.next_back().unwrap_or(sorted[0]);
    let outliers = values
        .iter()
        .zip(ids)
        .filter(|(v, _)| **v < low_fence || **v > high_fence)
        .map(|(v, id)| Outlier {
            observation_id: id.clone(),
            value: *v,
        })
        .collect();
    Some(BoxStats {
        min: sorted[0],
        q1,
        median,
        q3,
        max: sorted[sorted.len() - 1],
        whisker_low,
        whisker_high,
        outliers,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(n: usize) -> Vec<StableId> {
        (0..n)
            .map(|i| StableId::new(format!("o{i}")).unwrap_or_else(|_| unreachable!()))
            .collect()
    }

    #[test]
    fn quartiles_match_r_type_7() {
        // R: quantile(c(1,2,3,4,5,6,7,8,9,10), c(.25,.5,.75)) = 3.25 5.5 7.75
        let v: Vec<f64> = (1..=10).map(f64::from).collect();
        let b = box_stats(&v, &ids(10)).unwrap_or_else(|| unreachable!());
        assert_eq!((b.q1, b.median, b.q3), (3.25, 5.5, 7.75));
        assert!(b.outliers.is_empty() && b.whisker_low == 1.0 && b.whisker_high == 10.0);
    }

    #[test]
    fn far_points_are_listed_with_their_observation() {
        // 1..9 e 30: Q1 = 3, Q3 = 7,75; cerca superior = 7,75 + 1,5·4,75 = 14,875.
        let mut v: Vec<f64> = (1..=9).map(f64::from).collect();
        v.push(30.0);
        let b = box_stats(&v, &ids(10)).unwrap_or_else(|| unreachable!());
        assert_eq!(b.outliers.len(), 1);
        assert_eq!(b.outliers[0].value, 30.0);
        assert_eq!(b.outliers[0].observation_id.as_str(), "o9");
        assert_eq!(b.whisker_high, 9.0);
    }

    #[test]
    fn single_value_and_empty() {
        let b = box_stats(&[4.0], &ids(1)).unwrap_or_else(|| unreachable!());
        assert_eq!(
            (b.min, b.q1, b.median, b.q3, b.max),
            (4.0, 4.0, 4.0, 4.0, 4.0)
        );
        assert!(box_stats(&[], &[]).is_none());
    }
}
