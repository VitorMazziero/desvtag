//! Decomposição QR de Householder com pivoteamento de colunas (C03).
//!
//! `A·P = Q·R`. As colunas são normalizadas (norma 1) antes da fatoração, de modo que a
//! decisão de posto não dependa da escala das variáveis; o pivoteamento escolhe, a cada passo,
//! a coluna com maior norma restante, e o posto é o número de passos em que a norma restante
//! ainda supera `tol` vezes a primeira. Regressões **não** usam a inversão explícita de
//! `AᵀA`: resolvem-se `R·b = Qᵀ·y` e `(RᵀR)⁻¹` a partir de `R`.

use super::Matrix;

/// Resultado da fatoração.
#[derive(Debug, Clone)]
pub struct QrDecomposition {
    /// `R` triangular superior (apenas o bloco `min(m, n) × n` é significativo), em colunas **normalizadas** e permutadas.
    pub r: Matrix,
    /// Reflexões de Householder, necessárias para aplicar `Qᵀ`.
    reflectors: Vec<Vec<f64>>,
    /// `perm[k]` = índice original da coluna na posição `k`.
    pub perm: Vec<usize>,
    /// Norma original de cada coluna (índices originais); colunas nulas têm norma 0.
    pub column_norms: Vec<f64>,
    /// Posto numérico.
    pub rank: usize,
    /// Tolerância relativa usada.
    pub tol: f64,
}

/// Tolerância relativa padrão do posto: `max(m, n) · ε`.
#[must_use]
pub fn default_rank_tolerance(rows: usize, cols: usize) -> f64 {
    rows.max(cols) as f64 * f64::EPSILON
}

impl QrDecomposition {
    /// Fatora `a` (`m × n`, `m ≥ 1`) com pivoteamento de colunas.
    #[must_use]
    pub fn new(a: &Matrix, tol: f64) -> Self {
        let (m, n) = (a.rows(), a.cols());
        let mut work = a.clone();
        let mut perm: Vec<usize> = (0..n).collect();
        let mut column_norms = vec![0.0; n];
        for j in 0..n {
            let norm = (0..m).map(|i| work[(i, j)].powi(2)).sum::<f64>().sqrt();
            column_norms[j] = norm;
            if norm > 0.0 {
                for i in 0..m {
                    work[(i, j)] /= norm;
                }
            }
        }
        let steps = m.min(n);
        let mut reflectors = Vec::with_capacity(steps);
        let mut first_diag = 0.0_f64;
        let mut rank = 0;
        for k in 0..steps {
            // Pivô: coluna restante de maior norma.
            let (mut best, mut best_norm) = (k, -1.0);
            for j in k..n {
                let norm = (k..m).map(|i| work[(i, j)].powi(2)).sum::<f64>();
                if norm > best_norm {
                    best_norm = norm;
                    best = j;
                }
            }
            if best != k {
                for i in 0..m {
                    let tmp = work[(i, k)];
                    work[(i, k)] = work[(i, best)];
                    work[(i, best)] = tmp;
                }
                perm.swap(k, best);
            }
            let norm = (k..m).map(|i| work[(i, k)].powi(2)).sum::<f64>().sqrt();
            if k == 0 {
                first_diag = norm;
            }
            // Reflexão de Householder que zera work[k+1.., k].
            let alpha = if work[(k, k)] > 0.0 { -norm } else { norm };
            let mut v: Vec<f64> = (k..m).map(|i| work[(i, k)]).collect();
            if let Some(first) = v.first_mut() {
                *first -= alpha;
            }
            let vnorm2: f64 = v.iter().map(|x| x * x).sum();
            if vnorm2 > 0.0 {
                for j in k..n {
                    let dot: f64 = v
                        .iter()
                        .enumerate()
                        .map(|(idx, vi)| vi * work[(k + idx, j)])
                        .sum();
                    let factor = 2.0 * dot / vnorm2;
                    for (idx, vi) in v.iter().enumerate() {
                        work[(k + idx, j)] -= factor * vi;
                    }
                }
            }
            reflectors.push(v);
            if first_diag > 0.0 && work[(k, k)].abs() > tol * first_diag {
                rank = k + 1;
            }
        }
        Self {
            r: work,
            reflectors,
            perm,
            column_norms,
            rank,
            tol,
        }
    }

    /// Aplica `Qᵀ` a `y` (comprimento `m`).
    #[must_use]
    pub fn apply_qt(&self, y: &[f64]) -> Vec<f64> {
        let mut out = y.to_vec();
        for (k, v) in self.reflectors.iter().enumerate() {
            let vnorm2: f64 = v.iter().map(|x| x * x).sum();
            if vnorm2 == 0.0 {
                continue;
            }
            let dot: f64 = v
                .iter()
                .enumerate()
                .map(|(idx, vi)| vi * out[k + idx])
                .sum();
            let factor = 2.0 * dot / vnorm2;
            for (idx, vi) in v.iter().enumerate() {
                out[k + idx] -= factor * vi;
            }
        }
        out
    }

    /// Aplica `Q` a `z` (comprimento `m`).
    #[must_use]
    pub fn apply_q(&self, z: &[f64]) -> Vec<f64> {
        let mut out = z.to_vec();
        for (k, v) in self.reflectors.iter().enumerate().rev() {
            let vnorm2: f64 = v.iter().map(|x| x * x).sum();
            if vnorm2 == 0.0 {
                continue;
            }
            let dot: f64 = v
                .iter()
                .enumerate()
                .map(|(idx, vi)| vi * out[k + idx])
                .sum();
            let factor = 2.0 * dot / vnorm2;
            for (idx, vi) in v.iter().enumerate() {
                out[k + idx] -= factor * vi;
            }
        }
        out
    }

    /// Resolve `R[..rank, ..rank]·b = c[..rank]` por substituição regressiva.
    #[must_use]
    pub fn solve_upper(&self, c: &[f64]) -> Vec<f64> {
        let p = self.rank;
        let mut b = vec![0.0; p];
        for i in (0..p).rev() {
            let mut s = c[i];
            for (j, bj) in b.iter().enumerate().skip(i + 1) {
                s -= self.r[(i, j)] * bj;
            }
            b[i] = s / self.r[(i, i)];
        }
        b
    }

    /// `(RᵀR)⁻¹` do bloco de posto: `R⁻¹·R⁻ᵀ`, calculado por substituição (sem inverter `AᵀA`).
    #[must_use]
    pub fn xtx_inverse(&self) -> Matrix {
        let p = self.rank;
        // R⁻¹ triangular superior.
        let mut rinv = Matrix::zeros(p, p);
        for col in 0..p {
            let mut e = vec![0.0; p];
            e[col] = 1.0;
            let x = self.solve_upper(&e);
            for (row, v) in x.iter().enumerate() {
                rinv[(row, col)] = *v;
            }
        }
        rinv.mul(&rinv.transpose())
            .unwrap_or_else(|| Matrix::zeros(p, p))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mat(rows: &[&[f64]]) -> Matrix {
        Matrix::from_rows(&rows.iter().map(|r| r.to_vec()).collect::<Vec<_>>())
            .unwrap_or_else(|| unreachable!())
    }

    #[test]
    fn q_is_orthogonal_and_reproduces_the_matrix() {
        let a = mat(&[&[1.0, 2.0], &[3.0, 4.0], &[5.0, 6.0], &[7.0, 9.0]]);
        let qr = QrDecomposition::new(&a, default_rank_tolerance(4, 2));
        assert_eq!(qr.rank, 2);
        let y = [1.0, -2.0, 0.5, 3.0];
        let back = qr.apply_q(&qr.apply_qt(&y));
        for (x, z) in y.iter().zip(&back) {
            assert!((x - z).abs() < 1e-14);
        }
        // Norma preservada por Qᵀ.
        let n1: f64 = y.iter().map(|v| v * v).sum();
        let n2: f64 = qr.apply_qt(&y).iter().map(|v| v * v).sum();
        assert!((n1 - n2).abs() < 1e-13);
    }

    #[test]
    fn solves_a_least_squares_problem_exactly_when_the_model_fits() {
        // y = 2 + 3x exato: colunas [1, x].
        let a = mat(&[&[1.0, 0.0], &[1.0, 1.0], &[1.0, 2.0], &[1.0, 3.0]]);
        let y = [2.0, 5.0, 8.0, 11.0];
        let qr = QrDecomposition::new(&a, default_rank_tolerance(4, 2));
        let c = qr.apply_qt(&y);
        let scaled = qr.solve_upper(&c);
        // Desfaz a normalização das colunas e a permutação.
        let mut b = [0.0; 2];
        for (k, v) in scaled.iter().enumerate() {
            b[qr.perm[k]] = v / qr.column_norms[qr.perm[k]];
        }
        assert!(
            (b[0] - 2.0).abs() < 1e-13 && (b[1] - 3.0).abs() < 1e-13,
            "{b:?}"
        );
    }

    #[test]
    fn detects_a_linearly_dependent_column() {
        // Terceira coluna = primeira + segunda.
        let a = mat(&[
            &[1.0, 0.0, 1.0],
            &[1.0, 1.0, 2.0],
            &[1.0, 2.0, 3.0],
            &[1.0, 3.0, 4.0],
        ]);
        let qr = QrDecomposition::new(&a, 1e-10);
        assert_eq!(qr.rank, 2);
    }

    #[test]
    fn rank_does_not_depend_on_column_scale() {
        let a = mat(&[&[1.0, 1e9], &[1.0, 2e9], &[1.0, 3e9], &[1.0, 5e9]]);
        assert_eq!(QrDecomposition::new(&a, 1e-12).rank, 2);
    }

    #[test]
    fn a_zero_column_has_no_rank() {
        let a = mat(&[&[1.0, 0.0], &[1.0, 0.0], &[1.0, 0.0]]);
        assert_eq!(QrDecomposition::new(&a, 1e-12).rank, 1);
    }

    #[test]
    fn xtx_inverse_matches_the_closed_form_for_a_small_case() {
        // X = [1, x], x = 0,1,2,3 → XᵀX = [[4,6],[6,14]], inversa = 1/20 · [[14,-6],[-6,4]].
        let a = mat(&[&[1.0, 0.0], &[1.0, 1.0], &[1.0, 2.0], &[1.0, 3.0]]);
        let qr = QrDecomposition::new(&a, default_rank_tolerance(4, 2));
        let inv = qr.xtx_inverse();
        // Em colunas normalizadas e permutadas: converte para o espaço original para comparar.
        let mut full = [[0.0; 2]; 2];
        for i in 0..2 {
            for j in 0..2 {
                let (oi, oj) = (qr.perm[i], qr.perm[j]);
                full[oi][oj] = inv[(i, j)] / (qr.column_norms[oi] * qr.column_norms[oj]);
            }
        }
        let expected = [[14.0 / 20.0, -6.0 / 20.0], [-6.0 / 20.0, 4.0 / 20.0]];
        for i in 0..2 {
            for j in 0..2 {
                assert!((full[i][j] - expected[i][j]).abs() < 1e-14, "{full:?}");
            }
        }
    }
}
