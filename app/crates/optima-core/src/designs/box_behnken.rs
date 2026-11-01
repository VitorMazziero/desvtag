//! Box–Behnken para 3, 4 e 5 fatores.
//!
//! Para cada par de fatores `(i < j)`, em ordem lexicográfica, quatro ensaios `(±1, ±1)` com os
//! demais fatores no centro: `2·k·(k − 1)` ensaios (12, 24 e 40) mais os pontos centrais. A
//! construção por pares coincide com a publicada por Box e Behnken (1960) nesses três tamanhos;
//! para 6 e 7 fatores a construção publicada usa blocos incompletos balanceados distintos e **não
//! está implementada** (recusa explícita).

use crate::validation::{Issue, Severity};

/// Números de fatores suportados.
pub const SUPPORTED_FACTORS: [usize; 3] = [3, 4, 5];

/// Matriz codificada do Box–Behnken (sem pontos centrais).
///
/// # Errors
/// `design.box_behnken_unsupported` para número de fatores fora de 3–5.
pub fn box_behnken(k: usize) -> Result<Vec<Vec<f64>>, Vec<Issue>> {
    if !SUPPORTED_FACTORS.contains(&k) {
        return Err(vec![
            Issue::new("design.box_behnken_unsupported", Severity::Error)
                .with_param("factors", &k)
                .with_param("supported", &"3, 4, 5"),
        ]);
    }
    let mut rows = Vec::with_capacity(2 * k * (k - 1));
    for i in 0..k {
        for j in (i + 1)..k {
            for (a, b) in [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)] {
                let mut row = vec![0.0; k];
                row[i] = a;
                row[j] = b;
                rows.push(row);
            }
        }
    }
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_counts_are_two_k_times_k_minus_one() {
        for (k, n) in [(3, 12), (4, 24), (5, 40)] {
            assert_eq!(box_behnken(k).unwrap_or_else(|_| unreachable!()).len(), n);
        }
    }

    #[test]
    fn every_row_has_exactly_two_nonzero_entries_and_columns_are_balanced() {
        for k in SUPPORTED_FACTORS {
            let m = box_behnken(k).unwrap_or_else(|_| unreachable!());
            assert!(
                m.iter()
                    .all(|r| r.iter().filter(|c| **c != 0.0).count() == 2)
            );
            for j in 0..k {
                assert_eq!(m.iter().map(|r| r[j]).sum::<f64>(), 0.0);
            }
        }
    }

    #[test]
    fn unsupported_sizes_are_refused() {
        assert!(box_behnken(2).is_err());
        assert!(box_behnken(6).is_err());
    }
}
