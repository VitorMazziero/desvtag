//! Distribuição F de Snedecor.

use super::quantile::{QuantileError, invert_lower_tail, invert_upper_tail};
use crate::numeric::special_functions::beta_inc_regularized;

fn args_ok(x: f64, d1: f64, d2: f64) -> bool {
    d1 > 0.0 && d2 > 0.0 && x >= 0.0 && !(x.is_nan() || d1.is_nan() || d2.is_nan())
}

/// `P(F ≤ x)` com `d1` e `d2` graus de liberdade.
#[must_use]
pub fn cdf(x: f64, d1: f64, d2: f64) -> f64 {
    if !args_ok(x, d1, d2) {
        return f64::NAN;
    }
    // P(F ≤ x) = I_u(d1/2, d2/2), u = d1 x/(d1 x + d2), 1 − u = d2/(d1 x + d2).
    let denom = d1 * x + d2;
    beta_inc_regularized(0.5 * d1, 0.5 * d2, d1 * x / denom, d2 / denom).0
}

/// `P(F > x)`, com precisão relativa na cauda.
#[must_use]
pub fn sf(x: f64, d1: f64, d2: f64) -> f64 {
    if !args_ok(x, d1, d2) {
        return f64::NAN;
    }
    let denom = d1 * x + d2;
    beta_inc_regularized(0.5 * d1, 0.5 * d2, d1 * x / denom, d2 / denom).1
}

/// Quantil superior: `x` tal que `P(F > x) = q`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile_upper(q: f64, d1: f64, d2: f64) -> Result<f64, QuantileError> {
    if d1 <= 0.0 || d2 <= 0.0 || d1.is_nan() || d2.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    invert_upper_tail(|x| sf(x, d1, d2), q, 0.0, 4.0)
}

/// Quantil `P(F ≤ x) = p`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile(p: f64, d1: f64, d2: f64) -> Result<f64, QuantileError> {
    if d1 <= 0.0 || d2 <= 0.0 || d1.is_nan() || d2.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    if p > 0.5 {
        return quantile_upper(1.0 - p, d1, d2);
    }
    invert_lower_tail(|x| cdf(x, d1, d2), p, 0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(a: f64, b: f64) -> f64 {
        ((a - b) / b).abs()
    }

    #[test]
    fn relations_with_other_distributions() {
        // F(1, ν) = t²: P(F > t²) = 2 P(T > t). Com ν = 4, t = 2,776445105197793 (t_{0,975;4}).
        let t = 2.776_445_105_197_793_4;
        assert!(rel(sf(t * t, 1.0, 4.0), 0.05) < 1e-10);
        // d2 → ∞: d1·F → χ²_{d1}.
        assert!((sf(2.0, 3.0, 1e9) - crate::distributions::chi_square::sf(6.0, 3.0)).abs() < 1e-7);
        assert!((cdf(1.7, 5.0, 8.0) + sf(1.7, 5.0, 8.0) - 1.0).abs() < 1e-15);
    }

    #[test]
    fn classic_critical_values_and_inverse() {
        // F_{0,95; 3, 12} = 3,490294819497605 (tabela; scipy.stats.f.ppf(0.95, 3, 12)).
        assert!(
            rel(
                quantile(0.95, 3.0, 12.0).unwrap_or(f64::NAN),
                3.490_294_819_497_605
            ) < 1e-11
        );
        for (p, d1, d2) in [
            (0.01, 2.0, 7.0),
            (0.5, 10.0, 10.0),
            (0.999, 4.0, 30.0),
            (1e-8, 3.0, 5.0),
        ] {
            let x = quantile(p, d1, d2).unwrap_or(f64::NAN);
            assert!(rel(cdf(x, d1, d2), p) < 1e-10, "p={p}");
        }
    }

    #[test]
    fn invalid_arguments_are_not_numbers() {
        assert!(cdf(-1.0, 1.0, 1.0).is_nan() && sf(1.0, 0.0, 1.0).is_nan());
        assert!(quantile(0.5, 1.0, 0.0).is_err());
    }
}
