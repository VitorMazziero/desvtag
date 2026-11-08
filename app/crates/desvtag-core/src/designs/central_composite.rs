//! Composto central (CCD): parte fatorial, pontos axiais ±α e pontos centrais.
//!
//! - **Rotacional (DCCR/CCRD):** `α = F^(1/4)`, com `F` o número de pontos da parte fatorial;
//! - **Face centrada (FCD):** `α = 1`;
//! - **`α` informado:** caso geral.
//!
//! No arranjo **circunscrito** a parte fatorial fica em ±1 e os pontos axiais em ±α; no
//! **inscrito**, os axiais ficam em ±1 e a parte fatorial em ±1/α (os níveis informados pelo
//! usuário são, então, os extremos da região). A parte fatorial é completa ou fracionária regular
//! (geradores como em [`super::fractional`]).

use super::factorial::full_factorial;
use super::fractional::{fractional_matrix, parse_generators, relation_and_resolution};
use super::spec::AxialKind;
use crate::validation::{Issue, Severity};

/// Maior distância axial aceita.
pub const MAX_ALPHA: f64 = 10.0;

/// Parte do composto central.
#[derive(Debug, Clone, PartialEq)]
pub struct CentralComposite {
    /// Linhas: parte fatorial seguida dos pontos axiais, na escala codificada.
    pub matrix: Vec<Vec<f64>>,
    /// Pontos axiais (as últimas `2k` linhas).
    pub axial: usize,
    /// Distância axial `α`.
    pub alpha: f64,
    /// Pontos da parte fatorial.
    pub factorial: usize,
    /// Relação definidora e resolução da parte fatorial (fracionária).
    pub words: Vec<super::alias::Word>,
    /// Resolução da parte fatorial.
    pub resolution: Option<u32>,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Número de pontos da parte fatorial para `k` fatores e `p` geradores.
#[must_use]
pub fn factorial_points(k: usize, p: usize) -> usize {
    1_usize << (k - p)
}

/// Distância axial.
///
/// # Errors
/// `design.invalid_alpha_axial` quando `α` não está em `(0, 10]`.
pub fn axial_distance(kind: &AxialKind, factorial: usize) -> Result<f64, Vec<Issue>> {
    let alpha = match kind {
        AxialKind::Rotatable => (factorial as f64).powf(0.25),
        AxialKind::FaceCentered => 1.0,
        AxialKind::Custom { alpha } => *alpha,
    };
    if alpha.is_finite() && alpha > 0.0 && alpha <= MAX_ALPHA {
        Ok(alpha)
    } else {
        Err(vec![
            error("design.invalid_axial_distance").with_param("max", &MAX_ALPHA),
        ])
    }
}

/// Monta o composto central.
///
/// # Errors
/// Diagnósticos `design.*` para fatores, geradores ou `α` inválidos.
pub fn central_composite(
    k: usize,
    kind: &AxialKind,
    inscribed: bool,
    generators: &[String],
) -> Result<CentralComposite, Vec<Issue>> {
    if k < 2 {
        return Err(vec![
            error("design.too_few_factors").with_param("count", &k),
        ]);
    }
    if k > 8 && generators.is_empty() {
        return Err(vec![error("design.too_many_factors").with_param("max", &8)]);
    }
    let (cube, words, resolution) = if generators.is_empty() {
        (full_factorial(k), Vec::new(), None)
    } else {
        let parsed = parse_generators(k, generators)?;
        let (words, resolution) = relation_and_resolution(&parsed);
        (fractional_matrix(k, &parsed), words, resolution)
    };
    let factorial = cube.len();
    let alpha = axial_distance(kind, factorial)?;
    let (cube_level, axial_level) = if inscribed {
        (1.0 / alpha, 1.0)
    } else {
        (1.0, alpha)
    };
    let mut matrix: Vec<Vec<f64>> = cube
        .into_iter()
        .map(|row| row.into_iter().map(|c| c * cube_level).collect())
        .collect();
    for i in 0..k {
        for sign in [-1.0, 1.0] {
            let mut row = vec![0.0; k];
            row[i] = sign * axial_level;
            matrix.push(row);
        }
    }
    Ok(CentralComposite {
        matrix,
        axial: 2 * k,
        alpha,
        factorial,
        words,
        resolution,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotatable_alpha_is_the_fourth_root_of_the_factorial_points() {
        let two = central_composite(2, &AxialKind::Rotatable, false, &[])
            .unwrap_or_else(|_| unreachable!());
        assert!((two.alpha - 2.0_f64.sqrt()).abs() < 1e-15);
        let three = central_composite(3, &AxialKind::Rotatable, false, &[])
            .unwrap_or_else(|_| unreachable!());
        assert!((three.alpha - 8.0_f64.powf(0.25)).abs() < 1e-15);
        // 2^(5-1): F = 16, α = 2.
        let half = central_composite(5, &AxialKind::Rotatable, false, &["E=ABCD".to_string()])
            .unwrap_or_else(|_| unreachable!());
        assert_eq!(
            (half.factorial, half.axial, half.matrix.len()),
            (16, 10, 26)
        );
        assert!((half.alpha - 2.0).abs() < 1e-15);
    }

    #[test]
    fn face_centred_and_custom_alpha() {
        let fcd = central_composite(3, &AxialKind::FaceCentered, false, &[])
            .unwrap_or_else(|_| unreachable!());
        assert_eq!(fcd.alpha, 1.0);
        assert_eq!(fcd.matrix.len(), 14);
        assert!(central_composite(3, &AxialKind::Custom { alpha: 0.0 }, false, &[]).is_err());
        assert!(central_composite(3, &AxialKind::Custom { alpha: 11.0 }, false, &[]).is_err());
        assert!(central_composite(3, &AxialKind::Custom { alpha: f64::NAN }, false, &[]).is_err());
    }

    #[test]
    fn inscribed_places_axial_points_at_one_and_the_cube_at_one_over_alpha() {
        let c = central_composite(2, &AxialKind::Rotatable, true, &[])
            .unwrap_or_else(|_| unreachable!());
        let inv = 1.0 / 2.0_f64.sqrt();
        assert_eq!(c.matrix[0], [-inv, -inv]);
        assert_eq!(c.matrix[4], [-1.0, 0.0]);
        assert_eq!(c.matrix[7], [0.0, 1.0]);
    }

    #[test]
    fn axial_points_are_the_last_rows_in_factor_order() {
        let c = central_composite(3, &AxialKind::Custom { alpha: 1.5 }, false, &[])
            .unwrap_or_else(|_| unreachable!());
        let axial = &c.matrix[c.matrix.len() - 6..];
        assert_eq!(axial[0], [-1.5, 0.0, 0.0]);
        assert_eq!(axial[1], [1.5, 0.0, 0.0]);
        assert_eq!(axial[4], [0.0, 0.0, -1.5]);
    }

    #[test]
    fn fractional_cube_reports_resolution() {
        let c = central_composite(5, &AxialKind::FaceCentered, false, &["E=ABCD".to_string()])
            .unwrap_or_else(|_| unreachable!());
        assert_eq!(c.resolution, Some(5));
        assert!(central_composite(3, &AxialKind::Rotatable, false, &["D=AB".to_string()]).is_err());
    }
}
