//! Fatorial completo de **níveis mistos**: dois ou mais fatores com números diferentes de níveis
//! (categóricos ou numéricos tratados como níveis nomeados), repetições e ordem de execução
//! aleatorizada com semente registrada.
//!
//! A ordem padrão tem o **primeiro fator variando mais depressa** (como a ordem de Yates dos
//! planejamentos de dois níveis) e repete a combinação completa a cada repetição: repetição 1 com
//! todas as combinações, depois a repetição 2, e assim por diante. A ordem de execução é uma
//! permutação dessa lista (PCG32 e Fisher–Yates de [`super::randomization`]).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::randomization::{ALGORITHM, permutation};
use super::spec::MAX_RUNS;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "mixed_levels_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Número máximo de fatores.
pub const MAX_FACTORS: usize = 8;
/// Número máximo de níveis por fator.
pub const MAX_LEVELS: usize = 50;

/// Um fator do planejamento, com seus níveis nomeados.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedFactor {
    /// Identificador do fator no experimento.
    pub id: StableId,
    /// Nome do fator, como digitado.
    pub name: String,
    /// Níveis, na ordem em que foram digitados.
    pub levels: Vec<String>,
}

/// Especificação do fatorial de níveis mistos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedSpec {
    /// Fatores, na ordem das colunas (o primeiro varia mais depressa).
    pub factors: Vec<MixedFactor>,
    /// Repetições da combinação completa (≥ 1).
    pub replicates: u32,
    /// Aleatorizar a ordem de execução.
    pub randomize: bool,
    /// Semente da aleatorização (registrada no resultado); inteiro de até 2⁵³ − 1 na interface.
    #[ts(type = "number")]
    pub seed: u64,
}

/// Um ensaio do planejamento.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixedRun {
    /// Posição de execução (1-based).
    pub run: u32,
    /// Posição na ordem padrão (1-based).
    pub standard_order: u32,
    /// Índice (0-based) do nível de cada fator.
    pub level_indices: Vec<u32>,
    /// Nome do nível de cada fator.
    pub levels: Vec<String>,
    /// Repetição da combinação (1-based).
    pub replicate: u32,
}

/// Planejamento gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedMixed {
    /// Especificação usada.
    pub spec: MixedSpec,
    /// Combinações de níveis (produto dos números de níveis).
    pub combinations: u32,
    /// Total de ensaios (`combinações × repetições`).
    pub total: u32,
    /// Ensaios na ordem de execução.
    pub runs: Vec<MixedRun>,
    /// Algoritmo de aleatorização (ou a ordem padrão, quando não aleatorizado).
    pub randomization_algorithm: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn validate(spec: &MixedSpec) -> Vec<Issue> {
    let mut issues = Vec::new();
    if spec.factors.len() < 2 {
        issues.push(error("design.mixed_too_few_factors").with_param("count", &spec.factors.len()));
    }
    if spec.factors.len() > MAX_FACTORS {
        issues.push(
            error("design.mixed_too_many_factors")
                .with_param("count", &spec.factors.len())
                .with_param("max", &MAX_FACTORS),
        );
    }
    let mut names: Vec<&str> = spec.factors.iter().map(|f| f.name.trim()).collect();
    names.sort_unstable();
    if let Some(dup) = names.windows(2).find(|w| w[0] == w[1] && !w[0].is_empty()) {
        issues.push(error("design.mixed_duplicate_factor").with_param("factor", &dup[0]));
    }
    for factor in &spec.factors {
        if factor.name.trim().is_empty() {
            issues.push(error("design.mixed_empty_factor_name"));
        }
        if factor.levels.len() < 2 {
            issues.push(
                error("design.mixed_too_few_levels")
                    .with_param("factor", &factor.name)
                    .with_param("count", &factor.levels.len()),
            );
        }
        if factor.levels.len() > MAX_LEVELS {
            issues.push(
                error("design.mixed_too_many_levels")
                    .with_param("factor", &factor.name)
                    .with_param("count", &factor.levels.len())
                    .with_param("max", &MAX_LEVELS),
            );
        }
        if factor.levels.iter().any(|l| l.trim().is_empty()) {
            issues.push(error("design.mixed_empty_level").with_param("factor", &factor.name));
        }
        let mut levels: Vec<&str> = factor.levels.iter().map(|l| l.trim()).collect();
        levels.sort_unstable();
        if let Some(dup) = levels.windows(2).find(|w| w[0] == w[1] && !w[0].is_empty()) {
            issues.push(
                error("design.mixed_duplicate_level")
                    .with_param("factor", &factor.name)
                    .with_param("level", &dup[0]),
            );
        }
    }
    if spec.replicates == 0 {
        issues.push(error("design.invalid_replicates"));
    }
    issues
}

fn combinations(spec: &MixedSpec) -> u64 {
    spec.factors
        .iter()
        .map(|f| f.levels.len() as u64)
        .try_fold(1_u64, u64::checked_mul)
        .unwrap_or(u64::MAX)
}

/// Total de ensaios, sem gerar o planejamento.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou acima de [`MAX_RUNS`].
pub fn count_runs(spec: &MixedSpec) -> Result<(u32, u32), CoreError> {
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let combos = combinations(spec);
    let total = combos.saturating_mul(u64::from(spec.replicates));
    if total > u64::from(MAX_RUNS) {
        return Err(CoreError::InvalidInput(vec![
            error("design.too_many_runs")
                .with_param("runs", &total)
                .with_param("max", &MAX_RUNS),
        ]));
    }
    Ok((
        u32::try_from(combos).unwrap_or(u32::MAX),
        u32::try_from(total).unwrap_or(u32::MAX),
    ))
}

/// Gera o planejamento: lista padrão (primeiro fator varia mais depressa) e ordem de execução.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou grandes demais.
pub fn generate(spec: &MixedSpec) -> Result<GeneratedMixed, CoreError> {
    let (combos, total) = count_runs(spec)?;
    let sizes: Vec<usize> = spec.factors.iter().map(|f| f.levels.len()).collect();
    // Ordem padrão: repetição 1 com todas as combinações, depois a repetição 2, …
    let mut standard: Vec<(Vec<usize>, u32)> = Vec::with_capacity(total as usize);
    for replicate in 1..=spec.replicates {
        for index in 0..combos as usize {
            let mut rest = index;
            let indices: Vec<usize> = sizes
                .iter()
                .map(|&size| {
                    let level = rest % size;
                    rest /= size;
                    level
                })
                .collect();
            standard.push((indices, replicate));
        }
    }
    let order: Vec<usize> = if spec.randomize {
        permutation(standard.len(), spec.seed)
    } else {
        (0..standard.len()).collect()
    };
    let runs: Vec<MixedRun> = order
        .iter()
        .enumerate()
        .filter_map(|(position, &standard_index)| {
            let (indices, replicate) = standard.get(standard_index)?;
            Some(MixedRun {
                run: u32::try_from(position + 1).unwrap_or(u32::MAX),
                standard_order: u32::try_from(standard_index + 1).unwrap_or(u32::MAX),
                level_indices: indices
                    .iter()
                    .map(|&i| u32::try_from(i).unwrap_or(u32::MAX))
                    .collect(),
                levels: indices
                    .iter()
                    .zip(&spec.factors)
                    .filter_map(|(&i, f)| f.levels.get(i).cloned())
                    .collect(),
                replicate: *replicate,
            })
        })
        .collect();
    let mut issues = Vec::new();
    if spec.replicates == 1 {
        issues.push(Issue::new(
            "design.mixed_single_replicate",
            Severity::Warning,
        ));
    }
    Ok(GeneratedMixed {
        spec: spec.clone(),
        combinations: combos,
        total,
        runs,
        randomization_algorithm: if spec.randomize {
            ALGORITHM.to_string()
        } else {
            "standard-order".to_string()
        },
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn factor(id: &str, name: &str, levels: &[&str]) -> MixedFactor {
        MixedFactor {
            id: StableId::new(id.to_string()).expect("id"),
            name: name.to_string(),
            levels: levels.iter().map(|s| (*s).to_string()).collect(),
        }
    }

    fn spec(replicates: u32, randomize: bool, seed: u64) -> MixedSpec {
        MixedSpec {
            factors: vec![
                factor("f1", "Cepa", &["A", "B", "C"]),
                factor("f2", "pH", &["5", "7"]),
            ],
            replicates,
            randomize,
            seed,
        }
    }

    #[test]
    fn standard_order_has_the_first_factor_varying_fastest() {
        let g = generate(&spec(1, false, 0)).expect("planejamento");
        assert_eq!(g.combinations, 6);
        assert_eq!(g.total, 6);
        let pairs: Vec<(String, String)> = g
            .runs
            .iter()
            .map(|r| (r.levels[0].clone(), r.levels[1].clone()))
            .collect();
        let expected: Vec<(String, String)> = [
            ("A", "5"),
            ("B", "5"),
            ("C", "5"),
            ("A", "7"),
            ("B", "7"),
            ("C", "7"),
        ]
        .iter()
        .map(|(a, b)| ((*a).to_string(), (*b).to_string()))
        .collect();
        assert_eq!(pairs, expected);
        assert_eq!(g.randomization_algorithm, "standard-order");
        assert_eq!(g.issues.len(), 1); // uma repetição só
    }

    #[test]
    fn replicates_repeat_the_whole_combination_and_each_run_is_unique() {
        let g = generate(&spec(3, true, 42)).expect("planejamento");
        assert_eq!(g.total, 18);
        let mut seen = std::collections::BTreeSet::new();
        for r in &g.runs {
            assert!(seen.insert((r.level_indices.clone(), r.replicate)));
        }
        assert_eq!(seen.len(), 18);
        let mut standard: Vec<u32> = g.runs.iter().map(|r| r.standard_order).collect();
        standard.sort_unstable();
        assert_eq!(standard, (1..=18).collect::<Vec<_>>());
    }

    #[test]
    fn same_seed_same_order_and_a_different_seed_changes_it() {
        let a = generate(&spec(2, true, 7)).expect("a");
        let b = generate(&spec(2, true, 7)).expect("b");
        let c = generate(&spec(2, true, 8)).expect("c");
        assert_eq!(a.runs, b.runs);
        assert_ne!(a.runs, c.runs);
    }

    #[test]
    fn invalid_specifications_are_rejected_with_codes() {
        let mut one = spec(1, false, 0);
        one.factors.truncate(1);
        let CoreError::InvalidInput(issues) = generate(&one).expect_err("poucos fatores");
        assert!(
            issues
                .iter()
                .any(|i| i.code == "design.mixed_too_few_factors")
        );

        let mut few = spec(1, false, 0);
        few.factors[1].levels.truncate(1);
        let CoreError::InvalidInput(issues) = generate(&few).expect_err("poucos níveis");
        assert!(
            issues
                .iter()
                .any(|i| i.code == "design.mixed_too_few_levels")
        );

        let mut dup = spec(1, false, 0);
        dup.factors[0].levels = vec!["A".into(), "A".into()];
        assert!(generate(&dup).is_err());

        let mut zero = spec(0, false, 0);
        zero.replicates = 0;
        assert!(generate(&zero).is_err());
    }

    #[test]
    fn too_many_runs_are_refused_before_generating() {
        let mut big = spec(1, false, 0);
        big.factors[0].levels = (0..50).map(|i| format!("a{i}")).collect();
        big.factors[1].levels = (0..50).map(|i| format!("b{i}")).collect();
        big.replicates = 100;
        let CoreError::InvalidInput(issues) = count_runs(&big).expect_err("grande demais");
        assert!(issues.iter().any(|i| i.code == "design.too_many_runs"));
    }
}
