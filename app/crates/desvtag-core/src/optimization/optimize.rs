//! Orquestração: ajusta os modelos, executa a busca, agrupa os candidatos e relata a convergência.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::candidates::{OptimumCandidate, cluster, describe};
use super::constraints::Problem;
use super::objective::OptimizationRequest;
use super::search::multi_start;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::interpretation::Fact;
use crate::provenance::Provenance;
use crate::surface::grid::SurfaceGridFit;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "desirability_optimization";
/// Versão do método.
pub const METHOD_VERSION: u32 = 3;
/// Identificação do algoritmo de busca.
pub const ALGORITHM: &str = "latin-hypercube/nelder-mead-projected";
/// Inícios usados na busca de cada resposta isolada (compromissos).
const TRADE_OFF_STARTS: usize = 20;

/// Situação da busca.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum OptimizationStatus {
    /// Há ao menos um candidato viável com desejabilidade global positiva.
    Found,
    /// Há pontos viáveis, mas a desejabilidade global é zero em todos os encontrados.
    OnlyZeroDesirability,
    /// Nenhum início terminou em ponto que satisfaça as restrições obrigatórias.
    Infeasible,
}

/// Melhor desejabilidade individual de uma resposta buscada isoladamente.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResponseTradeOff {
    /// Resposta.
    pub response_id: StableId,
    /// Nome.
    pub name: String,
    /// Melhor desejabilidade individual viável (busca isolada); `None` se não houve ponto viável.
    pub best_alone: Option<f64>,
    /// Condições reais em que ela ocorre.
    pub real: Vec<f64>,
}

/// Relatório de convergência da busca.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ConvergenceReport {
    /// Algoritmo.
    pub algorithm: String,
    /// Semente do hipercubo latino.
    #[ts(type = "number")]
    pub seed: u64,
    /// Inícios executados.
    pub starts: u32,
    /// Inícios que terminaram por tolerância (e não por limite de iterações).
    pub converged_starts: u32,
    /// Inícios que terminaram em ponto viável.
    pub feasible_starts: u32,
    /// Ótimos locais distintos (após o agrupamento).
    pub distinct_optima: u32,
    /// Inícios que chegaram à melhor solução.
    pub best_solution_starts: u32,
    /// Iterações somadas.
    #[ts(type = "number")]
    pub iterations: u64,
    /// Avaliações do objetivo somadas.
    #[ts(type = "number")]
    pub evaluations: u64,
    /// Tolerância de viabilidade usada (unidades da amplitude observada de cada resposta).
    pub feasibility_tolerance: f64,
}

/// Limite real de um fator no domínio da busca.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DomainRange {
    /// Fator.
    pub factor_id: StableId,
    /// Nome.
    pub name: String,
    /// Menor valor real do domínio.
    pub min: f64,
    /// Maior valor real do domínio.
    pub max: f64,
    /// Menor valor real da região experimental.
    pub region_min: f64,
    /// Maior valor real da região experimental.
    pub region_max: f64,
}

/// Resultado da otimização.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimizationResult {
    /// Explicit fixed-block reference used by every fitted response, when supplied.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub block: Option<crate::surface::model::SurfaceBlockContext>,
    /// Ajustes da busca usados na malha de desejabilidade depois de salvar.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub grid_models: Option<Vec<SurfaceGridFit>>,
    /// Situação.
    pub status: OptimizationStatus,
    /// Candidatos viáveis, do melhor ao pior.
    pub candidates: Vec<OptimumCandidate>,
    /// Compromissos: melhor desejabilidade individual de cada resposta isolada.
    pub trade_offs: Vec<ResponseTradeOff>,
    /// Convergência.
    pub convergence: ConvergenceReport,
    /// Nomes dos fatores.
    pub factor_names: Vec<String>,
    /// Domínio da busca por fator.
    pub domain: Vec<DomainRange>,
    /// A busca estendeu o domínio além da região experimental por escolha explícita.
    pub extended: bool,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Fatos para a interpretação.
    pub facts: Vec<Fact>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Executa a otimização.
///
/// # Errors
/// [`CoreError::InvalidInput`] para objetivos, limites, domínio ou modelos inválidos.
pub fn optimize(request: &OptimizationRequest) -> Result<OptimizationResult, CoreError> {
    let problem = Problem::build(request)?;
    let options = &request.setup.search;
    let starts = multi_start(&problem, None, options.starts as usize, options.seed);

    let clusters = cluster(&problem, &starts, options.cluster_tolerance);
    let feasible_starts = starts
        .iter()
        .filter(|s| problem.evaluate(&s.x, None).violation == 0.0)
        .count();

    // Compromissos: cada resposta isolada, mesmas restrições.
    let mut trade_offs = Vec::with_capacity(problem.models.len());
    if problem.models.len() > 1 {
        for (i, m) in problem.models.iter().enumerate() {
            let alone = multi_start(
                &problem,
                Some(i),
                (options.starts as usize).min(TRADE_OFF_STARTS),
                options.seed.wrapping_add(1000 + i as u64),
            );
            let best = alone
                .iter()
                .filter(|s| problem.evaluate(&s.x, Some(i)).violation == 0.0)
                .min_by(|a, b| a.f.total_cmp(&b.f));
            trade_offs.push(ResponseTradeOff {
                response_id: m.id.clone(),
                name: m.name.clone(),
                best_alone: best.map(|s| problem.evaluate(&s.x, Some(i)).individual[i]),
                real: best.map_or_else(Vec::new, |s| {
                    s.x.iter()
                        .zip(&problem.levels)
                        .map(|(c, l)| l.decode(*c))
                        .collect()
                }),
            });
        }
    }
    let best_alone: Vec<Option<f64>> = trade_offs.iter().map(|t| t.best_alone).collect();

    let candidates: Vec<OptimumCandidate> = clusters
        .iter()
        .take(options.max_candidates as usize)
        .enumerate()
        .map(|(i, c)| {
            describe(
                &problem,
                &c.x,
                u32::try_from(i + 1).unwrap_or(u32::MAX),
                c.count,
                request.setup.alpha,
                &best_alone,
            )
        })
        .collect();

    let status = match candidates.first() {
        None => OptimizationStatus::Infeasible,
        Some(c) if c.global_desirability > 0.0 => OptimizationStatus::Found,
        Some(_) => OptimizationStatus::OnlyZeroDesirability,
    };
    let best_count = clusters.first().map_or(0, |c| c.count);
    let convergence = ConvergenceReport {
        algorithm: ALGORITHM.to_string(),
        seed: options.seed,
        starts: options.starts,
        converged_starts: u32::try_from(starts.iter().filter(|s| s.converged).count())
            .unwrap_or(u32::MAX),
        feasible_starts: u32::try_from(feasible_starts).unwrap_or(u32::MAX),
        distinct_optima: u32::try_from(clusters.len()).unwrap_or(u32::MAX),
        best_solution_starts: best_count,
        iterations: starts.iter().map(|s| s.iterations as u64).sum(),
        evaluations: starts.iter().map(|s| s.evaluations as u64).sum(),
        feasibility_tolerance: super::constraints::FEASIBILITY_TOLERANCE,
    };
    let domain = (0..problem.factor_ids.len())
        .map(|j| DomainRange {
            factor_id: problem.factor_ids[j].clone(),
            name: problem.factor_names[j].clone(),
            min: problem.levels[j].decode(problem.lo[j]),
            max: problem.levels[j].decode(problem.hi[j]),
            region_min: problem.levels[j].decode(problem.region_lo[j]),
            region_max: problem.levels[j].decode(problem.region_hi[j]),
        })
        .collect();

    let mut issues = Vec::new();
    let mut facts = vec![Fact::new("optimization.no_global_claim")];
    match status {
        OptimizationStatus::Infeasible => {
            issues.push(Issue::new("optimization.infeasible", Severity::Warning));
            facts.push(Fact::new("optimization.infeasible"));
        }
        OptimizationStatus::OnlyZeroDesirability => {
            facts.push(Fact::new("optimization.zero_desirability"));
        }
        OptimizationStatus::Found => {
            if best_count <= 1 && options.starts > 1 {
                facts.push(Fact::new("optimization.single_start"));
            }
            if let Some(best) = candidates.first().filter(|c| !c.at_bounds.is_empty()) {
                let names: Vec<&str> = best
                    .at_bounds
                    .iter()
                    .map(|j| problem.factor_names[*j].as_str())
                    .collect();
                facts.push(
                    Fact::new("optimization.boundary").with_param("factors", &names.join("; ")),
                );
            }
        }
    }
    let extrapolated = candidates.iter().filter(|c| c.extrapolated).count();
    if extrapolated > 0 {
        facts.push(Fact::new("optimization.extrapolated").with_param("count", &extrapolated));
    }
    if problem.models.len() > 1 && status == OptimizationStatus::Found {
        facts.push(Fact::new("optimization.compromise"));
    }
    facts.push(Fact::new("optimization.confirm_with_runs"));
    Ok(OptimizationResult {
        block: problem
            .models
            .first()
            .and_then(|model| model.prepared.block.clone()),
        grid_models: (!candidates.is_empty()).then(|| {
            problem
                .models
                .iter()
                .map(|model| SurfaceGridFit::from_prepared(&model.id, &model.prepared))
                .collect()
        }),
        status,
        candidates,
        trade_offs,
        convergence,
        factor_names: problem.factor_names.clone(),
        domain,
        extended: problem.extended,
        issues,
        facts,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}
