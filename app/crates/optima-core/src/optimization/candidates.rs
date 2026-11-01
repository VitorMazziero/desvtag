//! Candidatos: agrupamento dos ótimos locais, ordenação e previsões com incerteza.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::constraints::Problem;
use super::search::Start;
use crate::domain::StableId;
use crate::models::prediction::{Prediction, predict_row};
use crate::surface::terms::model_row;

/// Previsão de uma resposta em um candidato.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResponsePrediction {
    /// Resposta.
    pub response_id: StableId,
    /// Nome da resposta.
    pub name: String,
    /// Valor previsto e intervalos (de confiança da média e de predição de uma nova observação).
    pub prediction: Prediction,
    /// Desejabilidade individual no valor previsto.
    pub desirability: f64,
    /// Perda em relação à melhor desejabilidade individual obtida buscando só esta resposta
    /// (compromisso entre respostas); `None` quando a busca individual não foi feita.
    pub loss_vs_best_alone: Option<f64>,
}

/// Solução candidata.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OptimumCandidate {
    /// Posição na ordenação (1 = melhor).
    pub rank: u32,
    /// Valores codificados dos fatores.
    pub coded: Vec<f64>,
    /// Valores reais dos fatores.
    pub real: Vec<f64>,
    /// Desejabilidade global.
    pub global_desirability: f64,
    /// Previsões por resposta.
    pub predictions: Vec<ResponsePrediction>,
    /// Fora da região experimental (intervalo observado ou extrapolação oculta).
    pub extrapolated: bool,
    /// Alavancagem relativa máxima (`1` = igual à maior dos ensaios).
    pub leverage_ratio: f64,
    /// Fatores (índices) que estão em um limite do domínio.
    #[ts(type = "Array<number>")]
    pub at_bounds: Vec<usize>,
    /// Quantos inícios convergiram para esta solução.
    pub starts: u32,
    /// Violação máxima das restrições (≤ tolerância registrada).
    pub violation: f64,
}

/// Ótimo local agrupado.
#[derive(Debug, Clone)]
pub(crate) struct Cluster {
    pub x: Vec<f64>,
    pub count: u32,
}

/// Agrupa os inícios viáveis (distância euclidiana codificada ≤ `tolerance`) e ordena do melhor ao
/// pior valor da função.
pub(crate) fn cluster(problem: &Problem, starts: &[Start], tolerance: f64) -> Vec<Cluster> {
    let mut order: Vec<&Start> = starts
        .iter()
        .filter(|s| problem.evaluate(&s.x, None).violation == 0.0)
        .collect();
    order.sort_by(|a, b| a.f.total_cmp(&b.f));
    let mut clusters: Vec<Cluster> = Vec::new();
    for s in order {
        let distance = |c: &Cluster| {
            c.x.iter()
                .zip(&s.x)
                .map(|(a, b)| (a - b) * (a - b))
                .sum::<f64>()
                .sqrt()
        };
        match clusters.iter_mut().find(|c| distance(c) <= tolerance) {
            Some(c) => c.count += 1,
            None => clusters.push(Cluster {
                x: s.x.clone(),
                count: 1,
            }),
        }
    }
    clusters
}

/// Constrói o candidato (previsões, intervalos, extrapolação) para um ponto codificado.
pub(crate) fn describe(
    problem: &Problem,
    x: &[f64],
    rank: u32,
    starts: u32,
    alpha: f64,
    best_alone: &[Option<f64>],
) -> OptimumCandidate {
    let e = problem.evaluate(x, None);
    let predictions = problem
        .models
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let row = model_row(&m.prepared.monomials, x);
            ResponsePrediction {
                response_id: m.id.clone(),
                name: m.name.clone(),
                prediction: predict_row(&m.prepared.model, &row, 1.0 - alpha),
                desirability: e.individual[i],
                loss_vs_best_alone: best_alone
                    .get(i)
                    .copied()
                    .flatten()
                    .map(|best| (best - e.individual[i]).max(0.0)),
            }
        })
        .collect();
    let at_bounds = x
        .iter()
        .enumerate()
        .filter(|(j, c)| {
            (**c - problem.lo[*j]).abs() <= 1e-6 || (**c - problem.hi[*j]).abs() <= 1e-6
        })
        .map(|(j, _)| j)
        .collect();
    OptimumCandidate {
        rank,
        coded: x.to_vec(),
        real: x
            .iter()
            .zip(&problem.levels)
            .map(|(c, l)| l.decode(*c))
            .collect(),
        global_desirability: e.global,
        predictions,
        extrapolated: e.extrapolated,
        leverage_ratio: e.leverage_ratio,
        at_bounds,
        starts,
        violation: e.violation,
    }
}
