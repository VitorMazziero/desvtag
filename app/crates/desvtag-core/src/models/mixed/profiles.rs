//! Perfis individuais e agregação nas condições observadas, sem imputação.
use super::{
    advanced_types::{MixedMeanProfile, MixedProfilePoint},
    estimates::estimate,
    estimation::Fit,
    inference::Information,
    linalg::dot,
    prepare::Prepared,
};
use crate::descriptive::{Stat, UndefinedReason};
use std::collections::BTreeSet;
pub(super) fn calculate(
    prepared: &Prepared,
    fit: &Fit,
    info: Option<&Information>,
    unit_variance: Option<f64>,
) -> (Vec<MixedProfilePoint>, Vec<MixedMeanProfile>, Vec<f64>) {
    let data = &prepared.data;
    let p = fit.solution.beta.len();
    let mut points = Vec::new();
    let mut effects = Vec::new();
    for (g, rows) in data.groups.iter().enumerate() {
        let residual: Vec<f64> = rows
            .iter()
            .map(|&i| data.y[i] - dot(&data.x[i], &fit.solution.beta))
            .collect();
        let blup = unit_variance.and_then(|variance| {
            fit.solution.blocks[g]
                .solve(&residual)
                .map(|v| variance * v.iter().sum::<f64>())
        });
        effects.push(blup.unwrap_or(0.));
        for &i in rows {
            let population = dot(&data.x[i], &fit.solution.beta);
            points.push(MixedProfilePoint {
                observation_id: prepared.design.observation_ids[i].clone(),
                unit: prepared.units[g].clone(),
                time: prepared.source_times[i],
                observed: data.y[i],
                population,
                conditional: blup.map_or_else(
                    || Stat::undefined(UndefinedReason::NotApplicable),
                    |u| Stat::finite(population + u),
                ),
                residual: data.y[i] - population,
            });
        }
    }
    let mut means = Vec::new();
    for &time in &data.occasions {
        let rows: Vec<usize> = prepared
            .source_times
            .iter()
            .enumerate()
            .filter(|(_, t)| **t == Some(time))
            .map(|(i, _)| i)
            .collect();
        let n = rows.len();
        let contrast: Vec<f64> = (0..p)
            .map(|j| rows.iter().map(|&i| data.x[i][j]).sum::<f64>() / n as f64)
            .collect();
        let units = points
            .iter()
            .filter(|p| p.time == Some(time))
            .map(|p| &p.unit)
            .collect::<BTreeSet<_>>()
            .len();
        means.push(MixedMeanProfile {
            time,
            n: u32::try_from(n).unwrap_or(u32::MAX),
            units: u32::try_from(units).unwrap_or(u32::MAX),
            observed_mean: rows.iter().map(|&i| data.y[i]).sum::<f64>() / n as f64,
            inference: estimate(&contrast, fit, info, prepared.spec.confidence_level),
        });
    }
    (points, means, effects)
}
