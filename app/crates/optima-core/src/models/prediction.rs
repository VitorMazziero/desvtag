//! Predição com intervalos para novas linhas da matriz do modelo.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::covariance::quadratic_form;
use super::linear::LinearModel;
use crate::descriptive::{Stat, UndefinedReason};
use crate::inference::intervals::{symmetric_interval, t_critical};

/// Predição para uma linha.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Prediction {
    /// Valor ajustado `x₀ᵀβ̂`.
    pub fitted: Stat,
    /// Erro-padrão da média prevista, `σ̂·√(x₀ᵀ(XᵀX)⁻¹x₀)`.
    pub mean_std_error: Stat,
    /// Limite inferior do intervalo de confiança da média.
    pub mean_lower: Stat,
    /// Limite superior do intervalo de confiança da média.
    pub mean_upper: Stat,
    /// Limite inferior do intervalo de predição de uma nova observação.
    pub prediction_lower: Stat,
    /// Limite superior do intervalo de predição de uma nova observação.
    pub prediction_upper: Stat,
}

fn all_undefined(reason: UndefinedReason) -> Prediction {
    let u = Stat::undefined(reason);
    Prediction {
        fitted: u,
        mean_std_error: u,
        mean_lower: u,
        mean_upper: u,
        prediction_lower: u,
        prediction_upper: u,
    }
}

/// Prediz uma linha de colunas do modelo (mesma ordem e codificação da matriz do ajuste).
#[must_use]
pub fn predict_row(model: &LinearModel, row: &[f64], confidence_level: f64) -> Prediction {
    let Some(q) = quadratic_form(model.factorization(), row) else {
        return all_undefined(UndefinedReason::NotEstimable);
    };
    let fitted: f64 = row
        .iter()
        .zip(model.coefficients())
        .map(|(x, b)| b.map_or(0.0, |b| x * b))
        .sum();
    let fitted_stat = Stat::finite(fitted);
    let Some(sigma) = model.sigma() else {
        return Prediction {
            fitted: fitted_stat,
            ..all_undefined(UndefinedReason::NoResidualDegreesOfFreedom)
        };
    };
    let Some(critical) = t_critical(confidence_level, model.df_residual() as f64) else {
        return Prediction {
            fitted: fitted_stat,
            ..all_undefined(UndefinedReason::NonFiniteResult)
        };
    };
    let mean_se = sigma * q.sqrt();
    let new_se = sigma * (1.0 + q).sqrt();
    let (mean_lower, mean_upper) = symmetric_interval(fitted, critical, mean_se);
    let (prediction_lower, prediction_upper) = symmetric_interval(fitted, critical, new_se);
    Prediction {
        fitted: fitted_stat,
        mean_std_error: Stat::finite(mean_se),
        mean_lower: Stat::finite(mean_lower),
        mean_upper: Stat::finite(mean_upper),
        prediction_lower: Stat::finite(prediction_lower),
        prediction_upper: Stat::finite(prediction_upper),
    }
}

/// Prediz várias linhas.
#[must_use]
pub fn predict_rows(
    model: &LinearModel,
    rows: &[Vec<f64>],
    confidence_level: f64,
) -> Vec<Prediction> {
    rows.iter()
        .map(|r| predict_row(model, r, confidence_level))
        .collect()
}
