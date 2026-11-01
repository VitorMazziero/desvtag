//! Resumo por grupo de fatores.
//!
//! Cada combinação de níveis dos fatores de agrupamento forma um grupo. Uma
//! observação sem valor em algum desses fatores **não** entra em nenhum grupo;
//! o número de observações excluídas é informado (nunca silenciosamente
//! descartado). Os grupos são ordenados fator a fator: pelos níveis declarados,
//! quando houver; senão, numericamente (fator quantitativo) ou em ordem
//! alfabética (fator categórico).

use std::cmp::Ordering;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::summary::{Summary, summarize_column};
use crate::domain::{Dataset, Factor, FactorValue, StableId};

/// Rótulo de um fator em um grupo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GroupLabel {
    /// Fator.
    pub factor_id: StableId,
    /// Nível, como texto (números em notação decimal mais curta que os reproduz).
    pub label: String,
}

/// Resumo de um grupo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GroupSummary {
    /// Nível de cada fator de agrupamento.
    pub labels: Vec<GroupLabel>,
    /// Resumo da resposta no grupo.
    pub summary: Summary,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Rank {
    Declared(usize),
    Number(f64),
    Text(String),
}

impl Rank {
    pub(crate) fn cmp(&self, other: &Self) -> Ordering {
        match (self, other) {
            (Self::Declared(a), Self::Declared(b)) => a.cmp(b),
            (Self::Number(a), Self::Number(b)) => a.total_cmp(b),
            (Self::Text(a), Self::Text(b)) => a.cmp(b),
            // Misturas não ocorrem em dados validados; ordem estável por variante.
            (a, b) => a.tag().cmp(&b.tag()),
        }
    }

    const fn tag(&self) -> u8 {
        match self {
            Self::Declared(_) => 0,
            Self::Number(_) => 1,
            Self::Text(_) => 2,
        }
    }
}

pub(crate) fn label_and_rank(factor: &Factor, value: &FactorValue) -> (String, Rank) {
    match value {
        FactorValue::Number(x) => (x.to_string(), Rank::Number(*x)),
        FactorValue::Text(text) => {
            let rank = factor
                .levels
                .iter()
                .position(|l| l == text)
                .map_or_else(|| Rank::Text(text.clone()), Rank::Declared);
            (text.clone(), rank)
        }
    }
}

struct Group {
    labels: Vec<GroupLabel>,
    ranks: Vec<Rank>,
    values: Vec<Option<f64>>,
}

/// Resume a resposta `response_index` por grupo. Retorna os grupos e o número
/// de observações excluídas por falta de valor em algum fator de agrupamento.
#[must_use]
pub fn summarize_groups(
    dataset: &Dataset,
    response_index: usize,
    group_indexes: &[usize],
) -> (Vec<GroupSummary>, u32) {
    if group_indexes.is_empty() {
        return (Vec::new(), 0);
    }
    let mut groups: Vec<Group> = Vec::new();
    let mut by_key: HashMap<Vec<String>, usize> = HashMap::new();
    let mut excluded: u32 = 0;

    for obs in &dataset.observations {
        let mut parts = Vec::with_capacity(group_indexes.len());
        for &fi in group_indexes {
            let value = obs.factors.get(fi).and_then(Option::as_ref);
            match (dataset.factors.get(fi), value) {
                (Some(factor), Some(value)) => parts.push((factor, label_and_rank(factor, value))),
                _ => break,
            }
        }
        if parts.len() != group_indexes.len() {
            excluded = excluded.saturating_add(1);
            continue;
        }
        let key: Vec<String> = parts.iter().map(|(_, (label, _))| label.clone()).collect();
        let response = obs.responses.get(response_index).copied().flatten();
        let slot = *by_key.entry(key).or_insert_with(|| {
            groups.push(Group {
                labels: parts
                    .iter()
                    .map(|(factor, (label, _))| GroupLabel {
                        factor_id: factor.id.clone(),
                        label: label.clone(),
                    })
                    .collect(),
                ranks: parts.iter().map(|(_, (_, rank))| rank.clone()).collect(),
                values: Vec::new(),
            });
            groups.len() - 1
        });
        if let Some(group) = groups.get_mut(slot) {
            group.values.push(response);
        }
    }

    groups.sort_by(|a, b| {
        a.ranks
            .iter()
            .zip(&b.ranks)
            .map(|(x, y)| x.cmp(y))
            .find(|o| *o != Ordering::Equal)
            .unwrap_or(Ordering::Equal)
    });
    let summaries = groups
        .into_iter()
        .map(|g| GroupSummary {
            labels: g.labels,
            summary: summarize_column(g.values),
        })
        .collect();
    (summaries, excluded)
}
