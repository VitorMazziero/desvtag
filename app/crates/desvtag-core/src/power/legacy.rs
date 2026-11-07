use super::*;
use crate::descriptive::UndefinedReason;
fn evaluate(request: &PowerRequest, n: u32) -> Option<Evaluation> {
    match &request.design {
        PowerDesign::Anova { means } => anova::power(means, request.sigma, request.alpha, n),
        PowerDesign::OneSampleT { difference } | PowerDesign::PairedT { difference } => {
            t_test::power(
                *difference,
                request.sigma,
                request.alpha,
                request.two_sided,
                n,
                false,
            )
        }
        PowerDesign::TwoSampleT { difference } => t_test::power(
            *difference,
            request.sigma,
            request.alpha,
            request.two_sided,
            n,
            true,
        ),
        _ => None,
    }
}

fn minimum_n(request: &PowerRequest, target: f64) -> Result<Option<u32>, CoreError> {
    let reaches = |n: u32| {
        evaluate(request, n)
            .map(|e| e.power >= target)
            .ok_or_else(|| CoreError::InvalidInput(vec![error("power.numerical_failure")]))
    };
    let mut high = 2_u32;
    while !reaches(high)? {
        if high >= MAX_N {
            return Ok(None);
        }
        high = (high * 2).min(MAX_N);
    }
    let mut low = 2_u32; // `low` pode já atingir
    if reaches(low)? {
        return Ok(Some(low));
    }
    while high - low > 1 {
        let mid = low + (high - low) / 2;
        if reaches(mid)? {
            high = mid;
        } else {
            low = mid;
        }
    }
    Ok(Some(high))
}

fn validate(request: &PowerRequest) -> Vec<Issue> {
    let mut issues = Vec::new();
    if !(request.sigma.is_finite() && request.sigma > 0.0) {
        issues.push(error("power.invalid_sigma"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("power.invalid_alpha"));
    }
    match &request.design {
        PowerDesign::Anova { means } => {
            if means.len() < 2 || means.iter().any(|m| !m.is_finite()) {
                issues.push(error("power.invalid_means"));
            } else if means.iter().all(|m| (*m - means[0]).abs() == 0.0)
                && !matches!(request.goal, PowerGoal::PowerAt { .. })
            {
                issues.push(error("power.no_effect"));
            }
            if matches!(request.goal, PowerGoal::PrecisionFor { .. }) {
                issues.push(error("power.precision_needs_t"));
            }
        }
        PowerDesign::OneSampleT { difference }
        | PowerDesign::PairedT { difference }
        | PowerDesign::TwoSampleT { difference } => {
            if !difference.is_finite() {
                issues.push(error("power.invalid_difference"));
            } else if *difference == 0.0 && matches!(request.goal, PowerGoal::SampleSizeFor { .. })
            {
                issues.push(error("power.no_effect"));
            }
        }
        _ => issues.push(error("power.invalid_design")),
    }
    match request.goal {
        PowerGoal::PowerAt { n } if !(2..=MAX_N).contains(&n) => {
            issues.push(error("power.invalid_n"))
        }
        PowerGoal::SampleSizeFor { power } if !(power > 0.0 && power < 1.0) => {
            issues.push(error("power.invalid_target"));
        }
        PowerGoal::PrecisionFor { half_width } if !(half_width.is_finite() && half_width > 0.0) => {
            issues.push(error("power.invalid_half_width"));
        }
        _ => {}
    }
    issues
}

/// Calcula potência, tamanho de amostra ou precisão.
///
/// # Errors
/// [`CoreError::InvalidInput`] para solicitação inválida ou objetivo inalcançável até [`MAX_N`].
pub fn analyze(request: &PowerRequest) -> Result<PowerResult, CoreError> {
    let issues = validate(request);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let two_groups = matches!(request.design, PowerDesign::TwoSampleT { .. });
    let groups = match &request.design {
        PowerDesign::Anova { means } => means.len() as u32,
        PowerDesign::TwoSampleT { .. } => 2,
        _ => 1,
    };
    let n = match request.goal {
        PowerGoal::PowerAt { n } => n,
        PowerGoal::SampleSizeFor { power } => minimum_n(request, power)?.ok_or_else(|| {
            CoreError::InvalidInput(vec![error("power.unreachable").with_param("max", &MAX_N)])
        })?,
        PowerGoal::PrecisionFor { half_width } => {
            t_test::precision_n(request.sigma, request.alpha, half_width, two_groups).ok_or_else(
                || {
                    CoreError::InvalidInput(vec![
                        error("power.unreachable").with_param("max", &MAX_N),
                    ])
                },
            )?
        }
    };
    let at = evaluate(request, n);
    let details = if let Some(at) = &at {
        TestDetails::from(at)
    } else if matches!(request.goal, PowerGoal::PrecisionFor { .. }) {
        let difference = match request.design {
            PowerDesign::OneSampleT { difference }
            | PowerDesign::PairedT { difference }
            | PowerDesign::TwoSampleT { difference } => difference,
            _ => 0.0,
        };
        t_test::details(
            difference,
            request.sigma,
            request.alpha,
            request.two_sided,
            n,
            two_groups,
        )
        .ok_or_else(|| CoreError::InvalidInput(vec![error("power.numerical_failure")]))?
    } else {
        return Err(CoreError::InvalidInput(vec![error(
            "power.numerical_failure",
        )]));
    };
    let curve_end = (n.saturating_mul(2)).clamp(10, 400);
    let curve: Vec<PowerPoint> = (0..CURVE_POINTS)
        .filter_map(|i| {
            let m = 2 + ((curve_end - 2) as usize * i / (CURVE_POINTS - 1)) as u32;
            evaluate(request, m).map(|e| PowerPoint {
                n: m,
                power: e.power,
            })
        })
        .collect();
    let half_width = if matches!(request.design, PowerDesign::Anova { .. }) {
        Stat::undefined(UndefinedReason::NoModelTerms)
    } else {
        t_test::half_width(request.sigma, request.alpha, n, two_groups).map_or(
            Stat::undefined(UndefinedReason::NonFiniteResult),
            Stat::finite,
        )
    };
    let mut notes = Vec::new();
    if at.is_none() {
        notes.push(Issue::new(
            "power.analytical_unavailable",
            Severity::Warning,
        ));
    }
    if curve.len() < CURVE_POINTS {
        notes.push(Issue::new("power.curve_incomplete", Severity::Warning));
    }
    if n < 5 {
        notes.push(Issue::new("power.small_n", Severity::Warning));
    }
    Ok(PowerResult {
        n,
        total: n
            .checked_mul(if matches!(request.design, PowerDesign::Anova { .. }) {
                groups
            } else if two_groups {
                2
            } else {
                1
            })
            .ok_or_else(|| CoreError::InvalidInput(vec![error("power.total_budget")]))?,
        power: at
            .as_ref()
            .map_or(Stat::undefined(UndefinedReason::NonFiniteResult), |at| {
                Stat::finite(at.power)
            }),
        noncentrality: details.noncentrality,
        df1: details.df1,
        df2: details.df2,
        critical: details.critical,
        half_width,
        curve,
        issues: notes,
        provenance: Provenance::current(
            METHOD_ID,
            if at.is_none() {
                METHOD_VERSION
            } else {
                LEGACY_METHOD_VERSION
            },
        ),
        simulation: None,
    })
}
