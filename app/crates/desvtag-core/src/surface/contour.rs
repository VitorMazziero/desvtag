//! Curvas de nível por *marching squares* sobre a malha de predições.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Segmento de uma curva de nível, em coordenadas reais dos eixos.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Segment {
    /// Extremo inicial, eixo horizontal.
    pub x1: f64,
    /// Extremo inicial, eixo vertical.
    pub y1: f64,
    /// Extremo final, eixo horizontal.
    pub x2: f64,
    /// Extremo final, eixo vertical.
    pub y2: f64,
}

/// Curva de nível: valor e segmentos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContourLevel {
    /// Valor da resposta.
    pub level: f64,
    /// Segmentos da curva.
    pub segments: Vec<Segment>,
}

/// Níveis "redondos" (passo 1, 2 ou 5 × 10ⁿ) cobrindo `[min, max]`, com cerca de `target` níveis
/// no interior do intervalo.
#[must_use]
pub fn nice_levels(min: f64, max: f64, target: usize) -> Vec<f64> {
    if !(min.is_finite() && max.is_finite()) || max <= min || target == 0 {
        return Vec::new();
    }
    let raw = (max - min) / target as f64;
    let magnitude = 10.0_f64.powf(raw.log10().floor());
    // Passo "redondo" mais próximo (em escala logarítmica) do ideal.
    let step = [1.0, 2.0, 5.0, 10.0]
        .into_iter()
        .map(|m| m * magnitude)
        .min_by(|a, b| (a / raw).ln().abs().total_cmp(&(b / raw).ln().abs()))
        .unwrap_or(magnitude);
    let first = (min / step).ceil();
    let mut levels = Vec::new();
    let mut n = first;
    while n * step <= max {
        let level = n * step;
        // Evita níveis exatamente iguais ao mínimo/máximo (curvas degeneradas).
        if level > min && level < max {
            levels.push(level);
        }
        n += 1.0;
        if levels.len() > 200 {
            break;
        }
    }
    levels
}

fn crossing(a: f64, b: f64, level: f64, pa: f64, pb: f64) -> f64 {
    let t = (level - a) / (b - a);
    pa + t * (pb - pa)
}

/// Segmentos do nível `level` em `z[iy][ix]` com eixos `x[ix]` e `y[iy]`. Células com algum vértice
/// ausente (`None`) são ignoradas.
#[must_use]
pub fn contour(x: &[f64], y: &[f64], z: &[Vec<Option<f64>>], level: f64) -> Vec<Segment> {
    let mut segments = Vec::new();
    for iy in 0..y.len().saturating_sub(1) {
        for ix in 0..x.len().saturating_sub(1) {
            let (Some(v00), Some(v10), Some(v11), Some(v01)) =
                (z[iy][ix], z[iy][ix + 1], z[iy + 1][ix + 1], z[iy + 1][ix])
            else {
                continue;
            };
            let case = usize::from(v00 >= level)
                | (usize::from(v10 >= level) << 1)
                | (usize::from(v11 >= level) << 2)
                | (usize::from(v01 >= level) << 3);
            let (x0, x1, y0, y1) = (x[ix], x[ix + 1], y[iy], y[iy + 1]);
            // Pontos nas arestas: baixo (y0), direita (x1), cima (y1), esquerda (x0).
            let bottom = || (crossing(v00, v10, level, x0, x1), y0);
            let right = || (x1, crossing(v10, v11, level, y0, y1));
            let top = || (crossing(v01, v11, level, x0, x1), y1);
            let left = || (x0, crossing(v00, v01, level, y0, y1));
            let mut push = |a: (f64, f64), b: (f64, f64)| {
                segments.push(Segment {
                    x1: a.0,
                    y1: a.1,
                    x2: b.0,
                    y2: b.1,
                });
            };
            match case {
                1 | 14 => push(left(), bottom()),
                2 | 13 => push(bottom(), right()),
                3 | 12 => push(left(), right()),
                4 | 11 => push(right(), top()),
                6 | 9 => push(bottom(), top()),
                7 | 8 => push(left(), top()),
                5 | 10 => {
                    // Sela: decide pela média dos vértices.
                    let center_high = (v00 + v10 + v11 + v01) / 4.0 >= level;
                    if (case == 5) == center_high {
                        push(left(), top());
                        push(bottom(), right());
                    } else {
                        push(left(), bottom());
                        push(right(), top());
                    }
                }
                _ => {}
            }
        }
    }
    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    fn grid(f: impl Fn(f64, f64) -> f64, n: usize) -> (Vec<f64>, Vec<f64>, Vec<Vec<Option<f64>>>) {
        let axis: Vec<f64> = (0..n)
            .map(|i| -1.0 + 2.0 * i as f64 / (n - 1) as f64)
            .collect();
        let z = axis
            .iter()
            .map(|&y| axis.iter().map(|&x| Some(f(x, y))).collect())
            .collect();
        (axis.clone(), axis, z)
    }

    #[test]
    fn circle_contour_points_lie_on_the_circle() {
        let (x, y, z) = grid(|x, y| x * x + y * y, 41);
        let segs = contour(&x, &y, &z, 0.25);
        assert!(segs.len() > 20);
        for s in &segs {
            for (px, py) in [(s.x1, s.y1), (s.x2, s.y2)] {
                // Interpolação linear de um paraboloide: erro pequeno (O(h²)).
                assert!(((px * px + py * py).sqrt() - 0.5).abs() < 5e-3, "{px} {py}");
            }
        }
    }

    #[test]
    fn a_plane_gives_straight_segments_at_the_exact_position() {
        let (x, y, z) = grid(|x, y| x + 0.0 * y, 5);
        let segs = contour(&x, &y, &z, 0.3);
        assert!(!segs.is_empty());
        assert!(
            segs.iter()
                .all(|s| (s.x1 - 0.3).abs() < 1e-12 && (s.x2 - 0.3).abs() < 1e-12)
        );
    }

    #[test]
    fn cells_with_missing_vertices_are_skipped_and_flat_grids_have_no_levels() {
        let (x, y, mut z) = grid(|x, y| x + y, 3);
        z[0][0] = None;
        let with_hole = contour(&x, &y, &z, -1.0).len();
        let (_, _, full) = grid(|x, y| x + y, 3);
        assert!(with_hole < contour(&x, &y, &full, -1.0).len());
        assert!(nice_levels(1.0, 1.0, 5).is_empty());
    }

    #[test]
    fn nice_levels_are_round_and_inside_the_range() {
        let levels = nice_levels(3.2, 47.9, 8);
        assert!(levels.windows(2).all(|w| w[1] > w[0]));
        assert!(levels.iter().all(|l| *l > 3.2 && *l < 47.9));
        assert_eq!(levels[..3], [5.0, 10.0, 15.0]);
    }
}
