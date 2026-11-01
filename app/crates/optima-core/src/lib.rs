//! Núcleo científico do EnziTAG Optima.
//!
//! Este pacote contém somente cálculo puro e tipos de domínio: não acessa
//! rede, sistema de arquivos, idioma, tema nem interface. Os módulos seguem o
//! mapa em `docs/arquitetura/mapa-modulos.md`.
//!
//! Implementado até a ET02: C01 (`domain`), C02 (`validation`), C03
//! (`numeric::summation`), C05 (`descriptive`), C18 (`interpretation`) e C19
//! (`registry`, `errors`, `provenance`). O único método científico é
//! `descriptive_summary`.

pub mod descriptive;
pub mod diagnostics;
pub mod distributions;
pub mod domain;
pub mod errors;
pub mod inference;
pub mod interpretation;
pub mod models;
pub mod numeric;
pub mod provenance;
pub mod registry;
pub mod validation;

/// Versão do núcleo científico (igual à versão do aplicativo, DT-0002).
pub const CORE_VERSION: &str = env!("CARGO_PKG_VERSION");
