//! Série do gráfico quantil–quantil normal dos resíduos.
//!
//! Quantis teóricos de Blom: `Φ⁻¹((i − 3/8)/(n + 1/4))`, `i = 1…n`, contra os resíduos
//! padronizados ordenados.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::distributions::normal;

/// Ponto do gráfico quantil–quantil.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct QqPoint {
    /// Quantil teórico da normal padrão.
    pub theoretical: f64,
    /// Resíduo padronizado ordenado.
    pub sample: f64,
}

/// Monta os pontos a partir dos valores (qualquer ordem); valores não finitos são ignorados.
#[must_use]
pub fn qq_points(values: &[f64]) -> Vec<QqPoint> {
    let mut sorted: Vec<f64> = values.iter().copied().filter(|v| v.is_finite()).collect();
    sorted.sort_by(f64::total_cmp);
    let n = sorted.len() as f64;
    sorted
        .iter()
        .enumerate()
        .filter_map(|(i, sample)| {
            let p = ((i + 1) as f64 - 0.375) / (n + 0.25);
            normal::quantile(p).ok().map(|theoretical| QqPoint {
                theoretical,
                sample: *sample,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blom_quantiles_are_symmetric_and_sorted() {
        let pts = qq_points(&[3.0, -1.0, 0.5, 2.0, -2.0]);
        assert_eq!(pts.len(), 5);
        assert!(
            pts.windows(2)
                .all(|w| w[0].sample <= w[1].sample && w[0].theoretical < w[1].theoretical)
        );
        assert!((pts[0].theoretical + pts[4].theoretical).abs() < 1e-12);
        assert!(pts[2].theoretical.abs() < 1e-12);
        // n = 5, i = 1: scipy.stats.norm.ppf(0.625/5.25) = -1.1797611176118612
        assert!(
            (pts[0].theoretical + 1.179_761_117_611_861_2).abs() < 1e-11,
            "{}",
            pts[0].theoretical
        );
    }

    #[test]
    fn non_finite_values_are_dropped() {
        assert_eq!(qq_points(&[f64::NAN, 1.0]).len(), 1);
    }
}
