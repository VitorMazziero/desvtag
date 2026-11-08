//! C16/C12 — superfície de resposta de segunda ordem (ET07).
//!
//! - [`terms`]: termos do modelo (principais, interações de dois fatores e quadráticos), modelo
//!   completo padrão, hierarquia e linha do modelo;
//! - [`model`]: ajuste na escala codificada, ANOVA, falta de ajuste, região experimental e fatos;
//! - [`equation`]: equação em unidades codificadas e reais (reais por substituição exata);
//! - [`grid`]: malha de predições para a superfície, com região e extrapolação;
//! - [`contour`]: curvas de nível por *marching squares* sobre a malha.
//!
//! Especificação em `docs/metodos/superficie-resposta.md` e `planejamento-personalizado.md`.

pub mod contour;
pub mod equation;
pub mod grid;
pub mod model;
pub mod selection;
pub mod terms;

pub use grid::{GridRequest, SurfaceGrid, SurfaceGridFit, compute_grid};
pub use model::{SurfaceRequest, SurfaceResult, analyze};
