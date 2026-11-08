//! Fato interpretável: chave estável e parâmetros.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Fato que a interface explica ao usuário.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Fact {
    /// Chave estável, por exemplo `descriptive.missing_excluded`.
    pub key: String,
    /// Parâmetros da frase.
    pub params: BTreeMap<String, String>,
}

impl Fact {
    /// Fato sem parâmetros.
    #[must_use]
    pub fn new(key: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            params: BTreeMap::new(),
        }
    }

    /// Acrescenta um parâmetro.
    #[must_use]
    pub fn with_param(mut self, key: impl Into<String>, value: &impl ToString) -> Self {
        self.params.insert(key.into(), value.to_string());
        self
    }
}
