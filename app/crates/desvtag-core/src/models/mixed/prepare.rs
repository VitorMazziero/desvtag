//! Casos completos, unidades, ocasiões e matriz de efeitos fixos avançados.
use super::{
    MAX_FIXED_CELLS, MAX_FIXED_COLUMNS, MAX_OBSERVATIONS, MAX_UN_OCCASIONS,
    advanced_types::*,
    covariance::Structure,
    estimation::Data,
    linalg::{Cholesky, dot},
    types::MixedModelRequest,
};
use crate::{
    domain::{Dataset, Factor, FactorKind, FactorValue, StableId},
    errors::CoreError,
    models::{
        design_matrix::{DesignMatrix, ExcludedObservation, ExclusionReason, build_bounded},
        resource_budget::WorkBudget,
        terms::{ModelSpec, TermSpec},
    },
    validation::{Issue, Severity},
};
use std::collections::{BTreeMap, BTreeSet};
pub(super) fn error(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![Issue::new(code, Severity::Error)])
}
pub(super) struct Prepared {
    pub data: Data,
    pub design: DesignMatrix,
    pub dataset: Dataset,
    pub spec: ModelSpec,
    pub units: Vec<String>,
    pub source_times: Vec<Option<f64>>,
    pub structure: Structure,
    pub time_factor: Option<StableId>,
}
pub(super) fn prepare(
    request: &MixedModelRequest,
    advanced: &AdvancedMixedSpec,
    budget: WorkBudget,
) -> Result<Prepared, CoreError> {
    if request.dataset.observations.len() > MAX_OBSERVATIONS {
        return Err(CoreError::InvalidInput(vec![
            Issue::new("mixed.row_budget", Severity::Error)
                .with_param("maxRows", &MAX_OBSERVATIONS),
        ]));
    }
    for (i, label) in advanced.time_labels.iter().enumerate() {
        if !label.index.is_finite()
            || label.label.trim().is_empty()
            || advanced.time_labels[..i]
                .iter()
                .any(|other| other.index == label.index || other.label == label.label)
        {
            return Err(error("mixed.invalid_time_values"));
        }
    }
    let mut dataset = request.dataset.clone();
    let mut spec = request.spec.clone();
    // Validate original dimensions before indexing or filtering.
    build_bounded(&dataset, &spec, MAX_FIXED_COLUMNS, MAX_FIXED_CELLS)
        .map_err(CoreError::InvalidInput)?;
    let structure = match advanced.covariance {
        MixedCovariance::CompoundSymmetry => Structure::CompoundSymmetry,
        MixedCovariance::Ar1 => Structure::Ar1,
        MixedCovariance::Unstructured => Structure::Unstructured,
    };
    let temporal =
        structure != Structure::CompoundSymmetry || advanced.time_effect != MixedTimeEffect::None;
    let times = match &advanced.times {
        Some(values)
            if values.len() == dataset.observations.len()
                && values.iter().flatten().all(|v| v.is_finite()) =>
        {
            values.clone()
        }
        None if !temporal => vec![None; dataset.observations.len()],
        _ => return Err(error("mixed.invalid_time_values")),
    };
    let time_by_id: BTreeMap<_, _> = dataset
        .observations
        .iter()
        .zip(&times)
        .map(|(o, t)| (o.id.clone(), *t))
        .collect();
    let mut excluded_time = Vec::new();
    if advanced.times.is_some() {
        dataset.observations.retain(|o| {
            let keep = time_by_id.get(&o.id).copied().flatten().is_some();
            if !keep {
                excluded_time.push(ExcludedObservation {
                    observation_id: o.id.clone(),
                    reason: ExclusionReason::MissingTime,
                });
            }
            keep
        });
    }
    let mut time_factor = None;
    if advanced.time_effect != MixedTimeEffect::None {
        let mut name = "optima-time".to_owned();
        while dataset.factors.iter().any(|f| f.id.as_str() == name) {
            name.push('x');
        }
        let id = StableId::new(name).map_err(|_| error("mixed.invalid_time_values"))?;
        let mut occasions: Vec<f64> = dataset
            .observations
            .iter()
            .filter_map(|o| time_by_id.get(&o.id).copied().flatten())
            .collect();
        occasions.sort_by(f64::total_cmp);
        occasions.dedup();
        let categorical = advanced.time_effect == MixedTimeEffect::Categorical;
        dataset.factors.push(Factor {
            id: id.clone(),
            name: "Time".to_owned(),
            kind: if categorical {
                FactorKind::Categorical
            } else {
                FactorKind::Numeric
            },
            unit: None,
            levels: if categorical {
                occasions.iter().map(ToString::to_string).collect()
            } else {
                Vec::new()
            },
        });
        for o in &mut dataset.observations {
            let t = time_by_id.get(&o.id).copied().flatten();
            o.factors.push(t.map(|t| {
                if categorical {
                    FactorValue::Text(t.to_string())
                } else {
                    FactorValue::Number(t)
                }
            }));
        }
        spec.terms.push(TermSpec::Main {
            factor_id: id.clone(),
        });
        time_factor = Some(id);
    }
    let mut design = build_bounded(&dataset, &spec, MAX_FIXED_COLUMNS, MAX_FIXED_CELLS)
        .map_err(CoreError::InvalidInput)?;
    design.excluded.extend(excluded_time);
    // Check the explicit grid budget before expensive covariance estimation.
    let mut involved = BTreeSet::new();
    for term in &spec.terms {
        match term {
            TermSpec::Main { factor_id } | TermSpec::Power { factor_id, .. } => {
                involved.insert(factor_id);
            }
            TermSpec::Interaction { factor_ids } => involved.extend(factor_ids),
        }
    }
    let used: BTreeSet<_> = design.observation_ids.iter().collect();
    let mut cells = 1_usize;
    for (i, factor) in dataset.factors.iter().enumerate().filter(|(_, factor)| {
        factor.kind == FactorKind::Categorical && involved.contains(&factor.id)
    }) {
        let levels = if factor.levels.is_empty() {
            dataset
                .observations
                .iter()
                .filter(|o| used.contains(&o.id))
                .filter_map(|o| match &o.factors[i] {
                    Some(FactorValue::Text(label)) => Some(label),
                    _ => None,
                })
                .collect::<BTreeSet<_>>()
                .len()
        } else {
            factor.levels.len()
        };
        cells = cells
            .checked_mul(levels)
            .ok_or_else(|| error("mixed.reference_grid_too_large"))?;
        if cells > 100_000 {
            return Err(error("mixed.reference_grid_too_large"));
        }
    }
    let n = design.y.len();
    let p = design.x.cols();
    if n <= p + 1 {
        return Err(error("mixed.too_few_observations"));
    }
    let by_id: BTreeMap<_, _> = dataset.observations.iter().map(|o| (&o.id, o)).collect();
    let mut units = Vec::new();
    let mut groups: Vec<Vec<usize>> = Vec::new();
    let mut source_times = Vec::new();
    let mut unit_indices = BTreeMap::new();
    for (i, id) in design.observation_ids.iter().enumerate() {
        let o = by_id.get(id).ok_or_else(|| error("mixed.missing_unit"))?;
        let unit = o
            .unit_id
            .as_ref()
            .ok_or_else(|| error("mixed.missing_unit"))?
            .as_str();
        let g = *unit_indices.entry(unit).or_insert_with(|| {
            units.push(unit.to_owned());
            groups.push(Vec::new());
            units.len() - 1
        });
        groups[g].push(i);
        source_times.push(time_by_id.get(id).copied().flatten());
    }
    if units.len() < 2 {
        return Err(error("mixed.too_few_units"));
    }
    if groups.iter().all(|g| g.len() < 2) {
        return Err(error("mixed.no_repeated_units"));
    }
    let times: Vec<f64> = source_times.iter().map(|t| t.unwrap_or(0.)).collect();
    if advanced.times.is_some() {
        for group in &mut groups {
            group.sort_by(|&a, &b| times[a].total_cmp(&times[b]));
            for pair in group.windows(2) {
                let lag = times[pair[1]] - times[pair[0]];
                if lag == 0. {
                    return Err(error("mixed.duplicate_unit_time"));
                }
                if structure == Structure::Ar1
                    && ((lag - lag.round()).abs() > 1e-8
                        || lag.round() < 1.
                        || lag > 9_007_199_254_740_991.)
                {
                    return Err(error("mixed.noninteger_time_lag"));
                }
            }
        }
    }
    if structure == Structure::Ar1 {
        let mut lags = Vec::new();
        for group in &groups {
            for (i, &a) in group.iter().enumerate() {
                for &b in &group[i + 1..] {
                    lags.push((times[b] - times[a]).round());
                }
            }
        }
        lags.sort_by(f64::total_cmp);
        lags.dedup();
        // Common diagonal plus only one off-diagonal cannot identify three parameters.
        // Exclusively even lags make rho and -rho observationally indistinguishable.
        if lags.len() < 2 || !lags.iter().any(|lag| lag % 2. == 1.) {
            return Err(error("mixed.ar1_not_identifiable"));
        }
    }
    let mut occasions = if advanced.times.is_some() {
        times.clone()
    } else {
        Vec::new()
    };
    occasions.sort_by(f64::total_cmp);
    occasions.dedup();
    if structure == Structure::Unstructured {
        let q = occasions.len();
        if q > MAX_UN_OCCASIONS {
            return Err(CoreError::InvalidInput(vec![
                Issue::new("mixed.occasion_budget", Severity::Error)
                    .with_param("maxOccasions", &MAX_UN_OCCASIONS),
            ]));
        }
        if q < 2 || q * (q + 1) / 2 >= n - p {
            return Err(error("mixed.unstructured_not_identifiable"));
        }
        for i in 0..q {
            for j in 0..=i {
                let count = groups
                    .iter()
                    .filter(|g| {
                        g.iter().any(|&r| times[r] == occasions[i])
                            && g.iter().any(|&r| times[r] == occasions[j])
                    })
                    .count();
                if count < 2 {
                    return Err(error("mixed.unstructured_not_identifiable"));
                }
            }
        }
    }
    let x: Vec<Vec<f64>> = (0..n)
        .map(|i| (0..p).map(|j| design.x[(i, j)]).collect())
        .collect();
    let mut xtx = vec![0.; p * p];
    let mut xty = vec![0.; p];
    for (row, y) in x.iter().zip(&design.y) {
        for j in 0..p {
            xty[j] += row[j] * y;
            for k in 0..p {
                xtx[j * p + k] += row[j] * row[k];
            }
        }
    }
    let information = Cholesky::factor(&xtx, p).ok_or_else(|| error("model.rank_deficient"))?;
    let beta = information
        .solve(&xty)
        .ok_or_else(|| error("model.rank_deficient"))?;
    if structure != Structure::Unstructured {
        let all_absorbed = groups.iter().all(|group| {
            let sums: Vec<f64> = (0..p)
                .map(|j| group.iter().map(|&i| x[i][j]).sum::<f64>())
                .collect();
            information.solve(&sums).is_some_and(|projection| {
                (group.len() as f64 - dot(&sums, &projection)).abs() < 1e-10 * group.len() as f64
            })
        });
        if all_absorbed {
            return Err(error("mixed.random_intercept_not_identifiable"));
        }
    }
    let scale = x
        .iter()
        .zip(&design.y)
        .map(|(row, y)| (y - dot(row, &beta)).powi(2))
        .sum::<f64>()
        / (n - p) as f64;
    if !scale.is_finite() || scale <= 0. {
        return Err(error("mixed.no_residual_variation"));
    }
    let mut seen = BTreeSet::new();
    for r in &advanced.references {
        if !r.value.is_finite()
            || !seen.insert(&r.factor_id)
            || !dataset
                .factors
                .iter()
                .any(|f| f.id == r.factor_id && f.kind == FactorKind::Numeric)
        {
            return Err(error("mixed.invalid_reference_grid"));
        }
    }
    let mut seen = BTreeSet::new();
    for id in &advanced.marginal_factors {
        if !seen.insert(id)
            || !dataset
                .factors
                .iter()
                .any(|f| f.id == *id && f.kind == FactorKind::Categorical)
        {
            return Err(error("mixed.invalid_reference_grid"));
        }
    }
    let data = Data {
        budget,
        x,
        y: design.y.clone(),
        groups,
        times,
        occasions,
        scale,
    };
    Ok(Prepared {
        data,
        design,
        dataset,
        spec,
        units,
        source_times,
        structure,
        time_factor,
    })
}
