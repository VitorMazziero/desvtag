//! Núcleo científico do DesvTAG.
//!
//! Este pacote contém somente cálculo puro e tipos de domínio: não acessa
//! rede, sistema de arquivos, idioma, tema nem interface. Os módulos seguem o
//! mapa em `docs/arquitetura/mapa-modulos.md`.
//!
//! Implementado até a ET02: C01 (`domain`), C02 (`validation`), C03
//! (`numeric::summation`), C05 (`descriptive`), C18 (`interpretation`) e C19
//! (`registry`, `errors`, `provenance`). O único método científico é
//! `descriptive_summary`.

// Compiles to no operation in the production engine. Observation never changes a result.
macro_rules! record_work {
    ($label:literal, $amount:expr) => {
        #[cfg(feature = "validation-metrics")]
        crate::validation_metrics::record($label, $amount);
    };
}

/// Optional deterministic work counters for validation executables, not a scientific API.
#[cfg(feature = "validation-metrics")]
pub mod validation_metrics;

pub mod comparisons;
pub mod descriptive;
pub mod designs;
pub mod diagnostics;
pub mod distributions;
pub mod domain;
pub mod errors;
pub mod inference;
pub mod interpretation;
pub mod models;
pub mod numeric;
pub mod optimization;
pub mod power;
pub mod provenance;
pub mod registry;
pub mod surface;
pub mod validation;
pub mod visualization;

/// Versão do núcleo científico (igual à versão do aplicativo, DT-0002).
pub const CORE_VERSION: &str = env!("CARGO_PKG_VERSION");
