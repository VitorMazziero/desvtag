//! Distribuição do máximo de `|T_i|` das comparações de Dunnett (vários tratamentos × um controle).
//!
//! **Estrutura.** Com variância comum `σ²` estimada por `s²` (`ν` graus de liberdade), as
//! estatísticas `T_i = (x̄_i − x̄₀)/(s·√(1/n_i + 1/n₀))` têm correlação
//! `ρ_ij = λ_i·λ_j` com `λ_i = √(n_i/(n_i + n₀))`: um único fator comum. Condicionando em
//! `S = s/σ ~ χ_ν/√ν` e no fator `Z₀`,
//!
//! `P(max|T_i| ≤ c) = E_S ∫ φ(z) ∏_i [Φ((c·S − λ_i z)/r_i) − Φ((−c·S − λ_i z)/r_i)] dz`,
//! com `r_i = √(1 − λ_i²)`. Vale também para delineamentos desbalanceados (exato, sem simulação).
//!
//! A integral em `S` usa os mesmos nós da amplitude studentizada (painéis em cauda do `χ²_ν`);
//! a integral em `z`, quadratura composta de Gauss–Legendre. Especificação em
//! `docs/metodos/dunnett.md`.

use super::normal;
use super::quantile::{QuantileError, invert_upper_tail};
use super::studentized_range::{MIN_TAIL, StudentizedRange};
use crate::numeric::integration::gauss_legendre;

const Z_LIMIT: f64 = 8.0;
const PANELS: usize = 12;
const ORDER: usize = 12;

/// Núcleo pré-computado para um conjunto de `λ_i` e `ν`.
#[derive(Debug, Clone)]
pub struct Dunnett {
    /// `(λ_i, r_i)` por comparação.
    factors: Vec<(f64, f64)>,
    /// `(z, peso·φ(z))`.
    inner: Vec<(f64, f64)>,
    /// `(S, peso)`; um único nó `(1, 1)` para `ν = ∞`.
    outer: Vec<(f64, f64)>,
}

impl Dunnett {
    /// `sizes[i]` = observações do tratamento `i`; `control_size` = observações do controle.
    ///
    /// # Errors
    /// [`QuantileError::OutOfRange`] se não houver tratamentos, se um tamanho for zero ou se
    /// `df` for inválido.
    pub fn new(sizes: &[usize], control_size: usize, df: f64) -> Result<Self, QuantileError> {
        if sizes.is_empty() || control_size == 0 || sizes.contains(&0) || df.is_nan() || df <= 0.0 {
            return Err(QuantileError::OutOfRange);
        }
        let factors = sizes
            .iter()
            .map(|&n| {
                let lambda = (n as f64 / (n + control_size) as f64).sqrt();
                (lambda, (1.0 - lambda * lambda).sqrt())
            })
            .collect();
        let (nodes, weights) = gauss_legendre(ORDER);
        let width = 2.0 * Z_LIMIT / PANELS as f64;
        let mut inner = Vec::with_capacity(PANELS * ORDER);
        for panel in 0..PANELS {
            let mid = -Z_LIMIT + width * (panel as f64 + 0.5);
            for (t, w) in nodes.iter().zip(&weights) {
                let z = mid + 0.5 * width * t;
                inner.push((z, 0.5 * width * w * normal::pdf(z)));
            }
        }
        let outer = if df.is_infinite() {
            vec![(1.0, 1.0)]
        } else {
            StudentizedRange::scale_nodes(df)?
        };
        Ok(Self {
            factors,
            inner,
            outer,
        })
    }

    /// `P(max_i |T_i| ≤ c)`.
    #[must_use]
    pub fn cdf(&self, c: f64) -> f64 {
        if c.is_nan() {
            return f64::NAN;
        }
        if c <= 0.0 {
            return 0.0;
        }
        let mut total = crate::numeric::CompensatedSum::new();
        for &(s, ws) in &self.outer {
            let half = c * s;
            let mut inner = crate::numeric::CompensatedSum::new();
            for &(z, wz) in &self.inner {
                let mut product = 1.0_f64;
                for &(lambda, r) in &self.factors {
                    let upper = (half - lambda * z) / r;
                    let lower = (-half - lambda * z) / r;
                    // Φ(upper) − Φ(lower) sem cancelamento na cauda superior.
                    product *= if upper < 0.0 {
                        normal::cdf(upper) - normal::cdf(lower)
                    } else {
                        normal::sf(lower) - normal::sf(upper)
                    };
                    if product == 0.0 {
                        break;
                    }
                }
                inner.add(wz * product);
            }
            total.add(ws * inner.total());
        }
        total.total().clamp(0.0, 1.0)
    }

    /// `P(max_i |T_i| > c)`: valor-p ajustado de uma comparação com estatística `c`.
    #[must_use]
    pub fn sf(&self, c: f64) -> f64 {
        (1.0 - self.cdf(c)).clamp(0.0, 1.0)
    }

    /// Valor crítico bilateral `c` com `P(max|T_i| > c) = alpha`.
    ///
    /// # Errors
    /// [`QuantileError`] fora do domínio ou sem convergência.
    pub fn quantile_upper(&self, alpha: f64) -> Result<f64, QuantileError> {
        if !(MIN_TAIL..1.0).contains(&alpha) {
            return Err(QuantileError::OutOfRange);
        }
        invert_upper_tail(|c| self.sf(c), alpha, 0.0, 2.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_comparison_reduces_to_the_two_sided_t() {
        // m = 1: P(|T| ≤ c) com T ~ t_ν.
        let d = Dunnett::new(&[6], 6, 10.0).unwrap_or_else(|_| unreachable!());
        for c in [0.5, 1.5, 2.228, 3.0] {
            let expected = 1.0 - 2.0 * super::super::student_t::sf(c, 10.0);
            assert!((d.cdf(c) - expected).abs() < 1e-9, "{c}");
        }
    }

    #[test]
    fn critical_value_grows_with_the_number_of_comparisons() {
        let c = |m: usize| {
            Dunnett::new(&vec![5; m], 5, 4.0 * (m as f64 + 1.0))
                .and_then(|d| d.quantile_upper(0.05))
                .unwrap_or(f64::NAN)
        };
        assert!(c(1) < c(2) && c(2) < c(4));
    }

    #[test]
    fn rejects_invalid_input() {
        assert!(Dunnett::new(&[], 5, 10.0).is_err());
        assert!(Dunnett::new(&[3, 0], 5, 10.0).is_err());
        assert!(Dunnett::new(&[3], 0, 10.0).is_err());
        assert!(Dunnett::new(&[3], 5, 0.0).is_err());
    }
}
