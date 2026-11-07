//! Natureza dos fatores experimentais.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Tipo de um fator: quantitativo (níveis numéricos) ou categórico (rótulos).
///
/// O usuário define fatores livremente; os planejamentos verificam, em seus
/// módulos, se a natureza do fator é compatível com o método escolhido.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum FactorKind {
    /// Níveis numéricos ordenados (ex.: temperatura em °C).
    Numeric,
    /// Níveis nominais (ex.: tipo de enzima).
    Categorical,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_as_camel_case() {
        let json = serde_json::to_string(&FactorKind::Categorical).unwrap_or_default();
        assert_eq!(json, "\"categorical\"");
        assert_eq!(
            serde_json::from_str::<FactorKind>(&json).ok(),
            Some(FactorKind::Categorical)
        );
    }
}
