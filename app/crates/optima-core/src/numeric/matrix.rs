//! Matriz densa de `f64` em ordem de linha (C03).
//!
//! Estrutura mínima e transparente: as operações são as que os métodos consomem. Sem
//! `unsafe`; índices fora do intervalo são erros de programação e provocam `panic` apenas
//! nos acessores `Index`; as rotinas públicas validam dimensões e devolvem `Option`/`Result`.

use std::ops::{Index, IndexMut};

/// Matriz `rows × cols`.
#[derive(Debug, Clone, PartialEq)]
pub struct Matrix {
    rows: usize,
    cols: usize,
    data: Vec<f64>,
}

impl Matrix {
    /// Matriz de zeros.
    #[must_use]
    pub fn zeros(rows: usize, cols: usize) -> Self {
        Self {
            rows,
            cols,
            data: vec![0.0; rows * cols],
        }
    }

    /// Constrói a partir de linhas de mesmo comprimento; `None` se forem irregulares.
    #[must_use]
    pub fn from_rows(rows: &[Vec<f64>]) -> Option<Self> {
        let cols = rows.first().map_or(0, Vec::len);
        if rows.iter().any(|r| r.len() != cols) {
            return None;
        }
        Some(Self {
            rows: rows.len(),
            cols,
            data: rows.iter().flatten().copied().collect(),
        })
    }

    /// Número de linhas.
    #[must_use]
    pub const fn rows(&self) -> usize {
        self.rows
    }

    /// Número de colunas.
    #[must_use]
    pub const fn cols(&self) -> usize {
        self.cols
    }

    /// Coluna `j` copiada.
    #[must_use]
    pub fn column(&self, j: usize) -> Vec<f64> {
        (0..self.rows).map(|i| self[(i, j)]).collect()
    }

    /// Transposta.
    #[must_use]
    pub fn transpose(&self) -> Self {
        let mut t = Self::zeros(self.cols, self.rows);
        for i in 0..self.rows {
            for j in 0..self.cols {
                t[(j, i)] = self[(i, j)];
            }
        }
        t
    }

    /// Produto matriz-vetor `A·x`; `None` se as dimensões não coincidirem.
    #[must_use]
    pub fn mul_vec(&self, x: &[f64]) -> Option<Vec<f64>> {
        if x.len() != self.cols {
            return None;
        }
        Some(
            (0..self.rows)
                .map(|i| {
                    let mut acc = crate::numeric::CompensatedSum::new();
                    for (j, xj) in x.iter().enumerate() {
                        acc.add(self[(i, j)] * xj);
                    }
                    acc.total()
                })
                .collect(),
        )
    }

    /// Produto `A·B`; `None` se as dimensões não coincidirem.
    #[must_use]
    pub fn mul(&self, other: &Self) -> Option<Self> {
        if self.cols != other.rows {
            return None;
        }
        let mut out = Self::zeros(self.rows, other.cols);
        for i in 0..self.rows {
            for j in 0..other.cols {
                let mut acc = crate::numeric::CompensatedSum::new();
                for k in 0..self.cols {
                    acc.add(self[(i, k)] * other[(k, j)]);
                }
                out[(i, j)] = acc.total();
            }
        }
        Some(out)
    }
}

impl Index<(usize, usize)> for Matrix {
    type Output = f64;
    fn index(&self, (i, j): (usize, usize)) -> &f64 {
        &self.data[i * self.cols + j]
    }
}

impl IndexMut<(usize, usize)> for Matrix {
    fn index_mut(&mut self, (i, j): (usize, usize)) -> &mut f64 {
        &mut self.data[i * self.cols + j]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_transposes_and_multiplies() {
        let a = Matrix::from_rows(&[vec![1.0, 2.0, 3.0], vec![4.0, 5.0, 6.0]])
            .unwrap_or_else(|| unreachable!());
        assert_eq!((a.rows(), a.cols()), (2, 3));
        let t = a.transpose();
        assert_eq!((t.rows(), t.cols(), t[(2, 1)]), (3, 2, 6.0));
        let p = a.mul(&t).unwrap_or_else(|| unreachable!());
        assert_eq!(
            p,
            Matrix::from_rows(&[vec![14.0, 32.0], vec![32.0, 77.0]])
                .unwrap_or_else(|| unreachable!())
        );
        assert_eq!(a.mul_vec(&[1.0, 0.0, -1.0]), Some(vec![-2.0, -2.0]));
    }

    #[test]
    fn rejects_irregular_rows_and_bad_shapes() {
        assert!(Matrix::from_rows(&[vec![1.0], vec![1.0, 2.0]]).is_none());
        let a = Matrix::zeros(2, 3);
        assert!(a.mul(&a).is_none());
        assert!(a.mul_vec(&[1.0]).is_none());
    }
}
