//! Quadratura de Gauss–Legendre (C03).
//!
//! Nós e pesos são calculados por iteração de Newton sobre os polinômios de Legendre (sem tabelas
//! digitadas à mão, portanto sem risco de coeficiente errado). Usada pela distribuição da amplitude
//! studentizada. Referência: Press et al., *Numerical Recipes*, §4.6; Golub e Welsch (1969).

/// Nós e pesos de Gauss–Legendre de ordem `n` em `[-1, 1]` (exata para polinômios de grau `2n − 1`).
#[must_use]
pub fn gauss_legendre(n: usize) -> (Vec<f64>, Vec<f64>) {
    let mut nodes = vec![0.0; n];
    let mut weights = vec![0.0; n];
    let m = n.div_ceil(2);
    for i in 0..m {
        // Estimativa inicial de Tricomi para a i-ésima raiz.
        let mut x = (std::f64::consts::PI * (i as f64 + 0.75) / (n as f64 + 0.5)).cos();
        let mut derivative = 1.0;
        for _ in 0..100 {
            let (mut p0, mut p1) = (1.0, x);
            if n == 1 {
                p1 = x;
            }
            for k in 2..=n {
                let kf = k as f64;
                let p2 = ((2.0 * kf - 1.0) * x * p1 - (kf - 1.0) * p0) / kf;
                p0 = p1;
                p1 = p2;
            }
            // `p1` = P_n(x); `p0` = P_{n−1}(x).
            let p_n = if n == 1 { x } else { p1 };
            let p_prev = if n == 1 { 1.0 } else { p0 };
            derivative = n as f64 * (x * p_n - p_prev) / (x * x - 1.0);
            let step = p_n / derivative;
            x -= step;
            if step.abs() < 1e-16 {
                break;
            }
        }
        nodes[i] = -x;
        nodes[n - 1 - i] = x;
        let w = 2.0 / ((1.0 - x * x) * derivative * derivative);
        weights[i] = w;
        weights[n - 1 - i] = w;
    }
    (nodes, weights)
}

/// Integra `f` em `[a, b]` com quadratura composta de Gauss–Legendre: `panels` subintervalos iguais,
/// `order` nós em cada um.
pub fn integrate(f: impl Fn(f64) -> f64, a: f64, b: f64, panels: usize, order: usize) -> f64 {
    let (nodes, weights) = gauss_legendre(order);
    let h = (b - a) / panels as f64;
    let mut total = crate::numeric::CompensatedSum::new();
    for p in 0..panels {
        let mid = a + h * (p as f64 + 0.5);
        for (t, w) in nodes.iter().zip(&weights) {
            total.add(w * f(mid + 0.5 * h * t));
        }
    }
    0.5 * h * total.total()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nodes_and_weights_satisfy_the_defining_identities() {
        for n in [1, 2, 3, 5, 8, 12, 16, 24] {
            let (x, w) = gauss_legendre(n);
            assert!((w.iter().sum::<f64>() - 2.0).abs() < 1e-14, "n={n}");
            assert!(x.iter().zip(&w).map(|(x, w)| x * w).sum::<f64>().abs() < 1e-14);
            // Exata para x^(2n−2): 2/(2n−1).
            let power = i32::try_from(2 * n - 2).unwrap_or(0);
            let integral: f64 = x.iter().zip(&w).map(|(x, w)| w * x.powi(power)).sum();
            assert!(
                (integral - 2.0 / (2.0 * n as f64 - 1.0)).abs() < 1e-14,
                "n={n}"
            );
        }
        // Valores conhecidos: n = 2 → ±1/√3, pesos 1.
        let (x, w) = gauss_legendre(2);
        assert!((x[1] - 1.0 / 3.0_f64.sqrt()).abs() < 1e-15 && (w[0] - 1.0).abs() < 1e-15);
    }

    #[test]
    fn composite_rule_integrates_smooth_functions() {
        // ∫₀^π sin = 2 ; ∫₀^1 e^x = e − 1.
        assert!((integrate(f64::sin, 0.0, std::f64::consts::PI, 4, 8) - 2.0).abs() < 1e-14);
        assert!((integrate(f64::exp, 0.0, 1.0, 1, 10) - (std::f64::consts::E - 1.0)).abs() < 1e-15);
    }
}
