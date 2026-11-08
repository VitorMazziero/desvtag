//! Validate the fixed design and prepare information per complete base replicate.
use super::*;
use crate::numeric::qr::{QrDecomposition, default_rank_tolerance};
use crate::numeric::{CompensatedSum, Matrix};
use std::collections::HashSet;

pub(super) enum FixedTest {
    F {
        numerator_df: u32,
        lambda_per_rep: f64,
    },
    T {
        delta_per_rep: Option<f64>,
        standard_error_per_rep: f64,
        standard_error_scales: [f64; 3],
    },
}
pub(super) struct FixedDesign {
    pub base_observations: u32,
    pub parameters: u32,
    pub test: FixedTest,
}
fn invalid(issue: Issue) -> CoreError {
    CoreError::InvalidInput(vec![issue])
}
fn sum(values: impl Iterator<Item = f64>) -> f64 {
    let mut s = CompensatedSum::new();
    for v in values {
        s.add(v);
    }
    s.total()
}

pub(super) fn prepare(
    design: &PowerDesign,
    sigma: f64,
    precision: bool,
) -> Result<FixedDesign, CoreError> {
    let result = match design {
        PowerDesign::Regression {
            predictors,
            coefficients,
        } => {
            let k = coefficients.len();
            let m = predictors.len();
            if k == 0
                || k > 32
                || m < k + 1
                || m > 4096
                || coefficients.iter().any(|x| !x.is_finite())
                || predictors
                    .iter()
                    .any(|row| row.len() != k || row.iter().any(|x| !x.is_finite()))
            {
                return Err(invalid(error("power.invalid_regression")));
            }
            let means: Vec<f64> = (0..k)
                .map(|j| sum(predictors.iter().map(|r| r[j] / m as f64)))
                .collect();
            let centered: Vec<Vec<f64>> = predictors
                .iter()
                .map(|row| row.iter().zip(&means).map(|(x, mean)| x - mean).collect())
                .collect();
            if centered.iter().flatten().any(|x| !x.is_finite()) {
                return Err(invalid(error("power.numerical_failure")));
            }
            let maxima: Vec<f64> = (0..k)
                .map(|j| centered.iter().map(|r| r[j].abs()).fold(0.0_f64, f64::max))
                .collect();
            let normalized: Vec<Vec<f64>> = centered
                .iter()
                .map(|r| {
                    std::iter::once(1.0)
                        .chain(
                            r.iter()
                                .zip(&maxima)
                                .map(|(x, max)| if *max > 0.0 { x / max } else { 0.0 }),
                        )
                        .collect()
                })
                .collect();
            let matrix = Matrix::from_rows(&normalized)
                .ok_or_else(|| invalid(error("power.invalid_regression")))?;
            if QrDecomposition::new(&matrix, default_rank_tolerance(m, k + 1)).rank != k + 1 {
                return Err(invalid(error("power.rank_deficient")));
            }
            let signal = sum(centered.iter().map(|row| {
                sum(row.iter().zip(coefficients).map(|(x, b)| x * (b / sigma))).powi(2)
            }));
            FixedDesign {
                base_observations: m as u32,
                parameters: (k + 1) as u32,
                test: FixedTest::F {
                    numerator_df: k as u32,
                    lambda_per_rep: signal,
                },
            }
        }
        PowerDesign::Contrast {
            means,
            weights,
            allocation,
        } => {
            let k = means.len();
            if k < 2
                || weights.len() != k
                || allocation.len() != k
                || means.iter().chain(weights).any(|x| !x.is_finite())
                || allocation.contains(&0)
            {
                return Err(invalid(error("power.invalid_contrast")));
            }
            let weight_scale = weights.iter().map(|c| c.abs()).fold(0.0_f64, f64::max);
            let scaled: Vec<f64> = weights.iter().map(|c| c / weight_scale).collect();
            let norm = sum(scaled.iter().map(|c| c.abs()));
            if norm == 0.0 || !norm.is_finite() || sum(scaled.iter().copied()).abs() > 1e-10 * norm
            {
                return Err(invalid(error("power.invalid_contrast")));
            }
            let count: u64 = allocation.iter().map(|n| u64::from(*n)).sum();
            if count > u64::from(MAX_N) {
                return Err(invalid(error("power.total_budget")));
            }
            let standardized_effect = sum(scaled.iter().zip(means).map(|(c, mu)| {
                let difference = mu - means[0];
                c * if difference.is_finite() {
                    difference / sigma
                } else {
                    mu / sigma - means[0] / sigma
                }
            }));
            let standard_error_factor = sum(scaled
                .iter()
                .zip(allocation)
                .map(|(c, n)| c * c / f64::from(*n)))
            .sqrt();
            // Multiply extremes first: reciprocal response/weight scales must not
            // overflow an intermediate product when the final standard error is finite.
            let mut scales = [sigma, weight_scale, standard_error_factor];
            scales.sort_by(f64::total_cmp);
            let standard_error_per_rep = (scales[0] * scales[2]) * scales[1];
            let delta_per_rep = standardized_effect / standard_error_factor;
            FixedDesign {
                base_observations: count as u32,
                parameters: k as u32,
                test: FixedTest::T {
                    delta_per_rep: delta_per_rep.is_finite().then_some(delta_per_rep),
                    standard_error_per_rep,
                    standard_error_scales: [sigma, weight_scale, standard_error_factor],
                },
            }
        }
        PowerDesign::TwoLevel {
            factors,
            terms,
            effects,
            target,
        } => {
            if !(1..=8).contains(factors)
                || terms.is_empty()
                || effects.len() != terms.len()
                || effects.iter().any(|x| !x.is_finite())
                || (*target as usize) >= terms.len()
            {
                return Err(invalid(error("power.invalid_two_level")));
            }
            let mut seen = HashSet::new();
            for term in terms {
                let mut canonical = term.clone();
                canonical.sort_unstable();
                if canonical.is_empty()
                    || canonical.iter().any(|i| *i >= *factors)
                    || canonical.windows(2).any(|p| p[0] == p[1])
                    || !seen.insert(canonical)
                {
                    return Err(invalid(error("power.invalid_two_level")));
                }
            }
            let count = 1_u32 << factors;
            let delta = (effects[*target as usize] / sigma) * (f64::from(count).sqrt() / 2.0);
            FixedDesign {
                base_observations: count,
                parameters: terms.len() as u32 + 1,
                test: FixedTest::T {
                    delta_per_rep: delta.is_finite().then_some(delta),
                    standard_error_per_rep: sigma * (2.0 / f64::from(count).sqrt()),
                    standard_error_scales: [sigma, 1.0, 2.0 / f64::from(count).sqrt()],
                },
            }
        }
        _ => return Err(invalid(error("power.invalid_design"))),
    };
    let finite = match result.test {
        FixedTest::F { lambda_per_rep, .. } => lambda_per_rep.is_finite() && lambda_per_rep >= 0.0,
        FixedTest::T {
            delta_per_rep,
            standard_error_scales,
            ..
        } => {
            (precision || delta_per_rep.is_some())
                && standard_error_scales
                    .iter()
                    .all(|scale| scale.is_finite() && *scale > 0.0)
        }
    };
    if !finite {
        return Err(invalid(error("power.numerical_failure")));
    }
    Ok(result)
}
