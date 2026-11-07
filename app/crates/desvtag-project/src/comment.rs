//! Comentários do experimento (v0.3, ET20): notas de revisão ligadas a uma análise, figura ou
//! tabela e à revisão dos dados em que foram escritas.
//!
//! São texto livre guardado no projeto; nenhum valor calculado depende deles. O campo é opcional
//! e aditivo: arquivos sem comentários continuam idênticos e abrem em versões anteriores.

use desvtag_core::domain::StableId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Máximo de caracteres do texto de um comentário ou resposta.
pub const MAX_TEXT: usize = 2000;
/// Máximo de caracteres do nome do autor e da chave do alvo.
pub const MAX_SHORT: usize = 200;
/// Máximo de respostas por comentário.
pub const MAX_REPLIES: usize = 200;

/// A que o comentário se refere.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum CommentTargetKind {
    /// O experimento como um todo.
    Experiment,
    /// Uma análise guardada (exige `analysis_id`).
    Analysis,
    /// Uma figura, pela chave estável (por exemplo `means`, `contour:A-B`).
    Figure,
    /// Uma tabela de resultados, pela chave estável.
    Table,
}

/// Alvo do comentário.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CommentTarget {
    /// Tipo do alvo.
    pub kind: CommentTargetKind,
    /// Chave estável da figura ou da tabela; vazia para experimento e análise.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    #[ts(type = "string | undefined", optional)]
    pub key: String,
    /// Análise a que o alvo pertence, quando houver.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub analysis_id: Option<StableId>,
}

/// Resposta a um comentário.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CommentReply {
    /// Identificador estável.
    pub id: StableId,
    /// Nome de quem respondeu (livre; pode ficar vazio).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    #[ts(type = "string | undefined", optional)]
    pub author: String,
    /// Texto da resposta.
    pub text: String,
    /// Criação (RFC 3339).
    pub created_at: String,
}

/// Comentário ligado a um alvo e à revisão em que foi feito.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Comment {
    /// Identificador estável.
    pub id: StableId,
    /// A que se refere.
    pub target: CommentTarget,
    /// Revisão dos dados vigente quando o comentário foi escrito.
    pub revision_id: StableId,
    /// Nome de quem escreveu (livre; pode ficar vazio).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    #[ts(type = "string | undefined", optional)]
    pub author: String,
    /// Texto do comentário.
    pub text: String,
    /// Criação (RFC 3339).
    pub created_at: String,
    /// Última edição do texto (RFC 3339); ausente nos comentários nunca editados.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub edited_at: Option<String>,
    /// Momento em que foi resolvido (RFC 3339); ausente enquanto estiver aberto.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub resolved_at: Option<String>,
    /// Respostas, da mais antiga para a mais recente.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    #[ts(type = "Array<CommentReply> | undefined", optional)]
    pub replies: Vec<CommentReply>,
}

fn text_ok(text: &str) -> bool {
    !text.trim().is_empty() && text.chars().count() <= MAX_TEXT
}

impl Comment {
    /// Texto, autor, chaves e respostas dentro dos limites; análise exigida quando o alvo é uma
    /// análise. A existência da revisão e da análise é verificada pelo documento.
    #[must_use]
    pub fn is_valid(&self) -> bool {
        let short = |s: &str| s.chars().count() <= MAX_SHORT;
        text_ok(&self.text)
            && short(&self.author)
            && short(&self.target.key)
            && (self.target.kind != CommentTargetKind::Analysis
                || self.target.analysis_id.is_some())
            && self.replies.len() <= MAX_REPLIES
            && self
                .replies
                .iter()
                .all(|r| text_ok(&r.text) && short(&r.author))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(s: &str) -> StableId {
        StableId::new(s).unwrap_or_else(|_| unreachable!())
    }

    fn comment(kind: CommentTargetKind) -> Comment {
        Comment {
            id: id("c1"),
            target: CommentTarget {
                kind,
                key: String::new(),
                analysis_id: Some(id("a1")),
            },
            revision_id: id("v1"),
            author: "Ana".to_string(),
            text: "Conferir o ponto central.".to_string(),
            created_at: "2026-11-02T12:00:00Z".to_string(),
            edited_at: None,
            resolved_at: None,
            replies: Vec::new(),
        }
    }

    #[test]
    fn accepts_a_normal_comment_and_rejects_empty_or_long_text() {
        assert!(comment(CommentTargetKind::Figure).is_valid());
        let mut c = comment(CommentTargetKind::Figure);
        c.text = "   ".to_string();
        assert!(!c.is_valid());
        c.text = "x".repeat(MAX_TEXT + 1);
        assert!(!c.is_valid());
        c.text = "x".repeat(MAX_TEXT);
        assert!(c.is_valid());
    }

    #[test]
    fn analysis_target_requires_the_analysis_id() {
        let mut c = comment(CommentTargetKind::Analysis);
        assert!(c.is_valid());
        c.target.analysis_id = None;
        assert!(!c.is_valid());
    }

    #[test]
    fn replies_are_checked_too() {
        let mut c = comment(CommentTargetKind::Table);
        c.replies.push(CommentReply {
            id: id("r1"),
            author: String::new(),
            text: String::new(),
            created_at: "2026-11-02T12:05:00Z".to_string(),
        });
        assert!(!c.is_valid());
        c.replies[0].text = "De acordo.".to_string();
        assert!(c.is_valid());
    }

    #[test]
    fn old_comments_default_to_unedited_and_edits_round_trip() {
        let old = comment(CommentTargetKind::Figure);
        let json = serde_json::to_string(&old).unwrap_or_default();
        let restored: Comment = serde_json::from_str(&json).unwrap_or_else(|_| unreachable!());
        assert_eq!(restored.edited_at, None);
        let mut edited = restored;
        edited.text = "Texto corrigido".into();
        edited.edited_at = Some("2026-11-03T03:00:00Z".into());
        let json = serde_json::to_string(&edited).unwrap_or_default();
        let reopened: Comment = serde_json::from_str(&json).unwrap_or_else(|_| unreachable!());
        assert_eq!(edited, reopened);
        assert_eq!(old.created_at, reopened.created_at);
        assert_eq!(old.revision_id, reopened.revision_id);
    }

    #[test]
    fn optional_fields_stay_out_of_the_json() {
        let json = serde_json::to_string(&comment(CommentTargetKind::Figure)).unwrap_or_default();
        assert!(!json.contains("editedAt"));
        assert!(!json.contains("resolvedAt"));
        assert!(!json.contains("replies"));
        assert!(json.contains("\"revisionId\":\"v1\""));
    }
}
