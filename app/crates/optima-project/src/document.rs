//! Documento do projeto: contêiner de experimentos, revisões e análises.
//!
//! Sem credenciais de qualquer serviço e sem caminhos do computador do usuário.

use optima_core::domain::StableId;
use optima_core::validation::{Issue, Severity};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use ts_rs::TS;

use optima_core::designs::spec::DesignSpec;

use crate::analysis::{AnalysisOptions, AnalysisRecord};
use crate::confirmation::{ConfirmationPlan, ExperimentOrigin};
use crate::experiment::ExperimentData;
use crate::revision::{Revision, RevisionReason};

/// Versão do esquema do documento. Independente da versão do aplicativo e do
/// protocolo; incrementada a cada mudança incompatível (migrações em `migrations/`).
pub const SCHEMA_VERSION: u32 = 1;

/// Caminho de entrada escolhido no início do experimento.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum EntryPath {
    /// Planejar experimento.
    Plan,
    /// Analisar dados existentes.
    Analyze,
    /// Comparar tratamentos.
    Compare,
}

/// Experimento: dados com histórico de revisões, seleção de análise e análises salvas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Experiment {
    /// Identificador estável.
    pub id: StableId,
    /// Nome dado pelo usuário.
    pub name: String,
    /// Caminho de entrada, se já escolhido.
    pub entry_path: Option<EntryPath>,
    /// A coluna de unidade experimental está visível na grade.
    pub show_unit_column: bool,
    /// Planejamento de dois níveis gerado para este experimento (caminho "Planejar experimento");
    /// a matriz é regenerada de forma determinística a partir da especificação e da semente.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub design: Option<DesignSpec>,
    /// Experimento de origem, quando este é uma confirmação proposta por uma otimização.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub origin: Option<ExperimentOrigin>,
    /// Previsões gravadas na proposta de confirmação.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub confirmation: Option<ConfirmationPlan>,
    /// Seleção atual de resposta e agrupamento.
    pub analysis_selection: AnalysisOptions,
    /// Revisões, da mais antiga para a mais recente; a última é o estado atual dos dados.
    pub revisions: Vec<Revision>,
    /// Análises guardadas.
    pub analyses: Vec<AnalysisRecord>,
    /// Observações livres do usuário.
    pub notes: String,
}

impl Experiment {
    /// Cria um experimento com a revisão inicial vazia.
    #[must_use]
    pub fn new(
        id: StableId,
        name: impl Into<String>,
        revision_id: StableId,
        created_at: impl Into<String>,
    ) -> Self {
        let data = ExperimentData::default();
        let content_hash = data.content_hash();
        Self {
            id,
            name: name.into(),
            entry_path: None,
            show_unit_column: false,
            design: None,
            origin: None,
            confirmation: None,
            analysis_selection: AnalysisOptions {
                response_id: None,
                group_by: Vec::new(),
                factor_id: None,
                alpha: None,
                terms: None,
                include_curvature: None,
                surface: None,
                optimization: None,
            },
            revisions: vec![Revision {
                id: revision_id,
                parent: None,
                created_at: created_at.into(),
                reason: RevisionReason::Created,
                data,
                content_hash,
            }],
            analyses: Vec::new(),
            notes: String::new(),
        }
    }

    /// Dados atuais (última revisão).
    #[must_use]
    pub fn current_data(&self) -> Option<&ExperimentData> {
        self.revisions.last().map(|r| &r.data)
    }
}

/// Projeto: vários experimentos em um arquivo `.enzitag`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectDocument {
    /// Versão do esquema com que o documento foi escrito.
    pub schema_version: u32,
    /// Identificador estável do projeto.
    pub project_id: StableId,
    /// Nome dado pelo usuário (preservado como digitado).
    pub name: String,
    /// Criação (RFC 3339).
    pub created_at: String,
    /// Última modificação (RFC 3339).
    pub modified_at: String,
    /// Versão do aplicativo que escreveu o arquivo.
    pub app_version: String,
    /// Experimentos.
    pub experiments: Vec<Experiment>,
}

impl ProjectDocument {
    /// Cria um projeto vazio na versão de esquema atual.
    #[must_use]
    pub fn empty(project_id: StableId, name: impl Into<String>, now: impl Into<String>) -> Self {
        let now = now.into();
        Self {
            schema_version: SCHEMA_VERSION,
            project_id,
            name: name.into(),
            created_at: now.clone(),
            modified_at: now,
            app_version: optima_core::CORE_VERSION.to_string(),
            experiments: Vec::new(),
        }
    }

    /// Recalcula o resumo SHA-256 de cada revisão. A interface cria revisões sem resumo;
    /// o Rust é a única fonte do cálculo (evita reimplementar a serialização canônica).
    #[must_use]
    pub fn with_hashes(mut self) -> Self {
        for experiment in &mut self.experiments {
            for revision in &mut experiment.revisions {
                revision.content_hash = revision.data.content_hash();
            }
        }
        self
    }

    /// Verifica a coerência interna do documento: identificadores únicos, pelo menos uma
    /// revisão por experimento, pais e análises apontando para revisões existentes.
    #[must_use]
    pub fn validate(&self) -> Vec<Issue> {
        let mut issues = Vec::new();
        let error = |code: &str| Issue::new(code, Severity::Error);
        let mut experiment_ids = HashSet::new();
        for exp in &self.experiments {
            if let Some(origin) = &exp.origin {
                let source = self
                    .experiments
                    .iter()
                    .find(|e| e.id == origin.experiment_id);
                if source.is_none_or(|s| !s.analyses.iter().any(|a| a.id == origin.analysis_id)) {
                    issues.push(error("project.origin_not_found").with_param("id", &exp.id));
                }
            }
            if !experiment_ids.insert(exp.id.as_str()) {
                issues.push(error("project.duplicate_experiment_id").with_param("id", &exp.id));
            }
            if exp.revisions.is_empty() {
                issues.push(error("project.experiment_without_revision").with_param("id", &exp.id));
                continue;
            }
            let mut revision_ids = HashSet::new();
            for rev in &exp.revisions {
                if !revision_ids.insert(rev.id.as_str()) {
                    issues.push(error("project.duplicate_revision_id").with_param("id", &rev.id));
                }
                if let Some(parent) = &rev.parent
                    && !exp.revisions.iter().any(|r| &r.id == parent)
                {
                    issues.push(error("project.unknown_parent_revision").with_param("id", &rev.id));
                }
                if rev.content_hash != rev.data.content_hash() {
                    issues.push(error("project.revision_hash_mismatch").with_param("id", &rev.id));
                }
                let width_ok = rev.data.rows.iter().all(|r| {
                    r.factors.len() == rev.data.factors.len()
                        && r.responses.len() == rev.data.responses.len()
                });
                if !width_ok {
                    issues.push(error("project.row_width_mismatch").with_param("id", &rev.id));
                }
            }
            let mut analysis_ids = HashSet::new();
            for analysis in &exp.analyses {
                if !analysis_ids.insert(analysis.id.as_str()) {
                    issues.push(
                        error("project.duplicate_analysis_id").with_param("id", &analysis.id),
                    );
                }
                if !revision_ids.contains(analysis.revision_id.as_str()) {
                    issues.push(
                        error("project.analysis_unknown_revision").with_param("id", &analysis.id),
                    );
                }
            }
        }
        issues
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(s: &str) -> StableId {
        StableId::new(s).unwrap_or_else(|_| unreachable!())
    }

    fn sample() -> ProjectDocument {
        let mut doc =
            ProjectDocument::empty(id("p1"), "Meu projeto — ação", "2026-11-01T12:00:00Z");
        doc.experiments.push(Experiment::new(
            id("e1"),
            "Experimento 1",
            id("v1"),
            "2026-11-01T12:00:00Z",
        ));
        doc
    }

    #[test]
    fn new_project_is_valid_and_round_trips_through_json() {
        let doc = sample();
        assert!(doc.validate().is_empty());
        let json = serde_json::to_string(&doc).unwrap_or_default();
        assert!(json.contains("\"schemaVersion\":1"));
        assert_eq!(
            serde_json::from_str::<ProjectDocument>(&json).ok(),
            Some(doc)
        );
    }

    #[test]
    fn detects_structural_problems() {
        let codes =
            |d: &ProjectDocument| d.validate().into_iter().map(|i| i.code).collect::<Vec<_>>();

        let mut d = sample();
        d.experiments.push(d.experiments[0].clone());
        assert!(codes(&d).contains(&"project.duplicate_experiment_id".to_string()));

        let mut d = sample();
        d.experiments[0].revisions.clear();
        assert_eq!(codes(&d), vec!["project.experiment_without_revision"]);

        // Origem de uma confirmação: precisa apontar para um experimento e uma análise existentes.
        let mut d = sample();
        d.experiments[0].origin = Some(ExperimentOrigin {
            experiment_id: id("e9"),
            analysis_id: id("a1"),
        });
        assert_eq!(codes(&d), vec!["project.origin_not_found"]);

        let mut d = sample();
        d.experiments[0].revisions[0].content_hash = "0".repeat(64);
        assert_eq!(codes(&d), vec!["project.revision_hash_mismatch"]);

        let mut d = sample();
        d.experiments[0].revisions[0].parent = Some(id("ghost"));
        assert_eq!(codes(&d), vec!["project.unknown_parent_revision"]);
    }

    #[test]
    fn with_hashes_fills_missing_hashes_and_fixes_stale_ones() {
        let mut d = sample();
        d.experiments[0].revisions[0].content_hash = String::new();
        assert!(!d.validate().is_empty());
        let d = d.with_hashes();
        assert!(d.validate().is_empty());
        assert_eq!(
            d.experiments[0].revisions[0].content_hash,
            d.experiments[0].revisions[0].data.content_hash()
        );
    }

    #[test]
    fn current_data_is_the_last_revision() {
        let exp = Experiment::new(id("e1"), "x", id("v1"), "t");
        assert_eq!(exp.current_data(), Some(&ExperimentData::default()));
    }
}
