//! Regras que transformam resultados em fatos.

use super::facts::Fact;
use crate::descriptive::{GroupSummary, Summary};

/// Fatos do resumo descritivo.
///
/// - `descriptive.independence_not_assessed` sempre aparece: contar linhas não
///   estabelece réplicas independentes.
/// - `descriptive.no_valid_observations`, `descriptive.missing_excluded`,
///   `descriptive.excluded_missing_factor` e `descriptive.group_too_small` aparecem
///   apenas quando se aplicam.
#[must_use]
pub fn descriptive_facts(
    overall: &Summary,
    groups: &[GroupSummary],
    excluded_missing_factor: u32,
) -> Vec<Fact> {
    let mut facts = Vec::new();
    if overall.n_valid == 0 {
        facts.push(Fact::new("descriptive.no_valid_observations"));
    }
    if overall.n_missing > 0 {
        facts.push(
            Fact::new("descriptive.missing_excluded").with_param("count", &overall.n_missing),
        );
    }
    if excluded_missing_factor > 0 {
        facts.push(
            Fact::new("descriptive.excluded_missing_factor")
                .with_param("count", &excluded_missing_factor),
        );
    }
    for group in groups.iter().filter(|g| g.summary.n_valid < 2) {
        let name = group
            .labels
            .iter()
            .map(|l| l.label.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        facts.push(
            Fact::new("descriptive.group_too_small")
                .with_param("group", &name)
                .with_param("count", &group.summary.n_valid),
        );
    }
    facts.push(Fact::new("descriptive.independence_not_assessed"));
    facts
}
