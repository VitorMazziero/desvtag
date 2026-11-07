//! Satterthwaite de contrastes e Fai–Cornelius de hipóteses conjuntas.
//! Informação observada REML; ausência de curvatura válida não recebe n−p.
use super::{
    covariance::Structure,
    estimation::{Data, Evaluator, Fit},
    linalg::{Cholesky, dot},
};
#[derive(Clone, Debug)]
pub(super) struct Information {
    pub inverse: Vec<f64>,
    pub covariance_derivatives: Vec<Vec<f64>>,
    pub dimension: usize,
    pub coefficients: usize,
}
impl Information {
    pub fn at(data: &Data, structure: Structure, fit: &Fit) -> Option<Self> {
        let evaluator = Evaluator::new(data, structure)?;
        let t = &fit.optimum.theta;
        let k = t.len();
        let p = fit.solution.beta.len();
        let mut hessian = vec![0.; k * k];
        let mut derivatives = Vec::with_capacity(k);
        let center = fit.solution.nll;
        for i in 0..k {
            let h = 5e-4 * (1. + t[i].abs());
            let mut plus = t.clone();
            let mut minus = t.clone();
            plus[i] += h;
            minus[i] -= h;
            let a = evaluator.solution(&plus, fit.boundary)?;
            let b = evaluator.solution(&minus, fit.boundary)?;
            hessian[i * k + i] = (a.nll - 2. * center + b.nll) / (h * h);
            derivatives.push(
                a.covariance
                    .iter()
                    .zip(&b.covariance)
                    .map(|(x, y)| (x - y) / (2. * h))
                    .collect(),
            );
            for j in 0..i {
                let g = 5e-4 * (1. + t[j].abs());
                let mut pp = plus.clone();
                let mut pm = plus.clone();
                let mut mp = minus.clone();
                let mut mm = minus.clone();
                pp[j] += g;
                pm[j] -= g;
                mp[j] += g;
                mm[j] -= g;
                let value = (evaluator.objective(&pp, fit.boundary)?
                    - evaluator.objective(&pm, fit.boundary)?
                    - evaluator.objective(&mp, fit.boundary)?
                    + evaluator.objective(&mm, fit.boundary)?)
                    / (4. * h * g);
                hessian[i * k + j] = value;
                hessian[j * k + i] = value;
            }
        }
        let inverse = Cholesky::factor(&hessian, k)?.inverse()?;
        Some(Self {
            inverse,
            covariance_derivatives: derivatives,
            dimension: k,
            coefficients: p,
        })
    }
    pub fn df(&self, contrast: &[f64], covariance: &[f64]) -> Option<f64> {
        let p = self.coefficients;
        if contrast.len() != p {
            return None;
        }
        let quadratic = |v: &[f64]| {
            (0..p)
                .map(|i| contrast[i] * dot(&v[i * p..(i + 1) * p], contrast))
                .sum::<f64>()
        };
        let variance = quadratic(covariance);
        if variance <= 0. {
            return None;
        }
        let g: Vec<f64> = self
            .covariance_derivatives
            .iter()
            .map(|v| quadratic(v))
            .collect();
        let k = self.dimension;
        let uncertainty = (0..k)
            .map(|i| g[i] * dot(&self.inverse[i * k..(i + 1) * k], &g))
            .sum::<f64>();
        if uncertainty <= 0. || !uncertainty.is_finite() {
            return None;
        }
        let df = 2. * variance * variance / uncertainty;
        (df.is_finite() && df > 0.).then_some(df)
    }
}
/// Symmetric Jacobi eigensystem; columns of vectors correspond to eigenvalues.
fn eigen(a: &[f64], n: usize) -> Option<(Vec<f64>, Vec<f64>)> {
    if n == 0 || a.len() != n * n {
        return None;
    }
    let mut a = a.to_vec();
    let mut vectors = vec![0.; n * n];
    for i in 0..n {
        vectors[i * n + i] = 1.;
    }
    for _ in 0..100 * n * n {
        let mut largest = 0.;
        let (mut i, mut j) = (0, 0);
        for r in 0..n {
            for c in r + 1..n {
                if a[r * n + c].abs() > largest {
                    largest = a[r * n + c].abs();
                    i = r;
                    j = c;
                }
            }
        }
        let scale = (0..n).map(|r| a[r * n + r].abs()).fold(0., f64::max);
        if largest <= 1e-13 * scale {
            return Some(((0..n).map(|r| a[r * n + r]).collect(), vectors));
        }
        let angle = 0.5 * (2. * a[i * n + j]).atan2(a[j * n + j] - a[i * n + i]);
        let (c, s) = (angle.cos(), angle.sin());
        let (aii, ajj, aij) = (a[i * n + i], a[j * n + j], a[i * n + j]);
        for k in 0..n {
            if k != i && k != j {
                let (ki, kj) = (a[k * n + i], a[k * n + j]);
                a[k * n + i] = c * ki - s * kj;
                a[i * n + k] = a[k * n + i];
                a[k * n + j] = s * ki + c * kj;
                a[j * n + k] = a[k * n + j];
            }
        }
        a[i * n + i] = c * c * aii - 2. * s * c * aij + s * s * ajj;
        a[j * n + j] = s * s * aii + 2. * s * c * aij + c * c * ajj;
        a[i * n + j] = 0.;
        a[j * n + i] = 0.;
        for k in 0..n {
            let (ki, kj) = (vectors[k * n + i], vectors[k * n + j]);
            vectors[k * n + i] = c * ki - s * kj;
            vectors[k * n + j] = s * ki + c * kj;
        }
    }
    None
}
#[derive(Debug)]
pub(super) struct Joint {
    pub f: f64,
    pub numerator_df: usize,
    pub denominator_df: Option<f64>,
}
pub(super) fn joint(
    columns: &[usize],
    fit: &Fit,
    information: Option<&Information>,
) -> Option<Joint> {
    let q = columns.len();
    let p = fit.solution.beta.len();
    let mut covariance = vec![0.; q * q];
    for i in 0..q {
        for j in 0..q {
            covariance[i * q + j] = fit.solution.covariance[columns[i] * p + columns[j]];
        }
    }
    let (eigenvalues, vectors) = eigen(&covariance, q)?;
    let largest = eigenvalues.iter().copied().fold(0., f64::max);
    if eigenvalues.iter().any(|v| *v <= 1e-12 * largest) {
        return None;
    }
    let mut f = 0.;
    let mut dfs = Vec::new();
    for i in 0..q {
        let mut contrast = vec![0.; p];
        for (j, &col) in columns.iter().enumerate() {
            contrast[col] = vectors[j * q + i];
        }
        f += dot(&contrast, &fit.solution.beta).powi(2) / eigenvalues[i];
        dfs.push(information.and_then(|info| info.df(&contrast, &fit.solution.covariance)));
    }
    let df = dfs
        .into_iter()
        .collect::<Option<Vec<f64>>>()
        .and_then(|nu| {
            if q == 1 {
                return Some(nu[0]);
            }
            let min = nu.iter().copied().fold(f64::INFINITY, f64::min);
            let max = nu.iter().copied().fold(0., f64::max);
            if max - min < 1e-7 {
                return Some(nu.iter().sum::<f64>() / q as f64);
            }
            if min <= 2. {
                return Some(2.);
            }
            let e = nu.iter().map(|v| v / (v - 2.)).sum::<f64>();
            let value = 2. * e / (e - q as f64);
            (value.is_finite() && value > 0.).then_some(value)
        });
    Some(Joint {
        f: f / q as f64,
        numerator_df: q,
        denominator_df: df,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn symmetric_eigenvectors_reconstruct_correlated_contrasts() {
        let a = [4., 1.5, 1.5, 2.];
        let (values, v) = eigen(&a, 2).unwrap_or_else(|| unreachable!());
        for i in 0..2 {
            for j in 0..2 {
                let reconstructed = (0..2)
                    .map(|k| v[i * 2 + k] * values[k] * v[j * 2 + k])
                    .sum::<f64>();
                assert!((reconstructed - a[i * 2 + j]).abs() < 1e-12);
            }
        }
    }
}
