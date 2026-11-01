//! Avaliação de condições dadas: previsões com incerteza e desejabilidade (proposta de confirmação).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::candidates::{OptimumCandidate, describe};
use super::constraints::Problem;
use super::objective::OptimizationRequest;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Pedido de avaliação: os mesmos modelos e objetivos, em condições reais dadas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EvaluateRequest {
    /// Modelos e objetivos.
    pub optimization: OptimizationRequest,
    /// Condições reais (um vetor por ponto, na ordem dos fatores).
    pub points: Vec<Vec<f64>>,
}

/// Previsões nos pontos pedidos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Evaluation {
    /// Um candidato por ponto (com `rank` = posição no pedido e `starts` = 0).
    pub points: Vec<OptimumCandidate>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Avalia os pontos.
///
/// # Errors
/// [`CoreError::InvalidInput`] para pedidos inválidos ou pontos com número de fatores incorreto.
pub fn evaluate_points(request: &EvaluateRequest) -> Result<Evaluation, CoreError> {
    let problem = Problem::build(&request.optimization)?;
    let k = problem.levels.len();
    if request.points.is_empty()
        || request.points.len() > 200
        || request
            .points
            .iter()
            .any(|p| p.len() != k || p.iter().any(|v| !v.is_finite()))
    {
        return Err(CoreError::InvalidInput(vec![Issue::new(
            "optimization.invalid_points",
            Severity::Error,
        )]));
    }
    let alpha = request.optimization.setup.alpha;
    let points = request
        .points
        .iter()
        .enumerate()
        .map(|(i, real)| {
            let coded: Vec<f64> = real
                .iter()
                .zip(&problem.levels)
                .map(|(v, l)| l.encode(*v))
                .collect();
            describe(
                &problem,
                &coded,
                u32::try_from(i + 1).unwrap_or(u32::MAX),
                0,
                alpha,
                &[],
            )
        })
        .collect();
    Ok(Evaluation {
        points,
        provenance: Provenance::current(
            super::optimize::METHOD_ID,
            super::optimize::METHOD_VERSION,
        ),
    })
}
