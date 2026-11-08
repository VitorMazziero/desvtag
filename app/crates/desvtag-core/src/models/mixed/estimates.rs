//! Estimativas e intervalos de funções lineares do modelo ajustado.
use super::{advanced_types::MixedEstimate, estimation::Fit, inference::Information, linalg::dot};
use crate::{
    descriptive::{Stat, UndefinedReason},
    distributions::student_t,
    inference::intervals::t_critical,
};
pub(super) fn unavailable() -> Stat {
    Stat::undefined(UndefinedReason::CovarianceInformationUnavailable)
}
pub(super) fn estimate(
    contrast: &[f64],
    fit: &Fit,
    information: Option<&Information>,
    level: f64,
) -> MixedEstimate {
    let p = contrast.len();
    let value = dot(contrast, &fit.solution.beta);
    let variance = (0..p)
        .map(|i| contrast[i] * dot(&fit.solution.covariance[i * p..(i + 1) * p], contrast))
        .sum::<f64>();
    let se = if variance >= 0. {
        Stat::finite(variance.sqrt())
    } else {
        Stat::undefined(UndefinedReason::NotEstimable)
    };
    let df = information.and_then(|i| i.df(contrast, &fit.solution.covariance));
    let (low, high) = match (df, se.value()) {
        (Some(df), Some(se)) => match t_critical(level, df) {
            Some(c) => (Stat::finite(value - c * se), Stat::finite(value + c * se)),
            None => (unavailable(), unavailable()),
        },
        _ => (unavailable(), unavailable()),
    };
    MixedEstimate {
        estimate: value,
        std_error: se,
        df: df.map_or_else(unavailable, Stat::finite),
        ci_lower: low,
        ci_upper: high,
    }
}
pub(super) fn p_value(estimate: &MixedEstimate) -> Stat {
    match (estimate.std_error.value(), estimate.df.value()) {
        (Some(se), Some(df)) if se > 0. => {
            Stat::finite((2. * student_t::sf((estimate.estimate / se).abs(), df)).min(1.))
        }
        _ => unavailable(),
    }
}
