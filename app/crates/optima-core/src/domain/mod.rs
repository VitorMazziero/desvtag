//! C01 — tipos de domínio dos dados experimentais.
//!
//! Identidades estáveis ([`ids`]), natureza dos fatores ([`factor`]) e o
//! conjunto de dados ([`dataset`]). Planejamentos, modelos e blocos entram
//! nas etapas seguintes.

pub mod dataset;
pub mod factor;
pub mod ids;

pub use dataset::{Dataset, Factor, FactorValue, Observation, Response};
pub use factor::FactorKind;
pub use ids::{IdError, StableId};
