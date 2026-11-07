//! C05 — estatística descritiva.
//!
//! Contagem, ausentes, média, variância, desvio-padrão, mínimo e máximo,
//! para toda a resposta e por grupo de fatores. Especificação em
//! `docs/metodos/estatistica-descritiva.md`.

pub mod grouped;
pub mod summary;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::domain::{Dataset, StableId};
use crate::errors::CoreError;
use crate::interpretation::Fact;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};

pub use grouped::{GroupLabel, GroupSummary};
pub use summary::{Stat, Summary, UndefinedReason};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "descriptive_summary";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

/// Solicitação de resumo descritivo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DescriptiveRequest {
    /// Dados.
    pub dataset: Dataset,
    /// Resposta a resumir.
    pub response_id: StableId,
    /// Fatores que definem os grupos (vazio: apenas o resumo geral).
    pub group_by: Vec<StableId>,
}

/// Resultado do resumo descritivo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DescriptiveResult {
    /// Resposta resumida.
    pub response_id: StableId,
    /// Resumo de todas as observações.
    pub overall: Summary,
    /// Resumo por grupo, na ordem definida pelos níveis dos fatores.
    pub groups: Vec<GroupSummary>,
    /// Observações fora dos grupos por falta do valor de algum fator de agrupamento.
    pub excluded_missing_factor: u32,
    /// Fatos para a interpretação (textos resolvidos pela interface).
    pub facts: Vec<Fact>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Calcula o resumo descritivo.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando o conjunto de dados ou a solicitação são
/// inconsistentes (diagnósticos com severidade de erro).
pub fn summarize(request: &DescriptiveRequest) -> Result<DescriptiveResult, CoreError> {
    let dataset = &request.dataset;
    let mut issues = validate_dataset(dataset);

    let response_index = dataset.response_index(&request.response_id);
    if response_index.is_none() {
        issues.push(
            Issue::new("request.unknown_response", Severity::Error)
                .with_param("id", &request.response_id),
        );
    }
    let mut group_indexes = Vec::new();
    for id in &request.group_by {
        match dataset.factor_index(id) {
            None => issues.push(
                Issue::new("request.unknown_group_factor", Severity::Error).with_param("id", id),
            ),
            Some(index) if group_indexes.contains(&index) => {
                issues.push(
                    Issue::new("request.duplicate_group_factor", Severity::Error)
                        .with_param("id", id),
                );
            }
            Some(index) => group_indexes.push(index),
        }
    }
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let Some(response_index) = response_index else {
        return Err(CoreError::InvalidInput(issues));
    };

    let overall = summary::summarize_column(
        dataset
            .observations
            .iter()
            .map(|o| o.responses.get(response_index).copied().flatten()),
    );
    let (groups, excluded_missing_factor) =
        grouped::summarize_groups(dataset, response_index, &group_indexes);
    let facts =
        crate::interpretation::descriptive_facts(&overall, &groups, excluded_missing_factor);

    Ok(DescriptiveResult {
        response_id: request.response_id.clone(),
        overall,
        groups,
        excluded_missing_factor,
        facts,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
