//! Gaussian nonlinear saturation models; optional likelihood profiles are calculated in Rust.
mod fitting;
mod model;
mod optimizer;
mod profile;
mod types;
use crate::descriptive::{Stat, UndefinedReason};
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};
pub use fitting::fit;
pub use types::*;
/// Registry method ID.
pub const METHOD_ID: &str = "nonlinear_saturation_fit";
/// Latest implementation version (legacy requests retain version 1).
pub const METHOD_VERSION: u32 = 2;
const MAX_ITERATIONS: usize = 500;
/// Number of fitted curve points.
pub const CURVE_POINTS: usize = 80;
/// Operational input envelope qualified for nonlinear fitting in v0.4.
pub const MAX_OBSERVATIONS: usize = 4096;
/// Shared upper bound on model/gradient row work, not a wall-clock limit.
pub const MAX_ROW_WORK: u64 = 100_000_000;
fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}
fn warning(code: &str) -> Issue {
    Issue::new(code, Severity::Warning)
}
fn finite_or(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}
#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests;
