//! Geração do planejamento: matriz básica, réplicas, pontos centrais e ordem de execução.

use super::alias::{alias_sets, effect_name};
use super::box_behnken::box_behnken;
use super::central_composite::{central_composite, factorial_points};
use super::coding::Levels;
use super::factorial::full_factorial;
use super::fractional::{fractional_matrix, parse_generators, relation_and_resolution};
use super::plackett_burman::{self, SUPPORTED_RUNS};
use super::randomization::{ALGORITHM, permutation};
use super::spec::{
    DesignKind, DesignRun, DesignSpec, GeneratedDesign, MAX_FULL_FACTORS, MAX_RUNS, PointType,
    RunCount, alias_rows,
};
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "two_level_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Identificador do método dos planejamentos de superfície de resposta (composto central e
/// Box–Behnken).
pub const SURFACE_METHOD_ID: &str = "response_surface_design";

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Matriz básica codificada, colunas fictícias, relação definidora e resolução.
struct Base {
    matrix: Vec<Vec<f64>>,
    dummies: u32,
    words: Vec<super::alias::Word>,
    resolution: Option<u32>,
    /// Últimas linhas da matriz que são pontos axiais.
    axial: usize,
    /// Distância axial (composto central).
    alpha: Option<f64>,
}

fn validate_common(spec: &DesignSpec) -> Vec<Issue> {
    let mut issues = Vec::new();
    let k = spec.factors.len();
    if k < 2 {
        issues.push(error("design.too_few_factors").with_param("count", &k));
    }
    for (i, f) in spec.factors.iter().enumerate() {
        if !(Levels {
            low: f.low,
            high: f.high,
        })
        .valid()
        {
            issues.push(error("design.invalid_levels").with_param("factor", &(i + 1)));
        }
        if f.name.trim().is_empty() {
            issues.push(error("design.empty_factor_name").with_param("factor", &(i + 1)));
        }
    }
    let mut ids: Vec<&str> = spec.factors.iter().map(|f| f.id.as_str()).collect();
    ids.sort_unstable();
    if ids.windows(2).any(|w| w[0] == w[1]) {
        issues.push(error("design.duplicate_factor_id"));
    }
    if spec.replicates == 0 {
        issues.push(error("design.invalid_replicates"));
    }
    issues
}

fn base(spec: &DesignSpec) -> Result<Base, Vec<Issue>> {
    let k = spec.factors.len();
    match &spec.kind {
        DesignKind::FullFactorial => {
            if k > MAX_FULL_FACTORS {
                return Err(vec![
                    error("design.too_many_factors").with_param("max", &MAX_FULL_FACTORS),
                ]);
            }
            Ok(Base {
                matrix: full_factorial(k),
                dummies: 0,
                words: Vec::new(),
                resolution: None,
                axial: 0,
                alpha: None,
            })
        }
        DesignKind::Fractional { generators } => {
            let parsed = parse_generators(k, generators)?;
            let (words, resolution) = relation_and_resolution(&parsed);
            Ok(Base {
                matrix: fractional_matrix(k, &parsed),
                dummies: 0,
                words,
                resolution,
                axial: 0,
                alpha: None,
            })
        }
        DesignKind::PlackettBurman { runs } => {
            let n = *runs as usize;
            if !SUPPORTED_RUNS.contains(&n) {
                return Err(vec![
                    error("design.unsupported_runs")
                        .with_param("runs", runs)
                        .with_param(
                            "supported",
                            &SUPPORTED_RUNS.map(|r| r.to_string()).join(", "),
                        ),
                ]);
            }
            let Some((matrix, _dummies)) = plackett_burman::design(n, k) else {
                return Err(vec![
                    error("design.too_many_factors").with_param("max", &(n - 1)),
                ]);
            };
            Ok(Base {
                matrix,
                dummies: u32::try_from(n - 1 - k).unwrap_or(0),
                words: Vec::new(),
                resolution: Some(3),
                axial: 0,
                alpha: None,
            })
        }
        DesignKind::CentralComposite {
            axial,
            inscribed,
            generators,
        } => {
            let c = central_composite(k, axial, *inscribed, generators)?;
            Ok(Base {
                matrix: c.matrix,
                dummies: 0,
                words: c.words,
                resolution: c.resolution,
                axial: c.axial,
                alpha: Some(c.alpha),
            })
        }
        DesignKind::BoxBehnken => Ok(Base {
            matrix: box_behnken(k)?,
            dummies: 0,
            words: Vec::new(),
            resolution: None,
            axial: 0,
            alpha: None,
        }),
    }
}

fn counts(base_runs: usize, axial: usize, spec: &DesignSpec) -> RunCount {
    let to_u32 = |v: usize| u32::try_from(v).unwrap_or(u32::MAX);
    let factorial_runs = to_u32(base_runs).saturating_mul(spec.replicates);
    RunCount {
        base_runs: to_u32(base_runs),
        factorial_runs,
        axial_runs: to_u32(axial).saturating_mul(spec.replicates),
        center_runs: spec.center_points,
        total: factorial_runs.saturating_add(spec.center_points),
    }
}

/// Conta os ensaios **sem gerar** a matriz (exibida antes de gerar).
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou acima de [`MAX_RUNS`].
pub fn count_runs(spec: &DesignSpec) -> Result<RunCount, CoreError> {
    let issues = validate_common(spec);
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let k = spec.factors.len();
    let mut axial = 0_usize;
    let base_runs = match &spec.kind {
        DesignKind::FullFactorial => {
            if k > MAX_FULL_FACTORS {
                return Err(CoreError::InvalidInput(vec![
                    error("design.too_many_factors").with_param("max", &MAX_FULL_FACTORS),
                ]));
            }
            1_usize << k
        }
        DesignKind::Fractional { generators } => {
            parse_generators(k, generators).map_err(CoreError::InvalidInput)?;
            1_usize << (k - generators.len())
        }
        DesignKind::PlackettBurman { runs } => {
            if !SUPPORTED_RUNS.contains(&(*runs as usize)) {
                return Err(CoreError::InvalidInput(vec![
                    error("design.unsupported_runs").with_param("runs", runs),
                ]));
            }
            *runs as usize
        }
        DesignKind::CentralComposite {
            axial: kind,
            generators,
            ..
        } => {
            if k > 8 && generators.is_empty() {
                return Err(CoreError::InvalidInput(vec![
                    error("design.too_many_factors").with_param("max", &8),
                ]));
            }
            if !generators.is_empty() {
                parse_generators(k, generators).map_err(CoreError::InvalidInput)?;
            }
            let cube = factorial_points(k, generators.len());
            super::central_composite::axial_distance(kind, cube)
                .map_err(CoreError::InvalidInput)?;
            axial = 2 * k;
            cube + axial
        }
        DesignKind::BoxBehnken => box_behnken(k).map_err(CoreError::InvalidInput)?.len(),
    };
    let count = counts(base_runs, axial, spec);
    if count.total > MAX_RUNS {
        return Err(CoreError::InvalidInput(vec![
            error("design.too_many_runs")
                .with_param("runs", &count.total)
                .with_param("max", &MAX_RUNS),
        ]));
    }
    Ok(count)
}

/// Gera o planejamento.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas.
pub fn generate(spec: &DesignSpec) -> Result<GeneratedDesign, CoreError> {
    let count = count_runs(spec)?;
    let base = base(spec).map_err(CoreError::InvalidInput)?;
    let k = spec.factors.len();
    let levels: Vec<Levels> = spec
        .factors
        .iter()
        .map(|f| Levels {
            low: f.low,
            high: f.high,
        })
        .collect();

    // Ensaios na ordem padrão: repetições do planejamento básico, depois os pontos centrais.
    let mut standard: Vec<(PointType, u32, Vec<f64>)> = Vec::with_capacity(count.total as usize);
    for replicate in 1..=spec.replicates {
        for (index, row) in base.matrix.iter().enumerate() {
            let point = if index >= base.matrix.len() - base.axial {
                PointType::Axial
            } else {
                PointType::Factorial
            };
            standard.push((point, replicate, row.clone()));
        }
    }
    for _ in 0..spec.center_points {
        standard.push((PointType::Center, 0, vec![0.0; k]));
    }
    let order: Vec<usize> = if spec.randomize {
        permutation(standard.len(), spec.seed)
    } else {
        (0..standard.len()).collect()
    };
    let runs: Vec<DesignRun> = order
        .iter()
        .enumerate()
        .map(|(position, &standard_index)| {
            let (point, replicate, coded) = &standard[standard_index];
            DesignRun {
                run: u32::try_from(position + 1).unwrap_or(u32::MAX),
                standard_order: u32::try_from(standard_index + 1).unwrap_or(u32::MAX),
                point: *point,
                replicate: *replicate,
                coded: coded.clone(),
                real: coded
                    .iter()
                    .zip(&levels)
                    .map(|(c, l)| l.decode(*c))
                    .collect(),
            }
        })
        .collect();

    let mut issues = Vec::new();
    let (defining_relation, aliases) = if base.words.is_empty() {
        (Vec::new(), Vec::new())
    } else {
        let relation = base
            .words
            .iter()
            .map(|w| {
                format!(
                    "I = {}{}",
                    if w.sign < 0 { "−" } else { "" },
                    effect_name(w.mask)
                )
            })
            .collect();
        (relation, alias_rows(&alias_sets(k, &base.words)))
    };
    if matches!(base.resolution, Some(r) if r <= 3) {
        issues.push(
            Issue::new(
                "design.main_effects_aliased_with_two_factor",
                Severity::Warning,
            )
            .with_param("resolution", &base.resolution.unwrap_or(3)),
        );
    }
    if matches!(spec.kind, DesignKind::CentralComposite { .. })
        && matches!(base.resolution, Some(r) if r < 5)
    {
        issues.push(
            Issue::new("design.cube_resolution_low", Severity::Warning)
                .with_param("resolution", &base.resolution.unwrap_or(0)),
        );
    }
    if matches!(
        spec.kind,
        DesignKind::BoxBehnken | DesignKind::CentralComposite { .. }
    ) && spec.center_points == 0
    {
        issues.push(Issue::new("design.surface_needs_center", Severity::Warning));
    }
    if spec.center_points == 1 {
        issues.push(Issue::new("design.single_center_point", Severity::Warning));
    }
    let max_correlation = match spec.kind {
        DesignKind::PlackettBurman { .. } => max_main_vs_two_factor(&base.matrix),
        _ => 0.0,
    };
    Ok(GeneratedDesign {
        spec: spec.clone(),
        count,
        runs,
        defining_relation,
        resolution: base.resolution,
        aliases,
        axial_distance: base.alpha,
        dummy_columns: base.dummies,
        max_main_vs_two_factor_correlation: max_correlation,
        randomization_algorithm: ALGORITHM.to_string(),
        issues,
        provenance: Provenance::current(
            if matches!(
                spec.kind,
                DesignKind::CentralComposite { .. } | DesignKind::BoxBehnken
            ) {
                SURFACE_METHOD_ID
            } else {
                METHOD_ID
            },
            METHOD_VERSION,
        ),
    })
}

/// Maior `|corr|` entre uma coluna principal e o produto de duas outras colunas.
fn max_main_vs_two_factor(matrix: &[Vec<f64>]) -> f64 {
    let n = matrix.len() as f64;
    let k = matrix.first().map_or(0, Vec::len);
    let mut worst = 0.0_f64;
    for a in 0..k {
        for b in 0..k {
            for c in (b + 1)..k {
                if a == b || a == c {
                    continue;
                }
                let dot: f64 = matrix.iter().map(|r| r[a] * r[b] * r[c]).sum();
                worst = worst.max((dot / n).abs());
            }
        }
    }
    worst
}
