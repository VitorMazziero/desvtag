//! Fixed additive block effects, with prescribed counts and within-block exchanges.
use super::*;

/// Allocation of completed and new runs to fixed additive execution blocks.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimalBlocks {
    /// Unique nonempty block labels, in the declared order (2–8).
    pub labels: Vec<String>,
    /// Zero-based block index of each fixed run, in the same order.
    pub fixed_blocks: Vec<u32>,
    /// New-run count for each block; the allocation remains fixed during search.
    pub new_runs: Vec<u32>,
}

fn invalid() -> CoreError {
    CoreError::InvalidInput(vec![error("design.optimal_invalid_blocks")])
}

pub(super) fn valid_labels(blocks: &OptimalBlocks) -> bool {
    (2..=8).contains(&blocks.labels.len())
        && blocks.labels.iter().enumerate().all(|(i, label)| {
            !label.trim().is_empty()
                && blocks.labels[..i]
                    .iter()
                    .all(|other| other.trim() != label.trim())
        })
}

pub(super) fn validate_labels_and_allocation(
    spec: &OptimalSpec,
) -> Result<&OptimalBlocks, CoreError> {
    let Some(blocks) = spec.blocks.as_ref() else {
        return Err(invalid());
    };
    let count = blocks.labels.len();
    if !valid_labels(blocks)
        || blocks.new_runs.len() != count
        || blocks.fixed_blocks.len() != spec.fixed_runs.len()
        || blocks.fixed_blocks.iter().any(|&b| b as usize >= count)
        || u64::from(spec.runs)
            != spec.fixed_runs.len() as u64
                + blocks.new_runs.iter().map(|&n| u64::from(n)).sum::<u64>()
        || (0..count).any(|b| blocks.new_runs[b] == 0 && !blocks.fixed_blocks.contains(&(b as u32)))
    {
        return Err(invalid());
    }
    Ok(blocks)
}

fn validate_blocks(spec: &OptimalSpec) -> Result<&OptimalBlocks, CoreError> {
    let blocks = validate_labels_and_allocation(spec)?;
    let count = blocks.labels.len();
    let mut bare = spec.clone();
    bare.blocks = None;
    let issues = validate(&bare);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let parameters = parameter_count(spec.factors.len(), spec.model) + count - 1;
    if (spec.runs as usize) < parameters {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_too_few_runs")
                .with_param("runs", &spec.runs)
                .with_param("parameters", &parameters),
        ]));
    }
    // Reuse the public structural/domain checks, including off-grid fixed runs.
    if !spec.fixed_runs.is_empty() {
        evaluate(&bare, &spec.fixed_runs)?;
    }
    Ok(blocks)
}

pub(super) fn row(spec: &OptimalSpec, coded: &[f64], block: u32, count: usize) -> Vec<f64> {
    let mut result = model_row(coded, spec.model);
    result.extend((0..count - 1).map(|j| {
        if block as usize == count - 1 {
            -1.0
        } else {
            f64::from(block as usize == j)
        }
    }));
    result
}

fn setup(
    spec: &OptimalSpec,
    blocks: &OptimalBlocks,
) -> Result<(Vec<Vec<f64>>, Region, usize), CoreError> {
    let cands = candidates(spec);
    if cands.is_empty() {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_empty_region",
        )]));
    }
    if cands.len() > MAX_CANDIDATES {
        return Err(CoreError::InvalidInput(vec![
            error("design.optimal_too_many_candidates")
                .with_param("candidates", &cands.len())
                .with_param("max", &MAX_CANDIDATES),
        ]));
    }
    let count = blocks.labels.len();
    let p = parameter_count(spec.factors.len(), spec.model) + count - 1;
    let mut rows = Vec::with_capacity(count * cands.len());
    for b in 0..count {
        for point in &cands {
            rows.push(row(spec, point, b as u32, count));
        }
    }
    let mut reg = region(rows, p);
    reg.candidates_per_block = cands.len();
    Ok((cands, reg, p))
}

/// Evaluate an explicitly associated design under the declared fixed-block model.
///
/// The input rows replace the fixed/new allocation for evaluation only. Block identities
/// are mandatory and are never inferred from row order. Singular valid designs retain
/// undefined metrics, as in the unblocked API.
///
/// # Errors
/// Invalid block configuration, associations, coordinates, or candidate region.
pub fn evaluate_with_blocks(
    spec: &OptimalSpec,
    runs_real: &[Vec<f64>],
    assignments: &[u32],
) -> Result<OptimalMetrics, CoreError> {
    if spec.categories.is_some() {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_category_association_required",
        )]));
    }
    let blocks = spec
        .blocks
        .as_ref()
        .filter(|blocks| valid_labels(blocks))
        .ok_or_else(invalid)?;
    if assignments.len() != runs_real.len()
        || assignments
            .iter()
            .any(|&b| b as usize >= blocks.labels.len())
    {
        return Err(CoreError::InvalidInput(vec![error(
            "design.optimal_invalid_evaluation_block",
        )]));
    }
    let mut bare = spec.clone();
    bare.blocks = None;
    evaluate(&bare, runs_real)?;
    let (_, reg, p) = setup(spec, blocks)?;
    let rows = runs_real
        .iter()
        .zip(assignments)
        .map(|(real, &b)| row(spec, &to_coded(spec, real), b, blocks.labels.len()))
        .collect::<Vec<_>>();
    Ok(metrics_of(&rows, &reg, p))
}

pub(super) fn generate(spec: &OptimalSpec) -> Result<GeneratedOptimal, CoreError> {
    let blocks = validate_blocks(spec)?;
    let (cands, reg, p) = setup(spec, blocks)?;
    let count = cands.len();
    let fixed = spec
        .fixed_runs
        .iter()
        .zip(&blocks.fixed_blocks)
        .map(|(real, &b)| row(spec, &to_coded(spec, real), b, blocks.labels.len()))
        .collect::<Vec<_>>();
    let (chosen, search, reached) = search(spec, &reg, &fixed, count, &blocks.new_runs)?;
    let mut runs = spec
        .fixed_runs
        .iter()
        .zip(&blocks.fixed_blocks)
        .map(|(real, &b)| OptimalRun {
            categories: None,
            run: 0,
            fixed: true,
            real: real.clone(),
            coded: to_coded(spec, real),
            block: Some(b),
        })
        .collect::<Vec<_>>();
    // Completed runs stay in their original order; randomize only within each new block.
    for b in 0..blocks.labels.len() {
        let selected = chosen
            .iter()
            .copied()
            .filter(|index| index / count == b)
            .collect::<Vec<_>>();
        let order = if spec.randomize {
            permutation(selected.len(), spec.seed.wrapping_add(b as u64))
        } else {
            (0..selected.len()).collect()
        };
        for slot in order {
            let coded = cands[selected[slot] % count].clone();
            runs.push(OptimalRun {
                categories: None,
                run: 0,
                fixed: false,
                real: to_real(spec, &coded),
                coded,
                block: Some(b as u32),
            });
        }
    }
    for (i, run) in runs.iter_mut().enumerate() {
        run.run = (i + 1) as u32;
    }
    let rows = runs
        .iter()
        .map(|run| {
            row(
                spec,
                &run.coded,
                run.block.unwrap_or(0),
                blocks.labels.len(),
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
    if blocks.new_runs.iter().all(|&n| n == 0) {
        issues.push(Issue::new(
            "design.optimal_nothing_to_choose",
            Severity::Warning,
        ));
    }
    Ok(GeneratedOptimal {
        spec: spec.clone(),
        candidates: count as u32,
        runs,
        metrics,
        starts_run: search.starts_attempted,
        starts_reaching_best: reached as u32,
        search: Some(search),
        algorithm: format!("fedorov-blocked-sum/1/{ALGORITHM}"),
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
