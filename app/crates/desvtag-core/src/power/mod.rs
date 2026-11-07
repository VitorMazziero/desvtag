//! Gaussian prospective power; legacy formulas remain separate from advanced designs.
mod advanced;
mod anova;
mod fixed_design;
mod legacy;
mod scale;
mod simulation;
mod t_test;
mod types;
use crate::descriptive::Stat;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};
pub use simulation::summary_consistent as simulation_summary_consistent;
pub use types::*;
/// Method registry ID.
pub const METHOD_ID: &str = "power_analysis";
/// Latest implemented version.
pub const METHOD_VERSION: u32 = 2;
const LEGACY_METHOD_VERSION: u32 = 1;
/// Maximum examined replication count.
pub const MAX_N: u32 = 100_000;
const CURVE_POINTS: usize = 40;
/// Potência e quantidades auxiliares em um `n`.
pub(crate) struct Evaluation {
    pub power: f64,
    pub noncentrality: f64,
    pub df1: f64,
    pub df2: f64,
    pub critical: f64,
}

pub(crate) struct TestDetails {
    pub noncentrality: Option<f64>,
    pub df1: f64,
    pub df2: f64,
    pub critical: f64,
}
impl From<&Evaluation> for TestDetails {
    fn from(at: &Evaluation) -> Self {
        Self {
            noncentrality: Some(at.noncentrality),
            df1: at.df1,
            df2: at.df2,
            critical: at.critical,
        }
    }
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests;

/// Analytical prospective power with optional independent Monte Carlo verification.
/// # Errors
/// Invalid assumptions, nonestimable design, numerical failure or an unreachable target.
pub fn analyze(request: &PowerRequest) -> Result<PowerResult, CoreError> {
    if let Some(options) = &request.simulation
        && !(1_000..=1_000_000).contains(&options.replications)
    {
        return Err(CoreError::InvalidInput(vec![error(
            "power.invalid_simulation",
        )]));
    }
    let mut result = if matches!(
        request.design,
        PowerDesign::Regression { .. }
            | PowerDesign::Contrast { .. }
            | PowerDesign::TwoLevel { .. }
    ) {
        advanced::analyze(request)?
    } else {
        legacy::analyze(request)?
    };
    if let Some(options) = &request.simulation {
        let precision = matches!(request.goal, PowerGoal::PrecisionFor { .. })
            && result.half_width.value().is_some();
        if result.total > MAX_N && !precision {
            return Err(CoreError::InvalidInput(vec![error("power.total_budget")]));
        }
        if result.total > MAX_N {
            result.issues.push(
                Issue::new("power.simulation_total_budget", Severity::Warning)
                    .with_param("max", &MAX_N),
            );
        } else {
            match simulation::run(&result, options, request.two_sided) {
                Ok(simulation) => result.simulation = Some(simulation),
                Err(_) if precision => result.issues.push(Issue::new(
                    "power.simulation_unavailable",
                    Severity::Warning,
                )),
                Err(error) => return Err(error),
            }
        }
        result.provenance.method_version = METHOD_VERSION;
    }
    Ok(result)
}
