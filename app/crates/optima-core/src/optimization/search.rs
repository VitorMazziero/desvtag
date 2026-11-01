//! Busca: hipercubo latino com semente (PCG32) e Nelder–Mead com projeção nos limites.
//!
//! A busca é **local com vários inícios**: cada início converge a um ótimo local dentro do domínio
//! (os vértices do simplex são projetados nos limites). Não há garantia de ótimo global; a
//! confiança vem da concordância entre inícios, informada no relatório de convergência.

use super::constraints::Problem;
use crate::designs::randomization::{Pcg32, permutation};

/// Resultado de um início.
#[derive(Debug, Clone)]
pub(crate) struct Start {
    pub x: Vec<f64>,
    pub f: f64,
    pub iterations: usize,
    pub evaluations: usize,
    pub converged: bool,
}

/// Tolerância do tamanho do simplex (unidades codificadas).
const X_TOLERANCE: f64 = 1e-9;
/// Tolerância da dispersão da função.
const F_TOLERANCE: f64 = 1e-12;

/// Pontos do hipercubo latino em `[lo, hi]`, determinísticos para a semente.
pub(crate) fn latin_hypercube(lo: &[f64], hi: &[f64], n: usize, seed: u64) -> Vec<Vec<f64>> {
    let k = lo.len();
    let mut jitter = Pcg32::new(seed ^ 0x9e37_79b9_7f4a_7c15);
    let columns: Vec<Vec<usize>> = (0..k)
        .map(|j| permutation(n, seed.wrapping_add(j as u64 + 1)))
        .collect();
    (0..n)
        .map(|i| {
            (0..k)
                .map(|j| {
                    let r = f64::from(jitter.next_u32()) / 4_294_967_296.0;
                    let u = (columns[j][i] as f64 + r) / n as f64;
                    lo[j] + u * (hi[j] - lo[j])
                })
                .collect()
        })
        .collect()
}

fn clamp(x: &mut [f64], lo: &[f64], hi: &[f64]) {
    for ((v, l), h) in x.iter_mut().zip(lo).zip(hi) {
        *v = v.clamp(*l, *h);
    }
}

/// Nelder–Mead (coeficientes 1, 2, 0,5 e 0,5) com projeção nos limites.
pub(crate) fn nelder_mead(
    f: &mut dyn FnMut(&[f64]) -> f64,
    x0: &[f64],
    lo: &[f64],
    hi: &[f64],
    max_iterations: usize,
) -> Start {
    let n = x0.len();
    let mut evaluations = 0_usize;
    let mut eval = |x: &[f64], evals: &mut usize| {
        *evals += 1;
        f(x)
    };
    let mut simplex: Vec<(Vec<f64>, f64)> = Vec::with_capacity(n + 1);
    let mut start = x0.to_vec();
    clamp(&mut start, lo, hi);
    let f0 = eval(&start, &mut evaluations);
    simplex.push((start.clone(), f0));
    for i in 0..n {
        let mut p = start.clone();
        let step = 0.1 * (hi[i] - lo[i]);
        if step > 0.0 {
            p[i] = if p[i] + step <= hi[i] {
                p[i] + step
            } else {
                p[i] - step
            };
        }
        clamp(&mut p, lo, hi);
        let fp = eval(&p, &mut evaluations);
        simplex.push((p, fp));
    }
    let mut iterations = 0;
    let mut converged = false;
    while iterations < max_iterations {
        iterations += 1;
        simplex.sort_by(|a, b| a.1.total_cmp(&b.1));
        let best = simplex[0].clone();
        let worst = simplex[n].clone();
        let size = simplex[1..]
            .iter()
            .map(|(p, _)| {
                p.iter()
                    .zip(&best.0)
                    .map(|(a, b)| (a - b).abs())
                    .fold(0.0, f64::max)
            })
            .fold(0.0, f64::max);
        if size <= X_TOLERANCE && worst.1 - best.1 <= F_TOLERANCE {
            converged = true;
            break;
        }
        let mut centroid = vec![0.0; n];
        for (p, _) in &simplex[..n] {
            for (c, v) in centroid.iter_mut().zip(p) {
                *c += v / n as f64;
            }
        }
        let towards = |from: &[f64], to: &[f64], t: f64| -> Vec<f64> {
            let mut p: Vec<f64> = from.iter().zip(to).map(|(a, b)| a + t * (b - a)).collect();
            clamp(&mut p, lo, hi);
            p
        };
        let reflected = towards(&centroid, &worst.0, -1.0);
        let fr = eval(&reflected, &mut evaluations);
        if fr < best.1 {
            let expanded = towards(&centroid, &worst.0, -2.0);
            let fe = eval(&expanded, &mut evaluations);
            simplex[n] = if fe < fr {
                (expanded, fe)
            } else {
                (reflected, fr)
            };
        } else if fr < simplex[n - 1].1 {
            simplex[n] = (reflected, fr);
        } else {
            let contracted = if fr < worst.1 {
                towards(&centroid, &reflected, 0.5)
            } else {
                towards(&centroid, &worst.0, 0.5)
            };
            let fc = eval(&contracted, &mut evaluations);
            if fc < worst.1.min(fr) {
                simplex[n] = (contracted, fc);
            } else {
                for vertex in simplex.iter_mut().skip(1) {
                    let shrunk = towards(&best.0, &vertex.0, 0.5);
                    let fs = eval(&shrunk, &mut evaluations);
                    *vertex = (shrunk, fs);
                }
            }
        }
    }
    simplex.sort_by(|a, b| a.1.total_cmp(&b.1));
    let (x, fx) = simplex.swap_remove(0);
    Start {
        x,
        f: fx,
        iterations,
        evaluations,
        converged,
    }
}

/// Executa todos os inícios (hipercubo latino) sobre o problema.
pub(crate) fn multi_start(
    problem: &Problem,
    only: Option<usize>,
    starts: usize,
    seed: u64,
) -> Vec<Start> {
    let k = problem.lo.len();
    let max_iterations = 200 * k.max(1);
    latin_hypercube(&problem.lo, &problem.hi, starts, seed)
        .iter()
        .map(|x0| {
            let mut objective = |x: &[f64]| problem.objective(x, only);
            nelder_mead(&mut objective, x0, &problem.lo, &problem.hi, max_iterations)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn latin_hypercube_stratifies_every_dimension_and_is_reproducible() {
        let (lo, hi) = (vec![-1.0, 10.0], vec![1.0, 20.0]);
        let pts = latin_hypercube(&lo, &hi, 8, 42);
        assert_eq!(pts, latin_hypercube(&lo, &hi, 8, 42));
        assert_ne!(pts, latin_hypercube(&lo, &hi, 8, 43));
        for j in 0..2 {
            let mut strata: Vec<usize> = pts
                .iter()
                .map(|p| (((p[j] - lo[j]) / (hi[j] - lo[j])) * 8.0).floor() as usize)
                .collect();
            strata.sort_unstable();
            assert_eq!(strata, (0..8).collect::<Vec<_>>());
        }
    }

    #[test]
    fn nelder_mead_finds_an_interior_minimum_and_respects_bounds() {
        let mut f = |x: &[f64]| (x[0] - 0.3).powi(2) + 2.0 * (x[1] + 0.2).powi(2);
        let r = nelder_mead(&mut f, &[0.9, 0.9], &[-1.0, -1.0], &[1.0, 1.0], 400);
        assert!(r.converged);
        assert!(
            (r.x[0] - 0.3).abs() < 1e-5 && (r.x[1] + 0.2).abs() < 1e-5,
            "{:?}",
            r.x
        );
        // O mínimo irrestrito está fora do domínio: a solução fica na fronteira.
        let mut g = |x: &[f64]| (x[0] - 3.0).powi(2) + x[1] * x[1];
        let r = nelder_mead(&mut g, &[0.0, 0.5], &[-1.0, -1.0], &[1.0, 1.0], 400);
        assert!(
            (r.x[0] - 1.0).abs() < 1e-6 && r.x[1].abs() < 1e-5,
            "{:?}",
            r.x
        );
    }
}
