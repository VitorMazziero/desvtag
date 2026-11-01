//! Situação de implementação e validação de um método (espelha a matriz de
//! cobertura em `docs/produto/matriz-cobertura.md`).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Situação da implementação.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Implementation {
    /// Código e testes próprios existem.
    Implemented,
}

/// Situação da validação numérica.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Validation {
    /// Ainda sem comparação com referência independente.
    NotValidated,
    /// Comparado a referência independente e verificado nas plataformas.
    Validated,
}
