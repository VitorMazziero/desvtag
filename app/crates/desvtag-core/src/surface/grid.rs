//! Malha de predições da superfície: dois fatores variam, os demais ficam fixos.
//!
//! A malha cobre o intervalo experimental observado de cada eixo. Um ponto é marcado como
//! **extrapolação** quando algum fator fica fora do seu intervalo observado ou quando a
//! alavancagem do ponto, `x₀ᵀ(XᵀX)⁻¹x₀`, supera a maior alavancagem dos ensaios (extrapolação
//! oculta; Montgomery, Peck e Vining). Os valores são os do preditor; nada é suavizado.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::contour::{ContourLevel, contour, nice_levels};
use super::model::{
    FactorRange, Prepared, SurfaceBlockContext, SurfaceRequest, SurfaceResult, prepare,
    prepare_design,
};
use super::terms::{Monomial, model_row};
use crate::descriptive::{Stat, UndefinedReason};
use crate::designs::coding::Levels;
use crate::domain::{FactorValue, StableId};
use crate::errors::CoreError;
use crate::models::{covariance::quadratic_form, design_matrix, linear::LinearFit};
use crate::numeric::{QrDecomposition, qr::default_rank_tolerance};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Menor e maior número de passos por eixo.
pub const MIN_STEPS: u32 = 5;
/// Maior número de passos por eixo.
pub const MAX_STEPS: u32 = 101;

/// Valor fixado de um fator (real).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FixedValue {
    /// Fator.
    pub factor_id: StableId,
    /// Valor real.
    pub value: f64,
}

/// Parte do ajuste arquivado necessária para a predição, sem diagnósticos ou resíduos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceGridFit {
    /// Identidade da resposta que produziu os coeficientes.
    pub response_id: StableId,
    /// Observações usadas na ordem da matriz de ajuste.
    pub observation_ids: Vec<StableId>,
    /// Coeficientes na ordem do ajuste, indefinidos nas colunas aliasadas.
    pub coefficients: Vec<crate::models::linear::CoefficientRow>,
    /// Posto calculado e arquivado com a análise.
    pub rank: u32,
    /// Faixas e codificação da análise.
    pub ranges: Vec<FactorRange>,
    /// Maior alavancagem entre os ensaios.
    pub max_leverage: f64,
    /// Bloco de referência arquivado.
    pub block: Option<SurfaceBlockContext>,
    /// Origem do modelo preditivo.
    pub provenance: Provenance,
}

impl From<&SurfaceResult> for SurfaceGridFit {
    fn from(result: &SurfaceResult) -> Self {
        Self::from_fit(
            &result.response_id,
            &result.fit,
            &result.ranges,
            result.max_leverage,
            result.block.as_ref().map(|block| block.context.clone()),
            result.provenance.clone(),
        )
    }
}

impl SurfaceGridFit {
    pub(crate) fn from_prepared(response_id: &StableId, prepared: &Prepared) -> Self {
        Self::from_fit(
            response_id,
            &prepared.report,
            &prepared.ranges,
            prepared.max_leverage,
            prepared.block.clone(),
            Provenance::current(super::model::METHOD_ID, super::model::METHOD_VERSION),
        )
    }

    fn from_fit(
        response_id: &StableId,
        fit: &LinearFit,
        ranges: &[FactorRange],
        max_leverage: f64,
        block: Option<SurfaceBlockContext>,
        provenance: Provenance,
    ) -> Self {
        Self {
            response_id: response_id.clone(),
            observation_ids: fit
                .observations
                .iter()
                .filter_map(|row| row.observation_id.clone())
                .collect(),
            coefficients: fit.coefficients.clone(),
            rank: fit.rank,
            ranges: ranges.to_vec(),
            max_leverage,
            block,
            provenance,
        }
    }
}

/// Solicitação da malha.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GridRequest {
    /// Solicitação original, que fornece condições e codificação da matriz de desenho.
    pub surface: SurfaceRequest,
    /// Ajuste já arquivado. Chamadores antigos podem solicitar a preparação completa.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub fitted: Option<SurfaceGridFit>,
    /// Fator do eixo horizontal.
    pub x_factor: StableId,
    /// Fator do eixo vertical.
    pub y_factor: StableId,
    /// Valores dos demais fatores (ausentes = centro dos níveis).
    pub fixed: Vec<FixedValue>,
    /// Passos no eixo horizontal (5 a 101).
    pub steps_x: u32,
    /// Passos no eixo vertical (5 a 101).
    pub steps_y: u32,
    /// Quantidade aproximada de curvas de nível.
    pub contour_levels: u32,
}

/// Condição fixada, ecoada no resultado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FixedEcho {
    /// Fator.
    pub factor_id: StableId,
    /// Nome.
    pub name: String,
    /// Valor real usado.
    pub value: f64,
    /// Valor codificado.
    pub coded: f64,
}

/// Malha de predições.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceGrid {
    /// Fixed additive block used for these predictions, when declared.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<super::model::SurfaceBlockContext>,
    /// Fator do eixo horizontal.
    pub x_factor: StableId,
    /// Nome do fator horizontal.
    pub x_name: String,
    /// Fator do eixo vertical.
    pub y_factor: StableId,
    /// Nome do fator vertical.
    pub y_name: String,
    /// Valores reais do eixo horizontal.
    pub x: Vec<f64>,
    /// Valores reais do eixo vertical.
    pub y: Vec<f64>,
    /// Predições `z[iy][ix]`.
    pub z: Vec<Vec<Stat>>,
    /// Extrapolação `[iy][ix]`.
    pub extrapolated: Vec<Vec<bool>>,
    /// Menor predição definida.
    pub z_min: Option<f64>,
    /// Maior predição definida.
    pub z_max: Option<f64>,
    /// Condições fixadas dos demais fatores.
    pub fixed: Vec<FixedEcho>,
    /// Curvas de nível.
    pub contours: Vec<ContourLevel>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

pub(crate) struct PredictionGeometry {
    monomials: Vec<Monomial>,
    pub(crate) ranges: Vec<FactorRange>,
    pub(crate) block: Option<SurfaceBlockContext>,
    pub(crate) qr: QrDecomposition,
    pub(crate) coefficients: Vec<Option<f64>>,
    pub(crate) max_leverage: f64,
    provenance: Provenance,
}

impl PredictionGeometry {
    fn new(surface: &SurfaceRequest, fitted: Option<&SurfaceGridFit>) -> Result<Self, CoreError> {
        let Some(fit) = fitted else {
            let p = prepare(surface)?;
            let (qr, coefficients) = p.model.into_prediction_parts();
            return Ok(Self {
                monomials: p.monomials,
                ranges: p.ranges,
                block: p.block,
                qr,
                coefficients,
                max_leverage: p.max_leverage,
                provenance: Provenance::current(
                    super::model::METHOD_ID,
                    super::model::METHOD_VERSION,
                ),
            });
        };
        Self::from_archive(surface, fit)
    }

    pub(crate) fn from_archive(
        surface: &SurfaceRequest,
        fit: &SurfaceGridFit,
    ) -> Result<Self, CoreError> {
        let archived_error = || CoreError::InvalidInput(vec![error("surface.grid_fit_mismatch")]);
        if fit.response_id != surface.response_id
            || fit.ranges.len() != surface.factors.len()
            || !fit.max_leverage.is_finite()
            || fit.max_leverage <= 0.0
            || fit.provenance.method_id != super::model::METHOD_ID
            || !(1..=super::model::METHOD_VERSION).contains(&fit.provenance.method_version)
            || fit
                .ranges
                .iter()
                .zip(&surface.factors)
                .any(|(range, factor)| {
                    let levels = Levels {
                        low: factor.low,
                        high: factor.high,
                    };
                    let original =
                        range.center == levels.center() && range.half_range == levels.half_range();
                    let restored = factor.low == range.center - range.half_range
                        && factor.high == range.center + range.half_range;
                    range.id != factor.id
                        || !range.center.is_finite()
                        || !range.half_range.is_finite()
                        || range.half_range <= 0.0
                        || !(original || restored)
                        || !range.min.is_finite()
                        || !range.max.is_finite()
                        || range.max < range.min
                })
        {
            return Err(archived_error());
        }
        let design = prepare_design(surface, Some(&fit.ranges))?;
        if fit.block != design.block {
            return Err(archived_error());
        }
        let matrix =
            design_matrix::build(&design.coded, &design.spec).map_err(CoreError::InvalidInput)?;
        let (n, p) = (matrix.x.rows(), matrix.x.cols());
        if matrix.observation_ids != fit.observation_ids
            || (0..n).any(|i| (0..p).any(|j| !matrix.x[(i, j)].is_finite()))
            || fit.coefficients.len() != p
            || fit
                .coefficients
                .iter()
                .zip(&matrix.labels)
                .any(|(c, name)| &c.label != name)
        {
            return Err(archived_error());
        }

        let used: HashSet<_> = matrix.observation_ids.iter().collect();
        let valid_ranges = fit
            .ranges
            .iter()
            .zip(&design.factor_indexes)
            .all(|(range, &index)| {
                let values = surface.dataset.observations.iter().filter_map(|row| {
                    match &row.factors[index] {
                        Some(FactorValue::Number(value)) if used.contains(&row.id) => Some(*value),
                        _ => None,
                    }
                });
                range.min == values.clone().fold(f64::INFINITY, f64::min)
                    && range.max == values.fold(f64::NEG_INFINITY, f64::max)
            });
        if !valid_ranges {
            return Err(archived_error());
        }

        // QR descreve só a geometria do desenho. Nenhum produto com y ou ajuste é executado.
        let qr = QrDecomposition::new(&matrix.x, default_rank_tolerance(n, p));
        if qr.rank == 0 || qr.rank != fit.rank as usize {
            return Err(archived_error());
        }
        let coefficients: Vec<_> = fit
            .coefficients
            .iter()
            .map(|c| c.estimate.value())
            .collect();
        if qr.perm.iter().enumerate().any(|(i, &j)| {
            coefficients[j].is_some_and(|value| !value.is_finite())
                || coefficients[j].is_some() != (i < qr.rank)
        }) {
            return Err(archived_error());
        }
        Ok(Self {
            monomials: design.monomials,
            ranges: fit.ranges.clone(),
            block: fit.block.clone(),
            qr,
            coefficients,
            max_leverage: fit.max_leverage,
            provenance: fit.provenance.clone(),
        })
    }

    pub(crate) fn prediction_row(&self, coded: &[f64]) -> Vec<f64> {
        let mut row = model_row(&self.monomials, coded);
        row.resize(self.coefficients.len(), 0.0);
        row
    }
}

/// Calcula a malha.
///
/// # Errors
/// [`CoreError::InvalidInput`] para eixos inválidos (iguais ou desconhecidos), passos fora de
/// 5–101, valores fixados inválidos ou falhas da análise.
pub fn compute_grid(request: &GridRequest) -> Result<SurfaceGrid, CoreError> {
    let factors = &request.surface.factors;
    let position = |id: &StableId| factors.iter().position(|f| &f.id == id);
    let (xi, yi) = (position(&request.x_factor), position(&request.y_factor));
    let mut issues = Vec::new();
    if xi.is_none() || yi.is_none() || xi == yi {
        issues.push(error("surface.invalid_axes"));
    }
    for steps in [request.steps_x, request.steps_y] {
        if !(MIN_STEPS..=MAX_STEPS).contains(&steps) {
            issues.push(
                error("surface.invalid_steps")
                    .with_param("min", &MIN_STEPS)
                    .with_param("max", &MAX_STEPS),
            );
        }
    }
    for fv in &request.fixed {
        if position(&fv.factor_id).is_none() || !fv.value.is_finite() {
            issues.push(error("surface.invalid_fixed_value").with_param("id", &fv.factor_id));
        }
    }
    let (Some(xi), Some(yi)) = (xi, yi) else {
        return Err(CoreError::InvalidInput(issues));
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let p = PredictionGeometry::new(&request.surface, request.fitted.as_ref())?;
    let k = factors.len();

    // Valores reais fixados (centro dos níveis por padrão).
    let mut base_real: Vec<f64> = p.ranges.iter().map(|range| range.center).collect();
    for fv in &request.fixed {
        if let Some(j) = position(&fv.factor_id) {
            base_real[j] = fv.value;
        }
    }
    let axis = |j: usize, steps: u32| -> Vec<f64> {
        let r = &p.ranges[j];
        let (lo, hi) = if r.min.is_finite() && r.max.is_finite() && r.max > r.min {
            (r.min, r.max)
        } else {
            (r.center - r.half_range, r.center + r.half_range)
        };
        (0..steps)
            .map(|i| lo + (hi - lo) * f64::from(i) / f64::from(steps - 1))
            .collect()
    };
    let x = axis(xi, request.steps_x);
    let y = axis(yi, request.steps_y);
    let tolerance = |j: usize| 1e-9 * p.ranges[j].half_range.abs().max(1.0);
    let outside =
        |j: usize, v: f64| v < p.ranges[j].min - tolerance(j) || v > p.ranges[j].max + tolerance(j);
    let mut z = Vec::with_capacity(y.len());
    let mut extrapolated = Vec::with_capacity(y.len());
    for &yv in &y {
        let mut z_row = Vec::with_capacity(x.len());
        let mut e_row = Vec::with_capacity(x.len());
        for &xv in &x {
            let mut real = base_real.clone();
            real[xi] = xv;
            real[yi] = yv;
            let coded: Vec<f64> = p
                .ranges
                .iter()
                .zip(&real)
                .map(|(range, &v)| range.encode(v))
                .collect();
            let row = p.prediction_row(&coded);
            let fitted: f64 = row
                .iter()
                .zip(&p.coefficients)
                .map(|(r, b)| b.map_or(0.0, |b| r * b))
                .sum();
            match quadratic_form(&p.qr, &row) {
                Some(q) => {
                    z_row.push(Stat::finite(fitted));
                    e_row.push(
                        (0..k).any(|j| outside(j, real[j]))
                            || q > p.max_leverage * (1.0 + 1e-9) + 1e-12,
                    );
                }
                None => {
                    z_row.push(Stat::undefined(UndefinedReason::NotEstimable));
                    e_row.push(true);
                }
            }
        }
        z.push(z_row);
        extrapolated.push(e_row);
    }
    let values: Vec<f64> = z.iter().flatten().filter_map(|s| s.value()).collect();
    let z_min = values.iter().copied().reduce(f64::min);
    let z_max = values.iter().copied().reduce(f64::max);
    let option_grid: Vec<Vec<Option<f64>>> = z
        .iter()
        .map(|row| row.iter().map(|s| s.value()).collect())
        .collect();
    let contours = match (z_min, z_max) {
        (Some(lo), Some(hi)) => nice_levels(lo, hi, request.contour_levels as usize)
            .into_iter()
            .map(|level| ContourLevel {
                level,
                segments: contour(&x, &y, &option_grid, level),
            })
            .collect(),
        _ => Vec::new(),
    };
    let fixed = (0..k)
        .filter(|j| *j != xi && *j != yi)
        .map(|j| FixedEcho {
            factor_id: factors[j].id.clone(),
            name: factors[j].name.clone(),
            value: base_real[j],
            coded: p.ranges[j].encode(base_real[j]),
        })
        .collect();
    if extrapolated.iter().flatten().any(|e| *e) {
        issues.push(Issue::new("surface.grid_extrapolation", Severity::Warning));
    }
    Ok(SurfaceGrid {
        block: p.block.clone(),
        x_factor: request.x_factor.clone(),
        x_name: factors[xi].name.clone(),
        y_factor: request.y_factor.clone(),
        y_name: factors[yi].name.clone(),
        x,
        y,
        z,
        extrapolated,
        z_min,
        z_max,
        fixed,
        contours,
        issues,
        provenance: p.provenance,
    })
}
