//! C08 — diagnósticos de resíduos e influência.
//!
//! - [`assumptions`]: homogeneidade das variâncias (Brown–Forsythe);
//! - [`residuals`]: resíduos padronizados e studentizados;
//! - [`influence`]: alavancagem (`hᵢᵢ`) e distância de Cook.
//!
//! Os testes formais de normalidade e homogeneidade entram com a ANOVA (ET05).

pub mod assumptions;
pub mod influence;
pub mod residuals;
