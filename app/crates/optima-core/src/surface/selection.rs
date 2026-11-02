//! Seleção e comparação de modelos de superfície de resposta (ET11).
//!
//! Para o modelo atual (`request.terms`; vazio = completo de segunda ordem) calcula métricas de
//! comparação e a **sequência de eliminação regressiva**: em cada passo remove o termo de maior
//! valor-p acima de `α` que respeite a **hierarquia** (um efeito principal só sai se nenhum termo
//! quadrático ou de interação do mesmo fator permanecer); para quando não há candidato ou quando
//! sobraria menos de 1 grau de liberdade no resíduo. A recomendação é apoio à decisão: o usuário
//! escolhe o passo. Especificação em `docs/metodos/selecao-de-modelos.md`.
//!
//! Métricas (convenção do statsmodels, com `k` parâmetros incluindo o intercepto e verossimilhança
//! gaussiana de variância `SQR/n`): `AIC = −2·llf + 2k`, `BIC = −2·llf + k·ln n`,
//! `AICc = AIC + 2k(k+1)/(n−k−1)`; `PRESS = Σ (eᵢ/(1−hᵢᵢ))²` e `R²pred = 1 − PRESS/SQT`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::model::{SurfaceRequest, SurfaceResult, analyze};
use super::terms::{Monomial, full_quadratic, parse};
use crate::descriptive::{Stat, UndefinedReason};
use crate::errors::CoreError;
use crate::models::TermSpec;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "surface_model_selection";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

/// Métricas de um modelo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ModelMetrics {
    /// Termos do modelo.
    pub terms: Vec<TermSpec>,
    /// Rótulos dos termos (mesma ordem).
    pub labels: Vec<String>,
    /// Parâmetros estimados, com o intercepto.
    pub parameters: u32,
    /// Graus de liberdade do resíduo.
    pub df_error: u32,
    /// `R²`.
    pub r_squared: Stat,
    /// `R²` ajustado.
    pub adjusted_r_squared: Stat,
    /// `R²` predito (`1 − PRESS/SQT`).
    pub predicted_r_squared: Stat,
    /// Soma de quadrados dos resíduos de predição.
    pub press: Stat,
    /// Raiz do quadrado médio do resíduo.
    pub rmse: Stat,
    /// Valor-p do teste `F` do modelo.
    pub model_p_value: Stat,
    /// Valor-p da falta de ajuste (indefinido sem erro puro).
    pub lack_of_fit_p_value: Stat,
    /// AIC.
    pub aic: Stat,
    /// AIC corrigido para amostras pequenas.
    pub aicc: Stat,
    /// BIC.
    pub bic: Stat,
}

/// Passo da sequência de eliminação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SelectionStep {
    /// Termo removido neste passo (`None` no passo inicial, o modelo atual).
    pub removed: Option<String>,
    /// Valor-p do termo removido no modelo anterior.
    pub removed_p_value: Stat,
    /// Métricas do modelo resultante.
    pub metrics: ModelMetrics,
}

/// Resultado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SelectionResult {
    /// Nível de significância usado na eliminação.
    pub alpha: f64,
    /// Modelo completo de segunda ordem.
    pub full: ModelMetrics,
    /// Sequência: o primeiro passo é o modelo atual; o último é o recomendado.
    pub steps: Vec<SelectionStep>,
    /// Por que a eliminação parou (`no_candidate`, `hierarchy`, `no_degrees_of_freedom`).
    pub stopped_because: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

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

fn metrics(request: &SurfaceRequest, result: &SurfaceResult) -> ModelMetrics {
    let n = result.fit_points.len() as f64;
    let df_error = f64::from(result.anova.residual.df);
    let k = n - df_error;
    let rss = val(&result.anova.residual.sum_squares);
    let sst = val(&result.anova.total.sum_squares);
    let press: f64 = result
        .fit_points
        .iter()
        .map(|p| (p.residual / (1.0 - p.leverage)).powi(2))
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
        terms: if request.terms.is_empty() {
            let ids: Vec<_> = request.factors.iter().map(|f| f.id.clone()).collect();
            full_quadratic(&ids)
        } else {
            request.terms.clone()
        },
        labels: result.terms.iter().map(|t| t.label.clone()).collect(),
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

/// Um termo principal só pode sair se nenhum quadrático ou interação do mesmo fator permanecer.
fn removable(monomials: &[Monomial], index: usize) -> bool {
    match monomials[index] {
        Monomial::Main(i) => !monomials.iter().any(|m| match *m {
            Monomial::Square(j) => j == i,
            Monomial::Cross(a, b) => a == i || b == i,
            Monomial::Main(_) => false,
        }),
        _ => true,
    }
}

/// Calcula métricas do modelo completo, do atual e a sequência de eliminação regressiva.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando o modelo atual não pode ser ajustado.
pub fn select(request: &SurfaceRequest) -> Result<SelectionResult, CoreError> {
    let ids: Vec<_> = request.factors.iter().map(|f| f.id.clone()).collect();
    let full_request = SurfaceRequest {
        terms: full_quadratic(&ids),
        ..request.clone()
    };
    let full = metrics(&full_request, &analyze(&full_request)?);

    let mut current = SurfaceRequest {
        terms: if request.terms.is_empty() {
            full_quadratic(&ids)
        } else {
            request.terms.clone()
        },
        ..request.clone()
    };
    let mut issues = Vec::new();
    let mut result = analyze(&current)?;
    let mut steps = vec![SelectionStep {
        removed: None,
        removed_p_value: Stat::undefined(UndefinedReason::NotEstimable),
        metrics: metrics(&current, &result),
    }];
    let stopped;
    loop {
        let Ok(monomials) = parse(&current.terms, &ids) else {
            stopped = "no_candidate";
            break;
        };
        // Candidatos: valor-p definido e acima de α, respeitando a hierarquia.
        let mut best: Option<(usize, f64)> = None;
        let mut blocked_by_hierarchy = false;
        for (i, row) in result.terms.iter().enumerate() {
            let Some(p) = row.p_value.value() else {
                continue;
            };
            if p <= request.alpha {
                continue;
            }
            if !removable(&monomials, i) {
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
        let label = result.terms[index].label.clone();
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
                    metrics: metrics(&next, &next_result),
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
