//! Plackett–Burman por matrizes de Hadamard.
//!
//! Para `N = q + 1` com `q` primo e `q ≡ 3 (mod 4)` usa-se a construção de **Paley**
//! (`H = I + S`, `S = [[0, 1ᵀ], [−1, Q]]`, `Q[i][j] = χ(i − j)` com χ o símbolo de Legendre); para
//! `N = 2ᵐ`, a de **Sylvester**. Cada matriz é normalizada para ter a primeira coluna só com `+1`
//! e verificada (`H·Hᵀ = N·I`) antes do uso. As colunas restantes são contrastes ortogonais de
//! `N − 1` fatores; fatores não usados são *colunas fictícias*.
//!
//! Tamanhos suportados: 8, 12, 16, 20, 24, 32, 44 e 48 ensaios. Os planejamentos originais de
//! Plackett e Burman (1946) para 12, 20 e 24 ensaios são cíclicos e coincidem com a construção de
//! Paley a menos de permutação e sinal de linhas e colunas. Ficam fora (sem construção
//! implementada): 28, 36, 40 e valores maiores.

/// Matriz de colunas ±1.
pub type Matrix = Vec<Vec<f64>>;

/// Tamanhos de planejamento suportados.
pub const SUPPORTED_RUNS: [usize; 8] = [8, 12, 16, 20, 24, 32, 44, 48];

fn is_prime(n: usize) -> bool {
    n >= 2
        && (2..)
            .take_while(|d| d * d <= n)
            .all(|d| !n.is_multiple_of(d))
}

fn legendre(a: usize, q: usize) -> i8 {
    let a = a % q;
    if a == 0 {
        return 0;
    }
    // Critério de Euler por exponenciação modular.
    let (mut result, mut base, mut exponent) = (1_u64, a as u64, (q as u64 - 1) / 2);
    let modulus = q as u64;
    while exponent > 0 {
        if exponent & 1 == 1 {
            result = result * base % modulus;
        }
        base = base * base % modulus;
        exponent >>= 1;
    }
    if result == 1 { 1 } else { -1 }
}

fn paley(n: usize) -> Option<Vec<Vec<i8>>> {
    let q = n.checked_sub(1)?;
    if !is_prime(q) || q % 4 != 3 {
        return None;
    }
    let mut h = vec![vec![0_i8; n]; n];
    for (i, row) in h.iter_mut().enumerate() {
        row[i] = 1; // I
    }
    for row in h.iter_mut().skip(1) {
        row[0] = -1; // S: primeira coluna
    }
    for value in h[0].iter_mut().skip(1) {
        *value = 1; // S: primeira linha
    }
    for i in 0..q {
        for j in 0..q {
            h[i + 1][j + 1] += legendre(i + q - j, q);
        }
    }
    Some(h)
}

fn sylvester(n: usize) -> Option<Vec<Vec<i8>>> {
    if !n.is_power_of_two() || n < 2 {
        return None;
    }
    let mut h = vec![vec![1_i8]];
    while h.len() < n {
        let m = h.len();
        let mut next = vec![vec![0_i8; 2 * m]; 2 * m];
        for i in 0..m {
            for j in 0..m {
                next[i][j] = h[i][j];
                next[i][j + m] = h[i][j];
                next[i + m][j] = h[i][j];
                next[i + m][j + m] = -h[i][j];
            }
        }
        h = next;
    }
    Some(h)
}

/// `H·Hᵀ = N·I`.
#[must_use]
pub fn is_hadamard(h: &[Vec<i8>]) -> bool {
    let n = h.len();
    h.iter()
        .all(|r| r.len() == n && r.iter().all(|v| v.abs() == 1))
        && (0..n).all(|a| {
            (0..n).all(|b| {
                let dot: i32 = (0..n)
                    .map(|k| i32::from(h[a][k]) * i32::from(h[b][k]))
                    .sum();
                dot == if a == b { n as i32 } else { 0 }
            })
        })
}

/// Matriz de Hadamard normalizada (primeira coluna `+1`) de ordem `n`, ou `None` se não suportada.
#[must_use]
pub fn hadamard(n: usize) -> Option<Vec<Vec<i8>>> {
    if !SUPPORTED_RUNS.contains(&n) {
        return None;
    }
    let mut h = sylvester(n).or_else(|| paley(n))?;
    for row in &mut h {
        if row[0] < 0 {
            row.iter_mut().for_each(|v| *v = -*v);
        }
    }
    is_hadamard(&h).then_some(h)
}

/// Planejamento PB de `runs` ensaios com `k ≤ runs − 1` fatores: devolve a matriz codificada
/// (`runs × k`) e as colunas fictícias (`runs × (runs − 1 − k)`).
#[must_use]
pub fn design(runs: usize, k: usize) -> Option<(Matrix, Matrix)> {
    if k == 0 || k > runs.checked_sub(1)? {
        return None;
    }
    let h = hadamard(runs)?;
    let pick = |range: std::ops::Range<usize>| -> Matrix {
        h.iter()
            .map(|r| range.clone().map(|j| f64::from(r[j])).collect())
            .collect()
    };
    Some((pick(1..(k + 1)), pick((k + 1)..runs)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_supported_size_is_a_hadamard_matrix() {
        for n in SUPPORTED_RUNS {
            let h = hadamard(n).unwrap_or_else(|| unreachable!("N = {n}"));
            assert_eq!(h.len(), n);
            assert!(is_hadamard(&h), "N = {n}");
            assert!(h.iter().all(|r| r[0] == 1), "primeira coluna +1");
        }
    }

    #[test]
    fn unsupported_sizes_are_refused_not_approximated() {
        for n in [0, 1, 4, 10, 14, 28, 36, 40, 52] {
            assert!(hadamard(n).is_none(), "N = {n}");
        }
    }

    #[test]
    fn design_columns_are_balanced_and_orthogonal_with_dummies() {
        let (m, dummies) = design(12, 8).unwrap_or_else(|| unreachable!());
        assert_eq!((m.len(), m[0].len(), dummies[0].len()), (12, 8, 3));
        for a in 0..8 {
            assert_eq!(m.iter().map(|r| r[a]).sum::<f64>(), 0.0);
            for b in (a + 1)..8 {
                assert_eq!(m.iter().map(|r| r[a] * r[b]).sum::<f64>(), 0.0);
            }
            for d in 0..3 {
                assert_eq!(
                    m.iter()
                        .zip(&dummies)
                        .map(|(r, dm)| r[a] * dm[d])
                        .sum::<f64>(),
                    0.0
                );
            }
        }
    }

    #[test]
    fn rejects_too_many_factors_and_zero() {
        assert!(design(12, 12).is_none());
        assert!(design(12, 0).is_none());
        assert!(design(12, 11).is_some());
    }

    #[test]
    fn twelve_runs_is_the_cyclic_plackett_burman_design() {
        // As linhas 2..12 do Hadamard de Paley (q = 11) são deslocamentos cíclicos de uma sequência
        // de resíduos quadráticos módulo 11 ({1, 3, 4, 5, 9} → +1): a estrutura cíclica de 1946.
        let h = hadamard(12).unwrap_or_else(|| unreachable!());
        let body: Vec<Vec<i8>> = h[1..].iter().map(|r| r[1..].to_vec()).collect();
        for i in 1..11 {
            let rotated: Vec<i8> = (0..11).map(|j| body[0][(j + 11 - i) % 11]).collect();
            // Cada linha é a primeira deslocada ciclicamente, a menos de sinal global.
            assert!(
                body[i] == rotated || body[i].iter().zip(&rotated).all(|(a, b)| *a == -*b),
                "linha {i}"
            );
        }
    }
}
