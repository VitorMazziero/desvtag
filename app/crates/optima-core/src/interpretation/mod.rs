//! C18 — interpretação: fatos e regras (sem texto).
//!
//! Este módulo não gera traduções nem recalcula testes: produz *fatos* com
//! chave estável e parâmetros, que a interface (U17) transforma em frases
//! curtas em português e inglês.

pub mod facts;
pub mod rules;

pub use facts::Fact;
pub use rules::{descriptive_facts, one_way_facts};
