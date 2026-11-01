//! Diagnósticos codificados: código estável, severidade e parâmetros.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Gravidade de um diagnóstico.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Severity {
    /// Impede o cálculo.
    Error,
    /// Não impede o cálculo, mas limita a interpretação.
    Warning,
    /// Informação para o usuário.
    Info,
}

/// Diagnóstico: o idioma é resolvido pela interface a partir de `code`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Issue {
    /// Código estável, por exemplo `protocol.unsupported_version`.
    pub code: String,
    /// Gravidade.
    pub severity: Severity,
    /// Parâmetros usados na mensagem localizada.
    pub params: BTreeMap<String, String>,
}

impl Issue {
    /// Cria um diagnóstico sem parâmetros.
    #[must_use]
    pub fn new(code: impl Into<String>, severity: Severity) -> Self {
        Self {
            code: code.into(),
            severity,
            params: BTreeMap::new(),
        }
    }

    /// Acrescenta um parâmetro.
    #[must_use]
    pub fn with_param(mut self, key: impl Into<String>, value: impl ToString) -> Self {
        self.params.insert(key.into(), value.to_string());
        self
    }

    /// Indica se o diagnóstico impede o cálculo.
    #[must_use]
    pub fn is_blocking(&self) -> bool {
        self.severity == Severity::Error
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_with_params_and_serializes_camel_case() {
        let issue = Issue::new("data.too_few", Severity::Error).with_param("n", 1);
        assert!(issue.is_blocking());
        let json = serde_json::to_value(&issue).unwrap_or_default();
        assert_eq!(json["severity"], "error");
        assert_eq!(json["params"]["n"], "1");
    }

    #[test]
    fn warning_is_not_blocking() {
        assert!(!Issue::new("x", Severity::Warning).is_blocking());
    }
}
