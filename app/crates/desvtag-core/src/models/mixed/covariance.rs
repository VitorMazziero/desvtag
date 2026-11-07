//! Covariância por unidade; AR(1) usa a precisão de Markov sem matriz densa.
use super::linalg::{Cholesky, dot};
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Structure {
    CompoundSymmetry,
    Ar1,
    Unstructured,
}
#[derive(Clone, Debug)]
pub(super) enum Block {
    RandomIntercept {
        n: usize,
        unit: f64,
        residual: f64,
    },
    Ar1 {
        transitions: Vec<f64>,
        unit: f64,
        residual: f64,
    },
    Unstructured(Cholesky),
}
impl Block {
    pub fn new(
        structure: Structure,
        theta: &[f64],
        times: &[f64],
        occasions: &[f64],
        scale: f64,
        boundary: bool,
    ) -> Option<Self> {
        if times.is_empty()
            || !scale.is_finite()
            || scale <= 0.
            || theta.iter().any(|v| !v.is_finite())
        {
            return None;
        }
        let unit = if boundary {
            0.
        } else {
            theta.first()?.exp() * scale
        };
        let residual = theta.get(usize::from(!boundary))?.exp() * scale;
        match structure {
            Structure::CompoundSymmetry => Some(Self::RandomIntercept {
                n: times.len(),
                unit,
                residual,
            }),
            Structure::Ar1 => {
                let rho = theta.get(if boundary { 1 } else { 2 })?.tanh();
                if rho.abs() >= 1. {
                    return None;
                }
                let mut transitions = Vec::new();
                for pair in times.windows(2) {
                    let lag = pair[1] - pair[0];
                    let rounded = lag.round();
                    if !lag.is_finite()
                        || rounded < 1.
                        || (lag - rounded).abs() > 1e-8
                        || rounded > 9_007_199_254_740_991.
                    {
                        return None;
                    }
                    let v = rho.abs().powf(rounded)
                        * if rho < 0. && rounded % 2. == 1. {
                            -1.
                        } else {
                            1.
                        };
                    if 1. - v * v <= 0. {
                        return None;
                    }
                    transitions.push(v);
                }
                Some(Self::Ar1 {
                    transitions,
                    unit,
                    residual,
                })
            }
            Structure::Unstructured => {
                let q = occasions.len();
                if theta.len() != q * (q + 1) / 2 {
                    return None;
                }
                let mut lower = vec![0.; q * q];
                let mut k = 0;
                for i in 0..q {
                    for j in 0..=i {
                        lower[i * q + j] = if i == j { theta[k].exp() } else { theta[k] };
                        k += 1;
                    }
                }
                let indexes: Option<Vec<usize>> = times
                    .iter()
                    .map(|t| occasions.iter().position(|v| v == t))
                    .collect();
                let indexes = indexes?;
                let n = times.len();
                let mut v = vec![0.; n * n];
                for i in 0..n {
                    for j in 0..n {
                        let a = indexes[i];
                        let b = indexes[j];
                        v[i * n + j] = scale
                            * (0..=a.min(b))
                                .map(|k| lower[a * q + k] * lower[b * q + k])
                                .sum::<f64>();
                    }
                }
                Some(Self::Unstructured(Cholesky::factor(&v, n)?))
            }
        }
    }
    fn residual_precision(&self, b: &[f64]) -> Option<Vec<f64>> {
        if let Self::Ar1 {
            transitions,
            residual,
            ..
        } = self
        {
            if b.len() != transitions.len() + 1 {
                return None;
            }
            let mut out = vec![0.; b.len()];
            out[0] = b[0];
            for (i, &a) in transitions.iter().enumerate() {
                let v = (b[i + 1] - a * b[i]) / (1. - a * a);
                out[i + 1] += v;
                out[i] -= a * v;
            }
            out.iter_mut().for_each(|x| *x /= residual);
            Some(out)
        } else {
            None
        }
    }
    pub fn solve(&self, b: &[f64]) -> Option<Vec<f64>> {
        let out = match self {
            Self::RandomIntercept { n, unit, residual } => {
                if b.len() != *n {
                    return None;
                }
                let correction = unit * b.iter().sum::<f64>() / (residual + *n as f64 * unit);
                b.iter().map(|v| (v - correction) / residual).collect()
            }
            Self::Ar1 { unit, .. } => {
                let mut r = self.residual_precision(b)?;
                if *unit > 0. {
                    let one = vec![1.; b.len()];
                    let z = self.residual_precision(&one)?;
                    let correction = unit * dot(&one, &r) / (1. + unit * dot(&one, &z));
                    for (v, z) in r.iter_mut().zip(z) {
                        *v -= correction * z;
                    }
                }
                r
            }
            Self::Unstructured(c) => c.solve(b)?,
        };
        out.iter().all(|v| v.is_finite()).then_some(out)
    }
    pub fn log_det(&self) -> Option<f64> {
        let value = match self {
            Self::RandomIntercept { n, unit, residual } => {
                *n as f64 * residual.ln() + (unit / residual * *n as f64).ln_1p()
            }
            Self::Ar1 {
                transitions,
                unit,
                residual,
            } => {
                let n = transitions.len() + 1;
                let one = vec![1.; n];
                let z = self.residual_precision(&one)?;
                n as f64 * residual.ln()
                    + transitions.iter().map(|a| (-a * a).ln_1p()).sum::<f64>()
                    + (unit * dot(&one, &z)).ln_1p()
            }
            Self::Unstructured(c) => c.log_det,
        };
        value.is_finite().then_some(value)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn check(
        structure: Structure,
        theta: &[f64],
        times: &[f64],
        occasions: &[f64],
        matrix: &[f64],
        boundary: bool,
    ) {
        let b = Block::new(structure, theta, times, occasions, 1., boundary)
            .unwrap_or_else(|| unreachable!());
        let c = Cholesky::factor(matrix, times.len()).unwrap_or_else(|| unreachable!());
        assert!((b.log_det().unwrap_or(0.) - c.log_det).abs() < 1e-12);
        for j in 0..times.len() {
            let mut e = vec![0.; times.len()];
            e[j] = 1.;
            for (got, want) in b
                .solve(&e)
                .unwrap_or_default()
                .iter()
                .zip(c.solve(&e).unwrap_or_default())
            {
                assert!((got - want).abs() < 1e-12, "{got} != {want}");
            }
        }
    }
    #[test]
    fn ar1_markov_precision_handles_negative_rho_and_missing_occasions() {
        for rho in [-0.6_f64, 0., 0.6] {
            let t: [f64; 4] = [0., 1., 4., 6.];
            let mut v = vec![0.; 16];
            // Signed correlation for odd lags, including negative rho.
            for i in 0..4 {
                for j in 0..4 {
                    v[i * 4 + j] = 2. + 3. * rho.powi((t[i] - t[j]).abs() as i32);
                }
            }
            check(
                Structure::Ar1,
                &[2_f64.ln(), 3_f64.ln(), rho.atanh()],
                &t,
                &[],
                &v,
                false,
            );
        }
    }
    #[test]
    fn cs_and_unstructured_use_the_requested_submatrix() {
        check(
            Structure::CompoundSymmetry,
            &[2_f64.ln(), 3_f64.ln()],
            &[0., 1., 2.],
            &[],
            &[5., 2., 2., 2., 5., 2., 2., 2., 5.],
            false,
        );
        check(
            Structure::Unstructured,
            &[0., 0.5, 2_f64.ln(), 0.2, -0.1, 0.5_f64.ln()],
            &[0., 2.],
            &[0., 1., 2.],
            &[1., 0.2, 0.2, 0.3],
            false,
        );
    }
    #[test]
    fn rejects_noninteger_and_duplicate_ar1_lags() {
        for t in [[0., 0.5], [0., 0.], [1., 0.]] {
            assert!(Block::new(Structure::Ar1, &[0., 0., 0.3], &t, &[], 1., false).is_none());
        }
    }
}
