//! Grade de referência e diferenças de médias marginais, calculadas no Rust.
use super::{
    advanced_types::*,
    estimates::{estimate, p_value},
    estimation::Fit,
    inference::Information,
    prepare::{Prepared, error},
};
use crate::{
    descriptive::Stat,
    domain::{Dataset, FactorKind, FactorValue, Observation, StableId},
    errors::CoreError,
    models::{design_matrix::build, terms::TermSpec},
};
use std::collections::BTreeSet;
pub(super) struct Marginal {
    pub grid: MixedReferenceGrid,
    pub means: Vec<MixedMarginalMean>,
    pub comparisons: Vec<MixedMarginalComparison>,
}
pub(super) fn calculate(
    prepared: &Prepared,
    advanced: &AdvancedMixedSpec,
    fit: &Fit,
    info: Option<&Information>,
) -> Result<Marginal, CoreError> {
    let dataset = &prepared.dataset;
    let spec = &prepared.spec;
    let mut involved = BTreeSet::new();
    for term in &spec.terms {
        match term {
            TermSpec::Main { factor_id } | TermSpec::Power { factor_id, .. } => {
                involved.insert(factor_id);
            }
            TermSpec::Interaction { factor_ids } => involved.extend(factor_ids),
        }
    }
    if advanced
        .marginal_factors
        .iter()
        .chain(advanced.references.iter().map(|r| &r.factor_id))
        .any(|id| !involved.contains(id))
    {
        return Err(error("mixed.invalid_reference_grid"));
    }
    let ids: BTreeSet<_> = prepared.design.observation_ids.iter().collect();
    let used: Vec<_> = dataset
        .observations
        .iter()
        .filter(|o| ids.contains(&o.id))
        .collect();
    let mut numeric = Vec::new();
    let mut categorical = Vec::new();
    let mut base = vec![None; dataset.factors.len()];
    let mut indexes = Vec::new();
    let mut cells = 1_usize;
    for (i, factor) in dataset
        .factors
        .iter()
        .enumerate()
        .filter(|(_, f)| involved.contains(&f.id))
    {
        if factor.kind == FactorKind::Numeric {
            let value = advanced
                .references
                .iter()
                .find(|r| r.factor_id == factor.id)
                .map_or_else(
                    || {
                        used.iter()
                            .filter_map(|o| match o.factors[i] {
                                Some(FactorValue::Number(v)) => Some(v),
                                _ => None,
                            })
                            .collect::<crate::numeric::CompensatedSum>()
                            .total()
                            / used.len() as f64
                    },
                    |r| r.value,
                );
            numeric.push(MixedReference {
                factor_id: factor.id.clone(),
                value,
            });
            base[i] = Some(FactorValue::Number(value));
        } else {
            let levels = if factor.levels.is_empty() {
                used.iter()
                    .filter_map(|o| match &o.factors[i] {
                        Some(FactorValue::Text(v)) => Some(v.clone()),
                        _ => None,
                    })
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect()
            } else {
                factor.levels.clone()
            };
            cells = cells
                .checked_mul(levels.len())
                .ok_or_else(|| error("mixed.reference_grid_too_large"))?;
            // Explicit guard; never replace the requested equal-weight grid with observed weights.
            if cells > 100_000 {
                return Err(error("mixed.reference_grid_too_large"));
            }
            categorical.push(MixedReferenceLevels {
                factor_id: factor.id.clone(),
                levels,
            });
            indexes.push(i);
        }
    }
    let grid = MixedReferenceGrid {
        numeric,
        categorical,
        cells: u32::try_from(cells).unwrap_or(u32::MAX),
    };
    if advanced.marginal_factors.is_empty() {
        return Ok(Marginal {
            grid,
            means: Vec::new(),
            comparisons: Vec::new(),
        });
    }
    let mut rows = vec![base];
    for (levels, &index) in grid.categorical.iter().zip(&indexes) {
        rows = rows
            .into_iter()
            .flat_map(|row| {
                levels.levels.iter().map(move |level| {
                    let mut r = row.clone();
                    r[index] = Some(FactorValue::Text(level.clone()));
                    r
                })
            })
            .collect();
    }
    let mut reference: Dataset = dataset.clone();
    for factor in &mut reference.factors {
        if let Some(levels) = grid.categorical.iter().find(|v| v.factor_id == factor.id) {
            factor.levels = levels.levels.clone();
        }
    }
    reference.observations = rows
        .into_iter()
        .enumerate()
        .map(|(i, factors)| {
            let mut responses = vec![None; dataset.responses.len()];
            if let Some(response) = dataset.response_index(&spec.response_id) {
                responses[response] = Some(0.);
            }
            Ok(Observation {
                id: StableId::new(format!("grid-{}", i + 1))
                    .map_err(|_| error("mixed.invalid_reference_grid"))?,
                unit_id: None,
                factors,
                responses,
            })
        })
        .collect::<Result<Vec<_>, CoreError>>()?;
    let matrix = build(&reference, spec).map_err(CoreError::InvalidInput)?;
    if matrix.labels != prepared.design.labels {
        return Err(error("mixed.invalid_reference_grid"));
    }
    let p = fit.solution.beta.len();
    let mut means = Vec::new();
    let mut comparisons = Vec::new();
    for id in &advanced.marginal_factors {
        let factor = dataset
            .factor_index(id)
            .ok_or_else(|| error("mixed.invalid_reference_grid"))?;
        let levels = &grid
            .categorical
            .iter()
            .find(|v| v.factor_id == *id)
            .ok_or_else(|| error("mixed.invalid_reference_grid"))?
            .levels;
        let mut contrasts = Vec::new();
        for level in levels {
            let matching: Vec<_> = reference
                .observations
                .iter()
                .enumerate()
                .filter(|(_, o)| o.factors[factor] == Some(FactorValue::Text(level.clone())))
                .map(|(i, _)| i)
                .collect();
            if matching.is_empty() {
                return Err(error("mixed.invalid_reference_grid"));
            }
            let contrast: Vec<f64> = (0..p)
                .map(|j| {
                    matching.iter().map(|&i| matrix.x[(i, j)]).sum::<f64>() / matching.len() as f64
                })
                .collect();
            means.push(MixedMarginalMean {
                factor_id: id.clone(),
                level: level.clone(),
                inference: estimate(&contrast, fit, info, spec.confidence_level),
            });
            contrasts.push(contrast);
        }
        let count = levels.len() * (levels.len() - 1) / 2;
        let start = comparisons.len();
        for i in 0..levels.len() {
            for j in i + 1..levels.len() {
                let difference: Vec<f64> = contrasts[i]
                    .iter()
                    .zip(&contrasts[j])
                    .map(|(a, b)| a - b)
                    .collect();
                let inference = estimate(
                    &difference,
                    fit,
                    info,
                    1. - (1. - spec.confidence_level) / count as f64,
                );
                let raw = p_value(&inference);
                comparisons.push(MixedMarginalComparison {
                    factor_id: id.clone(),
                    first: levels[i].clone(),
                    second: levels[j].clone(),
                    inference,
                    p_value: raw,
                    adjusted_p_value: raw,
                    family_size: u32::try_from(count).unwrap_or(u32::MAX),
                });
            }
        }
        let mut order: Vec<usize> = (start..comparisons.len()).collect();
        order.sort_by(|&i, &j| {
            comparisons[i]
                .p_value
                .value()
                .unwrap_or(f64::INFINITY)
                .total_cmp(&comparisons[j].p_value.value().unwrap_or(f64::INFINITY))
        });
        let mut previous = 0_f64;
        for (rank, index) in order.into_iter().enumerate() {
            if let Some(raw) = comparisons[index].p_value.value() {
                let multiplier = match advanced.adjustment {
                    MixedAdjustment::Bonferroni => count,
                    MixedAdjustment::Holm => count - rank,
                };
                let adjusted = (raw * multiplier as f64).min(1.);
                previous = previous.max(adjusted);
                comparisons[index].adjusted_p_value = Stat::finite(previous);
            }
        }
    }
    Ok(Marginal {
        grid,
        means,
        comparisons,
    })
}
