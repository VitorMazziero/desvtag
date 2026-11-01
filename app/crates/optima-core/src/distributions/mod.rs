//! C04 — distribuições de probabilidade.
//!
//! Normal, t de Student, F de Snedecor e qui-quadrado, cada uma com `cdf`, cauda superior `sf`
//! (calculada diretamente, com precisão relativa em probabilidades pequenas) e quantis.
//! Algoritmos e limites de precisão em `docs/metodos/distribuicoes.md`. A distribuição da
//! amplitude studentizada (Tukey) entra na ET05, com seu consumidor.

pub mod chi_square;
pub mod evaluate;
pub mod f;
pub mod normal;
pub mod quantile;
pub mod student_t;

pub use evaluate::{
    Distribution, DistributionFunction, DistributionRequest, DistributionResult, evaluate,
};
