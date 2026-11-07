//! Alavancagem e distância de Cook.

use crate::numeric::QrDecomposition;

/// Alavancagens `hᵢᵢ` (diagonal da matriz-chapéu) a partir das `rank` primeiras colunas de `Q`.
///
/// `hᵢᵢ = Σₖ Q[i,k]²`, sem formar `X(XᵀX)⁻¹Xᵀ`.
#[must_use]
pub fn leverages(qr: &QrDecomposition, rows: usize) -> Vec<f64> {
    let mut h = vec![0.0; rows];
    for k in 0..qr.rank {
        let mut unit = vec![0.0; rows];
        unit[k] = 1.0;
        for (hi, qik) in h.iter_mut().zip(qr.apply_q(&unit)) {
            *hi += qik * qik;
        }
    }
    h
}

/// Distância de Cook `rᵢ²·hᵢᵢ / (p·(1 − hᵢᵢ))` com `rᵢ` internamente studentizado e `p` = posto.
#[must_use]
pub fn cooks_distance(internal: f64, leverage: f64, rank: usize) -> Option<f64> {
    let complement = 1.0 - leverage;
    if rank == 0 || complement <= 1e-12 {
        return None;
    }
    let value = internal * internal * leverage / (rank as f64 * complement);
    value.is_finite().then_some(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::numeric::Matrix;
    use crate::numeric::qr::default_rank_tolerance;

    #[test]
    fn leverages_sum_to_the_rank_and_match_the_closed_form() {
        // Regressão simples com x = 1..5: h = 1/n + (x − x̄)²/Sxx, Sxx = 10.
        let rows: Vec<Vec<f64>> = (1..=5).map(|x| vec![1.0, f64::from(x)]).collect();
        let a = Matrix::from_rows(&rows).unwrap_or_else(|| unreachable!());
        let qr = QrDecomposition::new(&a, default_rank_tolerance(5, 2));
        let h = leverages(&qr, 5);
        assert!((h.iter().sum::<f64>() - 2.0).abs() < 1e-13);
        for (i, hi) in h.iter().enumerate() {
            let x = (i + 1) as f64;
            let expected = 0.2 + (x - 3.0) * (x - 3.0) / 10.0;
            assert!((hi - expected).abs() < 1e-13, "{hi} vs {expected}");
        }
    }

    #[test]
    fn cook_matches_the_definition() {
        let d = cooks_distance(2.0, 0.5, 2).unwrap_or(f64::NAN);
        assert!((d - 2.0).abs() < 1e-15); // 4·0,5 / (2·0,5)
        assert!(cooks_distance(1.0, 1.0, 2).is_none());
    }
}
