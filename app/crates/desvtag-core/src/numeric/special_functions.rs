//! Funções especiais (C03): `ln Γ`, gama incompleta regularizada, beta incompleta regularizada e `erfc`.
//!
//! Algoritmos (todos documentados em `docs/metodos/funcoes-especiais.md`):
//!
//! - `ln Γ(x)`: recorrência para `x ≥ 15` e série de Stirling com termos até `x⁻¹⁵` (erro < 1e-19).
//! - Gama incompleta regularizada `P(a, x)` e `Q(a, x)`: série para `x < a + 1` e fração contínua
//!   (Lentz modificado) caso contrário. Press et al., *Numerical Recipes*, §6.2.
//! - Beta incompleta regularizada `Iₓ(a, b)`: fração contínua de Lentz com a simetria
//!   `Iₓ(a, b) = 1 − I₁₋ₓ(b, a)`, escolhida para manter a **cauda pequena com precisão relativa**.
//!   Recebe `x` e `y = 1 − x` separados para não perder dígitos quando `x` é próximo de 1.
//! - `erfc(z) = Q(½, z²)` para `z ≥ 0`.

use std::f64::consts::PI;

/// Critério de parada das séries e frações contínuas: `2 ε`. Com `1e-16` (abaixo de `ε`) o critério
/// pode jamais ser satisfeito por ruído de arredondamento, e a iteração acumularia erro até o limite.
const EPS: f64 = 2.0 * f64::EPSILON;
const TINY: f64 = 1e-300;
const MAX_ITER: usize = 200_000;

/// Coeficientes de Lanczos (g = 7, n = 9; Godfrey), erro relativo típico ~1e-15 em Γ.
const LANCZOS: [f64; 9] = [
    0.999_999_999_999_809_9,
    676.520_368_121_885_1,
    -1_259.139_216_722_402_8,
    771.323_428_777_653_1,
    -176.615_029_162_140_6,
    12.507_343_278_686_905,
    -0.138_571_095_265_720_12,
    9.984_369_578_019_572e-6,
    1.505_632_735_149_311_6e-7,
];

/// `ln Γ(x)` para `x > 0`.
///
/// `x < 15`: aproximação de Lanczos (com `ln Γ(x) = ln Γ(x + 1) − ln x` para `x < 0,5`);
/// `x ≥ 15`: série de Stirling com termos até `x⁻¹⁵` (erro < 1e-19).
#[must_use]
pub fn ln_gamma(x: f64) -> f64 {
    if x <= 0.0 || x.is_nan() {
        return f64::NAN;
    }
    if x < 0.5 {
        return ln_gamma(x + 1.0) - x.ln();
    }
    if x < 15.0 {
        let z = x - 1.0;
        let t = z + 7.5;
        let mut sum = LANCZOS[0];
        for (i, c) in LANCZOS.iter().enumerate().skip(1) {
            sum += c / (z + i as f64);
        }
        return 0.5 * (2.0 * PI).ln() + (z + 0.5) * t.ln() - t + sum.ln();
    }
    (x - 0.5) * x.ln() - x + 0.5 * (2.0 * PI).ln() + stirling_correction(x)
}

/// Termo de correção de Stirling `ln Γ(x) − [(x − ½) ln x − x + ½ ln 2π]` para `x ≥ 15`
/// (série `Σ B₂ₖ / (2k (2k − 1) x^(2k−1))` até `x⁻¹⁵`; erro < 1e-19).
///
/// É a quantidade que permite calcular **diferenças** de `ln Γ` com argumentos grandes sem
/// cancelamento catastrófico (ver [`ln_beta`] e [`poisson_prefactor`]).
#[must_use]
pub fn stirling_correction(x: f64) -> f64 {
    let z2 = x * x;
    (1.0 / 12.0
        + (-1.0 / 360.0
            + (1.0 / 1260.0
                + (-1.0 / 1680.0
                    + (1.0 / 1188.0
                        + (-691.0 / 360_360.0 + (1.0 / 156.0 - 3617.0 / (122_400.0 * z2)) / z2)
                            / z2)
                        / z2)
                    / z2)
                / z2)
            / z2)
        / x
}

/// `ln B(a, b) = ln Γ(a) + ln Γ(b) − ln Γ(a + b)` sem cancelamento para argumentos grandes.
///
/// Mesmo método do R (`lbeta`): para `min(a, b) ≥ 15` usa a correção de Stirling;
/// para `max(a, b) ≥ 15` combina `ln Γ` do menor com a correção do maior.
#[must_use]
pub fn ln_beta(a: f64, b: f64) -> f64 {
    let (p, q) = if a < b { (a, b) } else { (b, a) };
    if p <= 0.0 || p.is_nan() || q.is_nan() {
        return f64::NAN;
    }
    let ln_sqrt_2pi = 0.5 * (2.0 * PI).ln();
    if p >= 15.0 {
        let corr = stirling_correction(p) + stirling_correction(q) - stirling_correction(p + q);
        -0.5 * q.ln()
            + ln_sqrt_2pi
            + corr
            + (p - 0.5) * (p / (p + q)).ln()
            + q * (-(p / (p + q))).ln_1p()
    } else if q >= 15.0 {
        let corr = stirling_correction(q) - stirling_correction(p + q);
        ln_gamma(p) + corr + p - p * (p + q).ln() + (q - 0.5) * (-(p / (p + q))).ln_1p()
    } else {
        ln_gamma(p) + ln_gamma(q) - ln_gamma(p + q)
    }
}

/// Erro de Stirling `stirlerr(n) = ln Γ(n + 1) − [(n + ½) ln n − n + ½ ln 2π]`.
fn stirling_error(n: f64) -> f64 {
    if n >= 15.0 {
        stirling_correction(n)
    } else {
        ln_gamma(n + 1.0) - (n + 0.5) * n.ln() + n - 0.5 * (2.0 * PI).ln()
    }
}

/// `bd0(x, np) = x ln(x/np) + np − x`, com série quando `x ≈ np` (Loader, 2000).
fn bd0(x: f64, np: f64) -> f64 {
    if (x - np).abs() < 0.1 * (x + np) {
        let mut v = (x - np) / (x + np);
        let mut s = (x - np) * v;
        if s.abs() < f64::MIN_POSITIVE {
            return s;
        }
        let mut ej = 2.0 * x * v;
        v *= v;
        for j in 1..1000 {
            ej *= v;
            let s1 = s + ej / f64::from(2 * j + 1);
            if s1 == s {
                return s1;
            }
            s = s1;
        }
    }
    x * (x / np).ln() + np - x
}

/// `x^a e^{−x} / Γ(a + 1)` (densidade de Poisson) sem cancelamento para `a` grande
/// (Loader, 2000): `exp(−stirlerr(a) − bd0(a, x)) / √(2π a)`.
#[must_use]
pub fn poisson_prefactor(a: f64, x: f64) -> f64 {
    if x == 0.0 {
        return if a == 0.0 { 1.0 } else { 0.0 };
    }
    if a < 10.0 {
        return (-x + a * x.ln() - ln_gamma(a + 1.0)).exp();
    }
    (-stirling_error(a) - bd0(a, x)).exp() / (2.0 * PI * a).sqrt()
}

/// Gama incompleta regularizada: devolve `(P(a, x), Q(a, x))`, com `P + Q = 1`, para `a > 0`, `x ≥ 0`.
///
/// A cauda menor é calculada diretamente (não por subtração), mantendo precisão relativa.
#[must_use]
pub fn gamma_inc_regularized(a: f64, x: f64) -> (f64, f64) {
    if a <= 0.0 || x < 0.0 || a.is_nan() || x.is_nan() {
        return (f64::NAN, f64::NAN);
    }
    if x == 0.0 {
        return (0.0, 1.0);
    }
    if x.is_infinite() {
        return (1.0, 0.0);
    }
    // x^a e^{-x} / Γ(a + 1); a vezes isto é o prefixo de Q (fração contínua).
    let density = poisson_prefactor(a, x);
    if x < a + 1.0 {
        // Série: P = [xᵃ e⁻ˣ / Γ(a+1)] · Σ xⁿ / ((a+1) ⋯ (a+n)), com o termo n = 0 igual a 1.
        let mut term = 1.0;
        let mut sum = term;
        let mut ap = a;
        for _ in 0..MAX_ITER {
            ap += 1.0;
            term *= x / ap;
            sum += term;
            if term.abs() < sum.abs() * EPS {
                break;
            }
        }
        let p = (density * sum).min(1.0);
        (p, 1.0 - p)
    } else {
        // Fração contínua (Lentz modificado).
        let mut b = x + 1.0 - a;
        let mut c = 1.0 / TINY;
        let mut d = 1.0 / b;
        let mut h = d;
        for i in 1..=MAX_ITER {
            let an = -(i as f64) * (i as f64 - a);
            b += 2.0;
            d = an * d + b;
            if d.abs() < TINY {
                d = TINY;
            }
            c = b + an / c;
            if c.abs() < TINY {
                c = TINY;
            }
            d = 1.0 / d;
            let del = d * c;
            h *= del;
            if (del - 1.0).abs() < EPS {
                break;
            }
        }
        let q = (a * density * h).min(1.0);
        (1.0 - q, q)
    }
}

/// Fração contínua da beta incompleta (Lentz). Devolve `h` tal que `Iₓ(a,b) = bt · h / a`.
fn beta_continued_fraction(a: f64, b: f64, x: f64) -> f64 {
    let (qab, qap, qam) = (a + b, a + 1.0, a - 1.0);
    let mut c = 1.0;
    let mut d = 1.0 - qab * x / qap;
    if d.abs() < TINY {
        d = TINY;
    }
    d = 1.0 / d;
    let mut h = d;
    for m in 1..=MAX_ITER {
        let m = m as f64;
        let m2 = 2.0 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1.0 + aa * d;
        if d.abs() < TINY {
            d = TINY;
        }
        c = 1.0 + aa / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        h *= d * c;
        let aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1.0 + aa * d;
        if d.abs() < TINY {
            d = TINY;
        }
        c = 1.0 + aa / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        let del = d * c;
        h *= del;
        if (del - 1.0).abs() < EPS {
            break;
        }
    }
    h
}

/// Beta incompleta regularizada: devolve `(Iₓ(a, b), 1 − Iₓ(a, b))` para `a, b > 0`, `0 ≤ x ≤ 1`.
///
/// `y` deve ser `1 − x` calculado pelo chamador **sem perda de precisão** (por exemplo,
/// `x = ν/(ν + t²)` e `y = t²/(ν + t²)`). A cauda menor é calculada diretamente.
#[must_use]
pub fn beta_inc_regularized(a: f64, b: f64, x: f64, y: f64) -> (f64, f64) {
    if a <= 0.0 || b <= 0.0 || a.is_nan() || b.is_nan() || x.is_nan() || !(0.0..=1.0).contains(&x) {
        return (f64::NAN, f64::NAN);
    }
    if x == 0.0 {
        return (0.0, 1.0);
    }
    if y == 0.0 {
        return (1.0, 0.0);
    }
    // Logaritmos precisos perto de 1: ln x = ln_1p(−y) quando y é pequeno, e vice-versa.
    let ln_x = if y < 0.5 { (-y).ln_1p() } else { x.ln() };
    let ln_y = if x < 0.5 { (-x).ln_1p() } else { y.ln() };
    let bt = (a * ln_x + b * ln_y - ln_beta(a, b)).exp();
    if x < (a + 1.0) / (a + b + 2.0) {
        let lower = (bt * beta_continued_fraction(a, b, x) / a).min(1.0);
        (lower, 1.0 - lower)
    } else {
        let upper = (bt * beta_continued_fraction(b, a, y) / b).min(1.0);
        (1.0 - upper, upper)
    }
}

/// `erfc(z)` para `z ≥ 0`. Na cauda (`z² ≥ 1,5`) usa a fração contínua com `z²` **exato**:
/// `z² = hi + lo` (produto sem erro por FMA), pois o erro de arredondamento de `z·z` seria
/// amplificado por `exp(−z²)`.
fn erfc_positive(z: f64) -> f64 {
    let x = z * z;
    if x < 1.5 {
        return gamma_inc_regularized(0.5, x).1;
    }
    let lo = z.mul_add(z, -x);
    let mut b = x + 0.5;
    let mut c = 1.0 / TINY;
    let mut d = 1.0 / b;
    let mut h = d;
    for i in 1..=MAX_ITER {
        let an = -(i as f64) * (i as f64 - 0.5);
        b += 2.0;
        d = an * d + b;
        if d.abs() < TINY {
            d = TINY;
        }
        c = b + an / c;
        if c.abs() < TINY {
            c = TINY;
        }
        d = 1.0 / d;
        let del = d * c;
        h *= del;
        if (del - 1.0).abs() < EPS {
            break;
        }
    }
    // Q(½, x) = √x e^{−x} / Γ(½) · h, com Γ(½) = √π.
    (z / PI.sqrt() * (-x).exp() * (-lo).exp() * h).min(1.0)
}

/// Função de erro complementar `erfc(z)`, com precisão relativa também nas caudas.
#[must_use]
pub fn erfc(z: f64) -> f64 {
    if z.is_nan() {
        return f64::NAN;
    }
    if z >= 0.0 {
        erfc_positive(z)
    } else {
        2.0 - erfc_positive(-z)
    }
}

/// Função de erro `erf(z)`.
#[must_use]
pub fn erf(z: f64) -> f64 {
    if z.is_nan() {
        return f64::NAN;
    }
    let p = gamma_inc_regularized(0.5, z * z).0;
    p.copysign(z)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rel(a: f64, b: f64) -> f64 {
        if b == 0.0 {
            a.abs()
        } else {
            ((a - b) / b).abs()
        }
    }

    #[test]
    fn ln_gamma_matches_exact_values() {
        assert!(ln_gamma(1.0).abs() < 1e-15);
        assert!(ln_gamma(2.0).abs() < 1e-15);
        assert!(rel(ln_gamma(0.5), 0.5 * PI.ln()) < 5e-15); // Γ(½) = √π (medido ≈ 1e-15)
        assert!(rel(ln_gamma(10.0), 362_880.0_f64.ln()) < 5e-15); // Γ(10) = 9!
        assert!(rel(ln_gamma(101.0), 363.739_375_555_563_47) < 5e-15); // ln(100!) (Python math.lgamma)
        assert!(ln_gamma(-1.0).is_nan() && ln_gamma(0.0).is_nan());
    }

    #[test]
    fn gamma_inc_special_cases_have_closed_forms() {
        // P(1, x) = 1 − e^{−x}.
        for x in [0.1, 1.0, 5.0, 30.0] {
            let (p, q) = gamma_inc_regularized(1.0, x);
            assert!(rel(q, (-x).exp()) < 1e-14, "x={x}");
            assert!((p + q - 1.0).abs() < 1e-15);
        }
        // P(½, x²) = erf(x): erf(1) = 0,8427007929497149.
        assert!(rel(gamma_inc_regularized(0.5, 1.0).0, 0.842_700_792_949_714_9) < 1e-14);
        assert_eq!(gamma_inc_regularized(2.0, 0.0), (0.0, 1.0));
    }

    #[test]
    fn beta_inc_special_cases_have_closed_forms() {
        // I_x(1, 1) = x; I_x(2, 1) = x²; I_x(1, 2) = 1 − (1−x)².
        for x in [0.1, 0.5, 0.9] {
            let y = 1.0 - x;
            assert!(rel(beta_inc_regularized(1.0, 1.0, x, y).0, x) < 1e-14);
            assert!(rel(beta_inc_regularized(2.0, 1.0, x, y).0, x * x) < 1e-14);
            assert!(rel(beta_inc_regularized(1.0, 2.0, x, y).0, 1.0 - y * y) < 1e-14);
        }
        // Simetria I_x(a,b) + I_{1−x}(b,a) = 1.
        let (l, _) = beta_inc_regularized(2.5, 4.0, 0.3, 0.7);
        let (l2, _) = beta_inc_regularized(4.0, 2.5, 0.7, 0.3);
        assert!((l + l2 - 1.0).abs() < 1e-14);
    }

    #[test]
    fn erfc_keeps_relative_precision_in_the_tail() {
        // erfc(5) = 1,5374597944280349e-12; erfc(−1) = 1 + erf(1).
        assert!(rel(erfc(5.0), 1.537_459_794_428_035_1e-12) < 5e-15); // medido ≈ 1,6e-15
        assert!(rel(erfc(-1.0), 1.842_700_792_949_715) < 5e-15);
        assert!(rel(erf(1.0), 0.842_700_792_949_714_9) < 5e-15);
        assert!(erf(-1.0) < 0.0 && erf(0.0) == 0.0);
    }

    #[test]
    fn invalid_arguments_give_nan_not_a_number_that_looks_valid() {
        assert!(gamma_inc_regularized(-1.0, 1.0).0.is_nan());
        assert!(beta_inc_regularized(1.0, 1.0, 1.5, -0.5).0.is_nan());
        assert!(erfc(f64::NAN).is_nan());
    }
}
