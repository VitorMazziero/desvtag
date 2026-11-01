//! Lista de métodos disponíveis no núcleo.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::status::{Implementation, Validation};

/// Descrição de um método disponível.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MethodInfo {
    /// Identificador `snake_case`.
    pub id: String,
    /// Versão do método.
    pub version: u32,
    /// Situação de implementação.
    pub implementation: Implementation,
    /// Situação de validação.
    pub validation: Validation,
}

/// Métodos registrados, com a situação real de implementação e validação.
/// Cada etapa acrescenta seus métodos aqui.
#[must_use]
pub fn registered_methods() -> Vec<MethodInfo> {
    vec![
        MethodInfo {
            id: crate::descriptive::METHOD_ID.to_string(),
            version: crate::descriptive::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::models::linear::METHOD_ID.to_string(),
            version: crate::models::linear::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
    ]
}
