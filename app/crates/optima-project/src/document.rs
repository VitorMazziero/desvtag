//! Documento do projeto (versão mínima da ET01).

use optima_core::domain::StableId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Versão do esquema do documento. Independente da versão do aplicativo e do
/// protocolo; incrementada a cada mudança incompatível (migrações na ET03).
pub const SCHEMA_VERSION: u32 = 1;

/// Projeto: contêiner de experimentos. Sem credenciais de qualquer serviço.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ProjectDocument {
    /// Versão do esquema com que o documento foi escrito.
    pub schema_version: u32,
    /// Identificador estável do projeto.
    pub project_id: StableId,
    /// Nome dado pelo usuário (preservado como digitado).
    pub name: String,
}

impl ProjectDocument {
    /// Cria um projeto vazio na versão de esquema atual.
    #[must_use]
    pub fn empty(project_id: StableId, name: impl Into<String>) -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            project_id,
            name: name.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_document_uses_current_schema_and_round_trips() {
        let id = StableId::new("p1").unwrap_or_else(|_| unreachable!());
        let doc = ProjectDocument::empty(id, "Meu projeto — ação");
        assert_eq!(doc.schema_version, SCHEMA_VERSION);
        let json = serde_json::to_string(&doc).unwrap_or_default();
        assert!(json.contains("\"schemaVersion\":1"));
        let back: Result<ProjectDocument, _> = serde_json::from_str(&json);
        assert_eq!(back.ok(), Some(doc));
    }
}
