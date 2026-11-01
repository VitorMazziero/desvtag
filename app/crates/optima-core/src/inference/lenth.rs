//! Método de Lenth para efeitos de planejamentos saturados ou sem graus de liberdade do erro.
//!
//! Com `m` efeitos ortogonais `cⱼ` (estimados na escala de efeito, isto é, 2 × coeficiente em
//! codificação ±1):
//!
//! `s₀ = 1,5 · mediana |cⱼ|`; `PSE = 1,5 · mediana{ |cⱼ| : |cⱼ| < 2,5 · s₀ }` (erro-padrão
//! pseudo); graus de liberdade `d = m/3`; margem de erro `ME = t₁₋α/₂(d) · PSE` e margem
//! simultânea `SME = t_γ(d) · PSE` com `γ = (1 + (1 − α)^{1/m})/2`. Efeitos com `|c| > ME` são
//! indicados como ativos; com `|c| > SME`, ativos com controle simultâneo. Lenth, R. V. (1989),
//! *Technometrics* 31, 469–473.

use crate::distributions::student_t;

/// Resultado do método de Lenth.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lenth {
    /// Erro-padrão pseudo.
    pub pse: f64,
    /// Graus de liberdade `m/3`.
    pub df: f64,
    /// Margem de erro individual.
    pub margin_of_error: f64,
    /// Margem de erro simultânea.
    pub simultaneous_margin: f64,
}

/// Mediana de valores finitos.
fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let n = sorted.len();
    if n % 2 == 1 {
        sorted[n / 2]
    } else {
        0.5 * (sorted[n / 2 - 1] + sorted[n / 2])
    }
}

/// Método de Lenth para `effects` e nível `alpha`; `None` com menos de 3 efeitos, valores não
/// finitos ou `PSE = 0` (efeitos todos nulos).
#[must_use]
pub fn lenth(effects: &[f64], alpha: f64) -> Option<Lenth> {
    let m = effects.len();
    if m < 3 || !(alpha > 0.0 && alpha < 1.0) || effects.iter().any(|e| !e.is_finite()) {
        return None;
    }
    let abs: Vec<f64> = effects.iter().map(|e| e.abs()).collect();
    let s0 = 1.5 * median(&abs);
    let trimmed: Vec<f64> = abs.iter().copied().filter(|v| *v < 2.5 * s0).collect();
    let pse = if trimmed.is_empty() {
        s0
    } else {
        1.5 * median(&trimmed)
    };
    if pse <= 0.0 {
        return None;
    }
    let df = m as f64 / 3.0;
    let me = student_t::quantile_upper(alpha / 2.0, df).ok()?;
    let gamma = 0.5 * (1.0 + (1.0 - alpha).powf(1.0 / m as f64));
    let sme = student_t::quantile_upper(1.0 - gamma, df).ok()?;
    Some(Lenth {
        pse,
        df,
        margin_of_error: me * pse,
        simultaneous_margin: sme * pse,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_a_hand_calculation() {
        // Efeitos: 0,1 0,2 −0,15 0,05 −0,1 0,12 3,0 (m = 7). |c| ordenado: 0,05 0,1 0,1 0,12 0,15 0,2 3,0
        // mediana = 0,12; s0 = 0,18; corte 2,5·s0 = 0,45 ⇒ ficam os seis menores;
        // mediana de (0,05 0,1 0,1 0,12 0,15 0,2) = 0,11 ⇒ PSE = 0,165.
        let l = lenth(&[0.1, 0.2, -0.15, 0.05, -0.1, 0.12, 3.0], 0.05)
            .unwrap_or_else(|| unreachable!());
        assert!((l.pse - 0.165).abs() < 1e-14, "{}", l.pse);
        assert!((l.df - 7.0 / 3.0).abs() < 1e-14);
        assert!(l.simultaneous_margin > l.margin_of_error);
        // ME = t(0,975; 7/3) · PSE com a cauda superior α/2.
        let t = student_t::quantile_upper(0.025, 7.0 / 3.0).unwrap_or(f64::NAN);
        assert!((l.margin_of_error - t * 0.165).abs() < 1e-12);
    }

    #[test]
    fn refuses_degenerate_inputs() {
        assert!(lenth(&[1.0, 2.0], 0.05).is_none());
        assert!(lenth(&[0.0, 0.0, 0.0, 0.0], 0.05).is_none());
        assert!(lenth(&[1.0, f64::NAN, 2.0], 0.05).is_none());
        assert!(lenth(&[1.0, 2.0, 3.0], 1.5).is_none());
    }
}
