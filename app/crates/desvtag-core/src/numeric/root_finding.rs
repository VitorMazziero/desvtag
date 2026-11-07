//! Busca de raízes de Brent (C03): robusta, sem derivadas, com intervalo que contém a raiz.
//!
//! Referência: R. P. Brent (1973), *Algorithms for Minimization without Derivatives*, cap. 4.

/// Falhas possíveis.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RootError {
    /// `f(a)` e `f(b)` têm o mesmo sinal: o intervalo não contém uma raiz.
    NotBracketed,
    /// O número máximo de iterações foi atingido.
    NoConvergence,
    /// A função devolveu `NaN`.
    NotANumber,
}

/// Raiz de `f` em `[a, b]` com tolerância relativa `rel_tol` (e absoluta mínima `abs_tol`).
///
/// # Errors
/// [`RootError`] quando o intervalo não contém raiz, a função devolve `NaN` ou não há convergência.
pub fn brent(
    mut f: impl FnMut(f64) -> f64,
    mut a: f64,
    mut b: f64,
    rel_tol: f64,
    abs_tol: f64,
) -> Result<f64, RootError> {
    let (mut fa, mut fb) = (f(a), f(b));
    if fa.is_nan() || fb.is_nan() {
        return Err(RootError::NotANumber);
    }
    if fa == 0.0 {
        return Ok(a);
    }
    if fb == 0.0 {
        return Ok(b);
    }
    if fa.signum() == fb.signum() {
        return Err(RootError::NotBracketed);
    }
    let (mut c, mut fc) = (a, fa);
    let (mut d, mut e) = (b - a, b - a);
    for _ in 0..500 {
        if fb.signum() == fc.signum() {
            c = a;
            fc = fa;
            d = b - a;
            e = d;
        }
        if fc.abs() < fb.abs() {
            a = b;
            b = c;
            c = a;
            fa = fb;
            fb = fc;
            fc = fa;
        }
        let tol = 2.0 * f64::EPSILON * b.abs() + 0.5 * (rel_tol * b.abs() + abs_tol);
        let m = 0.5 * (c - b);
        if m.abs() <= tol || fb == 0.0 {
            return Ok(b);
        }
        if e.abs() < tol || fa.abs() <= fb.abs() {
            d = m;
            e = m;
        } else {
            let s = fb / fa;
            let (mut p, mut q);
            if a == c {
                p = 2.0 * m * s;
                q = 1.0 - s;
            } else {
                let (qq, r) = (fa / fc, fb / fc);
                p = s * (2.0 * m * qq * (qq - r) - (b - a) * (r - 1.0));
                q = (qq - 1.0) * (r - 1.0) * (s - 1.0);
            }
            if p > 0.0 {
                q = -q;
            } else {
                p = -p;
            }
            if 2.0 * p < (3.0 * m * q - (tol * q).abs()).min((e * q).abs()) {
                e = d;
                d = p / q;
            } else {
                d = m;
                e = m;
            }
        }
        a = b;
        fa = fb;
        b += if d.abs() > tol { d } else { tol.copysign(m) };
        fb = f(b);
        if fb.is_nan() {
            return Err(RootError::NotANumber);
        }
    }
    Err(RootError::NoConvergence)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_simple_roots_to_machine_precision() {
        let r = brent(|x| x * x - 2.0, 0.0, 2.0, 1e-15, 1e-300).unwrap_or(f64::NAN);
        assert!((r - std::f64::consts::SQRT_2).abs() < 1e-15);
        let r = brent(f64::cos, 1.0, 2.0, 1e-15, 1e-300).unwrap_or(f64::NAN);
        assert!((r - std::f64::consts::FRAC_PI_2).abs() < 1e-15);
    }

    #[test]
    fn reports_missing_bracket_and_nan() {
        assert_eq!(
            brent(|x| x * x + 1.0, -1.0, 1.0, 1e-12, 1e-300),
            Err(RootError::NotBracketed)
        );
        assert_eq!(
            brent(|_| f64::NAN, 0.0, 1.0, 1e-12, 1e-300),
            Err(RootError::NotANumber)
        );
    }

    #[test]
    fn handles_a_root_at_an_endpoint_and_steep_functions() {
        assert_eq!(brent(|x| x, 0.0, 1.0, 1e-12, 1e-300), Ok(0.0));
        let r = brent(|x| (x - 0.3).powi(9), 0.0, 1.0, 1e-15, 1e-300).unwrap_or(f64::NAN);
        assert!((r - 0.3).abs() < 1e-1); // raiz de multiplicidade 9 é mal condicionada, mas converge
    }
}
