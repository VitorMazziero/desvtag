//! Problema de otimização: modelos ajustados, domínio de busca e violações de restrições.
//!
//! O domínio padrão é a **região experimental**: intervalos observados dos fatores e, além disso,
//! alavancagem de predição `x₀ᵀ(XᵀX)⁻¹x₀` não superior à maior alavancagem dos ensaios de cada modelo
//! (sem extrapolação oculta). Uma extensão só ocorre por limites informados (`DomainSpec::Extended`)
//! e os candidatos fora da região experimental são marcados.

use super::desirability::{global, individual};
use super::objective::{DomainSpec, Goal, OptimizationRequest};
use crate::designs::coding::Levels;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::models::covariance::quadratic_form;
use crate::surface::model::{Prepared, SurfaceRequest, prepare};
use crate::surface::terms::model_row;
use crate::validation::{Issue, Severity};

/// Violação máxima tolerada (em unidades da amplitude observada da resposta) para considerar um
/// ponto viável.
pub const FEASIBILITY_TOLERANCE: f64 = 1e-9;
/// Tolerância relativa da alavancagem no teste de extrapolação oculta.
const LEVERAGE_TOLERANCE: f64 = 1e-9;

/// Uma resposta com seu modelo ajustado.
pub(crate) struct ResponseModel {
    pub id: StableId,
    pub name: String,
    pub goal: Goal,
    pub importance: f64,
    pub prepared: Prepared,
    pub min: Option<f64>,
    pub max: Option<f64>,
    /// Amplitude observada da resposta (escala das violações).
    pub scale: f64,
}

/// Avaliação de um ponto codificado.
#[derive(Debug, Clone)]
pub(crate) struct Eval {
    pub individual: Vec<f64>,
    pub global: f64,
    pub violation: f64,
    pub extrapolated: bool,
    pub leverage_ratio: f64,
}

/// Modelos, domínio e níveis de um pedido.
pub(crate) struct Problem {
    pub models: Vec<ResponseModel>,
    pub levels: Vec<Levels>,
    pub factor_ids: Vec<StableId>,
    pub factor_names: Vec<String>,
    /// Limites codificados da busca.
    pub lo: Vec<f64>,
    pub hi: Vec<f64>,
    /// Região experimental codificada (união dos intervalos observados).
    pub region_lo: Vec<f64>,
    pub region_hi: Vec<f64>,
    /// Aplica a restrição de extrapolação oculta (domínio padrão).
    pub leverage_constraint: bool,
    pub extended: bool,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

impl Problem {
    /// Ajusta os modelos e monta o domínio.
    ///
    /// # Errors
    /// [`CoreError::InvalidInput`] para objetivos, limites, domínio ou modelos inválidos.
    pub(crate) fn build(request: &OptimizationRequest) -> Result<Self, CoreError> {
        let setup = &request.setup;
        let mut issues = Vec::new();
        if setup.responses.is_empty() {
            issues.push(error("optimization.no_responses"));
        }
        if !(setup.alpha > 0.0 && setup.alpha < 1.0) {
            issues.push(error("optimization.invalid_alpha"));
        }
        if let Err(issue) = setup.search.validate() {
            issues.push(issue);
        }
        for (i, g) in setup.responses.iter().enumerate() {
            if let Err(issue) = g.goal.validate() {
                issues.push(issue.with_param("response", &(i + 1)));
            }
            if !(g.importance.is_finite()
                && g.importance > 0.0
                && g.importance <= super::objective::MAX_IMPORTANCE)
            {
                issues.push(
                    error("optimization.invalid_importance").with_param("response", &(i + 1)),
                );
            }
            if setup
                .responses
                .iter()
                .take(i)
                .any(|o| o.response_id == g.response_id)
            {
                issues.push(
                    error("optimization.duplicate_response").with_param("response", &(i + 1)),
                );
            }
        }
        for limit in &setup.limits {
            let known = setup
                .responses
                .iter()
                .any(|g| g.response_id == limit.response_id);
            let finite =
                limit.min.is_none_or(f64::is_finite) && limit.max.is_none_or(f64::is_finite);
            let ordered = match (limit.min, limit.max) {
                (Some(a), Some(b)) => a <= b,
                _ => true,
            };
            if !known || !finite || !ordered {
                issues
                    .push(error("optimization.invalid_limit").with_param("id", &limit.response_id));
            }
        }
        if issues.iter().any(Issue::is_blocking) {
            return Err(CoreError::InvalidInput(issues));
        }

        let factor_ids: Vec<StableId> = request.factors.iter().map(|f| f.id.clone()).collect();
        let levels: Vec<Levels> = request
            .factors
            .iter()
            .map(|f| Levels {
                low: f.low,
                high: f.high,
            })
            .collect();
        let mut models = Vec::with_capacity(setup.responses.len());
        for g in &setup.responses {
            let prepared = prepare(&SurfaceRequest {
                dataset: request.dataset.clone(),
                response_id: g.response_id.clone(),
                factors: request.factors.clone(),
                terms: g.terms.clone(),
                alpha: setup.alpha,
            })?;
            if prepared.model.coefficients().iter().any(Option::is_none) {
                return Err(CoreError::InvalidInput(vec![
                    error("optimization.model_not_estimable").with_param("id", &g.response_id),
                ]));
            }
            let observed: Vec<f64> = prepared
                .report
                .observations
                .iter()
                .map(|o| o.observed)
                .collect();
            let span = observed.iter().copied().fold(f64::NEG_INFINITY, f64::max)
                - observed.iter().copied().fold(f64::INFINITY, f64::min);
            let limit = setup.limits.iter().find(|l| l.response_id == g.response_id);
            models.push(ResponseModel {
                id: g.response_id.clone(),
                name: request
                    .dataset
                    .responses
                    .iter()
                    .find(|r| r.id == g.response_id)
                    .map_or_else(|| g.response_id.to_string(), |r| r.name.clone()),
                goal: g.goal,
                importance: g.importance,
                prepared,
                min: limit.and_then(|l| l.min),
                max: limit.and_then(|l| l.max),
                scale: if span.is_finite() && span > 0.0 {
                    span
                } else {
                    1.0
                },
            });
        }

        // Região experimental: união dos intervalos observados, em unidades codificadas.
        let k = factor_ids.len();
        let mut region_lo = vec![f64::INFINITY; k];
        let mut region_hi = vec![f64::NEG_INFINITY; k];
        for m in &models {
            for (j, r) in m.prepared.ranges.iter().enumerate() {
                region_lo[j] = region_lo[j].min(levels[j].encode(r.min));
                region_hi[j] = region_hi[j].max(levels[j].encode(r.max));
            }
        }
        if region_lo.iter().chain(&region_hi).any(|v| !v.is_finite()) {
            return Err(CoreError::InvalidInput(vec![error(
                "optimization.no_region",
            )]));
        }
        let (mut lo, mut hi) = (region_lo.clone(), region_hi.clone());
        let mut extended = false;
        if let DomainSpec::Extended { bounds } = &setup.domain {
            extended = true;
            for b in bounds {
                let Some(j) = factor_ids.iter().position(|f| f == &b.factor_id) else {
                    issues
                        .push(error("optimization.invalid_bounds").with_param("id", &b.factor_id));
                    continue;
                };
                if !(b.min.is_finite() && b.max.is_finite() && b.min < b.max) {
                    issues
                        .push(error("optimization.invalid_bounds").with_param("id", &b.factor_id));
                    continue;
                }
                lo[j] = levels[j].encode(b.min);
                hi[j] = levels[j].encode(b.max);
            }
            if issues.iter().any(Issue::is_blocking) {
                return Err(CoreError::InvalidInput(issues));
            }
        }
        Ok(Self {
            models,
            levels,
            factor_ids,
            factor_names: request.factors.iter().map(|f| f.name.clone()).collect(),
            lo,
            hi,
            region_lo,
            region_hi,
            leverage_constraint: !extended,
            extended,
        })
    }

    /// Avalia um ponto codificado. `only` restringe a desejabilidade a uma resposta (compromissos).
    pub(crate) fn evaluate(&self, x: &[f64], only: Option<usize>) -> Eval {
        let mut individuals = Vec::with_capacity(self.models.len());
        let mut violation = 0.0;
        let mut ratio = 0.0_f64;
        for m in &self.models {
            let row = model_row(&m.prepared.monomials, x);
            let y: f64 = row
                .iter()
                .zip(m.prepared.model.coefficients())
                .map(|(r, b)| r * b.unwrap_or(0.0))
                .sum();
            if let Some(min) = m.min {
                violation += ((min - y) / m.scale).max(0.0);
            }
            if let Some(max) = m.max {
                violation += ((y - max) / m.scale).max(0.0);
            }
            let q = quadratic_form(m.prepared.model.factorization(), &row).unwrap_or(f64::INFINITY);
            let r = if m.prepared.max_leverage > 0.0 {
                q / m.prepared.max_leverage
            } else {
                1.0
            };
            ratio = ratio.max(r);
            individuals.push(individual(&m.goal, y));
        }
        if self.leverage_constraint && ratio > 1.0 + LEVERAGE_TOLERANCE {
            violation += ratio - 1.0;
        }
        let outside_box = x
            .iter()
            .enumerate()
            .any(|(j, c)| *c < self.region_lo[j] - 1e-9 || *c > self.region_hi[j] + 1e-9);
        let global_value = match only {
            Some(i) => individuals[i],
            None => {
                let weights: Vec<f64> = self.models.iter().map(|m| m.importance).collect();
                global(&individuals, &weights)
            }
        };
        Eval {
            individual: individuals,
            global: global_value,
            violation: if violation > FEASIBILITY_TOLERANCE {
                violation
            } else {
                0.0
            },
            extrapolated: outside_box || ratio > 1.0 + LEVERAGE_TOLERANCE,
            leverage_ratio: ratio,
        }
    }

    /// Função minimizada pela busca: viável com `D > 0` → `−D`; viável com `D = 0` → distância
    /// média até a aceitabilidade (guia a busca para fora do platô); inviável → `2 + violação`.
    pub(crate) fn objective(&self, x: &[f64], only: Option<usize>) -> f64 {
        let e = self.evaluate(x, only);
        if e.violation > 0.0 {
            2.0 + e.violation
        } else if e.global > 0.0 {
            -e.global
        } else {
            let relevant: Vec<f64> = match only {
                Some(i) => vec![e.individual[i]],
                None => e.individual.clone(),
            };
            relevant.iter().map(|d| 1.0 - d).sum::<f64>() / relevant.len().max(1) as f64
        }
    }
}
