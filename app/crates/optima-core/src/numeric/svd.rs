//! Valores singulares por Jacobi unilateral (Hestenes), para diagnóstico de condicionamento (C03).
//!
//! Escolhido por exatidão relativa e simplicidade (sem bidiagonalização). Usado só para
//! diagnóstico (número de condição), não para ajustar modelos: a regressão usa QR.

use super::Matrix;

/// Valores singulares de `a` em ordem decrescente (para `m ≥ n`; se `m < n`, usa-se a transposta).
#[must_use]
pub fn singular_values(a: &Matrix) -> Vec<f64> {
    let work = if a.rows() >= a.cols() {
        a.clone()
    } else {
        a.transpose()
    };
    let (m, n) = (work.rows(), work.cols());
    let mut u = work;
    for _sweep in 0..60 {
        let mut rotated = false;
        for p in 0..n {
            for q in (p + 1)..n {
                let (mut alpha, mut beta, mut gamma) = (0.0, 0.0, 0.0);
                for i in 0..m {
                    alpha += u[(i, p)] * u[(i, p)];
                    beta += u[(i, q)] * u[(i, q)];
                    gamma += u[(i, p)] * u[(i, q)];
                }
                if gamma == 0.0 || gamma.abs() <= 1e-15 * (alpha * beta).sqrt() {
                    continue;
                }
                rotated = true;
                let zeta = (beta - alpha) / (2.0 * gamma);
                let t = zeta.signum() / (zeta.abs() + (1.0 + zeta * zeta).sqrt());
                let c = 1.0 / (1.0 + t * t).sqrt();
                let s = c * t;
                for i in 0..m {
                    let (up, uq) = (u[(i, p)], u[(i, q)]);
                    u[(i, p)] = c * up - s * uq;
                    u[(i, q)] = s * up + c * uq;
                }
            }
        }
        if !rotated {
            break;
        }
    }
    let mut values: Vec<f64> = (0..n)
        .map(|j| (0..m).map(|i| u[(i, j)].powi(2)).sum::<f64>().sqrt())
        .collect();
    values.sort_by(|x, y| y.total_cmp(x));
    values
}

/// Número de condição `σ_max / σ_min` (infinito se `σ_min = 0`); `None` para matriz vazia.
#[must_use]
pub fn condition_number(a: &Matrix) -> Option<f64> {
    let s = singular_values(a);
    let (max, min) = (*s.first()?, *s.last()?);
    Some(if min > 0.0 { max / min } else { f64::INFINITY })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diagonal_and_rank_one_matrices_have_the_expected_singular_values() {
        let d =
            Matrix::from_rows(&[vec![3.0, 0.0], vec![0.0, 4.0]]).unwrap_or_else(|| unreachable!());
        let s = singular_values(&d);
        assert!((s[0] - 4.0).abs() < 1e-14 && (s[1] - 3.0).abs() < 1e-14);
        // [[1,1],[1,1]] tem posto 1: valores singulares 2 e 0, condição infinita.
        let ones =
            Matrix::from_rows(&[vec![1.0, 1.0], vec![1.0, 1.0]]).unwrap_or_else(|| unreachable!());
        let s = singular_values(&ones);
        assert!((s[0] - 2.0).abs() < 1e-14 && s[1].abs() < 1e-14);
    }

    #[test]
    fn matches_high_precision_singular_values_of_a_3x2_matrix() {
        // A = [[1,2],[3,4],[5,6]]. Referência: mpmath (40 dígitos), autovalores de AᵀA:
        // 9,5255180915651082153 e 0,51430058065864427249 (NumPy 2.5.4 concorda).
        let a = Matrix::from_rows(&[vec![1.0, 2.0], vec![3.0, 4.0], vec![5.0, 6.0]])
            .unwrap_or_else(|| unreachable!());
        let s = singular_values(&a);
        assert!(
            ((s[0] - 9.525_518_091_565_108) / 9.525_518_091_565_108).abs() < 1e-14,
            "{s:?}"
        );
        assert!(
            ((s[1] - 0.514_300_580_658_644_3) / 0.514_300_580_658_644_3).abs() < 1e-14,
            "{s:?}"
        );
        let cond = condition_number(&a).unwrap_or(0.0);
        assert!(((cond - 18.521_305_341_258_145) / 18.521_305_341_258_145).abs() < 1e-13);
    }

    #[test]
    fn works_for_wide_matrices() {
        let a = Matrix::from_rows(&[vec![1.0, 2.0, 3.0]]).unwrap_or_else(|| unreachable!());
        assert!((singular_values(&a)[0] - 14.0_f64.sqrt()).abs() < 1e-14);
    }
}
