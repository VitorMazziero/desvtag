//! Seleção e comparação de modelos de efeitos para planejamentos de dois níveis (ET14-T03).
//!
//! Parte do modelo atual (`request.terms`) e calcula as mesmas métricas da seleção de superfícies
//! (`surface::selection`): `R²` ajustado e predito, PRESS, AIC, AICc, BIC e falta de ajuste. O
//! modelo **completo** tem todos os efeitos principais e todas as interações de dois fatores. A
//! **eliminação regressiva** remove em cada passo o termo de maior valor-p acima de `α` que respeite
//! a hierarquia (um efeito principal só sai se nenhuma interação com o fator permanecer); para
//! quando não há candidato ou quando sobraria menos de 1 grau de liberdade no resíduo. A curvatura
//! (pontos centrais), quando incluída, fica fixa. A recomendação é apoio à decisão.
//! Especificação em `docs/metodos/selecao-de-modelos.md`.

use super::analysis::{DesignAnalysisRequest, DesignAnalysisResult, analyze};
use crate::descriptive::{Stat, UndefinedReason};
use crate::errors::CoreError;
use crate::models::TermSpec;
use crate::provenance::Provenance;
use crate::surface::selection::{ModelMetrics, SelectionResult, SelectionStep};
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "two_level_model_selection";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

fn stat(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}

fn val(s: &Stat) -> f64 {
    s.value().unwrap_or(f64::NAN)
}

/// Efeitos principais e todas as interações de dois fatores do planejamento.
#[must_use]
pub fn full_two_factor(request: &DesignAnalysisRequest) -> Vec<TermSpec> {
    let ids: Vec<_> = request.spec.factors.iter().map(|f| f.id.clone()).collect();
    let mut terms: Vec<TermSpec> = ids
        .iter()
        .map(|id| TermSpec::Main {
            factor_id: id.clone(),
        })
        .collect();
    for (i, a) in ids.iter().enumerate() {
        for b in &ids[i + 1..] {
            terms.push(TermSpec::Interaction {
                factor_ids: vec![a.clone(), b.clone()],
            });
        }
    }
    terms
}

fn metrics(terms: &[TermSpec], result: &DesignAnalysisResult) -> ModelMetrics {
    let fit = &result.fit;
    let n = f64::from(fit.n_observations);
    let df_error = f64::from(result.anova.residual.df);
    let k = n - df_error;
    let rss = val(&result.anova.residual.sum_squares);
    let sst = val(&result.anova.total.sum_squares);
    let press: f64 = fit
        .observations
        .iter()
        .map(|o| (o.residual / (1.0 - o.leverage)).powi(2))
        .sum();
    let llf = -0.5 * n * ((2.0 * std::f64::consts::PI).ln() + (rss / n).ln() + 1.0);
    let aic = -2.0 * llf + 2.0 * k;
    let bic = -2.0 * llf + k * n.ln();
    let aicc = if n - k - 1.0 > 0.0 {
        aic + 2.0 * k * (k + 1.0) / (n - k - 1.0)
    } else {
        f64::NAN
    };
    ModelMetrics {
        terms: terms.to_vec(),
        labels: result.effects.iter().map(|e| e.label.clone()).collect(),
        parameters: k as u32,
        df_error: result.anova.residual.df,
        r_squared: result.anova.r_squared,
        adjusted_r_squared: result.anova.adjusted_r_squared,
        predicted_r_squared: stat(1.0 - press / sst),
        press: stat(press),
        rmse: stat((rss / df_error).sqrt()),
        model_p_value: result.anova.p_value,
        lack_of_fit_p_value: result
            .lack_of_fit
            .as_ref()
            .map_or(Stat::undefined(UndefinedReason::NotEstimable), |l| {
                l.p_value
            }),
        aic: stat(aic),
        aicc: stat(aicc),
        bic: stat(bic),
    }
}

/// Um efeito principal só pode sair se nenhuma interação com o fator permanecer.
fn removable(terms: &[TermSpec], index: usize) -> bool {
    match &terms[index] {
        TermSpec::Main { factor_id } => !terms.iter().any(|t| match t {
            TermSpec::Interaction { factor_ids } => factor_ids.contains(factor_id),
            _ => false,
        }),
        _ => true,
    }
}

/// Métricas do modelo completo e do atual, e a sequência de eliminação regressiva.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando o modelo atual não pode ser ajustado.
pub fn select(request: &DesignAnalysisRequest) -> Result<SelectionResult, CoreError> {
    let current_terms = if request.terms.is_empty() {
        full_two_factor(request)
    } else {
        request.terms.clone()
    };
    let mut current = DesignAnalysisRequest {
        terms: current_terms,
        ..request.clone()
    };
    let mut result = analyze(&current)?;
    let mut issues = Vec::new();

    // Modelo completo; se ele não puder ser ajustado (saturado, por exemplo), vale o atual.
    let full_request = DesignAnalysisRequest {
        terms: full_two_factor(request),
        ..request.clone()
    };
    let full = match analyze(&full_request) {
        Ok(full_result) => metrics(&full_request.terms, &full_result),
        Err(_) => {
            issues.push(Issue::new(
                "selection.full_model_unavailable",
                Severity::Warning,
            ));
            metrics(&current.terms, &result)
        }
    };

    let mut steps = vec![SelectionStep {
        removed: None,
        removed_p_value: Stat::undefined(UndefinedReason::NotEstimable),
        metrics: metrics(&current.terms, &result),
    }];
    let stopped;
    loop {
        let mut best: Option<(usize, f64)> = None;
        let mut blocked_by_hierarchy = false;
        for (i, row) in result.effects.iter().enumerate() {
            let Some(p) = row.p_value.value() else {
                continue;
            };
            if p <= request.alpha {
                continue;
            }
            if !removable(&current.terms, i) {
                blocked_by_hierarchy = true;
                continue;
            }
            if best.is_none_or(|(_, bp)| p > bp) {
                best = Some((i, p));
            }
        }
        let Some((index, p)) = best else {
            stopped = if blocked_by_hierarchy {
                "hierarchy"
            } else {
                "no_candidate"
            };
            break;
        };
        if result.anova.residual.df < 2 {
            stopped = "no_degrees_of_freedom";
            break;
        }
        let label = result.effects[index].label.clone();
        let mut next = current.clone();
        next.terms.remove(index);
        if next.terms.is_empty() {
            stopped = "no_candidate";
            break;
        }
        match analyze(&next) {
            Ok(next_result) => {
                steps.push(SelectionStep {
                    removed: Some(label),
                    removed_p_value: stat(p),
                    metrics: metrics(&next.terms, &next_result),
                });
                current = next;
                result = next_result;
            }
            Err(_) => {
                issues.push(Issue::new("selection.step_failed", Severity::Warning));
                stopped = "no_candidate";
                break;
            }
        }
    }
    Ok(SelectionResult {
        alpha: request.alpha,
        full,
        steps,
        stopped_because: stopped.to_string(),
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
