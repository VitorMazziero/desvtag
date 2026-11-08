//! Identificadores estáveis.
//!
//! O número da linha nunca é identidade permanente (roteiro, §3.1): projetos,
//! experimentos, observações e unidades experimentais são referidos por
//! identificadores estáveis, representados como texto.

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize};
use ts_rs::TS;

/// Comprimento máximo, em bytes, de um identificador.
pub const MAX_ID_LEN: usize = 64;

/// Motivo pelo qual um texto não é um identificador válido.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdError {
    /// O texto está vazio.
    Empty,
    /// O texto excede [`MAX_ID_LEN`] bytes.
    TooLong,
    /// O texto contém caractere fora de `[A-Za-z0-9_.:-]`.
    InvalidCharacter,
}

impl fmt::Display for IdError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => f.write_str("identifier is empty"),
            Self::TooLong => write!(f, "identifier is longer than {MAX_ID_LEN} bytes"),
            Self::InvalidCharacter => {
                f.write_str("identifier has a character outside [A-Za-z0-9_.:-]")
            }
        }
    }
}

impl std::error::Error for IdError {}

/// Identificador estável: texto não vazio, ASCII, sem espaços.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, TS)]
#[ts(export, type = "string")]
pub struct StableId(String);

impl StableId {
    /// Valida e cria um identificador.
    ///
    /// # Errors
    /// Retorna [`IdError`] se o texto for vazio, longo demais ou contiver
    /// caracteres fora de `[A-Za-z0-9_.:-]`.
    pub fn new(text: impl Into<String>) -> Result<Self, IdError> {
        let text = text.into();
        if text.is_empty() {
            return Err(IdError::Empty);
        }
        if text.len() > MAX_ID_LEN {
            return Err(IdError::TooLong);
        }
        let allowed = |c: char| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '-');
        if !text.chars().all(allowed) {
            return Err(IdError::InvalidCharacter);
        }
        Ok(Self(text))
    }

    /// Texto do identificador.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StableId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for StableId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        Self::new(text).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_ids() {
        for ok in ["exp-1", "proj:2026.11", "A_b-9"] {
            assert_eq!(
                StableId::new(ok).map(|id| id.to_string()),
                Ok(ok.to_string())
            );
        }
    }

    #[test]
    fn rejects_invalid_ids() {
        assert_eq!(StableId::new(""), Err(IdError::Empty));
        assert_eq!(StableId::new("a b"), Err(IdError::InvalidCharacter));
        assert_eq!(StableId::new("ação"), Err(IdError::InvalidCharacter));
        assert_eq!(
            StableId::new("x".repeat(MAX_ID_LEN + 1)),
            Err(IdError::TooLong)
        );
    }

    #[test]
    fn deserialization_validates() {
        assert!(serde_json::from_str::<StableId>("\"ok-1\"").is_ok());
        assert!(serde_json::from_str::<StableId>("\"not ok\"").is_err());
        assert!(serde_json::from_str::<StableId>("\"\"").is_err());
    }

    #[test]
    fn serializes_as_plain_string() {
        let id = StableId::new("p1").unwrap_or_else(|_| unreachable!());
        assert_eq!(serde_json::to_string(&id).ok().as_deref(), Some("\"p1\""));
    }
}
