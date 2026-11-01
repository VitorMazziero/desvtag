//! Inversão de caudas por Brent em escala logarítmica.
//!
//! Resolver `ln(cauda(x)) = ln(q)` em vez de `cauda(x) = q` mantém a precisão relativa de `x`
//! mesmo para `q` tão pequeno quanto 1e-300 (o que `1 − p` jamais permitiria).

use crate::numeric::root_finding::{RootError, brent};

/// Menor probabilidade de cauda aceita (abaixo disso `ln` da cauda perde significado em `f64`).
pub const MIN_TAIL: f64 = 1e-300;

/// Falhas de quantil.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuantileError {
    /// `p` fora de `(0, 1)` ou cauda abaixo de [`MIN_TAIL`].
    OutOfRange,
    /// A busca não convergiu.
    NoConvergence,
}

/// `x` tal que `tail(x) = q`, com `tail` decrescente em `[lo, ∞)`; `hi0` é o primeiro limite a testar.
///
/// # Errors
/// [`QuantileError`] se `q` não está em `[MIN_TAIL, 1)` ou a raiz não é encontrada.
pub fn invert_upper_tail(
    tail: impl Fn(f64) -> f64,
    q: f64,
    lo: f64,
    hi0: f64,
) -> Result<f64, QuantileError> {
    if !(MIN_TAIL..1.0).contains(&q) || q.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    let target = q.ln();
    let g = |x: f64| tail(x).ln() - target;
    let mut hi = hi0.max(lo + 1.0);
    for _ in 0..2000 {
        if g(hi) < 0.0 {
            break;
        }
        hi = lo + (hi - lo) * 2.0;
    }
    brent(g, lo, hi, 1e-15, 0.0).map_err(|e| match e {
        RootError::NoConvergence => QuantileError::NoConvergence,
        _ => QuantileError::OutOfRange,
    })
}

/// `x` tal que `cdf(x) = p`, com `cdf` crescente em `[lo, ∞)` e `cdf(lo)` < `p`; para `p` pequeno.
///
/// # Errors
/// [`QuantileError`] como em [`invert_upper_tail`].
pub fn invert_lower_tail(
    cdf: impl Fn(f64) -> f64,
    p: f64,
    lo: f64,
    hi0: f64,
) -> Result<f64, QuantileError> {
    if !(MIN_TAIL..1.0).contains(&p) || p.is_nan() {
        return Err(QuantileError::OutOfRange);
    }
    let target = p.ln();
    let g = |x: f64| target - cdf(x).ln(); // decrescente em x, positivo à esquerda da raiz
    let mut hi = hi0.max(lo + 1.0);
    for _ in 0..2000 {
        if g(hi) < 0.0 {
            break;
        }
        hi = lo + (hi - lo) * 2.0;
    }
    // Para x próximo de `lo`, cdf pode ser 0: ln = −∞ e g = +∞ (sinal correto).
    brent(g, lo, hi, 1e-15, 0.0).map_err(|e| match e {
        RootError::NoConvergence => QuantileError::NoConvergence,
        _ => QuantileError::OutOfRange,
    })
}
