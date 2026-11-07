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
            id: crate::comparisons::METHOD_ID.to_string(),
            version: crate::comparisons::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::comparisons::procedures::METHOD_ID.to_string(),
            version: crate::comparisons::procedures::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::models::factorial_anova::METHOD_ID.to_string(),
            version: crate::models::factorial_anova::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::surface::selection::METHOD_ID.to_string(),
            version: crate::surface::selection::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::selection::METHOD_ID.to_string(),
            version: crate::designs::selection::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::generate::METHOD_ID.to_string(),
            version: crate::designs::generate::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::completely_randomized::METHOD_ID.to_string(),
            version: crate::designs::completely_randomized::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::randomized_block::METHOD_ID.to_string(),
            version: crate::designs::randomized_block::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::mixed_levels::METHOD_ID.to_string(),
            version: crate::designs::mixed_levels::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::mixture::METHOD_ID.to_string(),
            version: crate::designs::mixture::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::models::mixture::METHOD_ID.to_string(),
            version: crate::models::mixture::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::optimal::METHOD_ID.to_string(),
            version: crate::designs::optimal::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::optimal::model::MODEL_METHOD_ID.to_string(),
            version: crate::designs::optimal::model::MODEL_METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::optimal::variance::VARIANCE_METHOD_ID.to_string(),
            version: crate::designs::optimal::variance::VARIANCE_METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::comparisons::paired::METHOD_ID.to_string(),
            version: crate::comparisons::paired::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::models::mixed::METHOD_ID.to_string(),
            version: crate::models::mixed::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::models::nonlinear::METHOD_ID.to_string(),
            version: crate::models::nonlinear::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::power::METHOD_ID.to_string(),
            version: crate::power::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::analysis::METHOD_ID.to_string(),
            version: crate::designs::analysis::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::designs::generate::SURFACE_METHOD_ID.to_string(),
            version: crate::designs::generate::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::surface::model::METHOD_ID.to_string(),
            version: crate::surface::model::METHOD_VERSION,
            implementation: Implementation::Implemented,
            validation: Validation::NumericallyValidated,
        },
        MethodInfo {
            id: crate::optimization::optimize::METHOD_ID.to_string(),
            version: crate::optimization::optimize::METHOD_VERSION,
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
