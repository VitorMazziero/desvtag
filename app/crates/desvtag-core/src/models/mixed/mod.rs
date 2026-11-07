//! Modelos de medidas repetidas: percurso legado e extensão científica v2.
//! V1: intercepto aleatório/CS. V2: CS, AR(1) + intercepto aleatório e UN marginal,
//! REML, inferência Satterthwaite/Fai–Cornelius, EMM e perfis. Sem cálculos na interface.
//! Especificação: docs/metodos/modelos-mistos.md; DT-0031 e DT-0032.

mod random_intercept;
mod types;

/// Ajusta o percurso v1 ou a configuração avançada explicitamente pedida.
/// # Errors
/// Solicitação inválida, estrutura não identificável ou REML sem convergência.
pub fn fit(request: &MixedModelRequest) -> Result<MixedModelResult, crate::errors::CoreError> {
    match &request.advanced {
        Some(spec) => advanced::fit(request, spec),
        None => random_intercept::fit(request),
    }
}
pub use types::{MixedCoefficient, MixedModelRequest, MixedModelResult, RandomEffect};

/// Identificador estável do método.
pub const METHOD_ID: &str = "linear_mixed_model";
/// Versão científica mais recente disponível no registro.
pub const METHOD_VERSION: u32 = 2;
/// Versão preservada para solicitações sem extensão avançada.
pub const LEGACY_METHOD_VERSION: u32 = 1;

/// Operational row envelope of the v2 estimator in v0.4.
pub const MAX_OBSERVATIONS: usize = 4096;
/// Maximum materialized fixed-effect columns in v2.
pub const MAX_FIXED_COLUMNS: usize = 64;
/// Maximum materialized fixed-effect cells, before copies/factorization.
pub const MAX_FIXED_CELLS: usize = 262_144;
/// Highest UN occasion dimension qualified for v0.4.
pub const MAX_UN_OCCASIONS: usize = 12;
/// Deterministic algebra-work proxy, not FLOPs or wall-clock seconds.
pub const MAX_ALGEBRA_WORK: u64 = 3_000_000_000;

mod covariance;
mod linalg;

mod estimation;
mod optimizer;

#[cfg(test)]
mod reference_tests;

#[cfg(test)]
mod resource_tests;

mod inference;

mod advanced_types;
pub use advanced_types::*;

mod prepare;

mod estimates;
mod marginal;
mod profiles;

mod advanced;
