//! C06 — modelos lineares.
//!
//! - [`terms`]: especificação do modelo (efeitos principais, interações e potências);
//! - [`design_matrix`]: matriz do modelo a partir de um conjunto de dados (codificação categórica);
//! - [`linear`]: ajuste por QR com pivoteamento e resultados (coeficientes, ANOVA, diagnósticos);
//! - [`covariance`]: covariância dos coeficientes e erros-padrão sem inverter `XᵀX`;
//! - [`prediction`]: predição com intervalos para novas condições.
//!
//! Especificação em `docs/metodos/regressao-linear.md`.

pub mod covariance;
pub mod design_matrix;
pub mod factorial_anova;
pub mod linear;
pub mod mixed;
pub mod mixture;
pub mod nonlinear;
pub mod prediction;
pub(crate) mod resource_budget;
pub mod terms;

pub use design_matrix::DesignMatrix;
pub use linear::{LinearFit, LinearModel, LinearModelRequest, fit_matrix, fit_model};
pub use terms::{CategoricalCoding, ModelSpec, TermSpec};
