//! C02 — validação de dados e configurações.
//!
//! Produz diagnósticos codificados, sem texto de interface: a tradução para
//! português e inglês pertence à interface (U17).

pub mod dataset;
pub mod issues;

pub use dataset::validate_dataset;
pub use issues::{Issue, Severity};
