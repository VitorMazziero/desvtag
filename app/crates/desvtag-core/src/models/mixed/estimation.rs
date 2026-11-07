//! GLS e REML por blocos, sem formar uma matriz n×n.
use super::covariance::{Block, Structure};
use super::linalg::{Cholesky, dot};
use super::optimizer::{Optimum, minimize};
use crate::models::resource_budget::WorkBudget;
#[derive(Clone, Debug)]
pub(super) struct Data {
    pub budget: WorkBudget,
    pub x: Vec<Vec<f64>>,
    pub y: Vec<f64>,
    pub groups: Vec<Vec<usize>>,
    pub times: Vec<f64>,
    pub occasions: Vec<f64>,
    pub scale: f64,
}
#[derive(Clone, Debug)]
pub(super) struct Solution {
    pub beta: Vec<f64>,
    pub covariance: Vec<f64>,
    pub nll: f64,
    pub blocks: Vec<Block>,
}
#[derive(Clone, Debug)]
pub(super) struct Fit {
    pub optimum: Optimum,
    pub solution: Solution,
    pub boundary: bool,
}
struct GroupData {
    times: Vec<f64>,
    y: Vec<f64>,
    columns: Vec<Vec<f64>>,
}
struct Evaluation {
    beta: Vec<f64>,
    information: Cholesky,
    nll: f64,
    blocks: Vec<Block>,
}
pub(super) struct Evaluator<'a> {
    data: &'a Data,
    structure: Structure,
    groups: Vec<GroupData>,
    p: usize,
    cost: u64,
}
impl<'a> Evaluator<'a> {
    pub fn new(data: &'a Data, structure: Structure) -> Option<Self> {
        record_work!("mixed.prepare_calls", 1);
        let n = data.y.len();
        let p = data.x.first()?.len();
        if n <= p || data.x.len() != n || data.x.iter().any(|r| r.len() != p) {
            return None;
        }
        let cost = data
            .groups
            .iter()
            .try_fold(0_u64, |sum, group| {
                sum.checked_add((group.len() as u64).checked_pow(3)?)
            })
            .and_then(|blocks| blocks.checked_add((p as u64).checked_pow(3)?))
            .and_then(|value| {
                value.checked_add((n as u64).checked_mul((p as u64).checked_pow(2)?)?)
            })
            .unwrap_or(u64::MAX);
        let groups = data
            .groups
            .iter()
            .map(|group| GroupData {
                times: group.iter().map(|&r| data.times[r]).collect(),
                y: group.iter().map(|&r| data.y[r]).collect(),
                columns: (0..p)
                    .map(|j| group.iter().map(|&r| data.x[r][j]).collect())
                    .collect(),
            })
            .collect();
        Some(Self {
            cost,
            data,
            structure,
            groups,
            p,
        })
    }
    fn calculate(&self, theta: &[f64], boundary: bool) -> Option<Evaluation> {
        if !self.data.budget.charge(self.cost) {
            return None;
        }
        record_work!("mixed.evaluate_calls", 1);
        let data = self.data;
        let n = data.y.len();
        let p = self.p;
        let mut xtwx = vec![0.; p * p];
        let mut xtwy = vec![0.; p];
        let mut log_det = 0.;
        let mut blocks = Vec::with_capacity(data.groups.len());
        for group in &self.groups {
            record_work!("mixed.covariance_blocks", 1);
            let block = Block::new(
                self.structure,
                theta,
                &group.times,
                &data.occasions,
                data.scale,
                boundary,
            )?;
            log_det += block.log_det()?;
            let wy = block.solve(&group.y)?;
            let columns = &group.columns;
            let weighted: Option<Vec<Vec<f64>>> = columns.iter().map(|c| block.solve(c)).collect();
            let weighted = weighted?;
            for j in 0..p {
                xtwy[j] += dot(&columns[j], &wy);
                for k in 0..p {
                    xtwx[j * p + k] += dot(&columns[j], &weighted[k]);
                }
            }
            blocks.push(block);
        }
        let information = Cholesky::factor(&xtwx, p)?;
        let beta = information.solve(&xtwy)?;
        let mut rss = 0.;
        // Residual quadratic form avoids cancellation y'Wy - beta'X'Wy.
        for (group, block) in data.groups.iter().zip(&blocks) {
            let residual: Vec<f64> = group
                .iter()
                .map(|&r| data.y[r] - dot(&data.x[r], &beta))
                .collect();
            rss += dot(&residual, &block.solve(&residual)?);
        }
        let nll = 0.5
            * (log_det
                + information.log_det
                + rss
                + (n - p) as f64 * (2. * std::f64::consts::PI).ln());
        if !nll.is_finite() || rss <= 0. {
            return None;
        }
        Some(Evaluation {
            beta,
            information,
            nll,
            blocks,
        })
    }
    pub fn objective(&self, theta: &[f64], boundary: bool) -> Option<f64> {
        self.calculate(theta, boundary).map(|value| value.nll)
    }
    pub fn solution(&self, theta: &[f64], boundary: bool) -> Option<Solution> {
        let value = self.calculate(theta, boundary)?;
        Some(Solution {
            beta: value.beta,
            covariance: value.information.inverse()?,
            nll: value.nll,
            blocks: value.blocks,
        })
    }
}
#[cfg(test)]
pub(super) fn evaluate(
    data: &Data,
    structure: Structure,
    theta: &[f64],
    boundary: bool,
) -> Option<Solution> {
    Evaluator::new(data, structure)?.solution(theta, boundary)
}
pub(super) fn fit(data: &Data, structure: Structure) -> Option<Fit> {
    let evaluator = Evaluator::new(data, structure)?;
    let mut candidates = Vec::new();
    let starts = match structure {
        Structure::CompoundSymmetry => vec![vec![0., 0.], vec![-2., 0.], vec![1., -1.]],
        Structure::Ar1 => [-0.65_f64, 0., 0.65]
            .iter()
            .flat_map(|rho| [vec![0., 0., rho.atanh()], vec![-2., 0., rho.atanh()]])
            .collect(),
        Structure::Unstructured => {
            let q = data.occasions.len();
            let mut identity = vec![0.; q * (q + 1) / 2];
            let mut k = 0;
            let mut correlated = identity.clone();
            for i in 0..q {
                for j in 0..=i {
                    if i != j {
                        correlated[k] = 0.3;
                    }
                    k += 1;
                }
            }
            // Different diagonal scales, with no imputed observations.
            identity.iter_mut().for_each(|v| *v = 0.);
            vec![identity, correlated]
        }
    };
    for boundary in [false, true] {
        if boundary && structure == Structure::Unstructured {
            continue;
        }
        let objective = |theta: &[f64]| evaluator.objective(theta, boundary);
        for start in &starts {
            let initial = if boundary {
                start[1..].to_vec()
            } else {
                start.clone()
            };
            if let Some(optimum) = minimize(&objective, &initial, 400).filter(|o| o.converged)
                && let Some(solution) = evaluator.solution(&optimum.theta, boundary)
            {
                candidates.push(Fit {
                    optimum,
                    solution,
                    boundary,
                });
            }
        }
    }
    candidates.sort_by(|a, b| a.optimum.value.total_cmp(&b.optimum.value));
    let best = candidates.first()?.clone();
    // The boundary model wins numerical ties, rather than reporting an arbitrary tiny variance.
    if structure != Structure::Unstructured
        && let Some(zero) = candidates
            .into_iter()
            .find(|c| c.boundary && c.optimum.value <= best.optimum.value + 1e-7)
    {
        return Some(zero);
    }
    Some(best)
}
