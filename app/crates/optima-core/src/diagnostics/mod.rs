//! C08 — diagnósticos de resíduos e influência.
//!
//! - [`residuals`]: resíduos padronizados e studentizados;
//! - [`influence`]: alavancagem (`hᵢᵢ`) e distância de Cook.
//!
//! Os testes formais de normalidade e homogeneidade entram com a ANOVA (ET05).

pub mod influence;
pub mod residuals;
