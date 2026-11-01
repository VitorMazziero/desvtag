//! Delineamento inteiramente casualizado (DIC) de um fator categórico: níveis, repetições e ordem
//! de execução aleatorizada com semente registrada.
//!
//! Cada ensaio é uma unidade experimental independente. A ordem padrão agrupa os ensaios por nível
//! (nível 1 com suas repetições, depois o nível 2, …); a ordem de execução é uma permutação dessa
//! lista (PCG32 e Fisher–Yates, os mesmos de [`super::randomization`]).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::randomization::{ALGORITHM, permutation};
use super::spec::MAX_RUNS;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "completely_randomized_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Número máximo de níveis (tratamentos) do fator.
pub const MAX_LEVELS: usize = 100;

/// Especificação do DIC.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CrdSpec {
    /// Identificador do fator no experimento.
    pub factor_id: StableId,
    /// Nome do fator, como digitado.
    pub factor_name: String,
    /// Níveis (tratamentos) do fator, na ordem em que foram digitados.
    pub levels: Vec<String>,
    /// Unidades experimentais por nível (≥ 1; a ANOVA exige pelo menos 2 em algum nível).
    pub replicates: u32,
    /// Aleatorizar a ordem de execução.
    pub randomize: bool,
    /// Semente da aleatorização (registrada no resultado); inteiro de até 2⁵³ − 1 na interface.
    #[ts(type = "number")]
    pub seed: u64,
}

/// Um ensaio (unidade experimental) do DIC.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CrdRun {
    /// Posição de execução (1-based).
    pub run: u32,
    /// Posição na ordem padrão (1-based), agrupada por nível.
    pub standard_order: u32,
    /// Índice do nível em `levels` (0-based).
    pub level_index: u32,
    /// Nível aplicado.
    pub level: String,
    /// Unidade experimental dentro do nível (1-based).
    pub replicate: u32,
}

/// DIC gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedCrd {
    /// Especificação usada.
    pub spec: CrdSpec,
    /// Total de ensaios (`níveis × repetições`).
    pub total: u32,
    /// Ensaios na ordem de execução.
    pub runs: Vec<CrdRun>,
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

fn validate(spec: &CrdSpec) -> Vec<Issue> {
    let mut issues = Vec::new();
    if spec.factor_name.trim().is_empty() {
        issues.push(error("design.crd_empty_factor_name"));
    }
    if spec.levels.len() < 2 {
        issues.push(error("design.crd_too_few_levels").with_param("count", &spec.levels.len()));
    }
    if spec.levels.len() > MAX_LEVELS {
        issues.push(
            error("design.crd_too_many_levels")
                .with_param("count", &spec.levels.len())
                .with_param("max", &MAX_LEVELS),
        );
    }
    for (i, level) in spec.levels.iter().enumerate() {
        if level.trim().is_empty() {
            issues.push(error("design.crd_empty_level").with_param("level", &(i + 1)));
        }
    }
    let mut names: Vec<&str> = spec.levels.iter().map(|l| l.trim()).collect();
    names.sort_unstable();
    if let Some(dup) = names.windows(2).find(|w| w[0] == w[1] && !w[0].is_empty()) {
        issues.push(error("design.crd_duplicate_level").with_param("level", &dup[0]));
    }
    if spec.replicates == 0 {
        issues.push(error("design.invalid_replicates"));
    }
    issues
}

/// Total de ensaios do DIC, sem gerá-lo.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou acima de [`MAX_RUNS`].
pub fn count_runs(spec: &CrdSpec) -> Result<u32, CoreError> {
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let total = spec
        .levels
        .len()
        .checked_mul(spec.replicates as usize)
        .and_then(|t| u32::try_from(t).ok())
        .unwrap_or(u32::MAX);
    if total > MAX_RUNS {
        return Err(CoreError::InvalidInput(vec![
            error("design.too_many_runs")
                .with_param("runs", &total)
                .with_param("max", &MAX_RUNS),
        ]));
    }
    Ok(total)
}

/// Gera o DIC: lista padrão por nível e ordem de execução.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas.
pub fn generate(spec: &CrdSpec) -> Result<GeneratedCrd, CoreError> {
    let total = count_runs(spec)?;
    let replicates = spec.replicates;
    // Ordem padrão: nível 1 com as repetições 1..r, nível 2, …
    let standard: Vec<(usize, u32)> = (0..spec.levels.len())
        .flat_map(|level| (1..=replicates).map(move |replicate| (level, replicate)))
        .collect();
    let order: Vec<usize> = if spec.randomize {
        permutation(standard.len(), spec.seed)
    } else {
        (0..standard.len()).collect()
    };
    let runs: Vec<CrdRun> = order
        .iter()
        .enumerate()
        .map(|(position, &standard_index)| {
            let (level, replicate) = standard[standard_index];
            CrdRun {
                run: u32::try_from(position + 1).unwrap_or(u32::MAX),
                standard_order: u32::try_from(standard_index + 1).unwrap_or(u32::MAX),
                level_index: u32::try_from(level).unwrap_or(u32::MAX),
                level: spec.levels[level].clone(),
                replicate,
            }
        })
        .collect();
    let mut issues = Vec::new();
    if replicates == 1 {
        issues.push(Issue::new("design.crd_single_replicate", Severity::Warning));
    }
    Ok(GeneratedCrd {
        spec: spec.clone(),
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
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    fn spec(levels: &[&str], replicates: u32, randomize: bool, seed: u64) -> CrdSpec {
        CrdSpec {
            factor_id: StableId::new("f1".to_string()).expect("id"),
            factor_name: "Condição".to_string(),
            levels: levels.iter().map(|s| (*s).to_string()).collect(),
            replicates,
            randomize,
            seed,
        }
    }

    fn codes(result: Result<GeneratedCrd, CoreError>) -> Vec<String> {
        match result {
            Err(CoreError::InvalidInput(issues)) => issues.into_iter().map(|i| i.code).collect(),
            Ok(_) => Vec::new(),
        }
    }

    #[test]
    fn standard_order_groups_by_level_and_is_kept_without_randomization() {
        let g = generate(&spec(&["A", "B", "C"], 2, false, 7)).expect("DIC");
        assert_eq!(g.total, 6);
        let seq: Vec<(u32, &str, u32)> = g
            .runs
            .iter()
            .map(|r| (r.run, r.level.as_str(), r.replicate))
            .collect();
        assert_eq!(
            seq,
            [
                (1, "A", 1),
                (2, "A", 2),
                (3, "B", 1),
                (4, "B", 2),
                (5, "C", 1),
                (6, "C", 2)
            ]
        );
        assert!(g.runs.iter().all(|r| r.run == r.standard_order));
        assert_eq!(g.randomization_algorithm, "standard-order");
    }

    #[test]
    fn randomized_order_is_a_reproducible_permutation_of_the_standard_list() {
        let a = generate(&spec(&["A", "B", "C", "D"], 5, true, 12345)).expect("DIC");
        let b = generate(&spec(&["A", "B", "C", "D"], 5, true, 12345)).expect("DIC");
        let c = generate(&spec(&["A", "B", "C", "D"], 5, true, 12346)).expect("DIC");
        assert_eq!(a, b);
        assert_ne!(a.runs, c.runs);
        assert_eq!(a.randomization_algorithm, ALGORITHM);
        // cada posição padrão aparece uma vez e cada nível recebe exatamente `replicates` ensaios
        let mut standard: Vec<u32> = a.runs.iter().map(|r| r.standard_order).collect();
        standard.sort_unstable();
        assert_eq!(standard, (1..=20).collect::<Vec<_>>());
        for level in 0..4 {
            let mut reps: Vec<u32> = a
                .runs
                .iter()
                .filter(|r| r.level_index == level)
                .map(|r| r.replicate)
                .collect();
            reps.sort_unstable();
            assert_eq!(reps, (1..=5).collect::<Vec<_>>());
        }
        assert!(a.runs.windows(2).all(|w| w[1].run == w[0].run + 1));
    }

    #[test]
    fn rejects_invalid_specifications_with_typed_codes() {
        assert_eq!(
            codes(generate(&spec(&["A"], 3, true, 1))),
            ["design.crd_too_few_levels"]
        );
        assert_eq!(
            codes(generate(&spec(&["A", " a ", "A "], 3, true, 1))),
            ["design.crd_duplicate_level"]
        );
        assert_eq!(
            codes(generate(&spec(&["A", "  "], 3, true, 1))),
            ["design.crd_empty_level"]
        );
        assert_eq!(
            codes(generate(&spec(&["A", "B"], 0, true, 1))),
            ["design.invalid_replicates"]
        );
        let mut nameless = spec(&["A", "B"], 2, true, 1);
        nameless.factor_name = " ".to_string();
        assert_eq!(codes(generate(&nameless)), ["design.crd_empty_factor_name"]);
        assert_eq!(
            codes(generate(&spec(&["A", "B"], 2501, true, 1))),
            ["design.too_many_runs"]
        );
    }

    #[test]
    fn a_single_replicate_is_allowed_with_a_warning() {
        let g = generate(&spec(&["A", "B"], 1, true, 3)).expect("DIC");
        assert_eq!(g.total, 2);
        assert_eq!(
            g.issues.iter().map(|i| i.code.as_str()).collect::<Vec<_>>(),
            ["design.crd_single_replicate"]
        );
    }

    #[test]
    fn count_matches_generation() {
        let s = spec(&["A", "B", "C"], 4, true, 9);
        assert_eq!(count_runs(&s).ok(), Some(12));
        assert_eq!(generate(&s).expect("DIC").runs.len(), 12);
    }
}
