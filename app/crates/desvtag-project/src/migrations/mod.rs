//! Migrações explícitas entre versões de esquema.
//!
//! Operam sobre uma **cópia** (`serde_json::Value`) e nunca sobre os bytes de
//! origem, que permanecem intactos. Na versão 1 não há migração real: não existe
//! esquema anterior publicado. Cada mudança incompatível acrescenta uma função
//! `vN_to_vM` aqui, um teste com um arquivo da versão antiga e incrementa
//! [`crate::SCHEMA_VERSION`].

use desvtag_core::validation::{Issue, Severity};
use serde_json::Value;

use crate::SCHEMA_VERSION;

/// Resultado da migração: documento na versão atual e versão de origem.
#[derive(Debug)]
pub struct Migrated {
    /// Documento no esquema atual.
    pub value: Value,
    /// Versão de origem, se houve migração.
    pub from: Option<u32>,
}

/// Leva um documento JSON ao esquema atual.
///
/// # Errors
/// - `project.invalid_schema`: `schemaVersion` ausente, zero ou não numérico.
/// - `project.future_schema`: arquivo escrito por versão mais nova do aplicativo
///   (não é aberto nem regravado de forma destrutiva).
pub fn migrate_to_current(value: Value) -> Result<Migrated, Issue> {
    let version = value
        .get("schemaVersion")
        .and_then(Value::as_u64)
        .and_then(|v| u32::try_from(v).ok())
        .filter(|v| *v >= 1)
        .ok_or_else(|| Issue::new("project.invalid_schema", Severity::Error))?;
    if version > SCHEMA_VERSION {
        return Err(Issue::new("project.future_schema", Severity::Error)
            .with_param("found", &version)
            .with_param("supported", &SCHEMA_VERSION));
    }
    // version == SCHEMA_VERSION: nada a migrar. Passos futuros entram como
    // `while version < SCHEMA_VERSION { value = step(version, value)?; version += 1; }`.
    Ok(Migrated { value, from: None })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn current_version_passes_unchanged() {
        let v = json!({"schemaVersion": SCHEMA_VERSION, "x": 1});
        let m = migrate_to_current(v.clone()).map(|m| (m.value, m.from));
        assert_eq!(m.ok(), Some((v, None)));
    }

    #[test]
    fn future_version_is_refused_with_both_versions_reported() {
        let err = migrate_to_current(json!({"schemaVersion": SCHEMA_VERSION + 1})).err();
        let issue = err.unwrap_or_else(|| Issue::new("none", Severity::Info));
        assert_eq!(issue.code, "project.future_schema");
        assert_eq!(
            issue.params.get("found"),
            Some(&(SCHEMA_VERSION + 1).to_string())
        );
        assert_eq!(
            issue.params.get("supported"),
            Some(&SCHEMA_VERSION.to_string())
        );
    }

    #[test]
    fn missing_zero_or_non_numeric_version_is_invalid() {
        for v in [
            json!({}),
            json!({"schemaVersion": 0}),
            json!({"schemaVersion": "1"}),
            json!({"schemaVersion": -3}),
        ] {
            assert_eq!(
                migrate_to_current(v).err().map(|i| i.code),
                Some("project.invalid_schema".to_string())
            );
        }
    }
}
