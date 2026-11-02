//! Potência da ANOVA de um fator pela F não central.

use super::Evaluation;
use crate::distributions::{f, noncentral};

pub(super) fn power(means: &[f64], sigma: f64, alpha: f64, n: u32) -> Option<Evaluation> {
    let k = means.len();
    if k < 2 || n < 2 {
        return None;
    }
    let grand = means.iter().sum::<f64>() / k as f64;
    let ss: f64 = means.iter().map(|m| (m - grand).powi(2)).sum();
    let lambda = f64::from(n) * ss / (sigma * sigma);
    let (df1, df2) = ((k - 1) as f64, k as f64 * (f64::from(n) - 1.0));
    let critical = f::quantile_upper(alpha, df1, df2).ok()?;
    let power = noncentral::ncf_sf(critical, df1, df2, lambda);
    power.is_finite().then_some(Evaluation {
        power,
        noncentrality: lambda,
        df1,
        df2,
        critical,
    })
}
