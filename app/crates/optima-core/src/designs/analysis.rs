//! Análise de planejamentos de dois níveis (triagem): efeitos, curvatura, Lenth, falta de ajuste,
//! Pareto, efeitos principais, interações e observado × predito.
//!
//! O ajuste é o do núcleo ([`crate::models::linear`]) sobre os fatores **codificados** (−1, 0, +1):
//! cada coeficiente `b` é o efeito por unidade codificada e o **efeito** (diferença entre as médias
//! dos níveis alto e baixo) vale `2·b` — as duas grandezas aparecem separadas. Termos aliasados
//! (por exemplo, duas interações confundidas em um fracionário) ficam `não estimáveis`; nenhum
//! teste sem graus de liberdade do erro é apresentado como válido: nesse caso o método de Lenth é
//! o único indicativo, rotulado como tal.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::alias::{alias_sets, defining_relation, effect_name};
use super::coding::Levels;
use super::fractional::{Generator, parse_generators};
use super::spec::{DesignKind, DesignSpec};
use crate::descriptive::Stat;
use crate::domain::{Dataset, Factor, FactorKind, FactorValue, StableId};
use crate::errors::CoreError;
use crate::inference::intervals::t_critical;
use crate::inference::lack_of_fit::{LackOfFit, lack_of_fit};
use crate::inference::lenth::{Lenth, lenth};
use crate::inference::regression_anova::RegressionAnova;
use crate::interpretation::Fact;
use crate::models::linear::{LinearFit, LinearModelRequest, fit_model_with_predictions};
use crate::models::{CategoricalCoding, ModelSpec, TermSpec};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};
use crate::visualization::effects::{
    InteractionSeries, MainEffectSeries, interaction, main_effect,
};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "two_level_design_analysis";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
const LEVEL_TOLERANCE: f64 = 1e-9;

/// Solicitação de análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignAnalysisRequest {
    /// Dados com os valores **reais** dos fatores numéricos do planejamento.
    pub dataset: Dataset,
    /// Resposta.
    pub response_id: StableId,
    /// Planejamento (níveis dos fatores e tipo).
    pub spec: DesignSpec,
    /// Termos do modelo: efeitos principais e interações dos fatores do planejamento.
    pub terms: Vec<TermSpec>,
    /// Nível de significância (0 < α < 1).
    pub alpha: f64,
    /// Incluir o termo de curvatura quando houver pontos centrais.
    pub include_curvature: bool,
}

/// Termo estimado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EffectRow {
    /// Rótulo (`Temperatura`, `Temperatura:pH`).
    pub label: String,
    /// Ordem do termo (1 = principal, 2 = interação de dois fatores…).
    pub order: u32,
    /// Coeficiente na escala codificada.
    pub coefficient: Stat,
    /// Efeito = 2 × coeficiente (nível alto − nível baixo).
    pub effect: Stat,
    /// Erro-padrão do efeito.
    pub std_error: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do IC do efeito.
    pub ci_lower: Stat,
    /// Limite superior do IC do efeito.
    pub ci_upper: Stat,
    /// Ativo pelo método de Lenth (`|efeito| > ME`); `None` sem Lenth.
    pub lenth_active: Option<bool>,
    /// Ativo com controle simultâneo (`|efeito| > SME`).
    pub lenth_simultaneous: Option<bool>,
    /// Efeitos confundidos com este termo (fracionários regulares), com sinal.
    pub aliased_with: Vec<String>,
}

/// Teste de curvatura (pontos centrais × pontos fatoriais).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurvatureTest {
    /// Média dos centrais menos o previsto pelo modelo linear nos fatoriais.
    pub difference: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p.
    pub p_value: Stat,
    /// Pontos centrais usados.
    pub center_points: u32,
}

/// Referência da barra do Pareto.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ParetoBasis {
    /// `|t|`, com o t crítico do nível α.
    TStatistic,
    /// `|efeito|`, com a margem de erro de Lenth.
    LenthEffect,
    /// `|efeito|`, sem referência (nem erro estimável nem Lenth).
    EffectOnly,
}

/// Barra do Pareto.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ParetoBar {
    /// Termo.
    pub label: String,
    /// Valor (conforme a base).
    pub value: f64,
    /// Acima da referência.
    pub significant: Option<bool>,
}

/// Pareto de efeitos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Pareto {
    /// Base das barras.
    pub basis: ParetoBasis,
    /// Linha de referência.
    pub reference: Option<f64>,
    /// Barras em ordem decrescente.
    pub bars: Vec<ParetoBar>,
}

/// Observado × predito de um ensaio.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ObservedPredicted {
    /// Observação.
    pub observation_id: StableId,
    /// Observado.
    pub observed: f64,
    /// Predito pelo modelo.
    pub predicted: f64,
}

/// Método de Lenth.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LenthResult {
    /// Erro-padrão pseudo.
    pub pse: f64,
    /// Graus de liberdade.
    pub df: f64,
    /// Margem de erro.
    pub margin_of_error: f64,
    /// Margem simultânea.
    pub simultaneous_margin: f64,
}

impl From<Lenth> for LenthResult {
    fn from(l: Lenth) -> Self {
        Self {
            pse: l.pse,
            df: l.df,
            margin_of_error: l.margin_of_error,
            simultaneous_margin: l.simultaneous_margin,
        }
    }
}

/// Resultado da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignAnalysisResult {
    /// Resposta.
    pub response_id: StableId,
    /// Nível de significância.
    pub alpha: f64,
    /// Nomes dos fatores na ordem do planejamento.
    pub factor_names: Vec<String>,
    /// Intercepto (média na escala codificada).
    pub intercept: Stat,
    /// Erro-padrão do intercepto.
    pub intercept_std_error: Stat,
    /// Termos.
    pub effects: Vec<EffectRow>,
    /// Curvatura.
    pub curvature: Option<CurvatureTest>,
    /// ANOVA da regressão.
    pub anova: RegressionAnova,
    /// Falta de ajuste e erro puro.
    pub lack_of_fit: Option<LackOfFit>,
    /// Lenth.
    pub lenth: Option<LenthResult>,
    /// Pareto.
    pub pareto: Pareto,
    /// Efeitos principais por fator.
    pub main_effects: Vec<MainEffectSeries>,
    /// Interações de dois fatores do modelo.
    pub interactions: Vec<InteractionSeries>,
    /// Observado × predito.
    pub observed_vs_predicted: Vec<ObservedPredicted>,
    /// Ajuste completo (coeficientes, diagnósticos por observação, avisos do ajuste).
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

fn doubled(s: Stat) -> Stat {
    s.value().map_or(s, |v| Stat::finite(2.0 * v))
}

fn alias_names(spec: &DesignSpec, mask: u32, k: usize) -> Vec<String> {
    let DesignKind::Fractional { generators } = &spec.kind else {
        return Vec::new();
    };
    let Ok(parsed) = parse_generators(k, generators) else {
        return Vec::new();
    };
    let words = defining_relation(&parsed.iter().map(Generator::word).collect::<Vec<_>>());
    alias_sets(k, &words)
        .into_iter()
        .find(|s| s.effect == mask)
        .map(|s| {
            s.aliases
                .iter()
                .map(|(m, sign)| {
                    format!("{}{}", if *sign < 0 { '−' } else { '+' }, effect_name(*m))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn unique_id(dataset: &Dataset, base: &str) -> StableId {
    let mut candidate = base.to_string();
    let mut n = 1;
    while dataset.factors.iter().any(|f| f.id.as_str() == candidate) {
        n += 1;
        candidate = format!("{base}{n}");
    }
    StableId::new(candidate)
        .unwrap_or_else(|_| StableId::new("curvature").unwrap_or_else(|_| unreachable!()))
}

/// Analisa o planejamento.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados, termos ou α inválidos.
pub fn analyze(request: &DesignAnalysisRequest) -> Result<DesignAnalysisResult, CoreError> {
    let dataset = &request.dataset;
    let spec = &request.spec;
    let mut issues = validate_dataset(dataset);
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("design.invalid_alpha"));
    }
    if dataset.response_index(&request.response_id).is_none() {
        issues.push(error("request.unknown_response").with_param("id", &request.response_id));
    }
    // Fatores do planejamento no conjunto de dados.
    let mut factor_indexes = Vec::new();
    for f in &spec.factors {
        match dataset.factor_index(&f.id) {
            Some(i) if dataset.factors[i].kind == FactorKind::Numeric => factor_indexes.push(i),
            Some(_) => issues.push(error("design.factor_not_numeric").with_param("id", &f.id)),
            None => issues.push(error("request.unknown_group_factor").with_param("id", &f.id)),
        }
        if !(Levels {
            low: f.low,
            high: f.high,
        })
        .valid()
        {
            issues.push(error("design.invalid_levels").with_param("id", &f.id));
        }
    }
    let mut term_masks: Vec<(u32, u32)> = Vec::new(); // (máscara, ordem)
    for (i, term) in request.terms.iter().enumerate() {
        let ids: Vec<&StableId> = match term {
            TermSpec::Main { factor_id } => vec![factor_id],
            TermSpec::Interaction { factor_ids } => factor_ids.iter().collect(),
            TermSpec::Power { .. } => {
                issues.push(error("design.power_term_not_two_level").with_param("term", &(i + 1)));
                continue;
            }
        };
        let mut mask = 0_u32;
        for id in ids {
            match spec.factors.iter().position(|f| &f.id == id) {
                Some(p) => mask |= 1 << p,
                None => {
                    issues.push(error("design.term_not_in_design").with_param("term", &(i + 1)))
                }
            }
        }
        term_masks.push((mask, mask.count_ones()));
    }
    if request.terms.is_empty() {
        issues.push(error("design.no_terms"));
    }
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }
    let Some(response_index) = dataset.response_index(&request.response_id) else {
        return Err(CoreError::InvalidInput(issues));
    };

    // Conjunto codificado.
    let levels: Vec<Levels> = spec
        .factors
        .iter()
        .map(|f| Levels {
            low: f.low,
            high: f.high,
        })
        .collect();
    let mut coded = dataset.clone();
    let mut unexpected = 0_usize;
    let mut center_rows = 0_usize;
    let mut other_rows = 0_usize;
    let mut center_flags = Vec::with_capacity(coded.observations.len());
    for obs in &mut coded.observations {
        let mut values = Vec::new();
        for (j, &fi) in factor_indexes.iter().enumerate() {
            if let Some(FactorValue::Number(real)) = obs.factors[fi].clone() {
                let c = levels[j].encode(real);
                obs.factors[fi] = Some(FactorValue::Number(c));
                values.push(c);
            }
        }
        let complete =
            values.len() == factor_indexes.len() && obs.responses[response_index].is_some();
        let is_center = complete && values.iter().all(|c| c.abs() < LEVEL_TOLERANCE);
        if complete {
            if is_center {
                center_rows += 1;
            } else {
                other_rows += 1;
            }
            if values
                .iter()
                .any(|c| !((c.abs() - 1.0).abs() < LEVEL_TOLERANCE || c.abs() < LEVEL_TOLERANCE))
            {
                unexpected += 1;
            }
        }
        center_flags.push(is_center);
    }
    if unexpected > 0 {
        issues.push(
            Issue::new("design.unexpected_levels", Severity::Warning)
                .with_param("count", &unexpected),
        );
    }
    let with_curvature = request.include_curvature && center_rows > 0 && other_rows > 0;
    let mut terms = request.terms.clone();
    let mut curvature_id = None;
    if with_curvature {
        let id = unique_id(&coded, "curvature");
        coded.factors.push(Factor {
            id: id.clone(),
            name: "curvature".into(),
            kind: FactorKind::Numeric,
            unit: None,
            levels: Vec::new(),
        });
        for (obs, is_center) in coded.observations.iter_mut().zip(&center_flags) {
            obs.factors.push(Some(FactorValue::Number(if *is_center {
                1.0
            } else {
                0.0
            })));
        }
        terms.push(TermSpec::Main {
            factor_id: id.clone(),
        });
        curvature_id = Some(id);
    }
    let fit = fit_model_with_predictions(&LinearModelRequest {
        dataset: coded.clone(),
        spec: ModelSpec {
            response_id: request.response_id.clone(),
            intercept: true,
            terms,
            coding: CategoricalCoding::Treatment,
            confidence_level: 1.0 - request.alpha,
        },
    })?;
    let report = fit.report;
    issues.extend(report.issues.iter().cloned());

    // Termos.
    let k = spec.factors.len();
    let df = f64::from(report.df_residual);
    let critical = t_critical(1.0 - request.alpha, df);
    let n_terms = request.terms.len();
    let mut effects: Vec<EffectRow> = Vec::with_capacity(n_terms);
    for (i, (mask, order)) in term_masks.iter().enumerate() {
        let row = &report.coefficients[i + 1];
        effects.push(EffectRow {
            label: row.label.clone(),
            order: *order,
            coefficient: row.estimate,
            effect: doubled(row.estimate),
            std_error: doubled(row.std_error),
            t_value: row.t_value,
            p_value: row.p_value,
            ci_lower: doubled(row.ci_lower),
            ci_upper: doubled(row.ci_upper),
            lenth_active: None,
            lenth_simultaneous: None,
            aliased_with: if *order <= 2 {
                alias_names(spec, *mask, k)
            } else {
                Vec::new()
            },
        });
    }
    // Lenth sobre os efeitos estimáveis.
    let estimable: Vec<f64> = effects.iter().filter_map(|e| e.effect.value()).collect();
    let lenth_result = lenth(&estimable, request.alpha);
    if let Some(l) = &lenth_result {
        for e in &mut effects {
            if let Some(v) = e.effect.value() {
                e.lenth_active = Some(v.abs() > l.margin_of_error);
                e.lenth_simultaneous = Some(v.abs() > l.simultaneous_margin);
            }
        }
    }
    let not_estimable = effects
        .iter()
        .filter(|e| e.effect.value().is_none())
        .count();

    // Curvatura.
    let curvature = curvature_id.is_some().then(|| {
        let row = &report.coefficients[n_terms + 1];
        CurvatureTest {
            difference: row.estimate,
            std_error: row.std_error,
            t_value: row.t_value,
            p_value: row.p_value,
            center_points: u32::try_from(center_rows).unwrap_or(u32::MAX),
        }
    });

    // Pareto.
    let (basis, reference, mut bars) = if report.df_residual > 0 {
        let bars: Vec<ParetoBar> = effects
            .iter()
            .filter_map(|e| {
                e.t_value.value().map(|t| ParetoBar {
                    label: e.label.clone(),
                    value: t.abs(),
                    significant: e.p_value.value().map(|p| p < request.alpha),
                })
            })
            .collect();
        (ParetoBasis::TStatistic, critical, bars)
    } else {
        let reference = lenth_result.map(|l| l.margin_of_error);
        let bars: Vec<ParetoBar> = effects
            .iter()
            .filter_map(|e| {
                e.effect.value().map(|v| ParetoBar {
                    label: e.label.clone(),
                    value: v.abs(),
                    significant: reference.map(|r| v.abs() > r),
                })
            })
            .collect();
        (
            if reference.is_some() {
                ParetoBasis::LenthEffect
            } else {
                ParetoBasis::EffectOnly
            },
            reference,
            bars,
        )
    };
    bars.sort_by(|a, b| b.value.total_cmp(&a.value));

    // Séries a partir dos ensaios usados no ajuste.
    let by_id: BTreeMap<&str, usize> = coded
        .observations
        .iter()
        .enumerate()
        .map(|(i, o)| (o.id.as_str(), i))
        .collect();
    let used: Vec<usize> = report
        .observations
        .iter()
        .filter_map(|o| {
            o.observation_id
                .as_ref()
                .and_then(|id| by_id.get(id.as_str()).copied())
        })
        .collect();
    let coded_rows: Vec<Vec<f64>> = used
        .iter()
        .map(|&r| {
            factor_indexes
                .iter()
                .map(|&fi| match &coded.observations[r].factors[fi] {
                    Some(FactorValue::Number(c)) => *c,
                    _ => f64::NAN,
                })
                .collect()
        })
        .collect();
    let observed: Vec<f64> = report.observations.iter().map(|o| o.observed).collect();
    let main_effects = (0..k)
        .map(|j| main_effect(&coded_rows, &observed, j))
        .collect();
    let interactions = term_masks
        .iter()
        .filter(|(mask, order)| *order == 2 && mask.count_ones() == 2)
        .map(|(mask, _)| {
            let a = mask.trailing_zeros() as usize;
            let b = (mask >> (a + 1)).trailing_zeros() as usize + a + 1;
            interaction(&coded_rows, &observed, a, b)
        })
        .collect();

    // Falta de ajuste e erro puro.
    let mut groups: BTreeMap<String, Vec<f64>> = BTreeMap::new();
    for (row, y) in coded_rows.iter().zip(&observed) {
        let key = row
            .iter()
            .map(|c| format!("{c:.9}"))
            .collect::<Vec<_>>()
            .join("|");
        groups.entry(key).or_default().push(*y);
    }
    let groups: Vec<Vec<f64>> = groups.into_values().collect();
    let lof = report
        .anova
        .residual
        .sum_squares
        .value()
        .and_then(|sse| lack_of_fit(&groups, sse, report.df_residual as usize));

    if report.df_residual == 0 {
        issues.push(Issue::new("design.saturated", Severity::Warning));
    }
    if not_estimable > 0 {
        issues.push(
            Issue::new("design.not_estimable_terms", Severity::Warning)
                .with_param("count", &not_estimable),
        );
    }
    let observed_vs_predicted = report
        .observations
        .iter()
        .filter_map(|o| {
            o.observation_id.clone().map(|id| ObservedPredicted {
                observation_id: id,
                observed: o.observed,
                predicted: o.fitted,
            })
        })
        .collect();

    let intercept_row = &report.coefficients[0];
    let facts = crate::interpretation::design_facts(&crate::interpretation::DesignFactsInput {
        effects: &effects,
        curvature: curvature.as_ref(),
        lack_of_fit: lof.as_ref(),
        df_residual: report.df_residual,
        lenth_used: report.df_residual == 0 && lenth_result.is_some(),
        kind: &spec.kind,
        alpha: request.alpha,
        unexpected_levels: unexpected,
        not_estimable,
    });
    Ok(DesignAnalysisResult {
        response_id: request.response_id.clone(),
        alpha: request.alpha,
        factor_names: spec.factors.iter().map(|f| f.name.clone()).collect(),
        intercept: intercept_row.estimate,
        intercept_std_error: intercept_row.std_error,
        effects,
        curvature,
        anova: report.anova.clone(),
        lack_of_fit: lof,
        lenth: lenth_result.map(Into::into),
        pareto: Pareto {
            basis,
            reference,
            bars,
        },
        main_effects,
        interactions,
        observed_vs_predicted,
        fit: Box::new(report),
        issues,
        facts,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
