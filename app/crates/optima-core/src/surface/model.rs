//! Ajuste do modelo de segunda ordem na escala codificada, ANOVA, falta de ajuste e fatos.
//!
//! Os fatores são codificados por `x = (real − centro)/meia-amplitude` com os níveis informados
//! (`DesignFactor::low/high`); o modelo é ajustado por mínimos quadrados sobre essas colunas. Não há
//! eliminação automática de termos: o modelo é o escolhido pelo usuário (ou o completo, por padrão).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::equation::{self, Equation};
use super::terms::{self, Monomial};
use crate::descriptive::Stat;
use crate::designs::coding::Levels;
use crate::designs::spec::DesignFactor;
use crate::domain::{Dataset, FactorKind, FactorValue, StableId};
use crate::errors::CoreError;
use crate::inference::lack_of_fit::{LackOfFit, lack_of_fit};
use crate::inference::regression_anova::RegressionAnova;
use crate::interpretation::Fact;
use crate::models::linear::{
    CoefficientRow, LinearFit, LinearModelRequest, fit_model_with_predictions,
};
use crate::models::{CategoricalCoding, LinearModel, ModelSpec, TermSpec};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "response_surface";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

/// Solicitação de análise de superfície de resposta.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceRequest {
    /// Dados com os valores **reais** dos fatores numéricos.
    pub dataset: Dataset,
    /// Resposta.
    pub response_id: StableId,
    /// Fatores e seus níveis (`low`/`high` definem a codificação).
    pub factors: Vec<DesignFactor>,
    /// Termos do modelo; vazio = modelo completo de segunda ordem.
    pub terms: Vec<TermSpec>,
    /// Nível de significância (0 < α < 1).
    pub alpha: f64,
}

/// Intervalo experimental de um fator.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorRange {
    /// Fator.
    pub id: StableId,
    /// Nome.
    pub name: String,
    /// Centro usado na codificação.
    pub center: f64,
    /// Meia-amplitude usada na codificação.
    pub half_range: f64,
    /// Menor valor real observado nos ensaios usados.
    pub min: f64,
    /// Maior valor real observado nos ensaios usados.
    pub max: f64,
}

/// Termo do modelo na escala codificada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceTermRow {
    /// Rótulo (`A`, `A²`, `A:B`).
    pub label: String,
    /// Estimativa na escala codificada.
    pub estimate: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do IC.
    pub ci_lower: Stat,
    /// Limite superior do IC.
    pub ci_upper: Stat,
}

/// Observado × predito.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceFitPoint {
    /// Observação.
    pub observation_id: StableId,
    /// Observado.
    pub observed: f64,
    /// Predito.
    pub predicted: f64,
    /// Resíduo.
    pub residual: f64,
    /// Alavancagem.
    pub leverage: f64,
}

/// Resultado da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SurfaceResult {
    /// Resposta.
    pub response_id: StableId,
    /// Nível de significância.
    pub alpha: f64,
    /// Nomes dos fatores.
    pub factor_names: Vec<String>,
    /// Intercepto.
    pub intercept: SurfaceTermRow,
    /// Termos do modelo (na ordem pedida).
    pub terms: Vec<SurfaceTermRow>,
    /// ANOVA da regressão, com `R²` e `R²` ajustado.
    pub anova: RegressionAnova,
    /// Falta de ajuste e erro puro (apenas quando há réplicas verdadeiras e graus de liberdade).
    pub lack_of_fit: Option<LackOfFit>,
    /// Equação nas escalas codificada e real.
    pub equation: Equation,
    /// Intervalo experimental de cada fator.
    pub ranges: Vec<FactorRange>,
    /// Maior alavancagem entre os ensaios (referência da extrapolação oculta).
    pub max_leverage: f64,
    /// Observado × predito.
    pub fit_points: Vec<SurfaceFitPoint>,
    /// Termos sem hierarquia (quadrático ou interação sem os principais).
    pub hierarchy_gaps: Vec<String>,
    /// Ajuste completo (diagnósticos por observação).
    pub fit: Box<LinearFit>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Fatos para a interpretação.
    pub facts: Vec<Fact>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Ajuste reutilizável (análise e malha).
pub(crate) struct Prepared {
    pub monomials: Vec<Monomial>,
    pub levels: Vec<Levels>,
    pub factor_indexes: Vec<usize>,
    pub coded: Dataset,
    pub names: Vec<String>,
    pub model: LinearModel,
    pub report: LinearFit,
    pub ranges: Vec<FactorRange>,
    pub max_leverage: f64,
    pub issues: Vec<Issue>,
}

/// Valida a solicitação, codifica os dados e ajusta o modelo.
pub(crate) fn prepare(request: &SurfaceRequest) -> Result<Prepared, CoreError> {
    let dataset = &request.dataset;
    let mut issues = validate_dataset(dataset);
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("surface.invalid_alpha"));
    }
    if request.factors.len() < 2 {
        issues.push(error("surface.too_few_factors").with_param("count", &request.factors.len()));
    }
    let response_index = dataset.response_index(&request.response_id);
    if response_index.is_none() {
        issues.push(error("request.unknown_response").with_param("id", &request.response_id));
    }
    let mut factor_indexes = Vec::new();
    let mut levels = Vec::new();
    for f in &request.factors {
        match dataset.factor_index(&f.id) {
            Some(i) if dataset.factors[i].kind == FactorKind::Numeric => factor_indexes.push(i),
            Some(_) => issues.push(error("surface.factor_not_numeric").with_param("id", &f.id)),
            None => issues.push(error("request.unknown_group_factor").with_param("id", &f.id)),
        }
        let l = Levels {
            low: f.low,
            high: f.high,
        };
        if !l.valid() {
            issues.push(error("surface.invalid_levels").with_param("id", &f.id));
        }
        levels.push(l);
    }
    let ids: Vec<StableId> = request.factors.iter().map(|f| f.id.clone()).collect();
    let term_specs = if request.terms.is_empty() {
        terms::full_quadratic(&ids)
    } else {
        request.terms.clone()
    };
    let monomials = match terms::parse(&term_specs, &ids) {
        Ok(m) => m,
        Err(mut e) => {
            issues.append(&mut e);
            Vec::new()
        }
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let Some(response_index) = response_index else {
        return Err(CoreError::InvalidInput(issues));
    };

    let mut coded = dataset.clone();
    for obs in &mut coded.observations {
        for (j, &fi) in factor_indexes.iter().enumerate() {
            if let Some(FactorValue::Number(real)) = obs.factors[fi].clone() {
                obs.factors[fi] = Some(FactorValue::Number(levels[j].encode(real)));
            }
        }
    }
    let fit = fit_model_with_predictions(&LinearModelRequest {
        dataset: coded.clone(),
        spec: ModelSpec {
            response_id: request.response_id.clone(),
            intercept: true,
            terms: monomial_specs(&monomials, &ids),
            coding: CategoricalCoding::Treatment,
            confidence_level: 1.0 - request.alpha,
        },
    })?;
    issues.extend(fit.report.issues.iter().cloned());

    // Intervalos observados (apenas ensaios usados no ajuste).
    let used_real: Vec<Vec<f64>> = fit
        .report
        .observations
        .iter()
        .filter_map(|o| o.observation_id.as_ref())
        .filter_map(|id| dataset.observations.iter().find(|ob| &ob.id == id))
        .map(|ob| {
            factor_indexes
                .iter()
                .map(|&fi| match &ob.factors[fi] {
                    Some(FactorValue::Number(v)) => *v,
                    _ => f64::NAN,
                })
                .collect()
        })
        .collect();
    let ranges = request
        .factors
        .iter()
        .enumerate()
        .map(|(j, f)| {
            let values = used_real.iter().map(|r| r[j]).filter(|v| v.is_finite());
            FactorRange {
                id: f.id.clone(),
                name: f.name.clone(),
                center: levels[j].center(),
                half_range: levels[j].half_range(),
                min: values.clone().fold(f64::INFINITY, f64::min),
                max: values.fold(f64::NEG_INFINITY, f64::max),
            }
        })
        .collect();
    let max_leverage = fit
        .report
        .observations
        .iter()
        .map(|o| o.leverage)
        .fold(0.0, f64::max);
    let _ = response_index;
    Ok(Prepared {
        monomials,
        levels,
        factor_indexes,
        coded,
        names: request.factors.iter().map(|f| f.name.clone()).collect(),
        model: fit.model,
        report: fit.report,
        ranges,
        max_leverage,
        issues,
    })
}

fn monomial_specs(monomials: &[Monomial], ids: &[StableId]) -> Vec<TermSpec> {
    monomials
        .iter()
        .map(|m| match *m {
            Monomial::Main(i) => TermSpec::Main {
                factor_id: ids[i].clone(),
            },
            Monomial::Square(i) => TermSpec::Power {
                factor_id: ids[i].clone(),
                degree: 2,
            },
            Monomial::Cross(i, j) => TermSpec::Interaction {
                factor_ids: vec![ids[i].clone(), ids[j].clone()],
            },
        })
        .collect()
}

fn term_row(label: String, c: &CoefficientRow) -> SurfaceTermRow {
    SurfaceTermRow {
        label,
        estimate: c.estimate,
        std_error: c.std_error,
        t_value: c.t_value,
        p_value: c.p_value,
        ci_lower: c.ci_lower,
        ci_upper: c.ci_upper,
    }
}

/// Analisa a superfície de resposta.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados, fatores, termos ou α inválidos.
pub fn analyze(request: &SurfaceRequest) -> Result<SurfaceResult, CoreError> {
    let p = prepare(request)?;
    let mut issues = p.issues.clone();
    let report = &p.report;
    let ids: Vec<StableId> = request.factors.iter().map(|f| f.id.clone()).collect();
    let _ = &ids;

    let intercept = term_row("(Intercept)".to_string(), &report.coefficients[0]);
    let term_rows: Vec<SurfaceTermRow> = p
        .monomials
        .iter()
        .enumerate()
        .map(|(i, m)| term_row(terms::label(*m, &p.names), &report.coefficients[i + 1]))
        .collect();
    let not_estimable = term_rows
        .iter()
        .filter(|t| t.estimate.value().is_none())
        .count();

    // Falta de ajuste: grupos de ensaios com os mesmos níveis de todos os fatores.
    let mut groups: std::collections::BTreeMap<String, Vec<f64>> =
        std::collections::BTreeMap::new();
    for o in &report.observations {
        let Some(id) = o.observation_id.as_ref() else {
            continue;
        };
        let Some(obs) = p.coded.observations.iter().find(|ob| &ob.id == id) else {
            continue;
        };
        let key = p
            .factor_indexes
            .iter()
            .map(|&fi| match &obs.factors[fi] {
                Some(FactorValue::Number(c)) => format!("{c:.9}"),
                _ => "?".to_string(),
            })
            .collect::<Vec<_>>()
            .join("|");
        groups.entry(key).or_default().push(o.observed);
    }
    let groups: Vec<Vec<f64>> = groups.into_values().collect();
    let lof = report
        .anova
        .residual
        .sum_squares
        .value()
        .and_then(|sse| lack_of_fit(&groups, sse, report.df_residual as usize));

    let estimates: Vec<Option<f64>> = std::iter::once(&report.coefficients[0])
        .chain(report.coefficients[1..].iter())
        .map(|c| c.estimate.value())
        .collect();
    let centers: Vec<f64> = p.levels.iter().map(Levels::center).collect();
    let halves: Vec<f64> = p.levels.iter().map(Levels::half_range).collect();
    let eq = equation::build(&p.monomials, &estimates, &centers, &halves);

    let gaps = terms::hierarchy_gaps(&p.monomials, &p.names);
    if !gaps.is_empty() {
        issues.push(
            Issue::new("surface.hierarchy_gaps", Severity::Warning)
                .with_param("terms", &gaps.join("; ")),
        );
    }
    if report.df_residual == 0 {
        issues.push(Issue::new("surface.saturated", Severity::Warning));
    }
    if not_estimable > 0 {
        issues.push(
            Issue::new("surface.not_estimable_terms", Severity::Warning)
                .with_param("count", &not_estimable),
        );
    }
    let fit_points = report
        .observations
        .iter()
        .filter_map(|o| {
            o.observation_id.clone().map(|id| SurfaceFitPoint {
                observation_id: id,
                observed: o.observed,
                predicted: o.fitted,
                residual: o.residual,
                leverage: o.leverage,
            })
        })
        .collect();

    let facts = facts(request.alpha, report, lof.as_ref(), not_estimable);
    Ok(SurfaceResult {
        response_id: request.response_id.clone(),
        alpha: request.alpha,
        factor_names: p.names.clone(),
        intercept,
        terms: term_rows,
        anova: report.anova.clone(),
        lack_of_fit: lof,
        equation: eq,
        ranges: p.ranges.clone(),
        max_leverage: p.max_leverage,
        fit_points,
        hierarchy_gaps: gaps,
        fit: Box::new(report.clone()),
        issues,
        facts,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

fn facts(
    alpha: f64,
    report: &LinearFit,
    lof: Option<&LackOfFit>,
    not_estimable: usize,
) -> Vec<Fact> {
    let mut facts = Vec::new();
    if report.df_residual == 0 {
        facts.push(Fact::new("surface.saturated"));
    } else if let Some(p) = report.anova.p_value.value() {
        let key = if p < alpha {
            "surface.model_significant"
        } else {
            "surface.model_not_significant"
        };
        facts.push(
            Fact::new(key)
                .with_param("p", &p)
                .with_param("alpha", &alpha),
        );
    }
    if let (Some(r2), Some(adj)) = (
        report.anova.r_squared.value(),
        report.anova.adjusted_r_squared.value(),
    ) {
        facts.push(
            Fact::new("surface.fit_measures")
                .with_param("r2", &r2)
                .with_param("adjusted", &adj),
        );
    }
    match lof.and_then(|l| l.p_value.value()) {
        Some(p) if p < alpha => {
            facts.push(Fact::new("surface.lack_of_fit_significant").with_param("p", &p));
        }
        Some(p) => facts.push(Fact::new("surface.lack_of_fit_not_significant").with_param("p", &p)),
        None => facts.push(Fact::new("surface.lack_of_fit_unavailable")),
    }
    if not_estimable > 0 {
        facts.push(Fact::new("surface.not_estimable").with_param("count", &not_estimable));
    }
    facts.push(Fact::new("surface.extrapolation_note"));
    facts.push(Fact::new("surface.independence_not_assessed"));
    facts
}
