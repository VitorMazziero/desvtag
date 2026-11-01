//! C11 — planejamentos de dois níveis: fatorial completo, fracionário e Plackett–Burman.
//!
//! - [`spec`]: especificação, contagem de ensaios e resultado gerado;
//! - [`coding`]: codificação reversível real ↔ codificado (−1, 0, +1);
//! - [`factorial`]: fatorial completo `2ᵏ` em ordem padrão (Yates);
//! - [`fractional`]: geradores, relação definidora e resolução;
//! - [`alias`]: estrutura de confundimento;
//! - [`plackett_burman`]: matrizes de Hadamard (Paley e Sylvester) e colunas fictícias;
//! - [`randomization`]: PCG32 e Fisher–Yates com semente registrada;
//! - [`generate`]: monta o planejamento (réplicas, pontos centrais, ordem de execução).
//!
//! Especificações em `docs/metodos/fatorial-dois-niveis.md`, `fatorial-fracionario.md`,
//! `plackett-burman.md` e `aleatorizacao.md`.

pub mod alias;
pub mod analysis;
pub mod coding;
pub mod factorial;
pub mod fractional;
pub mod generate;
pub mod plackett_burman;
pub mod randomization;
pub mod recommend;
pub mod spec;

pub use generate::{count_runs, generate};
pub use spec::{
    DesignFactor, DesignKind, DesignRun, DesignSpec, GeneratedDesign, PointType, RunCount,
};
