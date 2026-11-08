//! Structural validation of stored advanced results; never refits a model.
use desvtag_core::{
    descriptive::{Stat, UndefinedReason},
    models::mixed::{MixedCovariance, MixedModelRequest, MixedModelResult, MixedTimeEffect},
    models::terms::TermSpec,
};
use std::collections::{HashMap, HashSet};
fn not_applicable(value: Stat) -> bool {
    matches!(
        value,
        Stat::Undefined {
            reason: UndefinedReason::NotApplicable
        }
    )
}
pub(crate) fn valid(request: &MixedModelRequest, result: &MixedModelResult) -> bool {
    let (Some(input), Some(output)) = (&request.advanced, &result.advanced) else {
        return request.advanced.is_none() && result.advanced.is_none();
    };
    let p = result.coefficients.len();
    let q = output.occasions.len();
    if result.provenance.method_version < 2
        || input.covariance != output.covariance
        || input.time_effect != output.time_effect
        || request.spec.coding != output.coding
        || input.adjustment != output.adjustment
        || input.time_labels != output.time_labels
        || output.fixed_covariance.len() != p * p
        || output.profiles.len() != result.n_observations as usize
        || output.gradient_norm < 0.
        || output.occasions.windows(2).any(|t| t[0] >= t[1])
        || input
            .times
            .as_ref()
            .is_some_and(|t| t.len() != request.dataset.observations.len())
    {
        return false;
    }
    if (input.time_effect == MixedTimeEffect::None) != output.time_factor_id.is_none() {
        return false;
    }
    let original: HashMap<_, _> = request
        .dataset
        .observations
        .iter()
        .map(|o| (&o.id, o.unit_id.as_ref()))
        .collect();
    let mut points = HashSet::new();
    let mut units = HashSet::new();
    for point in &output.profiles {
        if !points.insert(&point.observation_id)
            || !original
                .get(&point.observation_id)
                .is_some_and(|unit| unit.is_some_and(|id| id.as_str() == point.unit))
        {
            return false;
        }
        units.insert(point.unit.as_str());
        if let Some(time) = point.time
            && !output.occasions.contains(&time)
        {
            return false;
        }
    }
    if units.len() != result.n_groups as usize
        || output.mean_profiles.len() != q
        || output
            .mean_profiles
            .iter()
            .zip(&output.occasions)
            .any(|(profile, time)| {
                profile.time != *time
                    || profile.n == 0
                    || profile.units == 0
                    || profile.units > profile.n
            })
    {
        return false;
    }
    let extra = usize::from(input.time_effect != MixedTimeEffect::None);
    if output.term_tests.len() != request.spec.terms.len() + extra {
        return false;
    }
    for (i, test) in output.term_tests.iter().enumerate() {
        if test.columns.len() != test.numerator_df as usize {
            return false;
        }
        if i < request.spec.terms.len() {
            if test.term != request.spec.terms[i] {
                return false;
            }
        } else if !matches!(&test.term,TermSpec::Main{factor_id} if Some(factor_id)==output.time_factor_id.as_ref())
        {
            return false;
        }
    }
    if input.covariance == MixedCovariance::Unstructured {
        if output.covariance_matrix.len() != q * q
            || !result.random_effects.is_empty()
            || !not_applicable(result.variance_unit)
            || !not_applicable(result.variance_residual)
            || !not_applicable(result.icc)
            || output
                .profiles
                .iter()
                .any(|p| !not_applicable(p.conditional))
        {
            return false;
        }
    } else if !output.covariance_matrix.is_empty()
        || result.random_effects.len() != units.len()
        || result
            .random_effects
            .iter()
            .any(|r| !units.contains(r.unit.as_str()))
    {
        return false;
    }
    let known = |id: &desvtag_core::domain::StableId| {
        request.dataset.factors.iter().any(|f| f.id == *id)
            || output.time_factor_id.as_ref() == Some(id)
    };
    let requested = |id: &desvtag_core::domain::StableId| {
        input.marginal_factors.contains(id)
            || (input.marginal_time && output.time_factor_id.as_ref() == Some(id))
    };
    output
        .reference_grid
        .numeric
        .iter()
        .all(|r| known(&r.factor_id))
        && output
            .reference_grid
            .categorical
            .iter()
            .all(|r| known(&r.factor_id) && !r.levels.is_empty())
        && output
            .marginal_means
            .iter()
            .all(|m| requested(&m.factor_id))
        && output
            .comparisons
            .iter()
            .all(|c| requested(&c.factor_id) && c.first != c.second && c.family_size > 0)
}
