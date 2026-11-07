//! Resíduos padronizados e studentizados.

/// Menor `1 − hᵢᵢ` aceito; abaixo disso o ponto é, na prática, ajustado exatamente.
const MIN_COMPLEMENT: f64 = 1e-12;

/// Resíduo internamente studentizado `eᵢ / (σ·√(1 − hᵢᵢ))`.
#[must_use]
pub fn internally_studentized(residual: f64, leverage: f64, sigma: f64) -> Option<f64> {
    let complement = 1.0 - leverage;
    if sigma > 0.0 && complement > MIN_COMPLEMENT {
        let value = residual / (sigma * complement.sqrt());
        value.is_finite().then_some(value)
    } else {
        None
    }
}

/// Resíduo externamente studentizado (deletado): `rᵢ·√((ν − 1)/(ν − rᵢ²))`, `ν` = graus residuais.
///
/// Segue distribuição t com `ν − 1` graus de liberdade sob o modelo.
#[must_use]
pub fn externally_studentized(internal: f64, df_residual: usize) -> Option<f64> {
    if df_residual < 2 {
        return None;
    }
    let nu = df_residual as f64;
    let denominator = nu - internal * internal;
    if denominator > 0.0 {
        let value = internal * ((nu - 1.0) / denominator).sqrt();
        value.is_finite().then_some(value)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standardizes_by_sigma_and_leverage() {
        let r = internally_studentized(2.0, 0.75, 2.0).unwrap_or(f64::NAN);
        assert!((r - 2.0).abs() < 1e-15); // 2 / (2·0,5)
        assert!(internally_studentized(1.0, 1.0, 1.0).is_none());
        assert!(internally_studentized(1.0, 0.5, 0.0).is_none());
    }

    #[test]
    fn external_matches_the_closed_form() {
        // ν = 10, r = 2: 2·√(9/6)
        let t = externally_studentized(2.0, 10).unwrap_or(f64::NAN);
        assert!((t - 2.0 * 1.5_f64.sqrt()).abs() < 1e-15);
        assert!(externally_studentized(2.0, 1).is_none());
        assert!(externally_studentized(4.0, 10).is_none()); // r² = 16 > ν
    }
}
