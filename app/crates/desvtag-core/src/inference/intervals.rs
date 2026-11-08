//! Intervalos baseados na distribuição t.

use crate::distributions::student_t;

/// Valor crítico bilateral `t₁₋α/₂` para o nível de confiança e os graus de liberdade dados.
#[must_use]
pub fn t_critical(confidence_level: f64, df: f64) -> Option<f64> {
    if !(confidence_level > 0.0 && confidence_level < 1.0) || df <= 0.0 {
        return None;
    }
    student_t::quantile_upper((1.0 - confidence_level) / 2.0, df).ok()
}

/// Valor-p bilateral de uma estatística t.
#[must_use]
pub fn two_sided_p(t: f64, df: f64) -> f64 {
    (2.0 * student_t::sf(t.abs(), df)).min(1.0)
}

/// Extremos `centro ± t·erro`.
#[must_use]
pub fn symmetric_interval(center: f64, critical: f64, scale: f64) -> (f64, f64) {
    let half = critical * scale;
    (center - half, center + half)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn critical_values_match_tables() {
        // Tabela t: 0,975 com 10 g.l. = 2,228138851986274
        let t = t_critical(0.95, 10.0).unwrap_or(f64::NAN);
        assert!((t - 2.228_138_851_986_274).abs() < 1e-10, "{t}");
        assert!(t_critical(1.0, 10.0).is_none());
        assert!(t_critical(0.95, 0.0).is_none());
    }

    #[test]
    fn two_sided_p_is_symmetric() {
        let p = two_sided_p(2.228_138_851_986_274, 10.0);
        assert!((p - 0.05).abs() < 1e-10);
        assert!((two_sided_p(-2.228_138_851_986_274, 10.0) - p).abs() < 1e-18);
    }
}
