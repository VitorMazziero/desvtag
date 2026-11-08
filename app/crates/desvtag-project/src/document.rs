//! Documento do projeto: contêiner de experimentos, revisões e análises.
//!
//! Sem credenciais de qualquer serviço e sem caminhos do computador do usuário.

use desvtag_core::domain::StableId;
use desvtag_core::validation::{Issue, Severity};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use ts_rs::TS;

use desvtag_core::designs::completely_randomized::CrdSpec;
use desvtag_core::designs::mixed_levels::MixedSpec;
use desvtag_core::designs::mixture::MixtureSpec;
use desvtag_core::designs::randomized_block::RcbdSpec;
use desvtag_core::designs::spec::DesignSpec;
use std::collections::BTreeMap;

use crate::analysis::{AnalysisOptions, AnalysisRecord};
use crate::comment::Comment;
use crate::confirmation::{ConfirmationPlan, ExperimentOrigin};
use crate::experiment::ExperimentData;
use crate::families::{AnalysisFamily, SavedMixture, SavedNonlinear, SavedPower, SavedRepeated};
use crate::figure_style::FigureStyle;
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
    /// Applied optimal designs, retaining numeric output and row identities without regeneration.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    #[ts(type = "Array<OptimalDesignRecord> | undefined", optional)]
    pub optimal_designs: Vec<crate::optimal::OptimalDesignRecord>,
    /// Saved geometric supplements; opening never computes a variance profile.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    #[ts(type = "Array<OptimalVarianceRecord> | undefined", optional)]
    pub optimal_variances: Vec<crate::optimal::OptimalVarianceRecord>,
    /// Independent selection of archived optimal designs and profiles for display.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub optimal_artifact_selection: Option<crate::optimal::OptimalArtifactSelection>,
    /// Identificador estável.
    pub id: StableId,
    /// Nome dado pelo usuário.
    pub name: String,
    /// Caminho de entrada, se já escolhido.
    pub entry_path: Option<EntryPath>,
    /// A coluna de unidade experimental está visível na grade.
    pub show_unit_column: bool,
    /// Dedicated time/occasion column visibility (absent in earlier files).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub show_time_column: Option<bool>,
    /// Planejamento de dois níveis gerado para este experimento (caminho "Planejar experimento");
    /// a matriz é regenerada de forma determinística a partir da especificação e da semente.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub design: Option<DesignSpec>,
    /// Delineamento inteiramente casualizado (um fator categórico) gerado para este experimento;
    /// a ordem de execução é regenerada de forma determinística a partir da especificação.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub crd: Option<CrdSpec>,
    /// Delineamento em blocos completos casualizados gerado para este experimento.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub rcbd: Option<RcbdSpec>,
    /// Fatorial completo de níveis mistos gerado para este experimento (v0.3).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub mixed: Option<MixedSpec>,
    /// Planejamento de misturas gerado para este experimento (v0.3).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub mixture: Option<MixtureSpec>,
    /// Modelo de Scheffé escolhido na análise de misturas (v0.3).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub mixture_model: Option<desvtag_core::models::mixture::MixtureModel>,
    /// Saved mixture calculations and current editable selection (v0.4, schema 1).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub mixture_result: Option<SavedMixture>,
    /// Saved paired/mixed calculations and current editable selection.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub mixed_model_result: Option<SavedRepeated>,
    /// Saved saturation calculations and current editable selection.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub nonlinear_result: Option<SavedNonlinear>,
    /// Saved prospective power calculations and raw editable assumptions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub power_result: Option<SavedPower>,
    /// Result family shown on reopening; absent uses the legacy result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub active_family: Option<AnalysisFamily>,
    /// Personalização gráfica por figura (chave estável da figura → ajustes).
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    #[ts(type = "Record<string, FigureStyle> | undefined", optional)]
    pub figure_styles: BTreeMap<String, FigureStyle>,
    /// Comentários de revisão, ligados a análises, figuras e tabelas (v0.3).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    #[ts(type = "Array<Comment> | undefined", optional)]
    pub comments: Vec<Comment>,
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
            optimal_designs: Vec::new(),
            optimal_variances: Vec::new(),
            optimal_artifact_selection: None,
            id,
            name: name.into(),
            entry_path: None,
            show_unit_column: false,
            show_time_column: None,
            design: None,
            crd: None,
            rcbd: None,
            mixed: None,
            mixture: None,
            mixture_model: None,
            mixture_result: None,
            mixed_model_result: None,
            nonlinear_result: None,
            power_result: None,
            active_family: None,
            figure_styles: BTreeMap::new(),
            comments: Vec::new(),
            origin: None,
            confirmation: None,
            analysis_selection: AnalysisOptions {
                optimal_design_id: None,
                surface_block: None,
                response_id: None,
                group_by: Vec::new(),
                factor_id: None,
                alpha: None,
                terms: None,
                include_curvature: None,
                surface: None,
                optimization: None,
                procedure: None,
                factorial: None,
                response_models: None,
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
    /// Experimento ativo ao salvar; ausente nos arquivos anteriores.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub current_experiment_id: Option<StableId>,
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
            app_version: desvtag_core::CORE_VERSION.to_string(),
            experiments: Vec::new(),
            current_experiment_id: None,
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
            if exp.figure_styles.values().any(|s| !s.is_valid()) {
                issues.push(error("project.invalid_figure_style").with_param("id", &exp.id));
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
            crate::family_validation::validate_families(exp, &mut analysis_ids, &mut issues);
            crate::optimal::validate_saved(exp, &mut analysis_ids, &mut issues);
            let mut comment_ids = HashSet::new();
            for comment in &exp.comments {
                let id = &comment.id;
                if !comment_ids.insert(id.as_str()) {
                    issues.push(error("project.duplicate_comment_id").with_param("id", id));
                }
                if !comment.is_valid() {
                    issues.push(error("project.invalid_comment").with_param("id", id));
                }
                if !revision_ids.contains(comment.revision_id.as_str()) {
                    issues.push(error("project.comment_unknown_revision").with_param("id", id));
                }
                if comment
                    .target
                    .analysis_id
                    .as_ref()
                    .is_some_and(|a| !analysis_ids.contains(a.as_str()))
                {
                    issues.push(error("project.comment_unknown_analysis").with_param("id", id));
                }
            }
        }
        issues
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::comment::{CommentTarget, CommentTargetKind};

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
    fn active_experiment_is_optional_for_older_documents() -> Result<(), serde_json::Error> {
        let original = sample();
        let json = serde_json::to_value(&original)?;
        assert!(json.get("currentExperimentId").is_none());
        let older: ProjectDocument = serde_json::from_value(json)?;
        assert_eq!(older.current_experiment_id, None);
        let mut selected = original;
        selected.current_experiment_id = Some(id("e1"));
        let restored: ProjectDocument = serde_json::from_str(&serde_json::to_string(&selected)?)?;
        assert_eq!(restored.current_experiment_id, Some(id("e1")));
        Ok(())
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
        d.experiments[0].figure_styles.insert(
            "means".to_string(),
            FigureStyle {
                font_scale: Some(7.0),
                ..FigureStyle::default()
            },
        );
        assert_eq!(codes(&d), vec!["project.invalid_figure_style"]);

        let mut d = sample();
        d.experiments[0].revisions[0].content_hash = "0".repeat(64);
        assert_eq!(codes(&d), vec!["project.revision_hash_mismatch"]);

        let mut d = sample();
        d.experiments[0].revisions[0].parent = Some(id("ghost"));
        assert_eq!(codes(&d), vec!["project.unknown_parent_revision"]);
    }

    fn comment(target_kind: CommentTargetKind, analysis: Option<&str>, revision: &str) -> Comment {
        Comment {
            id: id("c1"),
            target: CommentTarget {
                kind: target_kind,
                key: "means".to_string(),
                analysis_id: analysis.map(id),
            },
            revision_id: id(revision),
            author: String::new(),
            text: "Conferir.".to_string(),
            created_at: "2026-11-02T12:00:00Z".to_string(),
            edited_at: None,
            resolved_at: None,
            replies: Vec::new(),
        }
    }

    #[test]
    fn comments_must_point_to_existing_revisions_and_analyses() {
        let codes =
            |d: &ProjectDocument| d.validate().into_iter().map(|i| i.code).collect::<Vec<_>>();

        let mut d = sample();
        d.experiments[0]
            .comments
            .push(comment(CommentTargetKind::Figure, None, "v1"));
        assert!(codes(&d).is_empty());

        let mut d = sample();
        d.experiments[0]
            .comments
            .push(comment(CommentTargetKind::Figure, None, "ghost"));
        assert_eq!(codes(&d), vec!["project.comment_unknown_revision"]);

        let mut d = sample();
        d.experiments[0]
            .comments
            .push(comment(CommentTargetKind::Figure, Some("a9"), "v1"));
        assert_eq!(codes(&d), vec!["project.comment_unknown_analysis"]);

        let mut d = sample();
        let c = comment(CommentTargetKind::Experiment, None, "v1");
        d.experiments[0].comments.push(c.clone());
        d.experiments[0].comments.push(c);
        assert_eq!(codes(&d), vec!["project.duplicate_comment_id"]);

        let mut d = sample();
        let mut c = comment(CommentTargetKind::Figure, None, "v1");
        c.text = String::new();
        d.experiments[0].comments.push(c);
        assert_eq!(codes(&d), vec!["project.invalid_comment"]);
    }

    #[test]
    fn a_project_without_comments_keeps_the_same_json() {
        let json = serde_json::to_string(&sample()).unwrap_or_default();
        assert!(!json.contains("comments"));
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
