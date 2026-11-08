//! Distribuição qui-quadrado.

use super::quantile::{QuantileError, invert_lower_tail, invert_upper_tail};
use crate::numeric::special_functions::gamma_inc_regularized;

/// `P(X ≤ x)` com `df` graus de liberdade.
#[must_use]
pub fn cdf(x: f64, df: f64) -> f64 {
    if df <= 0.0 || x < 0.0 || df.is_nan() || x.is_nan() {
        return f64::NAN;
    }
    gamma_inc_regularized(0.5 * df, 0.5 * x).0
}

/// `P(X > x)`.
#[must_use]
pub fn sf(x: f64, df: f64) -> f64 {
    if df <= 0.0 || x < 0.0 || df.is_nan() || x.is_nan() {
        return f64::NAN;
    }
    gamma_inc_regularized(0.5 * df, 0.5 * x).1
}

/// Quantil superior: `x` tal que `P(X > x) = q`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile_upper(q: f64, df: f64) -> Result<f64, QuantileError> {
    if df <= 0.0 || df.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    invert_upper_tail(|x| sf(x, df), q, 0.0, df.max(1.0) * 2.0)
}

/// Quantil `P(X ≤ x) = p`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile(p: f64, df: f64) -> Result<f64, QuantileError> {
    if df <= 0.0 || df.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    if p > 0.5 {
        return quantile_upper(1.0 - p, df);
    }
    invert_lower_tail(|x| cdf(x, df), p, 0.0, df.max(1.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(a: f64, b: f64) -> f64 {
        ((a - b) / b).abs()
    }

    #[test]
    fn closed_forms() {
        // df = 2: P(X > x) = e^{−x/2}.
        for x in [0.1, 2.0, 30.0] {
            assert!(rel(sf(x, 2.0), (-0.5 * x).exp()) < 1e-13, "x={x}");
        }
        // df = 1: cdf(x) = erf(√(x/2)).
        assert!(rel(cdf(1.0, 1.0), 0.682_689_492_137_085_9) < 1e-13);
        assert!((cdf(3.0, 4.0) + sf(3.0, 4.0) - 1.0).abs() < 1e-15);
    }

    #[test]
    fn classic_critical_values_and_inverse() {
        // χ²_{0,95; 1} = 3,841458820694124 (= 1,959963984540054²); χ²_{0,95; 10} = 18,30703805327515.
        assert!(
            rel(
                quantile(0.95, 1.0).unwrap_or(f64::NAN),
                3.841_458_820_694_124
            ) < 1e-12
        );
        assert!(
            rel(
                quantile(0.95, 10.0).unwrap_or(f64::NAN),
                18.307_038_053_275_146
            ) < 1e-12
        );
        for (p, df) in [(0.01, 3.0), (0.5, 7.5), (0.999, 2.0), (1e-10, 5.0)] {
            let x = quantile(p, df).unwrap_or(f64::NAN);
            assert!(rel(cdf(x, df), p) < 1e-11, "p={p} df={df}");
        }
    }

    #[test]
    fn invalid_arguments_are_not_numbers() {
        assert!(cdf(-1.0, 3.0).is_nan() && sf(1.0, 0.0).is_nan());
        assert!(quantile(0.5, 0.0).is_err());
    }
}
