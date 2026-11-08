//! Immutable applied designs. Opening performs structural checks, never design search or fitting.
use crate::Experiment;
use desvtag_core::designs::optimal::{GeneratedOptimal, OptimalStop};
use desvtag_core::domain::StableId;
use desvtag_core::validation::{Issue, Severity};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use ts_rs::TS;

/// A generated design applied to a particular data revision.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalDesignRecord {
    /// Stable record identity.
    pub id: StableId,
    /// Creation time supplied by the app.
    pub created_at: String,
    /// Whether application preserved all source rows.
    pub augment: bool,
    /// Data revision before application, preserving completed observations.
    pub source_revision_id: StableId,
    /// Data revision containing the applied design.
    pub revision_id: StableId,
    /// Exact editable-input signature that produced the design.
    pub signature: String,
    /// Observation identities in generated-run order, including completed rows.
    pub row_ids: Vec<StableId>,
    /// Applied categorical execution-block column, when declared.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block_factor_id: Option<StableId>,
    /// Complete saved numeric specification, design, criteria and search diagnostics.
    pub result: GeneratedOptimal,
}

/// An explicit geometric calculation supplements, rather than overwrites, a saved design.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalVarianceRecord {
    /// Stable identity shared with the experiment result ledger.
    pub id: StableId,
    /// Time of the explicit evaluation, not of opening the file.
    pub created_at: String,
    /// Applied design whose original numeric output remains intact.
    pub design_id: StableId,
    /// Applied design data revision.
    pub revision_id: StableId,
    /// Visual preferences for this profile. They do not alter the saved values.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub view: Option<OptimalVarianceView>,
    /// Inputs, finite candidate values, ordered distributions and provenance.
    pub result: desvtag_core::designs::optimal::variance::OptimalVariance,
}

/// Display choices for an archived geometric profile.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalVarianceView {
    /// Show N times the relative prediction variance.
    pub scaled: bool,
    /// Block of the distribution, or all blocks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub distribution_block: Option<u32>,
    /// Block of the spatial slice.
    pub map_block: u32,
    /// Horizontal and vertical factor indices. Ignored when the axis is unavailable.
    pub axes: [u32; 2],
    /// Coded coordinates of the factors held fixed, keyed by their zero-based index.
    pub fixed: BTreeMap<String, f64>,
    /// Ordered categorical levels of the spatial slice.
    pub category_slice: Vec<String>,
}

/// Viewer selection, separate from the design bound to the analysis settings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalArtifactSelection {
    /// Design selected for inspection. Omitted when following the latest design.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub design_id: Option<StableId>,
    /// Explicitly selected profile per design, when not following the latest profile.
    pub variance_by_design: BTreeMap<StableId, StableId>,
}

fn category_tuple(
    categories: &desvtag_core::designs::optimal::OptimalCategories,
    labels: &[String],
) -> bool {
    labels.len() == categories.factors.len()
        && categories
            .factors
            .iter()
            .zip(labels)
            .all(|(f, l)| f.levels.contains(l))
        && categories
            .combinations
            .as_ref()
            .is_none_or(|tuples| tuples.contains(&labels.to_vec()))
}

fn valid_mixed_model(exp: &Experiment, record: &crate::analysis::AnalysisRecord) -> bool {
    let crate::analysis::AnalysisResult::OptimalModel(result) = &record.result else {
        return true;
    };
    let Some(design) = exp
        .optimal_designs
        .iter()
        .find(|d| Some(&d.id) == record.options.optimal_design_id.as_ref())
    else {
        return false;
    };
    let Some(revision) = exp.revisions.iter().find(|r| r.id == record.revision_id) else {
        return false;
    };
    let p = desvtag_core::designs::optimal::categorical::model_parameters(&result.spec);
    let fit = &result.fit;
    result.spec == design.result.spec
        && result.spec.categories.is_some()
        && result.block_factor_id == design.block_factor_id
        && Some(&result.response_id) == record.options.response_id.as_ref()
        && result.provenance.method_id == "optimal_model"
        && result.provenance.method_version == 1
        && record.method_id == result.provenance.method_id
        && record.method_version == result.provenance.method_version
        && fit.n_columns as usize == p
        && fit.coefficients.len() == p
        && fit.rank <= fit.n_columns
        && fit.rank <= fit.n_observations
        && fit.df_residual == fit.n_observations - fit.rank
        && fit.observations.len() == fit.n_observations as usize
        && fit
            .observations
            .iter()
            .filter_map(|o| o.observation_id.as_ref())
            .collect::<HashSet<_>>()
            .len()
            == fit.observations.len()
        && fit.observations.iter().all(|o| {
            o.observation_id
                .as_ref()
                .is_some_and(|id| revision.data.rows.iter().any(|row| &row.id == id))
        })
}

fn valid(exp: &Experiment, record: &OptimalDesignRecord) -> bool {
    let (Some(source), Some(applied)) = (
        exp.revisions
            .iter()
            .find(|r| r.id == record.source_revision_id),
        exp.revisions.iter().find(|r| r.id == record.revision_id),
    ) else {
        return false;
    };
    let applied_rows = applied
        .data
        .rows
        .iter()
        .map(|row| (row.id.as_str(), row))
        .collect::<HashMap<_, _>>();
    let source_rows = source
        .data
        .rows
        .iter()
        .map(|row| row.id.as_str())
        .collect::<HashSet<_>>();
    let factor_indexes = applied
        .data
        .factors
        .iter()
        .enumerate()
        .map(|(i, factor)| (factor.id.as_str(), i))
        .collect::<HashMap<_, _>>();
    let response_indexes = applied
        .data
        .responses
        .iter()
        .enumerate()
        .map(|(i, response)| (response.id.as_str(), i))
        .collect::<HashMap<_, _>>();
    let result = &record.result;
    let spec = &result.spec;
    let finite = serde_json::to_vec(result)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<GeneratedOptimal>(&bytes).ok())
        .is_some_and(|copy| copy == *result);
    let k = spec.factors.len();
    let base = desvtag_core::designs::optimal::categorical::parameter_count(spec);
    let extra = spec
        .blocks
        .as_ref()
        .map_or(0, |b| b.labels.len().saturating_sub(1));
    if !finite
        || record.signature.is_empty()
        || record.created_at.is_empty()
        || !(1..=5).contains(&(k + spec.categories.as_ref().map_or(0, |c| c.factors.len())))
        || !(1..=50).contains(&spec.starts)
        || !matches!(spec.levels, 3 | 5)
        || (!record.augment && !spec.fixed_runs.is_empty())
        || !(1..=60).contains(&spec.runs)
        || result.runs.len() != spec.runs as usize
        || record.row_ids.len() != result.runs.len()
        || record.row_ids.iter().collect::<HashSet<_>>().len() != record.row_ids.len()
        || spec.fixed_runs.len() > result.runs.len()
        || result.metrics.parameters as usize != base + extra
        || base + extra > spec.runs as usize
        || spec.constraints.iter().any(|constraint| {
            constraint.coefficients.len() != k
                || !constraint.upper.is_finite()
                || constraint
                    .coefficients
                    .iter()
                    .any(|value| !value.is_finite())
        })
        || result.provenance.method_id != "optimal_design"
        || result.provenance.method_version < 3
        || result.candidates == 0
        || result.candidates > 1500
        || result.starts_run == 0
        || result.starts_run > spec.starts
        || result.starts_reaching_best == 0
        || result.starts_reaching_best > result.starts_run
        || result.metrics.log_det.is_none()
        || [
            result.metrics.d_efficiency,
            result.metrics.a_efficiency,
            result.metrics.g_efficiency,
            result.metrics.i_average,
        ]
        .iter()
        .any(|v| v.is_none_or(|x| x <= 0.0))
        || spec
            .factors
            .iter()
            .any(|f| !f.low.is_finite() || !f.high.is_finite() || f.low >= f.high)
    {
        return false;
    }
    if spec.categories.is_some()
        && (result.provenance.method_version < 4
            || desvtag_core::designs::optimal::categorical::validate_metadata(spec).is_err())
    {
        return false;
    }
    let Some(search) = &result.search else {
        return false;
    };
    if search.starts_attempted != result.starts_run
        || u64::from(search.starts_succeeded) + u64::from(search.starts_failed)
            != u64::from(search.starts_attempted)
        || search.work_limit == Some(0)
        || ((search.starts_attempted < spec.starts
            || search.selected_stop == OptimalStop::WorkLimit)
            && search.work_limit.is_none())
        || search.starts_succeeded == 0
        || result.starts_reaching_best > search.starts_succeeded
        || search.starts_limited > search.starts_succeeded
        || search.selected_stop == OptimalStop::Singular
    {
        return false;
    }
    let block_index = record
        .block_factor_id
        .as_ref()
        .and_then(|id| applied.data.factors.iter().position(|f| &f.id == id));
    if let Some(blocks) = &spec.blocks {
        let b = blocks.labels.len();
        if !(2..=8).contains(&b)
            || blocks.fixed_blocks.len() != spec.fixed_runs.len()
            || blocks.new_runs.len() != b
            || block_index.is_none()
            || blocks.labels.iter().any(|label| label.trim().is_empty())
            || blocks.labels.iter().collect::<HashSet<_>>().len() != b
            || blocks.fixed_blocks.iter().any(|&i| i as usize >= b)
            || blocks.new_runs.iter().map(|&n| u64::from(n)).sum::<u64>()
                + spec.fixed_runs.len() as u64
                != u64::from(spec.runs)
            || block_index.is_some_and(|i| {
                applied.data.factors[i].kind != desvtag_core::domain::FactorKind::Categorical
            })
        {
            return false;
        }
        for (i, &count) in blocks.new_runs.iter().enumerate() {
            if result
                .runs
                .iter()
                .filter(|run| !run.fixed && run.block == Some(i as u32))
                .count()
                != count as usize
            {
                return false;
            }
        }
    } else if record.block_factor_id.is_some() {
        return false;
    }
    // Preserve every original row and original column, including rows outside the fitted subset.
    for old in source.data.rows.iter().filter(|_| record.augment) {
        let Some(new) = applied_rows.get(old.id.as_str()) else {
            return false;
        };
        for (i, factor) in source.data.factors.iter().enumerate() {
            let Some(j) = factor_indexes.get(factor.id.as_str()).copied() else {
                return false;
            };
            if old.factors.get(i) != new.factors.get(j) {
                return false;
            }
        }
        for (i, response) in source.data.responses.iter().enumerate() {
            let Some(j) = response_indexes.get(response.id.as_str()).copied() else {
                return false;
            };
            if old.responses.get(i) != new.responses.get(j) {
                return false;
            }
        }
    }
    result.runs.iter().enumerate().all(|(i, run)| {
        let Some(row) = applied_rows.get(record.row_ids[i].as_str()) else {
            return false;
        };
        if run.run as usize != i + 1
            || run.fixed != (i < spec.fixed_runs.len())
            || run.real.len() != k
            || run.coded.len() != k
        {
            return false;
        }
        if run.fixed && (run.real != spec.fixed_runs[i] || !source_rows.contains(row.id.as_str())) {
            return false;
        }
        if let Some(blocks) = &spec.blocks {
            let Some(block) = run.block else { return false };
            let Some(label) = blocks.labels.get(block as usize) else {
                return false;
            };
            if block_index
                .and_then(|j| row.factors.get(j))
                .map(|value| value.trim())
                != Some(label.as_str())
                || (run.fixed && run.block != Some(blocks.fixed_blocks[i]))
            {
                return false;
            }
        } else if run.block.is_some() {
            return false;
        }
        match (&spec.categories, &run.categories) {
            (None, None) => {}
            (Some(categories), Some(labels)) if category_tuple(categories, labels) => {
                if run.fixed && categories.fixed_runs.get(i) != Some(labels) {
                    return false;
                }
                for (factor, label) in categories.factors.iter().zip(labels) {
                    let Some(index) = factor_indexes.get(factor.id.as_str()).copied() else {
                        return false;
                    };
                    if applied.data.factors[index].kind
                        != desvtag_core::domain::FactorKind::Categorical
                        || row.factors.get(index) != Some(label)
                    {
                        return false;
                    }
                }
            }
            _ => return false,
        }
        spec.factors.iter().enumerate().all(|(j, factor)| {
            let Some(index) = factor_indexes.get(factor.id.as_str()).copied() else {
                return false;
            };
            let Some(value) = row
                .factors
                .get(index)
                .and_then(|s| s.trim().replace(',', ".").parse::<f64>().ok())
            else {
                return false;
            };
            if record.signature.starts_with("optimal:v1:") {
                let half = (factor.high - factor.low) / 2.0;
                let center = (factor.low + factor.high) / 2.0;
                return half.is_finite()
                    && half > 0.0
                    && center.is_finite()
                    && ((value - run.real[j]) / half).abs() <= 1e-8 * (1.0 + run.coded[j].abs())
                    && ((run.real[j] - center) / half - run.coded[j]).abs()
                        <= 1e-8 * (1.0 + run.coded[j].abs());
            }
            (value - run.real[j]).abs() <= 1e-8 * (1.0 + run.real[j].abs())
                && (factor.low + (run.coded[j] + 1.0) * (factor.high - factor.low) / 2.0
                    - run.real[j])
                    .abs()
                    <= 1e-8 * (1.0 + run.real[j].abs())
        })
    })
}

pub(crate) fn validate_saved<'a>(
    exp: &'a Experiment,
    ids: &mut HashSet<&'a str>,
    issues: &mut Vec<Issue>,
) {
    for record in &exp.analyses {
        if !valid_block_context(exp, record) {
            issues.push(
                Issue::new("project.invalid_block_context", Severity::Error)
                    .with_param("id", &record.id),
            );
        }
    }
    for record in &exp.analyses {
        if !valid_mixed_model(exp, record) {
            issues.push(
                Issue::new("project.invalid_optimal_model", Severity::Error)
                    .with_param("id", &record.id),
            );
        }
    }
    if exp
        .analysis_selection
        .optimal_design_id
        .as_ref()
        .is_some_and(|id| !exp.optimal_designs.iter().any(|d| &d.id == id))
    {
        issues.push(Issue::new("project.invalid_optimal_model", Severity::Error));
    }
    for record in &exp.optimal_designs {
        if !ids.insert(record.id.as_str()) || !valid(exp, record) {
            issues.push(
                Issue::new("project.invalid_optimal_design", Severity::Error)
                    .with_param("id", &record.id),
            );
        }
    }
    for record in &exp.optimal_variances {
        if !ids.insert(record.id.as_str()) || !valid_variance(exp, record) {
            issues.push(
                Issue::new("project.invalid_optimal_variance", Severity::Error)
                    .with_param("id", &record.id),
            );
        }
    }
}

fn close(a: f64, b: f64) -> bool {
    a.is_finite() && b.is_finite() && (a - b).abs() <= 1e-9 * (1.0 + b.abs())
}

/// Structural/source validation only: no fitting, inverse, variance evaluation or search.
fn valid_variance(exp: &Experiment, record: &OptimalVarianceRecord) -> bool {
    use desvtag_core::designs::optimal::variance::{VARIANCE_METHOD_ID, VARIANCE_METHOD_VERSION};
    let Some(design) = exp
        .optimal_designs
        .iter()
        .find(|r| r.id == record.design_id)
    else {
        return false;
    };
    if !valid(exp, design) {
        return false;
    }
    let profile = &record.result;
    let spec = &design.result.spec;
    let blocks = spec.blocks.as_ref().map_or(1, |b| b.labels.len());
    let expected_blocks = spec.blocks.as_ref().and_then(|_| {
        design
            .result
            .runs
            .iter()
            .map(|row| row.block)
            .collect::<Option<Vec<_>>>()
    });
    if record.created_at.is_empty()
        || record.revision_id != design.revision_id
        || profile.request.spec != *spec
        || profile.request.runs_real
            != design
                .result
                .runs
                .iter()
                .map(|row| row.real.clone())
                .collect::<Vec<_>>()
        || profile.request.run_categories
            != spec.categories.as_ref().and_then(|_| {
                design
                    .result
                    .runs
                    .iter()
                    .map(|row| row.categories.clone())
                    .collect::<Option<Vec<_>>>()
            })
        || profile.request.run_blocks != expected_blocks
        || profile.runs as usize != design.result.runs.len()
        || profile.parameters != design.result.metrics.parameters
        || profile.points.len() != design.result.candidates as usize
        || profile.points.is_empty()
        || profile.curves.len() != if spec.blocks.is_some() { blocks + 1 } else { 1 }
        || profile.provenance.method_id != VARIANCE_METHOD_ID
        || !(1..=VARIANCE_METHOD_VERSION).contains(&profile.provenance.method_version)
        || (spec.categories.is_some() && profile.provenance.method_version < 2)
        || profile.provenance.engine_version.is_empty()
    {
        return false;
    }
    // A prototype whose applied table differs from the nominal design cannot acquire
    // a profile pretending that nominal precision describes the applied observations.
    let Some(revision) = exp.revisions.iter().find(|r| r.id == record.revision_id) else {
        return false;
    };
    for (run, id) in design.result.runs.iter().zip(&design.row_ids) {
        let Some(row) = revision.data.rows.iter().find(|row| row.id == *id) else {
            return false;
        };
        for (j, factor) in spec.factors.iter().enumerate() {
            let Some(index) = revision.data.factors.iter().position(|f| f.id == factor.id) else {
                return false;
            };
            let Some(actual) = row
                .factors
                .get(index)
                .and_then(|v| v.trim().replace(',', ".").parse::<f64>().ok())
            else {
                return false;
            };
            let Some(real) = run.real.get(j) else {
                return false;
            };
            let half = (factor.high - factor.low) / 2.0;
            if !half.is_finite()
                || half <= 0.0
                || (!((actual - real) / half).is_finite() || ((actual - real) / half).abs() > 1e-8)
            {
                return false;
            }
        }
    }
    let mut identities = HashSet::new();
    for point in &profile.points {
        if point.real.len() != spec.factors.len()
            || point.coded.len() != spec.factors.len()
            || point.values.len() != blocks
            || !identities.insert((
                point
                    .coded
                    .iter()
                    .map(|v| if *v == 0.0 { 0 } else { v.to_bits() })
                    .collect::<Vec<_>>(),
                point.categories.clone(),
            ))
            || match (&spec.categories, &point.categories) {
                (None, None) => false,
                (Some(categories), Some(labels)) => !category_tuple(categories, labels),
                _ => true,
            }
            || point.values.iter().any(|v| {
                v.relative <= 0.0 || !close(v.scaled, f64::from(profile.runs) * v.relative)
            })
        {
            return false;
        }
        for ((coded, real), factor) in point.coded.iter().zip(&point.real).zip(&spec.factors) {
            let half = (factor.high - factor.low) / 2.0;
            let center = (factor.low + factor.high) / 2.0;
            let index = (coded + 1.0) * f64::from(spec.levels - 1) / 2.0;
            if !half.is_finite()
                || half <= 0.0
                || !center.is_finite()
                || !real.is_finite()
                || *coded < -1.0
                || *coded > 1.0
                || !close(index, index.round())
                || (!((real - center) / half).is_finite()
                    || ((real - center) / half - coded).abs() > 1e-8)
            {
                return false;
            }
        }
        if spec.constraints.iter().any(|c| {
            let sum = c
                .coefficients
                .iter()
                .zip(&point.real)
                .map(|(a, x)| a * x)
                .sum::<f64>();
            !sum.is_finite() || sum > c.upper + 1e-9
        }) {
            return false;
        }
    }
    for (i, curve) in profile.curves.iter().enumerate() {
        let expected = if i == 0 { None } else { Some((i - 1) as u32) };
        let count = profile.points.len() * if expected.is_none() { blocks } else { 1 };
        if curve.block != expected || curve.quantiles.len() != count {
            return false;
        }
        let mut covered = HashSet::new();
        let mut sum = 0.0;
        let mut previous = f64::NEG_INFINITY;
        for (rank, quantile) in curve.quantiles.iter().enumerate() {
            let block = quantile.block.unwrap_or(0);
            if quantile.block.is_some() != spec.blocks.is_some()
                || expected.is_some_and(|chosen| chosen != block)
                || !covered.insert((quantile.point, block))
                || !close(quantile.fraction, (rank + 1) as f64 / count as f64)
                || quantile.value.relative < previous
            {
                return false;
            }
            let Some(value) = profile
                .points
                .get(quantile.point as usize)
                .and_then(|point| point.values.get(block as usize))
            else {
                return false;
            };
            if *value != quantile.value {
                return false;
            }
            sum += value.relative;
            previous = value.relative;
        }
        let (Some(first), Some(last)) = (curve.quantiles.first(), curve.quantiles.last()) else {
            return false;
        };
        if curve.minimum != first.value
            || curve.maximum != last.value
            || !close(curve.average.relative, sum / count as f64)
            || !close(
                curve.average.scaled,
                f64::from(profile.runs) * curve.average.relative,
            )
        {
            return false;
        }
    }
    let Some(pooled) = profile.curves.first() else {
        return false;
    };
    design
        .result
        .metrics
        .i_average
        .is_some_and(|v| close(v, pooled.average.scaled))
        && design
            .result
            .metrics
            .g_efficiency
            .is_some_and(|v| close(v, f64::from(profile.parameters) / pooled.maximum.scaled))
}

fn valid_block_context(exp: &Experiment, record: &crate::analysis::AnalysisRecord) -> bool {
    use crate::analysis::AnalysisResult;
    let context = match &record.result {
        AnalysisResult::ResponseSurface(result) => {
            result.block.as_ref().map(|block| &block.context)
        }
        AnalysisResult::Optimization(result) => result.block.as_ref(),
        _ => return true,
    };
    let (selection, context) = match (&record.options.surface_block, context) {
        (None, None) => return true,
        (Some(selection), Some(context)) => (selection, context),
        _ => return false,
    };
    let Some(data) = exp
        .revisions
        .iter()
        .find(|revision| revision.id == record.revision_id)
        .map(|revision| &revision.data)
    else {
        return false;
    };
    let Some(index) = data
        .factors
        .iter()
        .position(|factor| factor.id == context.factor_id)
    else {
        return false;
    };
    let factor = &data.factors[index];
    let reference_known = factor
        .levels_text
        .split(';')
        .any(|label| label.trim() == context.reference)
        || data.rows.iter().any(|row| {
            row.factors
                .get(index)
                .is_some_and(|label| label.trim() == context.reference)
        });
    let finite = serde_json::to_vec(&record.result)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<crate::analysis::AnalysisResult>(&bytes).ok())
        .is_some_and(|copy| copy == record.result);
    selection.factor_id == context.factor_id
        && selection.reference == context.reference
        && !context.reference.is_empty()
        && factor.kind == desvtag_core::domain::FactorKind::Categorical
        && factor.name == context.name
        && reference_known
        && finite
        && record.method_version >= 2
}
