//! Analytical power and integer minimum replication for explicit fixed designs.
use super::fixed_design::{FixedDesign, FixedTest, prepare};
use super::*;
use crate::descriptive::UndefinedReason;
use crate::distributions::{f, noncentral, student_t};

impl FixedDesign {
    fn details(&self, request: &PowerRequest, n: u32) -> Result<Option<TestDetails>, CoreError> {
        let failure = || CoreError::InvalidInput(vec![error("power.numerical_failure")]);
        let total = u64::from(n) * u64::from(self.base_observations);
        if total > u64::from(MAX_N) {
            return Err(CoreError::InvalidInput(vec![error("power.total_budget")]));
        }
        if n == 0 || total <= u64::from(self.parameters) {
            return Ok(None);
        }
        let df = (total - u64::from(self.parameters)) as f64;
        let details = match self.test {
            FixedTest::F {
                numerator_df,
                lambda_per_rep,
            } => {
                let q = f64::from(numerator_df);
                let nc = f64::from(n) * lambda_per_rep;
                TestDetails {
                    noncentrality: nc.is_finite().then_some(nc),
                    df1: q,
                    df2: df,
                    critical: f::quantile_upper(request.alpha, q, df).map_err(|_| failure())?,
                }
            }
            FixedTest::T { delta_per_rep, .. } => {
                let nc = delta_per_rep
                    .map(|delta| delta.abs() * f64::from(n).sqrt())
                    .filter(|value| value.is_finite());
                TestDetails {
                    noncentrality: nc,
                    df1: df,
                    df2: 0.0,
                    critical: student_t::quantile_upper(
                        if request.two_sided {
                            request.alpha / 2.0
                        } else {
                            request.alpha
                        },
                        df,
                    )
                    .map_err(|_| failure())?,
                }
            }
        };
        if !details.critical.is_finite() {
            return Err(failure());
        }
        Ok(Some(details))
    }
    fn evaluation(&self, request: &PowerRequest, n: u32) -> Result<Option<Evaluation>, CoreError> {
        record_work!("power.evaluate_calls", 1);
        let failure = || CoreError::InvalidInput(vec![error("power.numerical_failure")]);
        let Some(details) = self.details(request, n)? else {
            return Ok(None);
        };
        let nc = details.noncentrality.ok_or_else(failure)?;
        record_work!(
            "power.tail_calls",
            if details.df2 > 0.0 || !request.two_sided {
                1
            } else {
                2
            }
        );
        let power = if details.df2 > 0.0 {
            noncentral::ncf_sf(details.critical, details.df1, details.df2, nc)
        } else {
            (1.0 - noncentral::nct_cdf(details.critical, details.df1, nc)
                + if request.two_sided {
                    noncentral::nct_cdf(-details.critical, details.df1, nc)
                } else {
                    0.0
                })
            .clamp(0.0, 1.0)
        };
        if !power.is_finite() {
            return Err(failure());
        }
        Ok(Some(Evaluation {
            power,
            noncentrality: nc,
            df1: details.df1,
            df2: details.df2,
            critical: details.critical,
        }))
    }
    fn half_width(&self, alpha: f64, n: u32) -> Option<f64> {
        record_work!("power.half_width_calls", 1);
        let FixedTest::T {
            standard_error_per_rep,
            standard_error_scales,
            ..
        } = self.test
        else {
            return None;
        };
        let total = n.checked_mul(self.base_observations)?;
        if total <= self.parameters {
            return None;
        }
        let critical =
            student_t::quantile_upper(alpha / 2.0, f64::from(total - self.parameters)).ok()?;
        let value = critical * (standard_error_per_rep / f64::from(n).sqrt());
        if value.is_finite() && value > 0.0 {
            Some(value)
        } else {
            super::scale::positive_product([
                critical,
                standard_error_scales[0],
                standard_error_scales[1],
                standard_error_scales[2],
                f64::from(n).sqrt().recip(),
            ])
        }
    }
}
fn minimum(design: &FixedDesign, request: &PowerRequest) -> Result<u32, CoreError> {
    let max = MAX_N / design.base_observations;
    let reaches = |n: u32| -> Result<bool, CoreError> {
        if let PowerGoal::PrecisionFor { half_width } = request.goal {
            return Ok(design
                .half_width(request.alpha, n)
                .is_some_and(|h| h <= half_width));
        }
        let Some(at) = design.evaluation(request, n)? else {
            return Ok(false);
        };
        Ok(matches!(request.goal, PowerGoal::SampleSizeFor { power } if at.power >= power))
    };
    let mut low = 0;
    let mut high = 1;
    while !reaches(high)? {
        low = high;
        if high >= max {
            return Err(CoreError::InvalidInput(vec![
                error("power.unreachable").with_param("max", &max),
            ]));
        }
        high = (high * 2).min(max);
    }
    while high - low > 1 {
        let mid = low + (high - low) / 2;
        if reaches(mid)? {
            high = mid;
        } else {
            low = mid;
        }
    }
    Ok(high)
}

pub(super) fn analyze(request: &PowerRequest) -> Result<PowerResult, CoreError> {
    let mut issues = Vec::new();
    if !request.sigma.is_finite() || request.sigma <= 0.0 {
        issues.push(error("power.invalid_sigma"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("power.invalid_alpha"));
    }
    match request.goal {
        PowerGoal::PowerAt { n: 0 } => issues.push(error("power.invalid_replications")),
        PowerGoal::SampleSizeFor { power } if !(power > 0.0 && power < 1.0) => {
            issues.push(error("power.invalid_target"))
        }
        PowerGoal::PrecisionFor { half_width } if !half_width.is_finite() || half_width <= 0.0 => {
            issues.push(error("power.invalid_half_width"))
        }
        _ => {}
    }
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let design = prepare(
        &request.design,
        request.sigma,
        matches!(request.goal, PowerGoal::PrecisionFor { .. }),
    )?;
    if matches!(request.goal, PowerGoal::PrecisionFor { .. })
        && matches!(design.test, FixedTest::F { .. })
    {
        return Err(CoreError::InvalidInput(vec![error(
            "power.precision_needs_t",
        )]));
    }
    let n = match request.goal {
        PowerGoal::PowerAt { n } => n,
        _ => minimum(&design, request)?,
    };
    let at = match design.evaluation(request, n) {
        Ok(value) => value,
        Err(_)
            if matches!(request.goal, PowerGoal::PrecisionFor { .. })
                && design.half_width(request.alpha, n).is_some() =>
        {
            None
        }
        Err(error) => return Err(error),
    };
    let details = if let Some(at) = &at {
        TestDetails::from(at)
    } else if matches!(request.goal, PowerGoal::PrecisionFor { .. }) {
        issues.push(Issue::new(
            "power.analytical_unavailable",
            Severity::Warning,
        ));
        design
            .details(request, n)?
            .ok_or_else(|| CoreError::InvalidInput(vec![error("power.insufficient_df")]))?
    } else {
        return Err(CoreError::InvalidInput(vec![error(
            "power.insufficient_df",
        )]));
    };
    let max = MAX_N / design.base_observations;
    let end = n.saturating_mul(2).max(10).min(max);
    let mut curve = Vec::new();
    let mut incomplete = false;
    for i in 0..CURVE_POINTS {
        let m = 1 + ((end - 1) as usize * i / (CURVE_POINTS - 1)) as u32;
        if curve.last().is_some_and(|point: &PowerPoint| point.n == m) {
            continue;
        }
        match design.evaluation(request, m) {
            Ok(Some(e)) => curve.push(PowerPoint {
                n: m,
                power: e.power,
            }),
            Ok(None) => {}
            Err(_) => incomplete = true,
        }
    }
    if incomplete {
        issues.push(Issue::new("power.curve_incomplete", Severity::Warning));
    }
    Ok(PowerResult {
        n,
        total: n * design.base_observations,
        power: at
            .as_ref()
            .map_or(Stat::undefined(UndefinedReason::NonFiniteResult), |at| {
                Stat::finite(at.power)
            }),
        noncentrality: details.noncentrality,
        df1: details.df1,
        df2: details.df2,
        critical: details.critical,
        half_width: design.half_width(request.alpha, n).map_or(
            Stat::undefined(UndefinedReason::NotApplicable),
            Stat::finite,
        ),
        curve,
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
        simulation: None,
    })
}
