//! C11/C12 — planejamentos: fatorial completo, fracionário, Plackett–Burman, composto central e
//! Box–Behnken.
//!
//! - [`spec`]: especificação, contagem de ensaios e resultado gerado;
//! - [`coding`]: codificação reversível real ↔ codificado (−1, 0, +1);
//! - [`factorial`]: fatorial completo `2ᵏ` em ordem padrão (Yates);
//! - [`fractional`]: geradores, relação definidora e resolução;
//! - [`alias`]: estrutura de confundimento;
//! - [`central_composite`] e [`box_behnken`]: planejamentos de superfície de resposta (ET07);
//! - [`plackett_burman`]: matrizes de Hadamard (Paley e Sylvester) e colunas fictícias;
//! - [`completely_randomized`]: delineamento inteiramente casualizado (DIC) de um fator categórico;
//! - [`mixed_levels`]: fatorial completo de níveis mistos (v0.3);
//! - [`optimal`]: planejamentos D e I-ótimos com restrições e ampliação (v0.3);
//! - [`mixture`]: simplex-lattice e simplex-centroide com limites inferiores (v0.3);
//! - [`randomization`]: PCG32 e Fisher–Yates com semente registrada;
//! - [`generate`]: monta o planejamento (réplicas, pontos centrais, ordem de execução).
//!
//! Especificações em `docs/metodos/fatorial-dois-niveis.md`, `fatorial-fracionario.md`,
//! `plackett-burman.md`, `aleatorizacao.md`, `composto-central.md` e `box-behnken.md`.

pub mod alias;
pub mod analysis;
pub mod box_behnken;
pub mod central_composite;
pub mod coding;
pub mod completely_randomized;
pub mod factorial;
pub mod fractional;
pub mod generate;
pub mod mixed_levels;
pub mod mixture;
pub mod optimal;
pub mod plackett_burman;
pub mod randomization;
pub mod randomized_block;
pub mod recommend;
pub mod spec;

pub use generate::{count_runs, generate};
pub use spec::{
    AxialKind, DesignFactor, DesignKind, DesignRun, DesignSpec, GeneratedDesign, PointType,
    RunCount,
};
