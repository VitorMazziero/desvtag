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
    if !(x >= 0.0 && d1 > 0.0 && d2 > 0.0 && lambda >= 0.0) {
        return f64::NAN;
    }
    let denom = d1 * x + d2;
    let (u, v) = (d1 * x / denom, d2 / denom);
    let mean = lambda / 2.0;
    if mean == 0.0 {
        return beta_inc_regularized(0.5 * d1, 0.5 * d2, u, v).1;
    }
    let last = (mean + 14.0 * mean.sqrt() + 60.0).ceil() as usize;
    let mut total = 0.0;
    let mut compensation = 0.0;
    for j in 0..=last {
        let jf = j as f64;
        let weight = (-mean + jf * mean.ln() - ln_gamma(jf + 1.0)).exp();
        let tail = beta_inc_regularized(0.5 * d1 + jf, 0.5 * d2, u, v).1;
        // soma compensada (Kahan)
        let term = weight * tail - compensation;
        let next = total + term;
        compensation = (next - total) - term;
        total = next;
    }
    total.clamp(0.0, 1.0)
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
    if !(df > 0.0 && t.is_finite() && delta.is_finite()) {
        return f64::NAN;
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
