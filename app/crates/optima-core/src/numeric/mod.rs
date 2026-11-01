//! C03 — fundamentos numéricos.
//!
//! Soma compensada, matriz, QR com pivoteamento (posto), valores singulares (condicionamento),
//! funções especiais e busca de raízes. Integração numérica entra com a distribuição da
//! amplitude studentizada (ET05); decomposição de Cholesky, quando um método a consumir.

pub mod matrix;
pub mod qr;
pub mod root_finding;
pub mod special_functions;
pub mod summation;
pub mod svd;

pub use matrix::Matrix;
pub use qr::QrDecomposition;
pub use summation::CompensatedSum;
