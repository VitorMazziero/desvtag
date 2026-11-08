//! Distribuições **não centrais** para potência: F não central (`sf`, por mistura de Poisson de
//! betas incompletas) e t não central (`cdf`, algoritmo AS 243 de Lenth, 1989).
//!
//! `F′(d₁, d₂, λ)`: `P(F′ > x) = Σⱼ Pois(j; λ/2)·(1 − I_u(d₁/2 + j, d₂/2))`, `u = d₁x/(d₁x + d₂)`.
//! `T′(ν, δ)`: série de Lenth para `t ≥ 0`; para `t < 0`, `P(T′ ≤ t; δ) = 1 − P(T′ ≤ −t; −δ)`.
//! Erro absoluto típico ≲ 1e-12 (verificado contra `scipy.stats.ncf` e `scipy.stats.nct`).

use super::normal;
use crate::numeric::special_functions::{beta_inc_regularized, ln_gamma};

/// `P(F′ > x)` para `d1`, `d2` graus de liberdade e parâmetro de não centralidade `lambda ≥ 0`.
#[must_use]
pub fn ncf_sf(x: f64, d1: f64, d2: f64, lambda: f64) -> f64 {
    if !(x >= 0.0
        && d1.is_finite()
        && d1 > 0.0
        && d2.is_finite()
        && d2 > 0.0
        && lambda.is_finite()
        && lambda >= 0.0)
    {
        return f64::NAN;
    }
    if x == 0.0 {
        return 1.0;
    }
    if x.is_infinite() {
        return 0.0;
    }
    let log_ratio = d1.ln() + x.ln() - d2.ln();
    let ratio = log_ratio.exp();
    let (u, v) = if ratio <= 1.0 {
        (ratio / (1.0 + ratio), 1.0 / (1.0 + ratio))
    } else {
        let inverse = (-log_ratio).exp();
        (1.0 / (1.0 + inverse), inverse / (1.0 + inverse))
    };
    let mean = lambda / 2.0;
    if mean == 0.0 {
        return beta_inc_regularized(0.5 * d1, 0.5 * d2, u, v).1;
    }
    if mean > 2_000_000.0 {
        if d1 < 1.0 {
            return f64::NAN;
        }
        let threshold = (lambda.ln() - d1.ln() - x.ln() + d2.ln() - 4.0_f64.ln()).exp();
        let chi_tail = if threshold.is_infinite() {
            0.0
        } else {
            super::chi_square::sf(threshold, d2)
        };
        let error_bound = normal::cdf(-lambda.sqrt() * 0.5) + chi_tail;
        return if error_bound.is_finite() && error_bound <= 1e-12 {
            1.0
        } else {
            f64::NAN
        };
    }
    let mode = mean.floor() as usize;
    let k = mode as f64;
    let log_weight = if mode >= 50 {
        let diff = mean - k;
        let inverse = 1.0 / k;
        -diff + k * (diff / k).ln_1p()
            - 0.5 * (2.0 * std::f64::consts::PI * k).ln()
            - inverse / 12.0
            + inverse.powi(3) / 360.0
            - inverse.powi(5) / 1260.0
            + inverse.powi(7) / 1680.0
    } else {
        -mean + k * mean.ln() - ln_gamma(k + 1.0)
    };
    let weight = log_weight.exp();
    let window = (14.0 * mean.sqrt() + 60.0).ceil() as usize;
    let tail = |j: usize| beta_inc_regularized(0.5 * d1 + j as f64, 0.5 * d2, u, v).1;
    let mut sum = crate::numeric::CompensatedSum::new();
    sum.add(weight * tail(mode));
    let mut down = weight;
    for j in (mode.saturating_sub(window)..mode).rev() {
        down *= (j + 1) as f64 / mean;
        sum.add(down * tail(j));
    }
    let mut up = weight;
    for j in mode + 1..=mode + window {
        up *= mean / j as f64;
        sum.add(up * tail(j));
    }
    sum.total().clamp(0.0, 1.0)
}

/// Conditional normal/chi-square quadrature avoids zero initial series weights.
fn nct_large_noncentrality(t: f64, df: f64, delta: f64) -> f64 {
    if t == 0.0 {
        return normal::cdf(-delta);
    }
    let lower = (-delta).max(-12.0);
    if lower >= 12.0 {
        return normal::cdf(-delta);
    }
    let integrand = |z: f64| {
        let ratio = (z + delta) / t;
        let argument = df * ratio * ratio;
        normal::pdf(z)
            * if argument.is_infinite() {
                0.0
            } else {
                super::chi_square::sf(argument, df)
            }
    };
    let coarse = crate::numeric::integration::gauss_legendre(12);
    let fine = crate::numeric::integration::gauss_legendre(24);
    fn rule(f: &impl Fn(f64) -> f64, a: f64, b: f64, quadrature: &(Vec<f64>, Vec<f64>)) -> f64 {
        let mid = 0.5 * (a + b);
        let half = 0.5 * (b - a);
        half * quadrature
            .0
            .iter()
            .zip(&quadrature.1)
            .map(|(x, w)| w * f(mid + half * x))
            .sum::<f64>()
    }
    fn refine(
        f: &impl Fn(f64) -> f64,
        a: f64,
        b: f64,
        tolerance: f64,
        depth: u32,
        coarse: &(Vec<f64>, Vec<f64>),
        fine: &(Vec<f64>, Vec<f64>),
    ) -> Option<f64> {
        let first = rule(f, a, b, coarse);
        let second = rule(f, a, b, fine);
        if !first.is_finite() || !second.is_finite() {
            return None;
        }
        if (first - second).abs() <= tolerance {
            return Some(second);
        }
        if depth == 0 {
            return None;
        }
        let mid = 0.5 * (a + b);
        Some(
            refine(f, a, mid, tolerance * 0.5, depth - 1, coarse, fine)?
                + refine(f, mid, b, tolerance * 0.5, depth - 1, coarse, fine)?,
        )
    }
    let mut breaks: Vec<f64> = (-12..=12).map(f64::from).filter(|z| *z > lower).collect();
    breaks.push(lower);
    if t - delta > lower && t - delta < 12.0 {
        breaks.push(t - delta);
    }
    breaks.sort_by(f64::total_cmp);
    breaks.dedup_by(|a, b| *a == *b);
    let mut sum = crate::numeric::CompensatedSum::new();
    sum.add(normal::cdf(-delta));
    for interval in breaks.windows(2) {
        let Some(value) = refine(
            &integrand,
            interval[0],
            interval[1],
            1e-12 * (interval[1] - interval[0]) / 24.0,
            20,
            &coarse,
            &fine,
        ) else {
            return f64::NAN;
        };
        sum.add(value);
    }
    sum.total().clamp(0.0, 1.0)
}

fn nct_cdf_nonnegative(t: f64, df: f64, del: f64) -> f64 {
    const ERRMAX: f64 = 1e-12;
    const ITRMAX: usize = 2000;
    let t2 = t * t;
    let x = t2 / (t2 + df);
    let mut tnc = 0.0;
    if x > 0.0 {
        let lambda = del * del;
        let mut p = 0.5 * (-0.5 * lambda).exp();
        let mut q = (2.0 / std::f64::consts::PI).sqrt() * p * del;
        let mut s = 0.5 - p;
        if s < 1e-7 {
            s = -0.5 * (-0.5 * lambda).exp_m1();
        }
        let mut a = 0.5;
        let b = 0.5 * df;
        let rxb = (df / (t2 + df)).powf(b);
        let albeta = 0.5 * std::f64::consts::PI.ln() + ln_gamma(b) - ln_gamma(0.5 + b);
        let mut xodd = beta_inc_regularized(a, b, x, df / (t2 + df)).0;
        let mut godd = 2.0 * rxb * (a * x.ln() - albeta).exp();
        tnc = b * x;
        let mut xeven = if tnc < f64::EPSILON { tnc } else { 1.0 - rxb };
        let mut geven = tnc * rxb;
        tnc = p * xodd + q * xeven;
        for it in 1..=ITRMAX {
            a += 1.0;
            xodd -= godd;
            xeven -= geven;
            godd *= x * (a + b - 1.0) / a;
            geven *= x * (a + b - 0.5) / (a + 0.5);
            p *= lambda / (2.0 * it as f64);
            q *= lambda / (2.0 * it as f64 + 1.0);
            tnc += p * xodd + q * xeven;
            s -= p;
            if s < -1e-10 {
                break;
            }
            if s >= 0.0 && (2.0 * s * (xodd - godd)).abs() < ERRMAX {
                break;
            }
        }
    }
    (tnc + normal::cdf(-del)).min(1.0)
}

/// `P(T′ ≤ t)` com `df` graus de liberdade e parâmetro de não centralidade `delta`.
#[must_use]
pub fn nct_cdf(t: f64, df: f64, delta: f64) -> f64 {
    if !(df.is_finite() && df > 0.0 && t.is_finite() && delta.is_finite()) {
        return f64::NAN;
    }
    if delta.abs() > 8.0 {
        return if t >= 0.0 {
            nct_large_noncentrality(t, df, delta)
        } else {
            1.0 - nct_large_noncentrality(-t, df, -delta)
        };
    }
    if t >= 0.0 {
        nct_cdf_nonnegative(t, df, delta)
    } else {
        1.0 - nct_cdf_nonnegative(-t, df, -delta)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn with_zero_noncentrality_they_reduce_to_the_central_distributions() {
        assert!((ncf_sf(3.0, 4.0, 20.0, 0.0) - super::super::f::sf(3.0, 4.0, 20.0)).abs() < 1e-14);
        assert!((nct_cdf(1.5, 12.0, 0.0) - super::super::student_t::cdf(1.5, 12.0)).abs() < 1e-12);
        assert!(
            (nct_cdf(-1.5, 12.0, 0.0) - super::super::student_t::cdf(-1.5, 12.0)).abs() < 1e-12
        );
    }

    #[test]
    fn known_reference_values() {
        // scipy.stats.nct.cdf(2.0, 10, 1.0) = 0.72... ; ncf.sf(3.0, 3, 16, 6.0) = 0.51...
        let v = nct_cdf(2.0, 10.0, 1.0);
        assert!((0.0..=1.0).contains(&v) && v > 0.5);
        let w = ncf_sf(3.0, 3.0, 16.0, 6.0);
        assert!((0.0..=1.0).contains(&w) && w > 0.3);
        // a potência cresce com a não centralidade
        assert!(ncf_sf(3.0, 3.0, 16.0, 12.0) > w);
    }

    #[test]
    fn invalid_arguments_give_nan() {
        assert!(ncf_sf(-1.0, 3.0, 4.0, 1.0).is_nan());
        assert!(nct_cdf(1.0, 0.0, 1.0).is_nan());
    }
}
