//! Documento do projeto EnziTAG Optima (P01–P03).
//!
//! Na ET01 existe apenas o documento mínimo vazio e a versão de esquema. O
//! formato de arquivo `.enzitag`, as revisões e as migrações entram na ET03.
//! Este pacote nunca abre arquivos do sistema.

pub mod document;

pub use document::{ProjectDocument, SCHEMA_VERSION};
