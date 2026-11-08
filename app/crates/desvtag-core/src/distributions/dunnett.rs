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

use std::collections::BTreeMap;

use super::normal;
use super::quantile::{QuantileError, invert_upper_tail};
use super::range_table::{PANEL_WIDTH, RangeTable};
use super::studentized_range::{MIN_TAIL, StudentizedRange};
use crate::numeric::integration::gauss_legendre;

const Z_LIMIT: f64 = 8.0;
const MIN_POSITIVE_PANELS: usize = 6;
const ORDER: usize = 12;
const PANEL_SIGMAS: f64 = 4.0;
const TRANSITION_SIGMAS: [f64; 5] = [-8.0, -4.0, 0.0, 4.0, 8.0];
const MAX_TABLE_SAMPLES: usize = 100_000;

#[derive(Debug, Clone)]
enum InnerQuadrature {
    /// `(z, peso·φ(z))` em painéis uniformes.
    Fixed(Vec<(f64, f64)>),
    Refined {
        rule: Vec<(f64, f64)>,
        /// `(λ, r/λ)` das transições que exigem painéis menores.
        transitions: Vec<(f64, f64)>,
    },
}

impl InnerQuadrature {
    fn new(factors: &[(f64, f64, usize)]) -> Self {
        let (nodes, weights) = gauss_legendre(ORDER);
        let rule: Vec<_> = nodes.into_iter().zip(weights).collect();
        let base_width = Z_LIMIT / MIN_POSITIVE_PANELS as f64;
        let transitions: Vec<_> = factors
            .iter()
            .filter_map(|&(lambda, r, _)| {
                let scale = r / lambda;
                (PANEL_SIGMAS * scale < base_width).then_some((lambda, scale))
            })
            .collect();
        let min_scale = transitions
            .iter()
            .map(|&(_, scale)| scale)
            .fold(f64::INFINITY, f64::min);
        let count =
            ((Z_LIMIT / (PANEL_SIGMAS * min_scale)).ceil() as usize).max(MIN_POSITIVE_PANELS);
        // Usa a malha uniforme enquanto for mais curta que o refinamento ao
        // redor das transições de Φ. As duas bordas do intervalo podem importar
        // perto de zero, onde a transição negativa ainda alcança z positivo.
        let refined_limit = MIN_POSITIVE_PANELS + 2 * TRANSITION_SIGMAS.len() * transitions.len();
        if count > refined_limit {
            return Self::Refined { rule, transitions };
        }
        let width = Z_LIMIT / count as f64;
        let mut inner = Vec::with_capacity(count * ORDER);
        for panel in 0..count {
            let mid = width * (panel as f64 + 0.5);
            for &(t, weight) in &rule {
                let z = mid + 0.5 * width * t;
                // O integrando é par em z. O peso incorpora os dois lados.
                inner.push((z, width * weight * normal::pdf(z)));
            }
        }
        Self::Fixed(inner)
    }
}

/// Núcleo pré-computado para um conjunto de `λ_i` e `ν`.
#[derive(Debug, Clone)]
pub struct Dunnett {
    /// `(λ, r, multiplicidade)` por tamanho de tratamento.
    factors: Vec<(f64, f64, usize)>,
    inner: InnerQuadrature,
    /// `(S, peso)`; um único nó `(1, 1)` para `ν = ∞`.
    outer: Vec<(f64, f64)>,
    table: Option<RangeTable>,
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
        let mut counts = BTreeMap::new();
        for &size in sizes {
            *counts.entry(size).or_insert(0) += 1;
        }
        let factors: Vec<_> = counts
            .into_iter()
            .map(|(n, count)| {
                let sum = n as f64 + control_size as f64;
                (
                    (n as f64 / sum).sqrt(),
                    (control_size as f64 / sum).sqrt(),
                    count,
                )
            })
            .collect();
        let inner = InnerQuadrature::new(&factors);
        let outer = if df.is_infinite() {
            vec![(1.0, 1.0)]
        } else {
            StudentizedRange::scale_nodes(df)?
        };
        Ok(Self {
            factors,
            inner,
            outer,
            table: None,
        })
    }

    /// Prepara a integral normal para ser reutilizada nos p-valores e no quantil.
    pub(crate) fn tabulated(
        sizes: &[usize],
        control_size: usize,
        df: f64,
    ) -> Result<Self, QuantileError> {
        let mut kernel = Self::new(sizes, control_size, df)?;
        if kernel.outer.len() > 1 {
            let min_r = kernel
                .factors
                .iter()
                .map(|&(_, r, _)| r)
                .fold(f64::INFINITY, f64::min);
            let exact = |half| kernel.normal_max_cdf(half);
            kernel.table = if min_r >= PANEL_WIDTH / 2.0 {
                Some(RangeTable::build(exact))
            } else {
                // A tabela mais fina compensa somente se não avaliar a
                // integral mais vezes que as próprias comparações.
                let budget = kernel.outer.len().saturating_mul(sizes.len());
                RangeTable::try_build(2.0 * min_r, budget.min(MAX_TABLE_SAMPLES), exact)
            };
        }
        Ok(kernel)
    }

    fn conditional_probability(&self, half: f64, z: f64) -> f64 {
        let mut product = 1.0;
        for &(lambda, r, count) in &self.factors {
            let upper = (half - lambda * z) / r;
            let lower = (-half - lambda * z) / r;
            // Φ(upper) − Φ(lower) sem cancelamento na cauda superior.
            let probability = if upper < 0.0 {
                normal::cdf(upper) - normal::cdf(lower)
            } else {
                normal::sf(lower) - normal::sf(upper)
            };
            product *= if count == 1 {
                probability
            } else {
                probability.powf(count as f64)
            };
            if product == 0.0 {
                break;
            }
        }
        product
    }

    fn normal_max_cdf(&self, half: f64) -> f64 {
        let mut total = crate::numeric::CompensatedSum::new();
        match &self.inner {
            InnerQuadrature::Fixed(nodes) => {
                for &(z, weight) in nodes {
                    total.add(weight * self.conditional_probability(half, z));
                }
            }
            InnerQuadrature::Refined { rule, transitions } => {
                let width = Z_LIMIT / MIN_POSITIVE_PANELS as f64;
                let mut cuts: Vec<_> = (0..=MIN_POSITIVE_PANELS)
                    .map(|panel| width * panel as f64)
                    .collect();
                for &(lambda, scale) in transitions {
                    let center = half / lambda;
                    for edge in [-center, center] {
                        cuts.extend(
                            TRANSITION_SIGMAS
                                .iter()
                                .map(|&offset| edge + offset * scale)
                                .filter(|&z| 0.0 < z && z < Z_LIMIT),
                        );
                    }
                }
                cuts.sort_unstable_by(f64::total_cmp);
                cuts.dedup();
                for panel in cuts.windows(2) {
                    let width = panel[1] - panel[0];
                    let mid = panel[0] + 0.5 * width;
                    for &(t, weight) in rule {
                        let z = mid + 0.5 * width * t;
                        total.add(
                            width * weight * normal::pdf(z) * self.conditional_probability(half, z),
                        );
                    }
                }
            }
        }
        total.total()
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
        for &(s, weight) in &self.outer {
            let half = c * s;
            let probability = self
                .table
                .as_ref()
                .map_or_else(|| self.normal_max_cdf(half), |table| table.eval(half));
            total.add(weight * probability);
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
    fn repeated_treatment_sizes_match_independent_quadrature() {
        // SciPy quad: one factor per treatment and both halves of the inner
        // normal integral, with the chi-square density integrated separately.
        let d = Dunnett::tabulated(&[8, 3, 8, 5, 3, 8], 5, 32.0).unwrap_or_else(|_| unreachable!());
        for (c, expected) in [
            (1.0, 0.186_338_382_678_008),
            (2.5, 0.921_578_642_829_629),
            (4.0, 0.998_143_522_046_349),
        ] {
            let actual = d.cdf(c);
            assert!((actual - expected).abs() < 1e-9, "{c}: {actual}");
        }
    }

    #[test]
    fn tabulation_matches_direct_quadrature_and_preserves_narrow_factors() {
        let distinct: Vec<_> = (4..=67).collect();
        for (sizes, control, df) in [
            (distinct.as_slice(), 3, 2_210.0),
            (&[1, 3, 620, 620][..], 10, 1.0),
        ] {
            let direct = Dunnett::new(sizes, control, df).unwrap_or_else(|_| unreachable!());
            let fast = Dunnett::tabulated(sizes, control, df).unwrap_or_else(|_| unreachable!());
            assert!(fast.table.is_some());
            for c in [0.125, 0.5, 1.0, 1.5, 2.5, 3.0, 4.0, 6.0, 8.0, 12.0, 24.0] {
                let delta = (fast.cdf(c) - direct.cdf(c)).abs();
                assert!(delta < 1e-12, "{c}: {delta:e}");
            }
        }
        let narrow = Dunnett::tabulated(&[3, 640], 10, 50.0).unwrap_or_else(|_| unreachable!());
        assert!(narrow.table.is_none());
    }

    #[test]
    fn unbalanced_control_matches_independent_adaptive_quadrature() {
        let distinct: Vec<_> = (4..=67).collect();
        // Referência por integração adaptativa SciPy em z e na densidade do χ².
        let many = Dunnett::tabulated(&distinct, 1, 2_208.0).unwrap_or_else(|_| unreachable!());
        assert!(matches!(many.inner, InnerQuadrature::Fixed(_)));
        assert!(many.table.is_some());
        for (statistic, expected) in [
            (0.792_931_609_401_439_1, 0.817_753_235_305_429_9),
            (1.198_719_177_529_320_7, 0.518_326_856_855_067_4),
            (2.469_304_714_592_305_5, 0.050_011_512_812_097_26),
        ] {
            let actual = many.sf(statistic);
            assert!((actual - expected).abs() < 2e-7, "{statistic}: {actual}");
        }

        let extreme =
            Dunnett::tabulated(&[512, 1024, 2048], 1, 3_581.0).unwrap_or_else(|_| unreachable!());
        assert!(matches!(extreme.inner, InnerQuadrature::Refined { .. }));
        assert!(extreme.table.is_none());
        for (statistic, expected) in [
            (0.506_410_839_277_112_5, 0.632_493_377_188_924_1),
            (1.778_590_079_954_189, 0.080_074_396_670_258_17),
            (2.556_520_657_487_976_4, 0.011_485_819_860_434_177),
            (1.968_972_295_634_331, 0.052_314_972_586_820_94),
        ] {
            let actual = extreme.sf(statistic);
            assert!((actual - expected).abs() < 2e-7, "{statistic}: {actual}");
        }
    }

    #[test]
    fn rejects_invalid_input() {
        assert!(Dunnett::new(&[], 5, 10.0).is_err());
        assert!(Dunnett::new(&[3, 0], 5, 10.0).is_err());
        assert!(Dunnett::new(&[3], 0, 10.0).is_err());
        assert!(Dunnett::new(&[3], 5, 0.0).is_err());
    }
}
