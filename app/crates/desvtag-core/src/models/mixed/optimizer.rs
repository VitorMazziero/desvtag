//! Minimização BFGS determinística com gradiente central e busca de Armijo.
//! Pontos fora do domínio são recusados; convergência não é presumida por estagnação.
use super::linalg::dot;
#[derive(Clone, Debug)]
pub(super) struct Optimum {
    pub theta: Vec<f64>,
    pub value: f64,
    pub iterations: usize,
    pub gradient_norm: f64,
    pub converged: bool,
}
fn gradient(f: &impl Fn(&[f64]) -> Option<f64>, x: &[f64]) -> Option<Vec<f64>> {
    let mut g = Vec::with_capacity(x.len());
    for i in 0..x.len() {
        let h = 1e-5 * (1. + x[i].abs());
        let mut a = x.to_vec();
        let mut b = a.clone();
        a[i] += h;
        b[i] -= h;
        g.push((f(&a)? - f(&b)?) / (2. * h));
    }
    g.iter().all(|v| v.is_finite()).then_some(g)
}
fn norm(g: &[f64]) -> f64 {
    g.iter().map(|v| v.abs()).fold(0., f64::max)
}
pub(super) fn minimize(
    f: &impl Fn(&[f64]) -> Option<f64>,
    start: &[f64],
    max_iterations: usize,
) -> Option<Optimum> {
    let n = start.len();
    if n == 0 {
        return None;
    }
    let mut x = start.to_vec();
    let mut value = f(&x)?;
    let mut g = gradient(f, &x)?;
    let identity = || {
        let mut h = vec![0.; n * n];
        for i in 0..n {
            h[i * n + i] = 1.;
        }
        h
    };
    let mut inv = identity();
    let mut iterations = 0;
    for iteration in 0..max_iterations {
        iterations = iteration;
        if norm(&g) < 2e-5 {
            break;
        }
        let mut direction: Vec<f64> = (0..n)
            .map(|i| -(0..n).map(|j| inv[i * n + j] * g[j]).sum::<f64>())
            .collect();
        if dot(&direction, &g) >= -1e-12 * dot(&g, &g) {
            direction = g.iter().map(|v| -v).collect();
            inv = identity();
        }
        let largest = norm(&direction);
        if largest > 4. {
            direction.iter_mut().for_each(|v| *v *= 4. / largest);
        }
        let slope = dot(&g, &direction);
        let mut step = 1.;
        let mut accepted = None;
        for _ in 0..40 {
            let next: Vec<f64> = x
                .iter()
                .zip(&direction)
                .map(|(a, d)| a + step * d)
                .collect();
            if let Some(v) = f(&next).filter(|v| v.is_finite() && *v <= value + 1e-4 * step * slope)
            {
                accepted = Some((next, v));
                break;
            }
            step *= 0.5;
        }
        let Some((next, next_value)) = accepted else {
            break;
        };
        let next_g = gradient(f, &next)?;
        let s: Vec<f64> = next.iter().zip(&x).map(|(a, b)| a - b).collect();
        let y: Vec<f64> = next_g.iter().zip(&g).map(|(a, b)| a - b).collect();
        let sy = dot(&s, &y);
        if sy > 1e-12 * dot(&s, &s).sqrt() * dot(&y, &y).sqrt() && sy > 0. {
            let hy: Vec<f64> = (0..n).map(|i| dot(&inv[i * n..(i + 1) * n], &y)).collect();
            let yhy = dot(&y, &hy);
            for i in 0..n {
                for j in 0..n {
                    inv[i * n + j] +=
                        (1. + yhy / sy) * s[i] * s[j] / sy - (hy[i] * s[j] + s[i] * hy[j]) / sy;
                }
            }
        } else {
            inv = identity();
        }
        x = next;
        value = next_value;
        g = next_g;
        iterations = iteration + 1;
    }
    Some(Optimum {
        theta: x,
        value,
        iterations,
        gradient_norm: norm(&g),
        converged: norm(&g) < 2e-5,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn curved_valley_and_failed_budget_are_distinguished() {
        let f = |x: &[f64]| Some((1. - x[0]).powi(2) + 100. * (x[1] - x[0] * x[0]).powi(2));
        let good = minimize(&f, &[-1.2, 1.], 400).unwrap_or_else(|| unreachable!());
        assert!(good.converged, "{good:?}");
        assert!(good.value < 1e-10);
        let short = minimize(&f, &[-1.2, 1.], 1).unwrap_or_else(|| unreachable!());
        assert!(!short.converged);
    }
}
