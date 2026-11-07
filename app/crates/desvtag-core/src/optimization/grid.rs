//! Desejabilidade global sobre dois fatores (gráfico), com os demais fixados.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::constraints::{OptimizationPredictor, Problem, response_scale};
use super::objective::OptimizationRequest;
use crate::descriptive::Stat;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::surface::contour::{ContourLevel, contour};
use crate::surface::grid::{
    FixedEcho, FixedValue, MAX_STEPS, MIN_STEPS, PredictionGeometry, SurfaceGrid, SurfaceGridFit,
};
use crate::validation::{Issue, Severity};

/// Pedido da malha de desejabilidade.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimizationGridRequest {
    /// Modelos e objetivos.
    pub optimization: OptimizationRequest,
    /// Ajustes arquivados, na ordem dos objetivos.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub fitted: Option<Vec<SurfaceGridFit>>,
    /// Fator do eixo horizontal.
    pub x_factor: StableId,
    /// Fator do eixo vertical.
    pub y_factor: StableId,
    /// Valores reais dos demais fatores (ausentes = centro dos níveis).
    pub fixed: Vec<FixedValue>,
    /// Passos por eixo (5 a 101).
    pub steps: u32,
}

/// Calcula a desejabilidade global em cada nó. O resultado usa a estrutura da malha de superfície,
/// com `z` = desejabilidade global (0 a 1) e `extrapolated` conforme a região experimental.
///
/// # Errors
/// [`CoreError::InvalidInput`] para eixos, passos ou valores fixados inválidos.
pub fn desirability_grid(request: &OptimizationGridRequest) -> Result<SurfaceGrid, CoreError> {
    let Some(fitted) = &request.fitted else {
        return grid(request, &Problem::build(&request.optimization)?);
    };
    let mismatch = || {
        CoreError::InvalidInput(vec![Issue::new(
            "optimization.grid_fit_mismatch",
            Severity::Error,
        )])
    };
    if fitted.len() != request.optimization.setup.responses.len() {
        return Err(mismatch());
    }
    let problem = Problem::build_with(&request.optimization, |i, surface| {
        let fit = fitted.get(i).ok_or_else(mismatch)?;
        let geometry = PredictionGeometry::from_archive(surface, fit)?;
        let used: HashSet<_> = fit.observation_ids.iter().collect();
        let response = surface
            .dataset
            .response_index(&surface.response_id)
            .ok_or_else(mismatch)?;
        let observed: Vec<f64> = surface
            .dataset
            .observations
            .iter()
            .filter(|row| used.contains(&row.id))
            .filter_map(|row| row.responses.get(response).copied().flatten())
            .collect();
        // O ajuste arquivado só vale para as observações que o produziram.
        if observed.len() != used.len() {
            return Err(mismatch());
        }
        Ok((geometry, response_scale(observed.into_iter())))
    })?;
    grid(request, &problem)
}

fn grid<M: OptimizationPredictor>(
    request: &OptimizationGridRequest,
    problem: &Problem<M>,
) -> Result<SurfaceGrid, CoreError> {
    let ids = &problem.factor_ids;
    let (xi, yi) = (
        ids.iter().position(|f| f == &request.x_factor),
        ids.iter().position(|f| f == &request.y_factor),
    );
    let mut issues = Vec::new();
    if xi.is_none() || yi.is_none() || xi == yi {
        issues.push(Issue::new("surface.invalid_axes", Severity::Error));
    }
    if !(MIN_STEPS..=MAX_STEPS).contains(&request.steps) {
        issues.push(
            Issue::new("surface.invalid_steps", Severity::Error)
                .with_param("min", &MIN_STEPS)
                .with_param("max", &MAX_STEPS),
        );
    }
    for fv in &request.fixed {
        if !ids.contains(&fv.factor_id) || !fv.value.is_finite() {
            issues.push(
                Issue::new("surface.invalid_fixed_value", Severity::Error)
                    .with_param("id", &fv.factor_id),
            );
        }
    }
    let (Some(xi), Some(yi)) = (xi, yi) else {
        return Err(CoreError::InvalidInput(issues));
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let k = ids.len();
    let mut base: Vec<f64> = problem
        .levels
        .iter()
        .map(crate::designs::coding::Levels::center)
        .collect();
    for fv in &request.fixed {
        if let Some(j) = ids.iter().position(|f| f == &fv.factor_id) {
            base[j] = fv.value;
        }
    }
    let axis = |j: usize| -> Vec<f64> {
        let (a, b) = (
            problem.levels[j].decode(problem.lo[j]),
            problem.levels[j].decode(problem.hi[j]),
        );
        (0..request.steps)
            .map(|i| a + (b - a) * f64::from(i) / f64::from(request.steps - 1))
            .collect()
    };
    let (x, y) = (axis(xi), axis(yi));
    let mut z = Vec::with_capacity(y.len());
    let mut extrapolated = Vec::with_capacity(y.len());
    for &yv in &y {
        let mut z_row = Vec::with_capacity(x.len());
        let mut e_row = Vec::with_capacity(x.len());
        for &xv in &x {
            let mut real = base.clone();
            real[xi] = xv;
            real[yi] = yv;
            let coded: Vec<f64> = (0..k).map(|j| problem.levels[j].encode(real[j])).collect();
            let e = problem.evaluate(&coded, None);
            // Pontos que violam limites obrigatórios têm desejabilidade zero no gráfico.
            z_row.push(Stat::finite(if e.violation > 0.0 { 0.0 } else { e.global }));
            e_row.push(e.extrapolated);
        }
        z.push(z_row);
        extrapolated.push(e_row);
    }
    let values: Vec<Option<f64>> = z.iter().flatten().map(Stat::value).collect();
    let z_min = values.iter().flatten().copied().reduce(f64::min);
    let z_max = values.iter().flatten().copied().reduce(f64::max);
    let option_grid: Vec<Vec<Option<f64>>> = z
        .iter()
        .map(|row| row.iter().map(|s| s.value()).collect())
        .collect();
    let contours = match (z_min, z_max) {
        (Some(lo), Some(hi)) if hi > lo => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
            .into_iter()
            .filter(|l| *l > lo && *l < hi)
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
            factor_id: ids[j].clone(),
            name: problem.factor_names[j].clone(),
            value: base[j],
            coded: problem.levels[j].encode(base[j]),
        })
        .collect();
    Ok(SurfaceGrid {
        block: problem
            .models
            .first()
            .and_then(|model| model.prepared.block().cloned()),
        x_factor: request.x_factor.clone(),
        x_name: problem.factor_names[xi].clone(),
        y_factor: request.y_factor.clone(),
        y_name: problem.factor_names[yi].clone(),
        x,
        y,
        z,
        extrapolated,
        z_min,
        z_max,
        fixed,
        contours,
        issues: Vec::new(),
        provenance: Provenance::current(
            super::optimize::METHOD_ID,
            super::optimize::METHOD_VERSION,
        ),
    })
}
