//! Núcleo científico do EnziTAG Optima.
//!
//! Este pacote contém somente cálculo puro e tipos de domínio: não acessa
//! rede, sistema de arquivos, idioma, tema nem interface. Os módulos seguem o
//! mapa em `docs/arquitetura/mapa-modulos.md`.
//!
//! Na ET01 existem apenas as estruturas iniciais de C01 (`domain`), C02
//! (`validation`) e C19 (`registry`, `errors`, `provenance`). Nenhum método
//! científico está implementado.

pub mod domain;
pub mod errors;
pub mod provenance;
pub mod registry;
pub mod validation;

/// Versão do núcleo científico (igual à versão do aplicativo, DT-0002).
pub const CORE_VERSION: &str = env!("CARGO_PKG_VERSION");
