//! Matriz do modelo (C06): colunas a partir de fatores, codificação categórica, interações e potências.
//!
//! Linhas com resposta ou algum fator do modelo ausente são **excluídas** (casos completos) e
//! listadas com o motivo; nunca se imputa valor.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::terms::{CategoricalCoding, ModelSpec, TermSpec};
use crate::domain::{Dataset, FactorKind, FactorValue, StableId};
use crate::numeric::Matrix;
use crate::validation::{Issue, Severity, validate_dataset};

/// Motivo da exclusão de uma observação do ajuste.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ExclusionReason {
    /// A resposta está ausente.
    MissingResponse,
    /// Falta o valor de algum fator usado no modelo.
    MissingFactor,
    /// Índice temporal ausente na configuração de medidas repetidas.
    MissingTime,
}

/// Observação fora do ajuste.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ExcludedObservation {
    /// Observação.
    pub observation_id: StableId,
    /// Motivo.
    pub reason: ExclusionReason,
}

/// Matriz do modelo e metadados.
#[derive(Debug, Clone)]
pub struct DesignMatrix {
    /// `n × p`.
    pub x: Matrix,
    /// Resposta (comprimento `n`).
    pub y: Vec<f64>,
    /// Rótulo de cada coluna.
    pub labels: Vec<String>,
    /// Observações usadas, na ordem das linhas de `x`.
    pub observation_ids: Vec<StableId>,
    /// Observações excluídas.
    pub excluded: Vec<ExcludedObservation>,
    /// A primeira coluna é o intercepto.
    pub has_intercept: bool,
    /// Índices de colunas por termo, sem o intercepto (metadado interno).
    pub term_columns: Vec<Vec<usize>>,
}

struct Columns {
    labels: Vec<String>,
    values: Vec<Vec<f64>>,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Níveis de um fator categórico nas linhas usadas: os declarados, ou os presentes em ordem alfabética.
fn levels_of(dataset: &Dataset, factor: usize, rows: &[usize]) -> Vec<String> {
    let declared = &dataset.factors[factor].levels;
    if !declared.is_empty() {
        return declared.clone();
    }
    let present: BTreeSet<&str> = rows
        .iter()
        .filter_map(
            |&r| match dataset.observations[r].factors[factor].as_ref() {
                Some(FactorValue::Text(t)) => Some(t.as_str()),
                _ => None,
            },
        )
        .collect();
    present.into_iter().map(str::to_owned).collect()
}

fn main_columns(
    dataset: &Dataset,
    factor: usize,
    rows: &[usize],
    coding: CategoricalCoding,
) -> Columns {
    let f = &dataset.factors[factor];
    match f.kind {
        FactorKind::Numeric => Columns {
            labels: vec![f.name.clone()],
            values: vec![
                rows.iter()
                    .map(|&r| match dataset.observations[r].factors[factor] {
                        Some(FactorValue::Number(x)) => x,
                        _ => f64::NAN,
                    })
                    .collect(),
            ],
        },
        FactorKind::Categorical => {
            let levels = levels_of(dataset, factor, rows);
            let index_of = |r: usize| match dataset.observations[r].factors[factor].as_ref() {
                Some(FactorValue::Text(t)) => levels.iter().position(|l| l == t),
                _ => None,
            };
            let last = levels.len().saturating_sub(1);
            let kept: Vec<usize> = match coding {
                CategoricalCoding::Treatment => (1..levels.len()).collect(),
                CategoricalCoding::Sum => (0..last).collect(),
            };
            let values = kept
                .iter()
                .map(|&k| {
                    rows.iter()
                        .map(|&r| match (index_of(r), coding) {
                            (Some(i), _) if i == k => 1.0,
                            (Some(i), CategoricalCoding::Sum) if i == last => -1.0,
                            _ => 0.0,
                        })
                        .collect()
                })
                .collect();
            Columns {
                labels: kept
                    .iter()
                    .map(|&k| format!("{}[{}]", f.name, levels[k]))
                    .collect(),
                values,
            }
        }
    }
}

fn product(a: &Columns, b: &Columns) -> Columns {
    let mut labels = Vec::new();
    let mut values = Vec::new();
    for (la, va) in a.labels.iter().zip(&a.values) {
        for (lb, vb) in b.labels.iter().zip(&b.values) {
            labels.push(format!("{la}:{lb}"));
            values.push(va.iter().zip(vb).map(|(x, y)| x * y).collect());
        }
    }
    Columns { labels, values }
}

/// Constrói a matriz do modelo.
///
/// # Errors
/// Diagnósticos de erro: dados inconsistentes, resposta ou fator inexistente, tipo de fator
/// incompatível com o termo, termo repetido, nível de confiança inválido ou nenhum caso completo.
pub fn build(dataset: &Dataset, spec: &ModelSpec) -> Result<DesignMatrix, Vec<Issue>> {
    build_internal(dataset, spec, None)
}

/// Restrict materialization for expensive methods, without changing the generic builder.
pub(crate) fn build_bounded(
    dataset: &Dataset,
    spec: &ModelSpec,
    max_columns: usize,
    max_cells: usize,
) -> Result<DesignMatrix, Vec<Issue>> {
    build_internal(dataset, spec, Some((max_columns, max_cells)))
}

fn build_internal(
    dataset: &Dataset,
    spec: &ModelSpec,
    budget: Option<(usize, usize)>,
) -> Result<DesignMatrix, Vec<Issue>> {
    let mut issues = validate_dataset(dataset);
    let response = dataset.response_index(&spec.response_id);
    if response.is_none() {
        issues.push(error("request.unknown_response").with_param("id", &spec.response_id));
    }
    if !(spec.confidence_level > 0.0 && spec.confidence_level < 1.0) {
        issues.push(error("model.invalid_confidence_level"));
    }
    // Resolve fatores de cada termo.
    let mut resolved: Vec<Vec<usize>> = Vec::new();
    for (i, term) in spec.terms.iter().enumerate() {
        let ids: Vec<&StableId> = match term {
            TermSpec::Main { factor_id } | TermSpec::Power { factor_id, .. } => vec![factor_id],
            TermSpec::Interaction { factor_ids } => factor_ids.iter().collect(),
        };
        let mut indexes = Vec::new();
        for id in ids {
            match dataset.factor_index(id) {
                Some(f) => indexes.push(f),
                None => issues.push(error("request.unknown_group_factor").with_param("id", id)),
            }
        }
        if let TermSpec::Interaction { .. } = term {
            let distinct: BTreeSet<_> = indexes.iter().collect();
            if indexes.len() < 2 || distinct.len() != indexes.len() {
                issues.push(error("model.invalid_interaction").with_param("term", &(i + 1)));
            }
        }
        if let TermSpec::Power { degree, .. } = term {
            let numeric = indexes
                .first()
                .is_some_and(|&f| dataset.factors[f].kind == FactorKind::Numeric);
            if *degree < 2 || i32::try_from(*degree).is_err() || !numeric {
                issues.push(error("model.invalid_power").with_param("term", &(i + 1)));
            }
        }
        if resolved.contains(&indexes) && spec.terms[..i].iter().any(|t| t == term) {
            issues.push(error("model.duplicate_term").with_param("term", &(i + 1)));
        }
        resolved.push(indexes);
    }
    if issues.iter().any(Issue::is_blocking) {
        return Err(issues);
    }
    let Some(response) = response else {
        return Err(issues);
    };

    // Casos completos.
    let involved: BTreeSet<usize> = resolved.iter().flatten().copied().collect();
    let mut rows = Vec::new();
    let mut excluded = Vec::new();
    for (r, obs) in dataset.observations.iter().enumerate() {
        if obs.responses[response].is_none() {
            excluded.push(ExcludedObservation {
                observation_id: obs.id.clone(),
                reason: ExclusionReason::MissingResponse,
            });
        } else if involved.iter().any(|&f| obs.factors[f].is_none()) {
            excluded.push(ExcludedObservation {
                observation_id: obs.id.clone(),
                reason: ExclusionReason::MissingFactor,
            });
        } else {
            rows.push(r);
        }
    }
    if rows.is_empty() {
        return Err(vec![error("model.no_complete_rows")]);
    }

    if let Some((max_columns, max_cells)) = budget {
        let mut widths = BTreeMap::new();
        for &factor in &involved {
            let f = &dataset.factors[factor];
            let width = match f.kind {
                FactorKind::Numeric => 1,
                FactorKind::Categorical if !f.levels.is_empty() => f.levels.len().saturating_sub(1),
                FactorKind::Categorical => {
                    levels_of(dataset, factor, &rows).len().saturating_sub(1)
                }
            };
            widths.insert(factor, width);
        }
        let mut count = Some(usize::from(spec.intercept));
        for (term, indexes) in spec.terms.iter().zip(&resolved) {
            let width = match term {
                TermSpec::Power { .. } => Some(1),
                _ => indexes
                    .iter()
                    .try_fold(1_usize, |width, index| width.checked_mul(widths[index])),
            };
            count = count.and_then(|current| width.and_then(|width| current.checked_add(width)));
        }
        if count.is_none_or(|columns| {
            columns > max_columns
                || rows
                    .len()
                    .checked_mul(columns)
                    .is_none_or(|cells| cells > max_cells)
        }) {
            return Err(vec![
                error("model.matrix_budget")
                    .with_param("maxColumns", &max_columns)
                    .with_param("maxCells", &max_cells),
            ]);
        }
    }

    let mut labels = Vec::new();
    let mut columns: Vec<Vec<f64>> = Vec::new();
    if spec.intercept {
        labels.push("(Intercept)".to_string());
        columns.push(vec![1.0; rows.len()]);
    }
    let mut term_columns = Vec::new();
    for (term, indexes) in spec.terms.iter().zip(&resolved) {
        let set = match term {
            TermSpec::Main { .. } => main_columns(dataset, indexes[0], &rows, spec.coding),
            TermSpec::Power { degree, .. } => {
                let exponent = i32::try_from(*degree).map_err(|_| {
                    vec![error("model.invalid_power").with_param("term", &(term_columns.len() + 1))]
                })?;
                let base = main_columns(dataset, indexes[0], &rows, spec.coding);
                let name = &dataset.factors[indexes[0]].name;
                Columns {
                    labels: vec![format!("{name}^{degree}")],
                    values: vec![base.values[0].iter().map(|x| x.powi(exponent)).collect()],
                }
            }
            TermSpec::Interaction { .. } => {
                let mut acc = main_columns(dataset, indexes[0], &rows, spec.coding);
                for &f in &indexes[1..] {
                    acc = product(&acc, &main_columns(dataset, f, &rows, spec.coding));
                }
                acc
            }
        };
        term_columns.push((labels.len()..labels.len() + set.labels.len()).collect());
        labels.extend(set.labels);
        columns.extend(set.values);
    }
    if columns.is_empty() {
        return Err(vec![error("model.no_columns")]);
    }
    let mut x = Matrix::zeros(rows.len(), columns.len());
    for (j, col) in columns.iter().enumerate() {
        for (i, v) in col.iter().enumerate() {
            x[(i, j)] = *v;
        }
    }
    let y = rows
        .iter()
        .map(|&r| dataset.observations[r].responses[response].unwrap_or(f64::NAN))
        .collect();
    let observation_ids = rows
        .iter()
        .map(|&r| dataset.observations[r].id.clone())
        .collect();
    Ok(DesignMatrix {
        x,
        y,
        labels,
        observation_ids,
        excluded,
        has_intercept: spec.intercept,
        term_columns,
    })
}
