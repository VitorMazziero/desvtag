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

/// Métodos registrados. Vazio na ET01: não há método científico implementado;
/// cada etapa seguinte acrescenta seus métodos aqui, com a situação real.
#[must_use]
pub fn registered_methods() -> Vec<MethodInfo> {
    Vec::new()
}
