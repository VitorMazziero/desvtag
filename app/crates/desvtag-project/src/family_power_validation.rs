//! Structural power-record checks; no recalculation of a saved analysis.
use desvtag_core::power::{PowerDesign, PowerRequest, PowerResult};
pub(crate) fn valid(request: &PowerRequest, result: &PowerResult) -> bool {
    if request.sigma <= 0.0 || !(request.alpha > 0.0 && request.alpha < 1.0) {
        return false;
    }
    match request.goal {
        desvtag_core::power::PowerGoal::PowerAt { n } if n != result.n => return false,
        desvtag_core::power::PowerGoal::SampleSizeFor { power }
            if !(power > 0.0 && power < 1.0) =>
        {
            return false;
        }
        desvtag_core::power::PowerGoal::PrecisionFor { half_width } if half_width <= 0.0 => {
            return false;
        }
        _ => {}
    }

    if result.n == 0
        || result.df1 <= 0.0
        || result.df2 < 0.0
        || result.noncentrality.is_some_and(|value| value < 0.0)
        || result
            .power
            .value()
            .is_some_and(|p| !(0.0..=1.0).contains(&p))
        || result
            .curve
            .iter()
            .any(|p| p.n == 0 || !(0.0..=1.0).contains(&p.power))
    {
        return false;
    }
    let precision = matches!(
        request.goal,
        desvtag_core::power::PowerGoal::PrecisionFor { .. }
    );
    let partial = precision
        && result.provenance.method_version >= 2
        && result.half_width.value().is_some_and(|value| value > 0.0)
        && result.power.value().is_none()
        && result
            .issues
            .iter()
            .any(|issue| issue.code == "power.analytical_unavailable");
    if (result.power.value().is_none() && !partial)
        || (result.noncentrality.is_none() && !partial)
        || matches!(request.goal, desvtag_core::power::PowerGoal::PrecisionFor { half_width }
            if !result.half_width.value().is_some_and(|value| value > 0.0 && value <= half_width))
    {
        return false;
    }
    let (base, advanced) = match &request.design {
        PowerDesign::Anova { means } => {
            if means.len() < 2 {
                return false;
            }
            (means.len() as u64, false)
        }
        PowerDesign::TwoSampleT { .. } => (2, false),
        PowerDesign::OneSampleT { .. } | PowerDesign::PairedT { .. } => (1, false),
        PowerDesign::Regression {
            predictors,
            coefficients,
        } => {
            if coefficients.is_empty()
                || coefficients.len() > 32
                || predictors.len() > 4096
                || predictors.len() <= coefficients.len()
                || predictors.iter().any(|r| r.len() != coefficients.len())
            {
                return false;
            }
            (predictors.len() as u64, true)
        }
        PowerDesign::Contrast {
            means,
            weights,
            allocation,
        } => {
            if means.len() < 2
                || means.len() != weights.len()
                || means.len() != allocation.len()
                || allocation.contains(&0)
            {
                return false;
            }
            (allocation.iter().map(|n| u64::from(*n)).sum(), true)
        }
        PowerDesign::TwoLevel {
            factors,
            terms,
            effects,
            target,
        } => {
            if !(1..=8).contains(factors)
                || terms.is_empty()
                || terms.len() != effects.len()
                || *target as usize >= terms.len()
                || terms
                    .iter()
                    .any(|t| t.is_empty() || t.iter().any(|f| *f >= *factors))
            {
                return false;
            }
            let mut seen = std::collections::HashSet::new();
            for term in terms {
                let mut mask = 0_u16;
                for factor in term {
                    let bit = 1_u16 << factor;
                    if mask & bit != 0 {
                        return false;
                    }
                    mask |= bit;
                }
                if !seen.insert(mask) {
                    return false;
                }
            }
            (u64::from(1_u32 << factors), true)
        }
    };
    if u64::from(result.total) != u64::from(result.n) * base
        || (advanced && result.total > 100000)
        || (advanced && result.provenance.method_version < 2)
    {
        return false;
    }
    let total = f64::from(result.total);
    let (df1, df2) = match &request.design {
        PowerDesign::Anova { means } => (means.len() as f64 - 1.0, total - means.len() as f64),
        PowerDesign::Regression { coefficients, .. } => (
            coefficients.len() as f64,
            total - coefficients.len() as f64 - 1.0,
        ),
        PowerDesign::Contrast { means, .. } => (total - means.len() as f64, 0.0),
        PowerDesign::TwoLevel { terms, .. } => (total - terms.len() as f64 - 1.0, 0.0),
        PowerDesign::TwoSampleT { .. } => (total - 2.0, 0.0),
        _ => (total - 1.0, 0.0),
    };
    if result.df1 != df1
        || result.df2 != df2
        || df1 <= 0.0
        || (df2 == 0.0
            && matches!(
                request.design,
                PowerDesign::Anova { .. } | PowerDesign::Regression { .. }
            ))
    {
        return false;
    }
    if matches!(
        request.design,
        PowerDesign::Anova { .. } | PowerDesign::Regression { .. }
    ) && (matches!(
        request.goal,
        desvtag_core::power::PowerGoal::PrecisionFor { .. }
    ) || result.half_width.value().is_some())
    {
        return false;
    }
    match (&request.simulation, &result.simulation) {
        (None, None) => true,
        (Some(input), None) => {
            precision
                && result.provenance.method_version >= 2
                && result.half_width.value().is_some_and(|value| value > 0.0)
                && (1000..=1000000).contains(&input.replications)
                && result.issues.iter().any(|issue| {
                    if result.total > desvtag_core::power::MAX_N {
                        issue.code == "power.simulation_total_budget"
                    } else {
                        issue.code == "power.simulation_unavailable"
                    }
                })
        }
        (Some(input), Some(sim)) => {
            result.provenance.method_version >= 2
                && desvtag_core::power::simulation_summary_consistent(sim)
                && sim.seed == input.seed
                && sim.replications == input.replications
                && (1000..=1000000).contains(&sim.replications)
                && sim.rejections <= sim.replications
                && (0.0..=1.0).contains(&sim.estimate)
                && sim.standard_error >= 0.0
                && sim.ci_lower >= 0.0
                && sim.ci_lower <= sim.estimate
                && sim.ci_upper >= sim.estimate
                && sim.ci_upper <= 1.0
                && !sim.algorithm.is_empty()
                && sim.algorithm.len() <= 200
        }
        _ => false,
    }
}
