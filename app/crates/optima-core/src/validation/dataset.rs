//! Validação estrutural de um conjunto de dados (C02).
//!
//! Devolve diagnósticos codificados; nenhum texto de interface. Erros
//! (`Severity::Error`) impedem o cálculo.

use std::collections::HashSet;

use crate::domain::{Dataset, FactorKind, FactorValue};
use crate::validation::{Issue, Severity};

/// Verifica a consistência interna do conjunto de dados.
#[must_use]
pub fn validate_dataset(dataset: &Dataset) -> Vec<Issue> {
    let mut issues = Vec::new();

    let mut seen = HashSet::new();
    for factor in &dataset.factors {
        if !seen.insert(factor.id.as_str()) {
            issues.push(
                Issue::new("dataset.duplicate_factor_id", Severity::Error)
                    .with_param("id", &factor.id),
            );
        }
        if factor.name.trim().is_empty() {
            issues.push(
                Issue::new("dataset.empty_name", Severity::Error).with_param("id", &factor.id),
            );
        }
    }
    let mut seen = HashSet::new();
    for response in &dataset.responses {
        if !seen.insert(response.id.as_str()) {
            issues.push(
                Issue::new("dataset.duplicate_response_id", Severity::Error)
                    .with_param("id", &response.id),
            );
        }
        if response.name.trim().is_empty() {
            issues.push(
                Issue::new("dataset.empty_name", Severity::Error).with_param("id", &response.id),
            );
        }
    }

    let mut seen = HashSet::new();
    for obs in &dataset.observations {
        if !seen.insert(obs.id.as_str()) {
            issues.push(
                Issue::new("dataset.duplicate_observation_id", Severity::Error)
                    .with_param("id", &obs.id),
            );
        }
        if obs.factors.len() != dataset.factors.len()
            || obs.responses.len() != dataset.responses.len()
        {
            issues.push(
                Issue::new("dataset.row_length_mismatch", Severity::Error)
                    .with_param("observation", &obs.id),
            );
            continue;
        }
        for (factor, value) in dataset.factors.iter().zip(&obs.factors) {
            let Some(value) = value else { continue };
            match (factor.kind, value) {
                (FactorKind::Numeric, FactorValue::Number(x)) => {
                    if !x.is_finite() {
                        issues.push(non_finite(&obs.id, &factor.id));
                    }
                }
                (FactorKind::Categorical, FactorValue::Text(label)) => {
                    if !factor.levels.is_empty() && !factor.levels.contains(label) {
                        issues.push(
                            Issue::new("dataset.undeclared_level", Severity::Error)
                                .with_param("observation", &obs.id)
                                .with_param("factor", &factor.id)
                                .with_param("level", label),
                        );
                    }
                }
                _ => issues.push(
                    Issue::new("dataset.factor_value_type", Severity::Error)
                        .with_param("observation", &obs.id)
                        .with_param("factor", &factor.id),
                ),
            }
        }
        for (response, value) in dataset.responses.iter().zip(&obs.responses) {
            if let Some(x) = value
                && !x.is_finite()
            {
                issues.push(non_finite(&obs.id, &response.id));
            }
        }
    }
    issues
}

fn non_finite(observation: &impl ToString, column: &impl ToString) -> Issue {
    Issue::new("dataset.non_finite_value", Severity::Error)
        .with_param("observation", observation)
        .with_param("column", column)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Factor, Observation, Response, StableId};

    fn id(s: &str) -> StableId {
        StableId::new(s).unwrap_or_else(|_| unreachable!())
    }

    fn base() -> Dataset {
        Dataset {
            factors: vec![Factor {
                id: id("f1"),
                name: "Condição".into(),
                kind: FactorKind::Categorical,
                unit: None,
                levels: vec!["A".into(), "B".into()],
            }],
            responses: vec![Response {
                id: id("r1"),
                name: "Atividade".into(),
                unit: Some("U/mL".into()),
            }],
            observations: vec![Observation {
                id: id("o1"),
                unit_id: None,
                factors: vec![Some(FactorValue::Text("A".into()))],
                responses: vec![Some(1.0)],
            }],
        }
    }

    fn codes(d: &Dataset) -> Vec<String> {
        validate_dataset(d).into_iter().map(|i| i.code).collect()
    }

    #[test]
    fn valid_dataset_has_no_issues() {
        assert!(codes(&base()).is_empty());
    }

    #[test]
    fn detects_duplicate_ids_and_empty_names() {
        let mut d = base();
        d.observations.push(d.observations[0].clone());
        d.factors.push(d.factors[0].clone());
        d.responses[0].name = "  ".into();
        let c = codes(&d);
        assert!(c.contains(&"dataset.duplicate_observation_id".to_string()));
        assert!(c.contains(&"dataset.duplicate_factor_id".to_string()));
        assert!(c.contains(&"dataset.empty_name".to_string()));
    }

    #[test]
    fn detects_shape_type_level_and_non_finite_problems() {
        let mut d = base();
        d.observations[0].responses = vec![];
        assert_eq!(codes(&d), vec!["dataset.row_length_mismatch"]);

        let mut d = base();
        d.observations[0].factors = vec![Some(FactorValue::Number(1.0))];
        assert_eq!(codes(&d), vec!["dataset.factor_value_type"]);

        let mut d = base();
        d.observations[0].factors = vec![Some(FactorValue::Text("C".into()))];
        assert_eq!(codes(&d), vec!["dataset.undeclared_level"]);

        let mut d = base();
        d.observations[0].responses = vec![Some(f64::INFINITY)];
        assert_eq!(codes(&d), vec!["dataset.non_finite_value"]);
    }

    #[test]
    fn missing_values_are_valid() {
        let mut d = base();
        d.observations[0].factors = vec![None];
        d.observations[0].responses = vec![None];
        assert!(codes(&d).is_empty());
    }
}
