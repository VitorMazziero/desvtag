//! Geometric mean-prediction variance on the exact finite candidate region (ET25 T07).
#![allow(clippy::indexing_slicing)]
use super::*;

/// Independent supplement method; computing a profile never runs the design search.
pub const VARIANCE_METHOD_ID: &str = "optimal_prediction_variance";
/// First explicit finite-region profile definition.
pub const VARIANCE_METHOD_VERSION: u32 = 2;

/// Explicit design to evaluate. Generator allocation is not inferred from row order.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalVarianceRequest {
    /// Explicit nominal labels for every design row, mandatory when categories are declared.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub run_categories: Option<Vec<Vec<String>>>,
    /// Model, coding, constraints and finite candidate grid.
    pub spec: OptimalSpec,
    /// Actual numeric design rows, including fixed rows.
    pub runs_real: Vec<Vec<f64>>,
    /// One declared block index per row; absent for unblocked designs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub run_blocks: Option<Vec<u32>>,
}

/// Variance of the fitted mean divided by sigma squared, and multiplied by n.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VarianceValue {
    /// h = f' (X'X)^-1 f; no estimated error variance is introduced.
    pub relative: f64,
    /// n*h, with n the explicit number of design rows.
    pub scaled: f64,
}

/// A spatial candidate; values follow the declared blocks (one value without blocks).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VariancePoint {
    /// Nominal coordinates, separate from numeric real/coded coordinates.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub categories: Option<Vec<String>>,
    /// Coded coordinates in specification order.
    pub coded: Vec<f64>,
    /// Real coordinates in specification order.
    pub real: Vec<f64>,
    /// Conditional values by block; this is not the variance of a block average.
    pub values: Vec<VarianceValue>,
}

/// One ordered value of the exact finite candidate distribution.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VarianceQuantile {
    /// Accumulated mass (i+1)/N in this finite distribution, in (0,1].
    pub fraction: f64,
    /// Index of the spatial candidate.
    pub point: u32,
    /// Declared block; absent when the design has no block.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<u32>,
    /// Both displayed scales of the same value.
    pub value: VarianceValue,
}

/// Pooled uniform candidates x blocks, or one explicitly selected block.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct VarianceCurve {
    /// None means the full uniform distribution, not a mean-response variance.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<u32>,
    /// Smallest variance over the selected candidates/blocks.
    pub minimum: VarianceValue,
    /// Uniform average over the selected candidates/blocks.
    pub average: VarianceValue,
    /// Largest variance over the selected candidates/blocks.
    pub maximum: VarianceValue,
    /// Sorted discrete distribution, with references to the exact source table.
    pub quantiles: Vec<VarianceQuantile>,
}

/// Saved geometric supplement, independent of measured responses or sigma squared.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalVariance {
    /// Exact evaluated inputs, so a saved profile cannot be attached to another design.
    pub request: OptimalVarianceRequest,
    /// Full parameter count, including block contrasts.
    pub parameters: u32,
    /// Actual number of design rows used in the information matrix.
    pub runs: u32,
    /// All and only admissible spatial candidates, without random sampling.
    pub points: Vec<VariancePoint>,
    /// First the pooled distribution, then each block when blocks are present.
    pub curves: Vec<VarianceCurve>,
    /// Definition and engine version used for this supplement.
    pub provenance: Provenance,
}

fn invalid_variance(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![error(code)])
}

/// Evaluate h and n*h on every admissible candidate, without design search.
///
/// # Errors
/// Invalid inputs/associations, singular information or unrepresentable finite coordinates.
pub fn prediction_variance(request: &OptimalVarianceRequest) -> Result<OptimalVariance, CoreError> {
    let spec = &request.spec;
    let metrics = if spec.categories.is_some() {
        let labels = request
            .run_categories
            .as_ref()
            .ok_or_else(|| invalid_variance("design.optimal_category_association_required"))?;
        evaluate_with_categories(
            spec,
            &request.runs_real,
            labels,
            request.run_blocks.as_deref(),
        )?
    } else {
        if request.run_categories.is_some() {
            return Err(invalid_variance("design.optimal_invalid_categories"));
        }
        match (&spec.blocks, &request.run_blocks) {
            (Some(_), Some(assignments)) => {
                evaluate_with_blocks(spec, &request.runs_real, assignments)?
            }
            (None, None) => evaluate(spec, &request.runs_real)?,
            _ => {
                return Err(invalid_variance(
                    "design.optimal_variance_block_association",
                ));
            }
        }
    };
    let p = metrics.parameters as usize;
    let block_count = spec.blocks.as_ref().map_or(1, |b| b.labels.len());
    let row = |coded: &[f64], labels: Option<&[String]>, block: u32| {
        if let Some(labels) = labels {
            categorical::row(
                spec,
                &categorical::Point {
                    coded: coded.to_vec(),
                    categories: labels.to_vec(),
                },
                block,
            )
        } else if spec.blocks.is_some() {
            blocked::row(spec, coded, block, block_count)
        } else {
            model_row(coded, spec.model)
        }
    };
    let rows = request
        .runs_real
        .iter()
        .enumerate()
        .map(|(i, real)| {
            row(
                &to_coded(spec, real),
                request
                    .run_categories
                    .as_ref()
                    .map(|labels| labels[i].as_slice()),
                request.run_blocks.as_ref().map_or(0, |a| a[i]),
            )
        })
        .collect::<Vec<_>>();
    let Some((inverse, _)) = spd_inverse(&information(rows.iter().map(Vec::as_slice), p), p) else {
        return Err(invalid_variance("design.optimal_variance_singular"));
    };
    let n = request.runs_real.len() as f64;
    let value = |relative: f64| VarianceValue {
        relative,
        scaled: n * relative,
    };
    let mut points = Vec::new();
    let region_points = if spec.categories.is_some() {
        categorical::points(spec)?
    } else {
        candidates(spec)
            .into_iter()
            .map(|coded| categorical::Point {
                coded,
                categories: Vec::new(),
            })
            .collect()
    };
    for point in region_points {
        let coded = point.coded;
        let categories = spec.categories.as_ref().map(|_| point.categories);
        let real = to_real(spec, &coded);
        if !real.iter().all(|x| x.is_finite())
            || to_coded(spec, &real)
                .iter()
                .zip(&coded)
                .any(|(actual, expected)| !actual.is_finite() || (actual - expected).abs() > 1e-8)
        {
            return Err(invalid_variance(
                "design.optimal_variance_unrepresentable_region",
            ));
        }
        let values = (0..block_count)
            .map(|b| {
                value(quad(
                    &inverse,
                    &row(&coded, categories.as_deref(), b as u32),
                    p,
                ))
            })
            .collect::<Vec<_>>();
        if values
            .iter()
            .any(|v| !v.relative.is_finite() || !v.scaled.is_finite() || v.relative <= 0.0)
        {
            return Err(invalid_variance("design.optimal_variance_numerical"));
        }
        points.push(VariancePoint {
            categories,
            coded,
            real,
            values,
        });
    }
    let selections = std::iter::once(None).chain(
        (0..block_count)
            .filter(|_| block_count > 1)
            .map(|b| Some(b as u32)),
    );
    let curves = selections
        .map(|selection| {
            let mut ordered = points
                .iter()
                .enumerate()
                .flat_map(|(i, point)| {
                    point.values.iter().enumerate().filter_map(move |(b, &v)| {
                        (selection.is_none() || selection == Some(b as u32))
                            .then_some((i as u32, b as u32, v))
                    })
                })
                .collect::<Vec<_>>();
            ordered.sort_by(|a, b| {
                a.2.relative
                    .total_cmp(&b.2.relative)
                    .then(a.0.cmp(&b.0))
                    .then(a.1.cmp(&b.1))
            });
            // Candidate validation guarantees a nonempty region and valid block identities.
            let minimum = ordered[0].2;
            let maximum = ordered[ordered.len() - 1].2;
            let average = value(
                ordered.iter().map(|item| item.2.relative).sum::<f64>() / ordered.len() as f64,
            );
            let count = ordered.len() as f64;
            let quantiles = ordered
                .into_iter()
                .enumerate()
                .map(|(i, (point, block, value))| VarianceQuantile {
                    fraction: (i + 1) as f64 / count,
                    point,
                    block: spec.blocks.as_ref().map(|_| block),
                    value,
                })
                .collect();
            VarianceCurve {
                block: selection,
                minimum,
                average,
                maximum,
                quantiles,
            }
        })
        .collect();
    Ok(OptimalVariance {
        request: request.clone(),
        parameters: p as u32,
        runs: request.runs_real.len() as u32,
        points,
        curves,
        provenance: Provenance::current(VARIANCE_METHOD_ID, VARIANCE_METHOD_VERSION),
    })
}
