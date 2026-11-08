//! Proveniência dos resultados (C19): quem calculou, com qual versão.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::CORE_VERSION;

/// Origem de um resultado. Resultados guardam método, versões e (a partir da
/// ET03) a revisão dos dados e as opções usadas.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Provenance {
    /// Identificador do método no registro (`snake_case`).
    pub method_id: String,
    /// Versão do método.
    pub method_version: u32,
    /// Versão do núcleo que calculou.
    pub engine_version: String,
}

impl Provenance {
    /// Proveniência para um método, com a versão atual do núcleo.
    #[must_use]
    pub fn current(method_id: impl Into<String>, method_version: u32) -> Self {
        Self {
            method_id: method_id.into(),
            method_version,
            engine_version: CORE_VERSION.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_current_core_version() {
        let p = Provenance::current("example_method", 1);
        assert_eq!(p.engine_version, CORE_VERSION);
        assert_eq!(p.method_version, 1);
    }
}
