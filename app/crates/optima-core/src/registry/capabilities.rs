//! Capacidades expostas pelo motor.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::methods::{MethodInfo, registered_methods};

/// Capacidades do motor: hoje, apenas a lista de métodos.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Capabilities {
    /// Métodos disponíveis, com situação de implementação e validação.
    pub methods: Vec<MethodInfo>,
}

impl Capabilities {
    /// Capacidades atuais do núcleo.
    #[must_use]
    pub fn current() -> Self {
        Self {
            methods: registered_methods(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_scientific_method_is_registered_in_et01() {
        assert!(Capabilities::current().methods.is_empty());
    }
}
