//! C09 — comparações de tratamentos de um fator.
//!
//! [`compare_one_way`] reúne ANOVA, Tukey/Tukey–Kramer, letras, diagnósticos e séries de gráfico
//! em uma única análise reproduzível. Especificações em `docs/metodos/anova-um-fator.md`,
//! `amplitude-studentizada.md`, `tukey.md` e `letras-comparacao.md`.

pub mod groups;
pub mod letters;
pub mod paired;
pub mod procedures;
pub mod tukey;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::summary::summarize_column;
use crate::descriptive::{Stat, UndefinedReason};
use crate::diagnostics::assumptions::{BrownForsythe, brown_forsythe};
use crate::diagnostics::residuals::internally_studentized;
use crate::domain::{Dataset, StableId};
use crate::errors::CoreError;
use crate::inference::intervals::t_critical;
use crate::inference::one_way_anova::{EffectSizes, OneWayAnova, partition, table};
use crate::interpretation::Fact;
use crate::models::design_matrix::ExcludedObservation;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};
use crate::visualization::boxplot::{BoxStats, box_stats};
use crate::visualization::residuals::{QqPoint, qq_points};

pub use letters::Letters;
pub use tukey::TukeyResult;

/// Identificador do método no registro.
pub const METHOD_ID: &str = "one_way_comparison";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;

/// Solicitação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OneWayRequest {
    /// Dados.
    pub dataset: Dataset,
    /// Resposta.
    pub response_id: StableId,
    /// Fator que define os grupos (categórico ou quantitativo tratado como níveis).
    pub factor_id: StableId,
    /// Nível de significância da família (padrão 0,05).
    pub alpha: f64,
}

/// Estatísticas de um grupo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GroupStats {
    /// Nível.
    pub label: String,
    /// Observações usadas.
    pub n: u32,
    /// Média.
    pub mean: Stat,
    /// Desvio-padrão amostral.
    pub sd: Stat,
    /// Erro-padrão da média do grupo, `sd/√n`.
    pub std_error: Stat,
    /// Limite inferior do IC da média (variância comum, `t` com os gl do erro).
    pub ci_lower: Stat,
    /// Limite superior do IC da média.
    pub ci_upper: Stat,
    /// Barra `média − dp` (gráfico de médias com desvio-padrão).
    pub sd_lower: Stat,
    /// Barra `média + dp`.
    pub sd_upper: Stat,
    /// Barra `média − EP` (erro-padrão da média do grupo).
    pub se_lower: Stat,
    /// Barra `média + EP`.
    pub se_upper: Stat,
    /// Boxplot do grupo.
    pub boxplot: Option<BoxStats>,
}

/// Resíduo de uma observação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResidualPoint {
    /// Observação.
    pub observation_id: StableId,
    /// Índice do grupo.
    pub group: u32,
    /// Valor ajustado (média do grupo).
    pub fitted: f64,
    /// Resíduo.
    pub residual: f64,
    /// Resíduo padronizado.
    pub standardized: Stat,
}

/// Diagnósticos da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OneWayDiagnostics {
    /// Resíduos por observação.
    pub residuals: Vec<ResidualPoint>,
    /// Gráfico quantil–quantil dos resíduos padronizados.
    pub qq: Vec<QqPoint>,
    /// Homogeneidade das variâncias.
    pub brown_forsythe: BrownForsythe,
    /// Razão entre o maior e o menor desvio-padrão dos grupos (quando definida).
    pub sd_ratio: Stat,
}

/// Resultado completo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OneWayResult {
    /// Resposta analisada.
    pub response_id: StableId,
    /// Fator.
    pub factor_id: StableId,
    /// Nível de significância.
    pub alpha: f64,
    /// Grupos, na ordem dos níveis.
    pub groups: Vec<GroupStats>,
    /// Média geral.
    pub grand_mean: Stat,
    /// ANOVA.
    pub anova: OneWayAnova,
    /// Tamanhos de efeito e CV.
    pub effect_sizes: EffectSizes,
    /// Tukey/Tukey–Kramer; ausente se não houve estimativa de erro.
    pub tukey: Option<TukeyResult>,
    /// Letras de comparação (a letra `a` é do grupo de maior média).
    pub letters: Option<Letters>,
    /// Diagnósticos.
    pub diagnostics: OneWayDiagnostics,
    /// Observações fora da análise.
    pub excluded: Vec<ExcludedObservation>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Fatos para a interpretação.
    pub facts: Vec<Fact>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn invalid(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn warning(code: &str) -> Issue {
    Issue::new(code, Severity::Warning)
}

/// Executa a análise de um fator.
///
/// # Errors
/// [`CoreError::InvalidInput`] para dados, resposta, fator ou `alpha` inválidos, ou menos de dois
/// grupos com observações.
pub fn compare_one_way(request: &OneWayRequest) -> Result<OneWayResult, CoreError> {
    let dataset = &request.dataset;
    let mut issues = validate_dataset(dataset);
    let response = dataset.response_index(&request.response_id);
    let factor = dataset.factor_index(&request.factor_id);
    if response.is_none() {
        issues.push(invalid("request.unknown_response").with_param("id", &request.response_id));
    }
    if factor.is_none() {
        issues.push(invalid("request.unknown_group_factor").with_param("id", &request.factor_id));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(invalid("comparison.invalid_alpha"));
    }
    let (Some(response), Some(factor)) = (response, factor) else {
        return Err(CoreError::InvalidInput(issues));
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }

    let (groups, excluded) = groups::group_by_factor(dataset, response, factor);
    if groups.len() < 2 {
        return Err(CoreError::InvalidInput(vec![
            invalid("comparison.too_few_groups").with_param("groups", &groups.len()),
        ]));
    }
    let slices: Vec<&[f64]> = groups.iter().map(|g| g.values.as_slice()).collect();
    let Some(part) = partition(&slices) else {
        return Err(CoreError::InvalidInput(vec![invalid(
            "comparison.non_finite_result",
        )]));
    };
    let (anova, effect_sizes) = table(&part);

    let df_error = part.n - part.k;
    let mse = (df_error > 0).then(|| part.ss_within / df_error as f64);
    let critical_t = t_critical(1.0 - request.alpha, df_error as f64);
    let group_stats: Vec<GroupStats> = groups
        .iter()
        .zip(&part.group_means)
        .map(|(g, &mean)| {
            let summary = summarize_column(g.values.iter().map(|v| Some(*v)));
            let n = g.values.len();
            let se_pooled = mse.map(|m| (m / n as f64).sqrt());
            let ci = se_pooled
                .zip(critical_t)
                .map(|(se, t)| (mean - t * se, mean + t * se));
            let se_group = summary.sd.value().map(|sd| sd / (n as f64).sqrt());
            let bar = |spread: Option<f64>, sign: f64| {
                spread.map_or(
                    Stat::undefined(UndefinedReason::FewerThanTwoObservations),
                    |s| Stat::finite(mean + sign * s),
                )
            };
            GroupStats {
                sd_lower: bar(summary.sd.value(), -1.0),
                sd_upper: bar(summary.sd.value(), 1.0),
                se_lower: bar(se_group, -1.0),
                se_upper: bar(se_group, 1.0),
                label: g.label.clone(),
                n: u32::try_from(n).unwrap_or(u32::MAX),
                mean: Stat::finite(mean),
                sd: summary.sd,
                std_error: se_group.map_or(
                    Stat::undefined(UndefinedReason::FewerThanTwoObservations),
                    Stat::finite,
                ),
                ci_lower: ci.map_or(
                    Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom),
                    |c| Stat::finite(c.0),
                ),
                ci_upper: ci.map_or(
                    Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom),
                    |c| Stat::finite(c.1),
                ),
                boxplot: box_stats(&g.values, &g.observation_ids),
            }
        })
        .collect();

    // Tukey e letras.
    let sizes: Vec<usize> = groups.iter().map(|g| g.values.len()).collect();
    let tukey =
        mse.and_then(|m| tukey::compare(&part.group_means, &sizes, m, df_error, request.alpha));
    if tukey.is_none() {
        issues.push(warning(if df_error == 0 {
            "comparison.no_residual_df"
        } else {
            "comparison.zero_within_variance"
        }));
    }
    let letters = tukey.as_ref().and_then(|t| {
        let k = groups.len();
        let mut relation = vec![vec![letters::Relation::Unknown; k]; k];
        for c in &t.comparisons {
            let r = match c.significant {
                Some(true) => letters::Relation::Different,
                Some(false) => letters::Relation::NotDifferent,
                None => letters::Relation::Unknown,
            };
            relation[c.group_a as usize][c.group_b as usize] = r;
            relation[c.group_b as usize][c.group_a as usize] = r;
        }
        let mut order: Vec<usize> = (0..k).collect();
        order.sort_by(|&a, &b| part.group_means[b].total_cmp(&part.group_means[a]));
        letters::compute(k, &order, |i, j| relation[i][j])
    });
    if tukey.is_some() && letters.is_none() {
        issues.push(warning("comparison.letters_unavailable"));
    }

    // Diagnósticos.
    let sigma = mse.map(f64::sqrt);
    let mut residuals = Vec::with_capacity(part.n);
    for (gi, g) in groups.iter().enumerate() {
        let mean = part.group_means[gi];
        for (value, id) in g.values.iter().zip(&g.observation_ids) {
            let residual = value - mean;
            let leverage = 1.0 / g.values.len() as f64;
            let standardized = sigma
                .and_then(|s| internally_studentized(residual, leverage, s))
                .map_or(Stat::undefined(UndefinedReason::NotEstimable), Stat::finite);
            residuals.push(ResidualPoint {
                observation_id: id.clone(),
                group: u32::try_from(gi).unwrap_or(u32::MAX),
                fitted: mean,
                residual,
                standardized,
            });
        }
    }
    let standardized_values: Vec<f64> = residuals
        .iter()
        .filter_map(|r| r.standardized.value())
        .collect();
    let sds: Vec<f64> = group_stats.iter().filter_map(|g| g.sd.value()).collect();
    let sd_ratio = match (
        sds.iter().copied().reduce(f64::max),
        sds.iter().copied().reduce(f64::min),
    ) {
        (Some(max), Some(min)) if min > 0.0 && sds.len() >= 2 => Stat::finite(max / min),
        _ => Stat::undefined(UndefinedReason::NotEstimable),
    };
    let diagnostics = OneWayDiagnostics {
        residuals,
        qq: qq_points(&standardized_values),
        brown_forsythe: brown_forsythe(&slices),
        sd_ratio,
    };

    if sizes.iter().any(|&s| s < 2) {
        issues.push(
            warning("comparison.singleton_groups")
                .with_param("count", &sizes.iter().filter(|&&s| s < 2).count()),
        );
    }
    if !excluded.is_empty() {
        issues
            .push(warning("comparison.excluded_observations").with_param("count", &excluded.len()));
    }

    let facts = crate::interpretation::one_way_facts(
        &anova,
        tukey.as_ref(),
        letters.as_ref(),
        &diagnostics,
        &sizes,
        excluded.len(),
        request.alpha,
    );
    Ok(OneWayResult {
        response_id: request.response_id.clone(),
        factor_id: request.factor_id.clone(),
        alpha: request.alpha,
        groups: group_stats,
        grand_mean: Stat::finite(part.grand_mean),
        anova,
        effect_sizes,
        tukey,
        letters,
        diagnostics,
        excluded,
        issues,
        facts,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
