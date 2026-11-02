//! Distribuição da amplitude studentizada `Q(k, ν)` (base do teste de Tukey).
//!
//! **Definição.** Para `k` médias independentes e `s = χ_ν/√ν` independente,
//! `P(Q ≤ q) = ∫₀^∞ f_s(s) · W(q·s; k) ds`, com
//! `W(w; k) = k ∫_{−∞}^{∞} φ(z) [Φ(z) − Φ(z − w)]^{k−1} dz` (distribuição da amplitude de `k`
//! normais padrão). Para `ν = ∞`, `P = W(q; k)`.
//!
//! **Algoritmo.** As duas integrais são calculadas por quadratura composta de Gauss–Legendre
//! (ver [`crate::numeric::integration`]), como em Copenhaver e Holland (1988), com nós fixados uma
//! vez por `(k, ν)`:
//!
//! - interna: `z ∈ [−8,5; 8,5]` (o integrando é limitado por `φ(z)`, desprezível fora); a
//!   diferença `Φ(z) − Φ(z − w)` usa a cauda superior quando `z > w/2`, evitando cancelamento;
//! - externa: transformação pela função de distribuição do `χ²_ν` (`x = Q_χ²(u)`, `s = √(x/ν)`),
//!   com painéis de Gauss–Legendre refinados nas duas caudas de `u`; os nós `s` independem de `q`.
//!
//! A cauda superior é `1 − cdf`; seu erro absoluto é da ordem de 1e-13 (ver
//! `docs/metodos/amplitude-studentizada.md`). Quantis por Brent no logaritmo da cauda.

use super::chi_square;
use super::normal;
use super::quantile::{QuantileError, invert_upper_tail};
use super::range_table::RangeTable;
use crate::numeric::integration::gauss_legendre;

/// Limite da integral interna em `z` (|z| ≤ 8,5: `φ(8,5) ≈ 1,6e-16`).
const Z_LIMIT: f64 = 8.5;
/// Painéis e ordem da quadratura interna.
const INNER_PANELS: usize = 16;
const INNER_ORDER: usize = 12;
/// Painéis externos `(início, fim, ordem)` em probabilidade de cauda: décadas até 1e-15 nas caudas
/// (o integrando varia com `ln` da cauda) e painéis largos no centro. A massa abaixo de 1e-15 é
/// desprezada (erro < 1e-15).
const OUTER_PANELS: [(f64, f64, usize); 16] = [
    (1e-15, 1e-14, 10),
    (1e-14, 1e-13, 10),
    (1e-13, 1e-12, 10),
    (1e-12, 1e-11, 10),
    (1e-11, 1e-10, 10),
    (1e-10, 1e-9, 10),
    (1e-9, 1e-8, 10),
    (1e-8, 1e-7, 10),
    (1e-7, 1e-6, 10),
    (1e-6, 1e-5, 10),
    (1e-5, 1e-4, 10),
    (1e-4, 1e-3, 16),
    (1e-3, 1e-2, 16),
    (1e-2, 0.07, 16),
    (0.07, 0.25, 16),
    (0.25, 0.5, 16),
];
/// Menor probabilidade de cauda aceita nos quantis.
pub const MIN_TAIL: f64 = 1e-10;
/// Maior número de grupos aceito.
pub const MAX_GROUPS: usize = 1000;

/// Núcleo pré-computado para `(k, ν)`: avalia `cdf` e `sf` de muitos `q` reaproveitando os nós.
#[derive(Debug, Clone)]
pub struct StudentizedRange {
    k: usize,
    /// Nós internos `z` com peso `k·φ(z)·peso`.
    inner: Vec<(f64, f64, f64, f64)>, // (z, peso, cdf(z), sf(z))
    /// Nós externos `s` e pesos (soma ≈ 1); vazio para `ν = ∞` (usa-se `s = 1`).
    outer: Vec<(f64, f64)>,
    /// Tabela de `W(·; k)`; presente em [`StudentizedRange::tabulated`].
    table: Option<RangeTable>,
}

impl StudentizedRange {
    /// Prepara o núcleo. `k` ≥ 2 grupos; `df` > 0 graus de liberdade do erro (`INFINITY` permitido).
    ///
    /// # Errors
    /// [`QuantileError::OutOfRange`] para parâmetros fora do domínio.
    pub fn new(k: usize, df: f64) -> Result<Self, QuantileError> {
        if !(2..=MAX_GROUPS).contains(&k) || df.is_nan() || df <= 0.0 {
            return Err(QuantileError::OutOfRange);
        }
        let (nodes, weights) = gauss_legendre(INNER_ORDER);
        let width = 2.0 * Z_LIMIT / INNER_PANELS as f64;
        let mut inner = Vec::with_capacity(INNER_PANELS * INNER_ORDER);
        for panel in 0..INNER_PANELS {
            let mid = -Z_LIMIT + width * (panel as f64 + 0.5);
            for (t, w) in nodes.iter().zip(&weights) {
                let z = mid + 0.5 * width * t;
                inner.push((
                    z,
                    0.5 * width * w * k as f64 * normal::pdf(z),
                    normal::cdf(z),
                    normal::sf(z),
                ));
            }
        }
        let outer = if df.is_infinite() {
            Vec::new()
        } else {
            Self::outer_nodes(df)?
        };
        Ok(Self {
            k,
            inner,
            outer,
            table: None,
        })
    }

    /// Como [`StudentizedRange::new`], mas tabula `W(·; k)` (Chebyshev por trechos): o custo
    /// inicial (~10 ms) compensa quando há dezenas de avaliações, como nos pares de Tukey e nos
    /// quantis; cada `cdf` fica centenas de vezes mais barata, com erro ≤ 1e-14 em `W`.
    ///
    /// # Errors
    /// [`QuantileError::OutOfRange`] para parâmetros fora do domínio.
    pub fn tabulated(k: usize, df: f64) -> Result<Self, QuantileError> {
        let mut base = Self::new(k, df)?;
        base.table = Some(RangeTable::build(|w| base.range_cdf_exact(w)));
        Ok(base)
    }

    /// Nós `(s, peso)` da integral sobre `s = χ_ν/√ν` (soma dos pesos ≈ 1), compartilhados com o
    /// kernel de Dunnett.
    ///
    /// # Errors
    /// [`QuantileError`] para `df` fora do domínio.
    pub(crate) fn scale_nodes(df: f64) -> Result<Vec<(f64, f64)>, QuantileError> {
        Self::outer_nodes(df)
    }

    fn outer_nodes(df: f64) -> Result<Vec<(f64, f64)>, QuantileError> {
        let mut out = Vec::new();
        for &(a, b, order) in &OUTER_PANELS {
            let (t, w) = gauss_legendre(order);
            // Nós em ln(cauda): o integrando é analítico nessa variável (em `u` ele tem uma
            // singularidade em 0 que degrada a quadratura de painéis geométricos).
            let (la, lb) = (a.ln(), b.ln());
            for (ti, wi) in t.iter().zip(&w) {
                let tail = (la + (lb - la) * 0.5 * (ti + 1.0)).exp();
                let weight = 0.5 * (lb - la) * wi * tail;
                // Cauda inferior e superior (simétricas em probabilidade).
                let lower = chi_square::quantile(tail, df)?;
                let upper = chi_square::quantile_upper(tail, df)?;
                for x in [lower, upper] {
                    out.push(((x / df).sqrt(), weight));
                }
            }
        }
        Ok(out)
    }

    /// `W(w; k)`: função de distribuição da amplitude de `k` normais padrão.
    fn range_cdf(&self, w: f64) -> f64 {
        match &self.table {
            Some(table) => table.eval(w),
            None => self.range_cdf_exact(w),
        }
    }

    /// `W(w; k)` por quadratura direta.
    fn range_cdf_exact(&self, w: f64) -> f64 {
        if w <= 0.0 {
            return 0.0;
        }
        let power = i32::try_from(self.k - 1).unwrap_or(i32::MAX);
        let mut total = crate::numeric::CompensatedSum::new();
        for &(z, weight, cdf_z, sf_z) in &self.inner {
            let diff = if z > 0.5 * w {
                normal::sf(z - w) - sf_z
            } else {
                cdf_z - normal::cdf(z - w)
            };
            if diff > 0.0 {
                total.add(weight * diff.powi(power));
            }
        }
        total.total().clamp(0.0, 1.0)
    }

    /// `P(Q ≤ q)`.
    #[must_use]
    pub fn cdf(&self, q: f64) -> f64 {
        if q.is_nan() {
            return f64::NAN;
        }
        if q <= 0.0 {
            return 0.0;
        }
        if q.is_infinite() {
            return 1.0;
        }
        if self.outer.is_empty() {
            return self.range_cdf(q);
        }
        let mut total = crate::numeric::CompensatedSum::new();
        for &(s, weight) in &self.outer {
            total.add(weight * self.range_cdf(q * s));
        }
        total.total().clamp(0.0, 1.0)
    }

    /// `P(Q > q)` (calculada como `1 − cdf`; erro absoluto ~1e-13).
    #[must_use]
    pub fn sf(&self, q: f64) -> f64 {
        if q.is_nan() {
            return f64::NAN;
        }
        (1.0 - self.cdf(q)).clamp(0.0, 1.0)
    }

    /// Quantil superior: `q` tal que `P(Q > q) = alpha`, com `alpha` em `[1e-10, 1)`.
    ///
    /// # Errors
    /// [`QuantileError`] fora do domínio ou sem convergência.
    pub fn quantile_upper(&self, alpha: f64) -> Result<f64, QuantileError> {
        if !(MIN_TAIL..1.0).contains(&alpha) {
            return Err(QuantileError::OutOfRange);
        }
        invert_upper_tail(|q| self.sf(q), alpha, 0.0, 4.0)
    }
}

/// `P(Q ≤ q)` para `k` grupos e `df` graus de liberdade.
///
/// # Errors
/// [`QuantileError::OutOfRange`] para parâmetros fora do domínio.
pub fn cdf(q: f64, k: usize, df: f64) -> Result<f64, QuantileError> {
    StudentizedRange::new(k, df).map(|d| d.cdf(q))
}

/// `P(Q > q)`.
///
/// # Errors
/// [`QuantileError::OutOfRange`] para parâmetros fora do domínio.
pub fn sf(q: f64, k: usize, df: f64) -> Result<f64, QuantileError> {
    StudentizedRange::new(k, df).map(|d| d.sf(q))
}

/// Quantil superior `q` com `P(Q > q) = alpha`.
///
/// # Errors
/// [`QuantileError`] fora do domínio ou sem convergência.
pub fn quantile_upper(alpha: f64, k: usize, df: f64) -> Result<f64, QuantileError> {
    StudentizedRange::tabulated(k, df)?.quantile_upper(alpha)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn two_groups_reduce_to_the_t_distribution() {
        // k = 2: Q = |T|·√2 com T ~ t_ν ⇒ P(Q > q) = P(|T| > q/√2).
        let mut worst = 0.0_f64;
        for (q, df) in [
            (1.0, 5.0),
            (2.5, 10.0),
            (4.0, 3.0),
            (0.3, 30.0),
            (3.0, 1.0),
            (6.0, 2.0),
            (2.0, 120.0),
            (5.0, 7.0),
        ] {
            let expected = 2.0 * super::super::student_t::sf(q / 2.0_f64.sqrt(), df);
            let got = sf(q, 2, df).unwrap_or(f64::NAN);
            worst = worst.max((got - expected).abs());
        }
        assert!(worst < 1e-11, "{worst:e}");
    }

    #[test]
    fn infinite_df_two_groups_is_the_normal_range() {
        // W(w; 2) = 2Φ(w/√2) − 1.
        let w = 1.7;
        let expected = 2.0 * normal::cdf(w / 2.0_f64.sqrt()) - 1.0;
        let got = cdf(w, 2, f64::INFINITY).unwrap_or(f64::NAN);
        assert!((got - expected).abs() < 1e-13);
    }

    #[test]
    fn critical_values_match_published_tables() {
        // Tabelas usuais (3 casas), α = 0,05: q(3; 10) = 3,877; q(4; 20) = 3,958. A comparação
        // com 15 algarismos contra mpmath/SciPy está em `tests/studentized_range_validation.rs`.
        let q = quantile_upper(0.05, 3, 10.0).unwrap_or(f64::NAN);
        assert!((q - 3.877).abs() < 5e-4, "{q}");
        let q = quantile_upper(0.05, 4, 20.0).unwrap_or(f64::NAN);
        assert!((q - 3.958).abs() < 5e-4, "{q}");
    }

    #[test]
    fn cdf_is_monotone_and_bounded_and_round_trips() {
        let d = StudentizedRange::new(5, 12.0).unwrap_or_else(|_| unreachable!());
        let mut last = 0.0;
        for i in 1..60 {
            let p = d.cdf(f64::from(i) * 0.2);
            assert!((0.0..=1.0).contains(&p) && p >= last - 1e-15);
            last = p;
        }
        let q = d.quantile_upper(0.01).unwrap_or(f64::NAN);
        assert!((d.sf(q) - 0.01).abs() < 1e-12);
    }

    #[test]
    fn tabulated_kernel_matches_direct_quadrature() {
        // A tabela de W(w; k) é a única aproximação nova: compara `cdf` e `sf` com a quadratura
        // direta em várias combinações (k, ν), inclusive muitos grupos e ν infinito.
        let mut worst = 0.0_f64;
        for (k, df) in [
            (2, 3.0),
            (5, 12.0),
            (40, 90.0),
            (100, 200.0),
            (100, 5.0),
            (1000, 1.0e4),
            (7, f64::INFINITY),
        ] {
            let direct = StudentizedRange::new(k, df).unwrap_or_else(|_| unreachable!());
            let table = StudentizedRange::tabulated(k, df).unwrap_or_else(|_| unreachable!());
            for i in 1..=60 {
                let q = f64::from(i) * 0.25;
                worst = worst.max((direct.cdf(q) - table.cdf(q)).abs());
            }
        }
        assert!(worst < 1e-13, "{worst:e}");
    }

    #[test]
    fn invalid_parameters_are_rejected() {
        assert!(StudentizedRange::new(1, 10.0).is_err());
        assert!(StudentizedRange::new(3, 0.0).is_err());
        assert!(StudentizedRange::new(3, f64::NAN).is_err());
        assert!(quantile_upper(0.0, 3, 10.0).is_err());
        assert!(quantile_upper(1.0, 3, 10.0).is_err());
    }
}
