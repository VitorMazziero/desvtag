//! Tabela de `W(w; k)` (função de distribuição da amplitude de `k` normais padrão) por
//! interpolação de Chebyshev em trechos.
//!
//! `W` depende só de `k`; o `cdf` da amplitude studentizada a avalia em ~400 pontos `w = q·s` por
//! `q`. Calcular `W` por quadratura em cada ponto custa ~190 chamadas de `erfc`; tabulá-la uma vez
//! por `k` reduz cada `P(Q ≤ q)` a ~400 avaliações polinomiais baratas (acelera as comparações
//! com muitos grupos, em que há milhares de pares). O erro máximo medido contra a quadratura
//! direta está nos testes (≤ 1e-14 em `W`).

/// Fim da tabela: `1 − W(20; k) < 1e-12` até `k = 1000` (`k·2·Φ̄(10) ≈ 1e-20`); acima, `W = 1`.
const W_MAX: f64 = 20.0;
/// Largura de cada trecho.
pub(super) const PANEL_WIDTH: f64 = 0.25;
/// Nós de Chebyshev por trecho (grau 24).
const NODES: usize = 25;

/// Interpolante de `W(·; k)` em `[0, W_MAX]`.
#[derive(Debug, Clone)]
pub(super) struct RangeTable {
    panel_width: f64,
    /// Coeficientes de Chebyshev de cada trecho.
    panels: Vec<[f64; NODES]>,
}

impl RangeTable {
    /// Monta a tabela avaliando `exact` (quadratura direta) nos nós de cada trecho.
    pub(super) fn build(exact: impl Fn(f64) -> f64) -> Self {
        let count = (W_MAX / PANEL_WIDTH).round() as usize;
        Self::with_panel_count(count, exact)
    }

    /// Usa trechos menores sem gastar mais avaliações do que o orçamento permite.
    pub(super) fn try_build(
        max_width: f64,
        sample_budget: usize,
        exact: impl Fn(f64) -> f64,
    ) -> Option<Self> {
        let count = (W_MAX / max_width.min(PANEL_WIDTH)).ceil() as usize;
        (count <= sample_budget / NODES).then(|| Self::with_panel_count(count, exact))
    }

    fn with_panel_count(count: usize, exact: impl Fn(f64) -> f64) -> Self {
        let panel_width = W_MAX / count as f64;
        let cosines: Vec<Vec<f64>> = (0..NODES)
            .map(|m| {
                (0..NODES)
                    .map(|j| {
                        (std::f64::consts::PI * m as f64 * (j as f64 + 0.5) / NODES as f64).cos()
                    })
                    .collect()
            })
            .collect();
        let nodes: Vec<f64> = (0..NODES)
            .map(|j| (std::f64::consts::PI * (j as f64 + 0.5) / NODES as f64).cos())
            .collect();
        let mut panels = Vec::with_capacity(count);
        for p in 0..count {
            let mid = panel_width * (p as f64 + 0.5);
            let half = 0.5 * panel_width;
            let values: Vec<f64> = nodes.iter().map(|x| exact(mid + half * x)).collect();
            let mut coefficients = [0.0; NODES];
            for (m, c) in coefficients.iter_mut().enumerate() {
                let sum: f64 = values.iter().zip(&cosines[m]).map(|(v, cs)| v * cs).sum();
                *c = 2.0 * sum / NODES as f64;
            }
            coefficients[0] *= 0.5;
            panels.push(coefficients);
        }
        Self {
            panel_width,
            panels,
        }
    }

    /// `W(w; k)` interpolada (0 para `w ≤ 0` e 1 para `w ≥ W_MAX`).
    pub(super) fn eval(&self, w: f64) -> f64 {
        if w <= 0.0 {
            return 0.0;
        }
        if w >= W_MAX {
            return 1.0;
        }
        let index = ((w / self.panel_width) as usize).min(self.panels.len() - 1);
        let mid = self.panel_width * (index as f64 + 0.5);
        let x = (w - mid) / (0.5 * self.panel_width);
        // Clenshaw.
        let c = &self.panels[index];
        let (mut b1, mut b2) = (0.0_f64, 0.0_f64);
        for m in (1..NODES).rev() {
            let b0 = 2.0 * x * b1 - b2 + c[m];
            b2 = b1;
            b1 = b0;
        }
        (x * b1 - b2 + c[0]).clamp(0.0, 1.0)
    }
}
