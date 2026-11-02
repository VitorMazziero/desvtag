//! Potência dos testes t (uma amostra, pareado e duas amostras) pela t não central, e precisão.

use super::{Evaluation, MAX_N};
use crate::distributions::{noncentral, student_t};

pub(super) fn power(
    difference: f64,
    sigma: f64,
    alpha: f64,
    two_sided: bool,
    n: u32,
    two_groups: bool,
) -> Option<Evaluation> {
    if n < 2 {
        return None;
    }
    let nf = f64::from(n);
    let (df, delta) = if two_groups {
        (2.0 * nf - 2.0, difference.abs() / sigma * (nf / 2.0).sqrt())
    } else {
        (nf - 1.0, difference.abs() / sigma * nf.sqrt())
    };
    let tail = if two_sided { alpha / 2.0 } else { alpha };
    let critical = student_t::quantile_upper(tail, df).ok()?;
    let upper = 1.0 - noncentral::nct_cdf(critical, df, delta);
    let lower = if two_sided {
        noncentral::nct_cdf(-critical, df, delta)
    } else {
        0.0
    };
    let power = (upper + lower).clamp(0.0, 1.0);
    power.is_finite().then_some(Evaluation {
        power,
        noncentrality: delta,
        df1: df,
        df2: 0.0,
        critical,
    })
}

fn factor(two_groups: bool) -> f64 {
    if two_groups { 2.0 } else { 1.0 }
}

fn df(n: u32, two_groups: bool) -> f64 {
    if two_groups {
        2.0 * f64::from(n) - 2.0
    } else {
        f64::from(n) - 1.0
    }
}

/// Semiamplitude do intervalo de confiança da diferença de médias em `n`.
pub(super) fn half_width(sigma: f64, alpha: f64, n: u32, two_groups: bool) -> Option<f64> {
    if n < 2 {
        return None;
    }
    let t = student_t::quantile_upper(alpha / 2.0, df(n, two_groups)).ok()?;
    Some(t * sigma * (factor(two_groups) / f64::from(n)).sqrt())
}

/// Menor `n` com semiamplitude `≤ half_width`.
pub(super) fn precision_n(sigma: f64, alpha: f64, target: f64, two_groups: bool) -> Option<u32> {
    let ok = |n: u32| half_width(sigma, alpha, n, two_groups).is_some_and(|h| h <= target);
    let mut high = 2_u32;
    while !ok(high) {
        if high >= MAX_N {
            return None;
        }
        high = (high * 2).min(MAX_N);
    }
    if ok(2) {
        return Some(2);
    }
    let mut low = 2_u32;
    while high - low > 1 {
        let mid = low + (high - low) / 2;
        if ok(mid) {
            high = mid;
        } else {
            low = mid;
        }
    }
    Some(high)
}
