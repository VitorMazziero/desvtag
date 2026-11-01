//! C07 — inferência dos modelos lineares.
//!
//! - [`one_way_anova`]: ANOVA de um fator, tamanhos de efeito e CV;
//! - [`regression_anova`]: partição das somas de quadrados, `R²` e teste F global;
//! - [`intervals`]: valores críticos t e intervalos de confiança e de predição.

pub mod intervals;
pub mod one_way_anova;
pub mod regression_anova;
