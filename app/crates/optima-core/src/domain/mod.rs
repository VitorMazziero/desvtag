//! C01 — tipos de domínio dos dados experimentais.
//!
//! Identidades estáveis ([`ids`]) e a natureza dos fatores ([`factor`]). Os
//! demais tipos (observação, unidade experimental, resposta, conjunto de
//! dados) entram na ET02.

pub mod factor;
pub mod ids;

pub use factor::FactorKind;
pub use ids::{IdError, StableId};
