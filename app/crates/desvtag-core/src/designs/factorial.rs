//! Fatorial completo de dois níveis em ordem padrão (Yates).
//!
//! A execução `r` (0-based) tem, para o fator `j`, nível alto se o bit `j` de `r` é 1. O primeiro
//! fator varia mais depressa: `− − −`, `+ − −`, `− + −`, `+ + −`, …

/// Matriz codificada (±1) de `2^k` linhas e `k` colunas.
#[must_use]
pub fn full_factorial(k: usize) -> Vec<Vec<f64>> {
    (0..1_usize << k)
        .map(|r| {
            (0..k)
                .map(|j| if (r >> j) & 1 == 1 { 1.0 } else { -1.0 })
                .collect()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_order_for_three_factors() {
        let m = full_factorial(3);
        assert_eq!(m.len(), 8);
        assert_eq!(m[0], [-1.0, -1.0, -1.0]);
        assert_eq!(m[1], [1.0, -1.0, -1.0]);
        assert_eq!(m[2], [-1.0, 1.0, -1.0]);
        assert_eq!(m[7], [1.0, 1.0, 1.0]);
    }

    #[test]
    fn columns_are_balanced_and_orthogonal() {
        let m = full_factorial(5);
        for a in 0..5 {
            assert_eq!(m.iter().map(|r| r[a]).sum::<f64>(), 0.0);
            for b in (a + 1)..5 {
                assert_eq!(m.iter().map(|r| r[a] * r[b]).sum::<f64>(), 0.0);
            }
        }
    }
}
