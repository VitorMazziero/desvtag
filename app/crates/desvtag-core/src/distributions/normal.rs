//! Distribuição normal padrão.

use std::f64::consts::{FRAC_1_SQRT_2, PI};

use super::quantile::{QuantileError, invert_upper_tail};
use crate::numeric::special_functions::erfc;

/// Densidade `φ(x)`.
#[must_use]
pub fn pdf(x: f64) -> f64 {
    (-0.5 * x * x).exp() / (2.0 * PI).sqrt()
}

/// Função de distribuição `Φ(x)`, com precisão relativa na cauda inferior.
#[must_use]
pub fn cdf(x: f64) -> f64 {
    0.5 * erfc(-x * FRAC_1_SQRT_2)
}

/// Cauda superior `1 − Φ(x)`, com precisão relativa na cauda superior.
#[must_use]
pub fn sf(x: f64) -> f64 {
    0.5 * erfc(x * FRAC_1_SQRT_2)
}

/// Quantil superior: `x` tal que `P(Z > x) = q`, para `q` em `[1e-300, 1)`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile_upper(q: f64) -> Result<f64, QuantileError> {
    if q > 0.5 {
        return quantile_upper(1.0 - q).map(|x| -x);
    }
    if q == 0.5 {
        return Ok(0.0);
    }
    invert_upper_tail(sf, q, 0.0, 2.0)
}

/// Quantil `Φ⁻¹(p)` para `p` em `(0, 1)`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile(p: f64) -> Result<f64, QuantileError> {
    if !(0.0..1.0).contains(&p) || p == 0.0 {
        return Err(QuantileError::OutOfRange);
    }
    if p < 0.5 {
        quantile_upper(p).map(|x| -x)
    } else {
        quantile_upper(1.0 - p)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(a: f64, b: f64) -> f64 {
        ((a - b) / b).abs()
    }

    #[test]
    fn standard_values() {
        assert!((cdf(0.0) - 0.5).abs() < 1e-16);
        assert!(rel(cdf(1.96), 0.975_002_104_851_780_1) < 5e-15);
        assert!(rel(sf(1.96), 0.024_997_895_148_220_435) < 5e-14);
        assert!(rel(pdf(0.0), 0.398_942_280_401_432_7) < 1e-15);
        assert!((cdf(-3.0) + cdf(3.0) - 1.0).abs() < 1e-15);
    }

    #[test]
    fn quantiles_invert_the_cdf_including_far_tails() {
        for p in [0.5, 0.975, 0.999, 0.1, 1e-5, 1e-10, 1e-100, 1e-300] {
            let x = quantile(p).unwrap_or(f64::NAN);
            let back = cdf(x);
            assert!(rel(back, p) < 1e-12, "p={p}: x={x}, cdf={back}");
        }
        assert!(rel(quantile(0.975).unwrap_or(f64::NAN), 1.959_963_984_540_054) < 1e-13);
        assert_eq!(quantile_upper(0.5), Ok(0.0));
        assert!(quantile(0.0).is_err() && quantile(1.0).is_err() && quantile(f64::NAN).is_err());
    }
}
