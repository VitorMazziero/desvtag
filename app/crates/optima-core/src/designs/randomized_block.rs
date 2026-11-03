//! Delineamento em blocos completos casualizados (DBC): cada bloco contém todos os tratamentos
//! uma vez, e a ordem dos tratamentos é sorteada **dentro de cada bloco**.
//!
//! A aleatorização usa um único gerador PCG32 (semente registrada) e Fisher–Yates por bloco, na
//! ordem dos blocos: a mesma semente produz a mesma ordem no Windows e no navegador.
//! Especificação em `docs/metodos/delineamento-em-blocos.md`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::randomization::{ALGORITHM, Pcg32};
use super::spec::MAX_RUNS;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "randomized_block_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Número máximo de tratamentos e de blocos.
pub const MAX_LEVELS: usize = 100;

/// Especificação do DBC.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RcbdSpec {
    /// Fator de tratamento.
    pub factor_id: StableId,
    /// Nome do fator de tratamento.
    pub factor_name: String,
    /// Tratamentos.
    pub levels: Vec<String>,
    /// Nome do fator de bloco.
    pub block_name: String,
    /// Blocos (por exemplo, dia, lote ou operador).
    pub blocks: Vec<String>,
    /// Aleatorizar a ordem dentro de cada bloco.
    pub randomize: bool,
    /// Semente da aleatorização.
    #[ts(type = "number")]
    pub seed: u64,
}

/// Um ensaio.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RcbdRun {
    /// Posição global de execução (blocos em ordem, ordem sorteada dentro de cada um).
    pub run: u32,
    /// Índice do bloco.
    pub block_index: u32,
    /// Bloco.
    pub block: String,
    /// Posição dentro do bloco (1-based).
    pub position: u32,
    /// Índice do tratamento.
    pub level_index: u32,
    /// Tratamento.
    pub level: String,
}

/// DBC gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedRcbd {
    /// Especificação.
    pub spec: RcbdSpec,
    /// Total de ensaios (`tratamentos × blocos`).
    pub total: u32,
    /// Ensaios.
    pub runs: Vec<RcbdRun>,
    /// Algoritmo.
    pub randomization_algorithm: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn duplicates(names: &[String]) -> Option<String> {
    let mut sorted: Vec<&str> = names.iter().map(|n| n.trim()).collect();
    sorted.sort_unstable();
    sorted
        .windows(2)
        .find(|w| w[0] == w[1])
        .map(|w| w[0].to_string())
}

/// Gera o DBC.
///
/// # Errors
/// [`CoreError::InvalidInput`] para nomes vazios ou repetidos, menos de 2 tratamentos, menos de 2
/// blocos ou mais de [`MAX_RUNS`] ensaios.
pub fn generate(spec: &RcbdSpec) -> Result<GeneratedRcbd, CoreError> {
    let mut issues = Vec::new();
    if spec.factor_name.trim().is_empty() || spec.block_name.trim().is_empty() {
        issues.push(error("design.rcbd_empty_name"));
    }
    for (levels, kind) in [(&spec.levels, "treatment"), (&spec.blocks, "block")] {
        if levels.len() < 2 {
            issues.push(
                error("design.rcbd_too_few_levels")
                    .with_param("kind", &kind)
                    .with_param("count", &levels.len()),
            );
        }
        if levels.len() > MAX_LEVELS {
            issues.push(
                error("design.rcbd_too_many_levels")
                    .with_param("kind", &kind)
                    .with_param("max", &MAX_LEVELS),
            );
        }
        if levels.iter().any(|l| l.trim().is_empty()) {
            issues.push(error("design.rcbd_empty_level").with_param("kind", &kind));
        }
        if let Some(d) = duplicates(levels) {
            issues.push(
                error("design.rcbd_duplicate")
                    .with_param("kind", &kind)
                    .with_param("level", &d),
            );
        }
    }
    let total = spec.levels.len() * spec.blocks.len();
    if issues.is_empty() && total > MAX_RUNS as usize {
        issues.push(
            error("design.too_many_runs")
                .with_param("runs", &total)
                .with_param("max", &MAX_RUNS),
        );
    }
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let mut rng = Pcg32::new(spec.seed);
    let mut runs = Vec::with_capacity(total);
    for (b, block) in spec.blocks.iter().enumerate() {
        let mut order: Vec<usize> = (0..spec.levels.len()).collect();
        if spec.randomize {
            for i in (1..order.len()).rev() {
                let j = rng.bounded(u32::try_from(i + 1).unwrap_or(u32::MAX)) as usize;
                order.swap(i, j);
            }
        }
        for (position, &level) in order.iter().enumerate() {
            runs.push(RcbdRun {
                run: u32::try_from(runs.len() + 1).unwrap_or(u32::MAX),
                block_index: u32::try_from(b).unwrap_or(u32::MAX),
                block: block.clone(),
                position: u32::try_from(position + 1).unwrap_or(u32::MAX),
                level_index: u32::try_from(level).unwrap_or(u32::MAX),
                level: spec.levels[level].clone(),
            });
        }
    }
    Ok(GeneratedRcbd {
        spec: spec.clone(),
        total: u32::try_from(total).unwrap_or(u32::MAX),
        runs,
        randomization_algorithm: if spec.randomize {
            ALGORITHM.to_string()
        } else {
            "standard-order".to_string()
        },
        issues: Vec::new(),
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    fn spec(levels: &[&str], blocks: &[&str], randomize: bool, seed: u64) -> RcbdSpec {
        RcbdSpec {
            factor_id: StableId::new("f1".to_string()).expect("id"),
            factor_name: "Condição".into(),
            levels: levels.iter().map(|s| (*s).into()).collect(),
            block_name: "Dia".into(),
            blocks: blocks.iter().map(|s| (*s).into()).collect(),
            randomize,
            seed,
        }
    }

    #[test]
    fn every_block_has_every_treatment_once_in_a_reproducible_order() {
        let a = generate(&spec(&["A", "B", "C", "D"], &["d1", "d2", "d3"], true, 42)).expect("DBC");
        let b = generate(&spec(&["A", "B", "C", "D"], &["d1", "d2", "d3"], true, 42)).expect("DBC");
        assert_eq!(a, b);
        assert_eq!(a.total, 12);
        for block in 0..3 {
            let mut levels: Vec<u32> = a
                .runs
                .iter()
                .filter(|r| r.block_index == block)
                .map(|r| r.level_index)
                .collect();
            levels.sort_unstable();
            assert_eq!(levels, [0, 1, 2, 3]);
        }
        assert!(a.runs.windows(2).all(|w| w[1].run == w[0].run + 1));
    }

    #[test]
    fn without_randomization_the_order_is_the_listed_one() {
        let g = generate(&spec(&["A", "B"], &["d1", "d2"], false, 1)).expect("DBC");
        let levels: Vec<&str> = g.runs.iter().map(|r| r.level.as_str()).collect();
        assert_eq!(levels, ["A", "B", "A", "B"]);
    }

    #[test]
    fn invalid_specifications_are_refused() {
        assert!(generate(&spec(&["A"], &["d1", "d2"], true, 1)).is_err());
        assert!(generate(&spec(&["A", "B"], &["d1"], true, 1)).is_err());
        assert!(generate(&spec(&["A", "A "], &["d1", "d2"], true, 1)).is_err());
        assert!(generate(&spec(&["A", " "], &["d1", "d2"], true, 1)).is_err());
    }
}
