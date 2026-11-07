//! Nominal treatment factors share the exact Fedorov criterion and block allocation.
//! Labels never enter numeric polynomial coordinates. No averaging drops a category.
use super::*;
use std::collections::HashSet;

/// Nominal treatment factor, with explicitly ordered sum-contrast levels.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalCategoricalFactor {
    /// Stable experiment column.
    pub id: StableId,
    /// Saved display name.
    pub name: String,
    /// Unique, nonempty labels; the last is the sum-coding baseline.
    pub levels: Vec<String>,
}

/// Categorical domain and immutable completed-run associations.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalCategories {
    /// Nominal treatment factors, separate from quantitative factors and execution blocks.
    pub factors: Vec<OptimalCategoricalFactor>,
    /// Optional permitted tuples. Absence means the full Cartesian product, with uniform mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub combinations: Option<Vec<Vec<String>>>,
    /// Labels for every completed numeric row, including empty numeric rows in category-only designs.
    pub fixed_runs: Vec<Vec<String>>,
}

/// Complete spatial candidate; block is a separate fixed allocation.
#[derive(Debug, Clone)]
pub(super) struct Point {
    pub coded: Vec<f64>,
    pub categories: Vec<String>,
}

fn invalid(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![error(code)])
}

/// Number of treatment parameters; the execution-block dimensions are added separately.
#[must_use]
pub fn parameter_count(spec: &OptimalSpec) -> usize {
    let mut widths = vec![1usize; spec.factors.len()];
    if let Some(categories) = &spec.categories {
        widths.extend(
            categories
                .factors
                .iter()
                .map(|f| f.levels.len().saturating_sub(1)),
        );
    }
    let mut p = 1usize.saturating_add(widths.iter().copied().sum::<usize>());
    if spec.model != OptimalModel::Linear {
        for (i, &a) in widths.iter().enumerate() {
            for &b in &widths[i + 1..] {
                p = p.saturating_add(a.saturating_mul(b));
            }
        }
    }
    if spec.model == OptimalModel::Quadratic {
        p = p.saturating_add(spec.factors.len());
    }
    p
}

/// Full sum-coded treatment model plus additive block columns.
#[must_use]
pub fn model_parameters(spec: &OptimalSpec) -> usize {
    parameter_count(spec)
        + spec
            .blocks
            .as_ref()
            .map_or(0, |b| b.labels.len().saturating_sub(1))
}

fn valid_tuple(categories: &OptimalCategories, tuple: &[String]) -> bool {
    tuple.len() == categories.factors.len()
        && categories
            .factors
            .iter()
            .zip(tuple)
            .all(|(f, label)| f.levels.contains(label))
}

fn permitted(categories: &OptimalCategories, tuple: &[String]) -> bool {
    valid_tuple(categories, tuple)
        && categories
            .combinations
            .as_ref()
            .is_none_or(|tuples| tuples.iter().any(|t| t == tuple))
}

pub(super) fn validate_categories(spec: &OptimalSpec, generation: bool) -> Result<(), CoreError> {
    let categories = spec
        .categories
        .as_ref()
        .ok_or_else(|| invalid("design.optimal_invalid_categories"))?;
    let mut ids = spec.factors.iter().map(|f| &f.id).collect::<HashSet<_>>();
    if ids.len() != spec.factors.len()
        || categories.factors.is_empty()
        || categories.factors.iter().any(|f| {
            !ids.insert(&f.id)
                || f.name.trim().is_empty()
                || !(2..=MAX_RUNS as usize).contains(&f.levels.len())
                || f.levels
                    .iter()
                    .any(|level| level.trim().is_empty() || level.trim() != level)
                || f.levels
                    .iter()
                    .map(|level| level.trim())
                    .collect::<HashSet<_>>()
                    .len()
                    != f.levels.len()
        })
    {
        return Err(invalid("design.optimal_invalid_categories"));
    }
    if let Some(tuples) = &categories.combinations
        && (tuples.is_empty()
            || tuples.len() > MAX_CANDIDATES
            || tuples.iter().collect::<HashSet<_>>().len() != tuples.len()
            || tuples.iter().any(|tuple| !valid_tuple(categories, tuple)))
    {
        return Err(invalid("design.optimal_invalid_category_combinations"));
    }
    if generation
        && (categories.fixed_runs.len() != spec.fixed_runs.len()
            || categories
                .fixed_runs
                .iter()
                .any(|tuple| !permitted(categories, tuple)))
    {
        return Err(invalid("design.optimal_invalid_fixed_categories"));
    }
    Ok(())
}

/// Exact finite mixed region, bounded before tuples or model rows are materialized.
pub(super) fn points(spec: &OptimalSpec) -> Result<Vec<Point>, CoreError> {
    let categories = spec
        .categories
        .as_ref()
        .ok_or_else(|| invalid("design.optimal_invalid_categories"))?;
    let numeric = candidates(spec);
    if numeric.is_empty() {
        return Err(invalid("design.optimal_empty_region"));
    }
    let count = categories.combinations.as_ref().map_or_else(
        || {
            categories
                .factors
                .iter()
                .fold(1usize, |n, f| n.saturating_mul(f.levels.len()))
        },
        Vec::len,
    );
    let total = count.saturating_mul(numeric.len());
    if total > MAX_CANDIDATES {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_too_many_candidates")
                .with_param("candidates", &total)
                .with_param("max", &MAX_CANDIDATES),
        ]));
    }
    let tuples = categories.combinations.clone().unwrap_or_else(|| {
        (0..count)
            .map(|index| {
                let mut rest = index;
                categories
                    .factors
                    .iter()
                    .map(|factor| {
                        let label = factor.levels[rest % factor.levels.len()].clone();
                        rest /= factor.levels.len();
                        label
                    })
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>()
    });
    Ok(tuples
        .into_iter()
        .flat_map(|labels| {
            numeric.iter().cloned().map(move |coded| Point {
                coded,
                categories: labels.clone(),
            })
        })
        .collect())
}

/// Sum-coded main effects, all requested cross-factor interactions, numeric squares, then block.
pub(super) fn row(spec: &OptimalSpec, point: &Point, block: u32) -> Vec<f64> {
    let mut columns = point.coded.iter().map(|&x| vec![x]).collect::<Vec<_>>();
    if let Some(categories) = &spec.categories {
        columns.extend(
            categories
                .factors
                .iter()
                .zip(&point.categories)
                .map(|(factor, label)| {
                    let last = factor.levels.last() == Some(label);
                    factor.levels[..factor.levels.len() - 1]
                        .iter()
                        .map(|level| {
                            if last {
                                -1.0
                            } else {
                                f64::from(level == label)
                            }
                        })
                        .collect::<Vec<_>>()
                }),
        );
    }
    let mut result = vec![1.0];
    result.extend(columns.iter().flatten().copied());
    if spec.model != OptimalModel::Linear {
        for (i, a) in columns.iter().enumerate() {
            for b in &columns[i + 1..] {
                for &x in a {
                    for &y in b {
                        result.push(x * y);
                    }
                }
            }
        }
    }
    if spec.model == OptimalModel::Quadratic {
        result.extend(point.coded.iter().map(|x| x * x));
    }
    if let Some(blocks) = &spec.blocks {
        result.extend((0..blocks.labels.len() - 1).map(|j| {
            if block as usize == blocks.labels.len() - 1 {
                -1.0
            } else {
                f64::from(block as usize == j)
            }
        }));
    }
    result
}

fn region_of(spec: &OptimalSpec, points: &[Point]) -> Region {
    let blocks = spec.blocks.as_ref().map_or(1, |b| b.labels.len());
    let mut rows = Vec::with_capacity(blocks * points.len());
    for block in 0..blocks {
        for point in points {
            rows.push(row(spec, point, block as u32));
        }
    }
    let mut reg = region(rows, model_parameters(spec));
    reg.candidates_per_block = points.len();
    reg
}

pub(super) fn checked_point(
    spec: &OptimalSpec,
    real: &[f64],
    labels: &[String],
    index: usize,
) -> Result<Point, CoreError> {
    let coded = to_coded(spec, real);
    let valid = real.len() == spec.factors.len()
        && real
            .iter()
            .zip(&spec.factors)
            .all(|(value, f)| value.is_finite() && *value >= f.low && *value <= f.high)
        && coded.iter().all(|x| x.is_finite())
        && spec.constraints.iter().all(|c| {
            c.coefficients
                .iter()
                .zip(real)
                .map(|(a, x)| a * x)
                .sum::<f64>()
                <= c.upper + 1e-9
        })
        && spec
            .categories
            .as_ref()
            .is_some_and(|c| permitted(c, labels));
    if !valid {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_invalid_evaluation_run").with_param("row", &(index + 1)),
        ]));
    }
    Ok(Point {
        coded,
        categories: labels.to_vec(),
    })
}

/// Evaluates explicit numeric, nominal and block coordinates, never inferring category membership.
/// # Errors
/// Invalid domain, missing associations or malformed rows; singular valid information returns null metrics.
pub fn evaluate_with_categories(
    spec: &OptimalSpec,
    runs_real: &[Vec<f64>],
    categories: &[Vec<String>],
    assignments: Option<&[u32]>,
) -> Result<OptimalMetrics, CoreError> {
    validate_categories(spec, false)?;
    if categories.len() != runs_real.len() {
        return Err(invalid("design.optimal_category_association_required"));
    }
    let mut effective = spec.clone();
    effective.runs = u32::try_from(runs_real.len()).unwrap_or(u32::MAX);
    effective.fixed_runs.clear();
    if let Some(c) = effective.categories.as_mut() {
        c.fixed_runs.clear();
    }
    let issues = validate(&effective)
        .into_iter()
        .filter(|i| i.code != "design.optimal_too_few_runs")
        .collect::<Vec<_>>();
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    match (&spec.blocks, assignments) {
        (None, None) => {}
        (Some(blocks), Some(a))
            if blocked::valid_labels(blocks)
                && a.len() == runs_real.len()
                && a.iter().all(|&b| (b as usize) < blocks.labels.len()) => {}
        _ => return Err(invalid("design.optimal_invalid_evaluation_block")),
    }
    let points = points(spec)?;
    let rows = runs_real
        .iter()
        .zip(categories)
        .enumerate()
        .map(|(i, (real, labels))| {
            checked_point(spec, real, labels, i)
                .map(|point| row(spec, &point, assignments.map_or(0, |a| a[i])))
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(metrics_of(
        &rows,
        &region_of(spec, &points),
        model_parameters(spec),
    ))
}

pub(super) fn generate(spec: &OptimalSpec) -> Result<GeneratedOptimal, CoreError> {
    validate_categories(spec, true)?;
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let category_spec = spec
        .categories
        .as_ref()
        .ok_or_else(|| invalid("design.optimal_invalid_categories"))?;
    let p = model_parameters(spec);
    if p > spec.runs as usize {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_too_few_runs")
                .with_param("runs", &spec.runs)
                .with_param("parameters", &p),
        ]));
    }
    let allocation = if let Some(blocks) = &spec.blocks {
        blocked::validate_labels_and_allocation(spec)?;
        blocks.new_runs.clone()
    } else {
        vec![spec.runs - spec.fixed_runs.len() as u32]
    };
    let points = points(spec)?;
    let reg = region_of(spec, &points);
    let mut runs = Vec::new();
    let mut fixed = Vec::new();
    for (i, (real, labels)) in spec
        .fixed_runs
        .iter()
        .zip(&category_spec.fixed_runs)
        .enumerate()
    {
        let point = checked_point(spec, real, labels, i)?;
        let block = spec.blocks.as_ref().map(|b| b.fixed_blocks[i]);
        fixed.push(row(spec, &point, block.unwrap_or(0)));
        runs.push(OptimalRun {
            categories: Some(labels.clone()),
            block,
            run: 0,
            fixed: true,
            real: real.clone(),
            coded: point.coded,
        });
    }
    let (chosen, search, reached) = search(spec, &reg, &fixed, points.len(), &allocation)?;
    for block in 0..allocation.len() {
        let selected = chosen
            .iter()
            .copied()
            .filter(|i| i / points.len() == block)
            .collect::<Vec<_>>();
        let order = if spec.randomize {
            permutation(selected.len(), spec.seed.wrapping_add(block as u64))
        } else {
            (0..selected.len()).collect()
        };
        for slot in order {
            let point = &points[selected[slot] % points.len()];
            let real = to_real(spec, &point.coded);
            checked_point(spec, &real, &point.categories, runs.len())?;
            runs.push(OptimalRun {
                categories: Some(point.categories.clone()),
                block: spec.blocks.as_ref().map(|_| block as u32),
                run: 0,
                fixed: false,
                real,
                coded: point.coded.clone(),
            });
        }
    }
    for (i, run) in runs.iter_mut().enumerate() {
        run.run = (i + 1) as u32;
    }
    let rows = runs
        .iter()
        .map(|r| {
            row(
                spec,
                &Point {
                    coded: r.coded.clone(),
                    categories: r.categories.clone().unwrap_or_default(),
                },
                r.block.unwrap_or(0),
            )
        })
        .collect::<Vec<_>>();
    let metrics = metrics_of(&rows, &reg, p);
    let mut issues: Vec<_> = search.work_warning(spec.starts).into_iter().collect();
    if reached == 1 && search.starts_attempted > 1 && search.work_limit.is_none() {
        issues.push(Issue::new(
            "design.optimal_single_best_start",
            Severity::Warning,
        ));
    }
    if allocation.iter().all(|&n| n == 0) {
        issues.push(Issue::new(
            "design.optimal_nothing_to_choose",
            Severity::Warning,
        ));
    }
    if search.selected_stop == OptimalStop::PassLimit {
        issues.push(Issue::new("design.optimal_pass_limit", Severity::Warning));
    }
    Ok(GeneratedOptimal {
        spec: spec.clone(),
        candidates: points.len() as u32,
        runs,
        metrics,
        starts_run: search.starts_attempted,
        starts_reaching_best: reached as u32,
        search: Some(search),
        algorithm: format!("fedorov-exchange/sum-coded-categories/{ALGORITHM}"),
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

/// Structural/domain validation for saved categorical designs; does not search or evaluate information.
/// # Errors
/// Invalid metadata, associations, run count, model dimension or fixed conditions.
pub fn validate_metadata(spec: &OptimalSpec) -> Result<(), CoreError> {
    validate_categories(spec, true)?;
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    if spec.blocks.is_some() {
        blocked::validate_labels_and_allocation(spec)?;
    }
    if model_parameters(spec) > spec.runs as usize {
        return Err(invalid("design.optimal_too_few_runs"));
    }
    let categories = spec
        .categories
        .as_ref()
        .ok_or_else(|| invalid("design.optimal_invalid_categories"))?;
    for (i, (real, labels)) in spec
        .fixed_runs
        .iter()
        .zip(&categories.fixed_runs)
        .enumerate()
    {
        checked_point(spec, real, labels, i)?;
    }
    Ok(())
}
