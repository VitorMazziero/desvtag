//! Formação dos grupos de um fator para comparação de tratamentos.
//!
//! Cada nível do fator forma um grupo. Observações sem resposta ou sem nível do fator ficam fora do
//! ajuste e são listadas com o motivo; nunca se imputa valor. A ordem dos grupos segue os níveis
//! declarados ou, na falta deles, a ordem numérica/alfabética.

use std::collections::HashMap;

use crate::descriptive::grouped::{Rank, label_and_rank};
use crate::domain::{Dataset, StableId};
use crate::models::design_matrix::{ExcludedObservation, ExclusionReason};

/// Valores de um grupo.
#[derive(Debug, Clone)]
pub struct GroupData {
    /// Rótulo do nível.
    pub label: String,
    /// Respostas.
    pub values: Vec<f64>,
    /// Observações correspondentes, na mesma ordem.
    pub observation_ids: Vec<StableId>,
}

/// Agrupa por `factor_index` as respostas de `response_index`.
#[must_use]
pub fn group_by_factor(
    dataset: &Dataset,
    response_index: usize,
    factor_index: usize,
) -> (Vec<GroupData>, Vec<ExcludedObservation>) {
    let factor = &dataset.factors[factor_index];
    let mut groups: Vec<(Rank, GroupData)> = Vec::new();
    let mut slot: HashMap<String, usize> = HashMap::new();
    let mut excluded = Vec::new();
    for obs in &dataset.observations {
        let Some(response) = obs.responses[response_index] else {
            excluded.push(ExcludedObservation {
                observation_id: obs.id.clone(),
                reason: ExclusionReason::MissingResponse,
            });
            continue;
        };
        let Some(level) = obs.factors[factor_index].as_ref() else {
            excluded.push(ExcludedObservation {
                observation_id: obs.id.clone(),
                reason: ExclusionReason::MissingFactor,
            });
            continue;
        };
        let (label, rank) = label_and_rank(factor, level);
        let index = *slot.entry(label.clone()).or_insert_with(|| {
            groups.push((
                rank,
                GroupData {
                    label,
                    values: Vec::new(),
                    observation_ids: Vec::new(),
                },
            ));
            groups.len() - 1
        });
        groups[index].1.values.push(response);
        groups[index].1.observation_ids.push(obs.id.clone());
    }
    groups.sort_by(|a, b| a.0.cmp(&b.0));
    (groups.into_iter().map(|(_, g)| g).collect(), excluded)
}
