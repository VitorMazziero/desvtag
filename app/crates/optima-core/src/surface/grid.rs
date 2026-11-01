//! Malha de predições da superfície: dois fatores variam, os demais ficam fixos.
//!
//! A malha cobre o intervalo experimental observado de cada eixo. Um ponto é marcado como
//! **extrapolação** quando algum fator fica fora do seu intervalo observado ou quando a
//! alavancagem do ponto, `x₀ᵀ(XᵀX)⁻¹x₀`, supera a maior alavancagem dos ensaios (extrapolação
//! oculta; Montgomery, Peck e Vining). Os valores são os do preditor; nada é suavizado.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::contour::{ContourLevel, contour, nice_levels};
use super::model::{SurfaceRequest, prepare};
use super::terms::model_row;
use crate::descriptive::{Stat, UndefinedReason};
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::models::covariance::quadratic_form;
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

/// Solicitação da malha.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GridRequest {
    /// A mesma solicitação da análise (o modelo é reajustado).
    pub surface: SurfaceRequest,
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
    let p = prepare(&request.surface)?;
    let k = factors.len();

    // Valores reais fixados (centro dos níveis por padrão).
    let mut base_real: Vec<f64> = p
        .levels
        .iter()
        .map(crate::designs::coding::Levels::center)
        .collect();
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
            let coded: Vec<f64> = (0..k).map(|j| p.levels[j].encode(real[j])).collect();
            let row = model_row(&p.monomials, &coded);
            let fitted: f64 = row
                .iter()
                .zip(p.model.coefficients())
                .map(|(r, b)| b.map_or(0.0, |b| r * b))
                .sum();
            match quadratic_form(p.model.factorization(), &row) {
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
            coded: p.levels[j].encode(base_real[j]),
        })
        .collect();
    if extrapolated.iter().flatten().any(|e| *e) {
        issues.push(Issue::new("surface.grid_extrapolation", Severity::Warning));
    }
    Ok(SurfaceGrid {
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
        provenance: Provenance::current(super::model::METHOD_ID, super::model::METHOD_VERSION),
    })
}
