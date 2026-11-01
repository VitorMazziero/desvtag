//! Distribuição t de Student.

use super::quantile::{QuantileError, invert_upper_tail};
use crate::numeric::special_functions::beta_inc_regularized;

/// Cauda superior `P(T > t)` com `df` graus de liberdade (`df > 0`).
#[must_use]
pub fn sf(t: f64, df: f64) -> f64 {
    if df <= 0.0 || df.is_nan() || t.is_nan() {
        return f64::NAN;
    }
    if t.is_infinite() {
        return if t > 0.0 { 0.0 } else { 1.0 };
    }
    // P(|T| > |t|) = I_x(df/2, ½) com x = df/(df + t²); y = 1 − x = t²/(df + t²) sem perda.
    let t2 = t * t;
    let (x, y) = if t2 < df {
        (df / (df + t2), t2 / (df + t2))
    } else {
        (1.0 / (1.0 + t2 / df), (t2 / df) / (1.0 + t2 / df))
    };
    let (two_sided, _) = beta_inc_regularized(0.5 * df, 0.5, x, y);
    if t >= 0.0 {
        0.5 * two_sided
    } else {
        1.0 - 0.5 * two_sided
    }
}

/// Função de distribuição `P(T ≤ t)`.
#[must_use]
pub fn cdf(t: f64, df: f64) -> f64 {
    sf(-t, df)
}

/// Quantil superior: `t` tal que `P(T > t) = q`, `q` em `[1e-300, 1)`.
///
/// # Errors
/// [`QuantileError`] fora do domínio (inclusive `df ≤ 0`).
pub fn quantile_upper(q: f64, df: f64) -> Result<f64, QuantileError> {
    if df <= 0.0 || df.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    if q > 0.5 {
        return quantile_upper(1.0 - q, df).map(|t| -t);
    }
    if q == 0.5 {
        return Ok(0.0);
    }
    invert_upper_tail(|t| sf(t, df), q, 0.0, 2.0)
}

/// Quantil `P(T ≤ t) = p`, `p` em `(0, 1)`.
///
/// # Errors
/// [`QuantileError`] fora do domínio.
pub fn quantile(p: f64, df: f64) -> Result<f64, QuantileError> {
    if !(0.0..1.0).contains(&p) || p == 0.0 {
        return Err(QuantileError::OutOfRange);
    }
    if p < 0.5 {
        quantile_upper(p, df).map(|t| -t)
    } else {
        quantile_upper(1.0 - p, df)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(a: f64, b: f64) -> f64 {
        ((a - b) / b).abs()
    }

    #[test]
    fn symmetry_and_the_cauchy_case() {
        assert!((cdf(0.0, 5.0) - 0.5).abs() < 1e-15);
        assert!((cdf(1.3, 7.0) + cdf(-1.3, 7.0) - 1.0).abs() < 1e-15);
        // df = 1 é a Cauchy: P(T > t) = ½ − atan(t)/π.
        for t in [0.5_f64, 1.0, 5.0, 100.0] {
            let exact = 0.5 - t.atan() / std::f64::consts::PI;
            assert!(rel(sf(t, 1.0), exact) < 1e-12, "t={t}");
        }
        // df = 2 tem forma fechada: P(T > t) = ½ (1 − t/√(2 + t²)).
        for t in [0.3_f64, 2.0, 10.0] {
            let exact = 0.5 * (1.0 - t / (2.0 + t * t).sqrt());
            assert!(rel(sf(t, 2.0), exact) < 1e-12, "t={t}");
        }
    }

    #[test]
    fn classic_critical_values() {
        // Tabelas: t_{0,975; 10} = 2,228138851986274; t_{0,975; 1} = 12,70620473617471.
        assert!(
            rel(
                quantile(0.975, 10.0).unwrap_or(f64::NAN),
                2.228_138_851_986_274
            ) < 1e-12
        );
        assert!(
            rel(
                quantile(0.975, 1.0).unwrap_or(f64::NAN),
                12.706_204_736_174_7
            ) < 1e-11
        );
    }

    #[test]
    fn large_df_approaches_the_normal() {
        assert!((cdf(1.96, 1e8) - 0.975_002_104_851_780_1).abs() < 1e-7);
    }

    #[test]
    fn invalid_arguments_are_not_numbers() {
        assert!(sf(1.0, 0.0).is_nan() && sf(1.0, -1.0).is_nan());
        assert!(quantile_upper(0.1, 0.0).is_err());
        assert_eq!(sf(f64::INFINITY, 3.0), 0.0);
    }
}
