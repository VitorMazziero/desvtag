//! Erros do núcleo científico (C19).
//!
//! Resultados indefinidos são estados explícitos, nunca `NaN`, infinito ou
//! zero substituto. Os métodos científicos (ET02 em diante) retornam
//! [`CoreError`] ou diagnósticos de [`crate::validation`].

use std::fmt;

use crate::validation::Issue;

/// Erro de uma operação do núcleo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoreError {
    /// Entrada inválida; carrega os diagnósticos que bloqueiam o cálculo.
    InvalidInput(Vec<Issue>),
}

impl fmt::Display for CoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(issues) => {
                write!(f, "invalid input ({} blocking issue(s))", issues.len())
            }
        }
    }
}

impl std::error::Error for CoreError {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation::Severity;

    #[test]
    fn displays_issue_count() {
        let err = CoreError::InvalidInput(vec![Issue::new("a", Severity::Error)]);
        assert_eq!(err.to_string(), "invalid input (1 blocking issue(s))");
    }
}
