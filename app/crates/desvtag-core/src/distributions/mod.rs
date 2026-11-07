//! C04 — distribuições de probabilidade.
//!
//! Normal, t de Student, F de Snedecor e qui-quadrado, cada uma com `cdf`, cauda superior `sf`
//! (calculada diretamente, com precisão relativa em probabilidades pequenas) e quantis.
//! Algoritmos e limites de precisão em `docs/metodos/distribuicoes.md`. A distribuição da
//! amplitude studentizada (Tukey) entra na ET05, com seu consumidor.

pub mod chi_square;
pub mod dunnett;
pub mod evaluate;
pub mod f;
pub mod noncentral;
pub mod normal;
pub mod quantile;
mod range_table;
pub mod student_t;
pub mod studentized_range;

pub use evaluate::{
    Distribution, DistributionFunction, DistributionRequest, DistributionResult, evaluate,
};
