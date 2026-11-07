//! Reproducible Gaussian test-statistic simulation, independent of analytical power values.
use super::*;
use crate::designs::randomization::Pcg32;
const ALGORITHM: &str =
    "pcg32-stream54/u32-midpoint/box-muller/marsaglia-tsang/gaussian-statistics-v1";
struct Generator {
    rng: Pcg32,
    spare: Option<f64>,
}
impl Generator {
    fn uniform(&mut self) -> f64 {
        (f64::from(self.rng.next_u32()) + 0.5) / 4294967296.0
    }
    fn normal(&mut self) -> f64 {
        if let Some(z) = self.spare.take() {
            return z;
        }
        let radius = (-2.0 * self.uniform().ln()).sqrt();
        let angle = std::f64::consts::TAU * self.uniform();
        self.spare = Some(radius * angle.sin());
        radius * angle.cos()
    }
    fn gamma(&mut self, shape: f64) -> Option<f64> {
        if shape < 1.0 {
            let u = self.uniform();
            return self.gamma(shape + 1.0).map(|g| g * u.powf(1.0 / shape));
        }
        let d = shape - 1.0 / 3.0;
        let c = (9.0 * d).sqrt().recip();
        for _ in 0..1000 {
            let x = self.normal();
            let base = 1.0 + c * x;
            if base <= 0.0 {
                continue;
            }
            let v = base * base * base;
            let u = self.uniform();
            if u < 1.0 - 0.0331 * x.powi(4) || u.ln() < 0.5 * x * x + d * (1.0 - v + v.ln()) {
                return Some(d * v);
            }
        }
        None
    }
    fn chi_square(&mut self, df: f64) -> Option<f64> {
        if df == 0.0 {
            Some(0.0)
        } else {
            self.gamma(df * 0.5).map(|g| 2.0 * g)
        }
    }
}

pub(super) fn run(
    result: &PowerResult,
    options: &PowerSimulation,
    two_sided: bool,
) -> Result<PowerSimulationResult, CoreError> {
    let mut generator = Generator {
        rng: Pcg32::new(u64::from(options.seed)),
        spare: None,
    };
    let failure = || CoreError::InvalidInput(vec![error("power.simulation_failed")]);
    let noncentrality = result.noncentrality.ok_or_else(failure)?;
    let mut rejections = 0;
    for _ in 0..options.replications {
        let reject = if result.df2 > 0.0 {
            let normal = generator.normal() + noncentrality.sqrt();
            let numerator =
                normal * normal + generator.chi_square(result.df1 - 1.0).ok_or_else(failure)?;
            let denominator = generator.chi_square(result.df2).ok_or_else(failure)?;
            if denominator <= 0.0 || !denominator.is_finite() {
                return Err(failure());
            }
            (numerator / result.df1) / (denominator / result.df2) > result.critical
        } else {
            let normal = generator.normal() + noncentrality;
            let denominator = generator.chi_square(result.df1).ok_or_else(failure)?;
            if denominator <= 0.0 || !denominator.is_finite() {
                return Err(failure());
            }
            let statistic = normal / (denominator / result.df1).sqrt();
            if two_sided {
                statistic.abs() > result.critical
            } else {
                statistic > result.critical
            }
        };
        rejections += u32::from(reject);
    }
    record_work!("power.simulation_studies", u64::from(options.replications));
    summary(options, rejections)
}

fn summary(options: &PowerSimulation, rejections: u32) -> Result<PowerSimulationResult, CoreError> {
    let failure = || CoreError::InvalidInput(vec![error("power.simulation_failed")]);
    let b = f64::from(options.replications);
    let estimate = f64::from(rejections) / b;
    let z = crate::distributions::normal::quantile_upper(0.025).map_err(|_| failure())?;
    let z2 = z * z;
    let denominator = 1.0 + z2 / b;
    let center = (estimate + z2 / (2.0 * b)) / denominator;
    let half = z * ((estimate * (1.0 - estimate) + z2 / (4.0 * b)) / b).sqrt() / denominator;
    Ok(PowerSimulationResult {
        seed: options.seed,
        replications: options.replications,
        rejections,
        estimate,
        standard_error: (estimate * (1.0 - estimate) / b).sqrt(),
        ci_lower: if rejections == 0 {
            0.0
        } else {
            (center - half).max(0.0)
        },
        ci_upper: if rejections == options.replications {
            1.0
        } else {
            (center + half).min(1.0)
        },
        algorithm: ALGORITHM.into(),
    })
}

/// Checks redundant Monte Carlo fields without sampling or evaluating analytical power.
pub fn summary_consistent(result: &PowerSimulationResult) -> bool {
    if !(1000..=1000000).contains(&result.replications)
        || result.rejections > result.replications
        || result.algorithm != ALGORITHM
    {
        return false;
    }
    let options = PowerSimulation {
        seed: result.seed,
        replications: result.replications,
    };
    let Ok(expected) = summary(&options, result.rejections) else {
        return false;
    };
    [
        (result.estimate, expected.estimate),
        (result.standard_error, expected.standard_error),
        (result.ci_lower, expected.ci_lower),
        (result.ci_upper, expected.ci_upper),
    ]
    .iter()
    .all(|(a, b)| a.is_finite() && (a - b).abs() <= 1e-14 + 1e-10 * b.abs())
}
