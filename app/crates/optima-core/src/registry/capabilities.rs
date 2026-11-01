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
    fn lists_the_implemented_methods_with_their_real_status() {
        let methods = Capabilities::current().methods;
        let ids: Vec<&str> = methods.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(
            ids,
            [
                "descriptive_summary",
                "one_way_comparison",
                "multiple_comparison_procedures",
                "two_level_design",
                "completely_randomized_design",
                "two_level_design_analysis",
                "response_surface_design",
                "response_surface",
                "desirability_optimization",
                "linear_model"
            ]
        );
    }
}
