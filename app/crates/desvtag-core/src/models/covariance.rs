//! Covariância dos coeficientes sem inverter `XᵀX`.
//!
//! Com `X·P = Q·R` e colunas escaladas por suas normas (`D`), `(XᵀX)⁻¹ = D⁻¹·(RᵀR)⁻¹·D⁻¹` nas
//! colunas retidas. As formas quadráticas de predição usam substituição direta em `Rᵀ`.

use crate::numeric::QrDecomposition;

/// Tolerância relativa para aceitar um vetor como estimável.
const ESTIMABLE_TOL: f64 = 1e-9;

/// `[(XᵀX)⁻¹]ⱼⱼ` por coluna original; `None` para colunas aliasadas (não estimáveis).
#[must_use]
pub fn unscaled_variances(qr: &QrDecomposition, columns: usize) -> Vec<Option<f64>> {
    let inverse = qr.xtx_inverse();
    let mut out = vec![None; columns];
    for k in 0..qr.rank {
        let original = qr.perm[k];
        let norm = qr.column_norms[original];
        out[original] = Some(inverse[(k, k)] / (norm * norm));
    }
    out
}

/// Forma quadrática `x₀ᵀ·(XᵀX)⁻¹·x₀` para uma linha `x0` (ordem original das colunas).
///
/// Devolve `None` se `x0` não for estimável: quando há aliasing, só combinações no espaço-linha de
/// `X` têm variância definida.
#[must_use]
pub fn quadratic_form(qr: &QrDecomposition, x0: &[f64]) -> Option<f64> {
    let rank = qr.rank;
    let columns = qr.perm.len();
    if x0.len() != columns || rank == 0 {
        return None;
    }
    if qr.perm.iter().any(|&original| {
        !x0[original].is_finite() || (qr.column_norms[original] == 0.0 && x0[original] != 0.0)
    }) {
        return None;
    }
    // Coordenadas escaladas e permutadas.
    let v: Vec<f64> = qr
        .perm
        .iter()
        .map(|&original| {
            let norm = qr.column_norms[original];
            if norm > 0.0 { x0[original] / norm } else { 0.0 }
        })
        .collect();
    if qr
        .perm
        .iter()
        .enumerate()
        .any(|(k, &o)| k < rank && qr.column_norms[o] == 0.0)
    {
        return None;
    }
    // Rᵀ·z = v[..rank]
    let mut z = vec![0.0; rank];
    for k in 0..rank {
        let mut s = v[k];
        for (j, zj) in z.iter().enumerate().take(k) {
            s -= qr.r[(j, k)] * zj;
        }
        z[k] = s / qr.r[(k, k)];
    }
    // Estimabilidade: as coordenadas das colunas aliasadas devem ser R₁₂ᵀ·z.
    let scale = 1.0 + v.iter().map(|x| x * x).sum::<f64>().sqrt();
    for (k, vk) in v.iter().enumerate().skip(rank) {
        let expected: f64 = (0..rank).map(|j| qr.r[(j, k)] * z[j]).sum();
        // Colunas de norma nula (todas zero) só são estimáveis com coeficiente nulo.
        if (vk - expected).abs() > ESTIMABLE_TOL * scale {
            return None;
        }
    }
    Some(z.iter().map(|x| x * x).sum())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::numeric::Matrix;
    use crate::numeric::qr::default_rank_tolerance;

    #[test]
    fn an_unobserved_column_cannot_support_a_nonzero_prediction_coordinate() {
        let q = qr_of(&[vec![1.0, 0.0], vec![1.0, 0.0]]);
        assert!(quadratic_form(&q, &[1.0, 0.0]).is_some());
        assert!(quadratic_form(&q, &[1.0, 1.0]).is_none());
        assert!(quadratic_form(&q, &[1.0, f64::NAN]).is_none());
    }

    fn qr_of(rows: &[Vec<f64>]) -> QrDecomposition {
        let a = Matrix::from_rows(rows).unwrap_or_else(|| unreachable!());
        QrDecomposition::new(&a, default_rank_tolerance(a.rows(), a.cols()))
    }

    #[test]
    fn simple_regression_variances_match_closed_form() {
        // x = 1..5: Var(b1)/σ² = 1/Sxx = 0,1; Var(b0)/σ² = 1/n + x̄²/Sxx = 1,1.
        let rows: Vec<Vec<f64>> = (1..=5).map(|x| vec![1.0, f64::from(x)]).collect();
        let qr = qr_of(&rows);
        let v = unscaled_variances(&qr, 2);
        assert!((v[0].unwrap_or(f64::NAN) - 1.1).abs() < 1e-13);
        assert!((v[1].unwrap_or(f64::NAN) - 0.1).abs() < 1e-13);
        // Predição em x = 3: 1/n = 0,2 ; em x = 6: 1/n + 9/10 = 1,1.
        assert!((quadratic_form(&qr, &[1.0, 3.0]).unwrap_or(f64::NAN) - 0.2).abs() < 1e-13);
        assert!((quadratic_form(&qr, &[1.0, 6.0]).unwrap_or(f64::NAN) - 1.1).abs() < 1e-13);
    }

    #[test]
    fn aliased_columns_have_no_variance_and_only_estimable_rows_are_accepted() {
        // Terceira coluna = primeira + segunda.
        let rows: Vec<Vec<f64>> = (1..=6)
            .map(|x| {
                let (a, b) = (1.0, f64::from(x * x % 7));
                vec![a, b, a + b]
            })
            .collect();
        let qr = qr_of(&rows);
        assert_eq!(qr.rank, 2);
        let v = unscaled_variances(&qr, 3);
        assert_eq!(v.iter().filter(|x| x.is_none()).count(), 1);
        // (1, 2, 3) está no espaço-linha; (1, 2, 5) não.
        assert!(quadratic_form(&qr, &[1.0, 2.0, 3.0]).is_some());
        assert!(quadratic_form(&qr, &[1.0, 2.0, 5.0]).is_none());
    }
}
