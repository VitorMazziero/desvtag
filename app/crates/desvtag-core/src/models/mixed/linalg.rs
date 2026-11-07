//! Álgebra dos blocos de covariância: Cholesky, resolução e determinante.
#[derive(Clone, Debug)]
pub(super) struct Cholesky {
    pub n: usize,
    lower: Vec<f64>,
    pub log_det: f64,
}
impl Cholesky {
    pub fn factor(a: &[f64], n: usize) -> Option<Self> {
        if n == 0 || a.len() != n * n || a.iter().any(|x| !x.is_finite()) {
            return None;
        }
        let mut l = vec![0.; n * n];
        let scale = (0..n).map(|i| a[i * n + i].abs()).fold(0., f64::max);
        if scale == 0. {
            return None;
        }
        for i in 0..n {
            for j in 0..=i {
                let s = a[i * n + j] - (0..j).map(|k| l[i * n + k] * l[j * n + k]).sum::<f64>();
                if i == j {
                    if s <= 1e-13 * scale {
                        return None;
                    }
                    l[i * n + j] = s.sqrt();
                } else {
                    l[i * n + j] = s / l[j * n + j];
                }
            }
        }
        let log_det = 2. * (0..n).map(|i| l[i * n + i].ln()).sum::<f64>();
        Some(Self {
            n,
            lower: l,
            log_det,
        })
    }
    pub fn solve(&self, b: &[f64]) -> Option<Vec<f64>> {
        if b.len() != self.n {
            return None;
        }
        let n = self.n;
        let mut x = b.to_vec();
        for i in 0..n {
            x[i] = (x[i] - (0..i).map(|j| self.lower[i * n + j] * x[j]).sum::<f64>())
                / self.lower[i * n + i];
        }
        for i in (0..n).rev() {
            x[i] = (x[i]
                - (i + 1..n)
                    .map(|j| self.lower[j * n + i] * x[j])
                    .sum::<f64>())
                / self.lower[i * n + i];
        }
        x.iter().all(|v| v.is_finite()).then_some(x)
    }
    pub fn inverse(&self) -> Option<Vec<f64>> {
        record_work!("mixed.information_inversions", 1);
        let n = self.n;
        let mut a = vec![0.; n * n];
        for j in 0..n {
            let mut e = vec![0.; n];
            e[j] = 1.;
            let col = self.solve(&e)?;
            for i in 0..n {
                a[i * n + j] = col[i];
            }
        }
        Some(a)
    }
}
pub(super) fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b)
        .map(|(x, y)| x * y)
        .collect::<crate::numeric::CompensatedSum>()
        .total()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn factor_solve_and_reject_non_positive_covariance() {
        let c = Cholesky::factor(&[4., 2., 2., 3.], 2).unwrap_or_else(|| unreachable!());
        let x = c.solve(&[8., 8.]).unwrap_or_else(|| unreachable!());
        assert!((x[0] - 1.).abs() < 1e-14 && (x[1] - 2.).abs() < 1e-14);
        assert!((c.log_det - 8_f64.ln()).abs() < 1e-14);
        assert!(Cholesky::factor(&[1., 2., 2., 1.], 2).is_none());
        assert!(Cholesky::factor(&[1., 1., 1., 1.], 2).is_none());
    }
}
