//! Desejabilidade individual (Derringer e Suich, 1980) e global.
//!
//! Individual, `d ∈ [0, 1]`:
//! - maximizar `(L, T, s)`: `0` se `y ≤ L`; `((y − L)/(T − L))^s` se `L < y < T`; `1` se `y ≥ T`;
//! - minimizar `(T, U, s)`: `1` se `y ≤ T`; `((U − y)/(U − T))^s` se `T < y < U`; `0` se `y ≥ U`;
//! - alvo `(L, T, U, s₁, s₂)`: `((y − L)/(T − L))^s₁` em `[L, T]`; `((U − y)/(U − T))^s₂` em `[T, U]`;
//!   `0` fora de `[L, U]`;
//! - faixa `(L, U)`: `1` dentro, `0` fora.
//!
//! Global: `D = (Π dᵢ^wᵢ)^(1/Σwᵢ)` (média geométrica ponderada); qualquer `dᵢ = 0` dá `D = 0`.

use super::objective::Goal;

/// Desejabilidade individual de um valor previsto `y`.
#[must_use]
pub fn individual(goal: &Goal, y: f64) -> f64 {
    if !y.is_finite() {
        return 0.0;
    }
    match *goal {
        Goal::Maximize { low, target, shape } => {
            if y <= low {
                0.0
            } else if y >= target {
                1.0
            } else {
                ((y - low) / (target - low)).powf(shape)
            }
        }
        Goal::Minimize {
            target,
            high,
            shape,
        } => {
            if y <= target {
                1.0
            } else if y >= high {
                0.0
            } else {
                ((high - y) / (high - target)).powf(shape)
            }
        }
        Goal::Target {
            low,
            target,
            high,
            shape_low,
            shape_high,
        } => {
            if y < low || y > high {
                0.0
            } else if y <= target {
                ((y - low) / (target - low)).powf(shape_low)
            } else {
                ((high - y) / (high - target)).powf(shape_high)
            }
        }
        Goal::Range { low, high } => {
            if y >= low && y <= high {
                1.0
            } else {
                0.0
            }
        }
    }
}

/// Desejabilidade global (média geométrica ponderada por `weights`).
#[must_use]
pub fn global(individual: &[f64], weights: &[f64]) -> f64 {
    let total: f64 = weights.iter().sum();
    if individual.is_empty()
        || individual.len() != weights.len()
        || total.partial_cmp(&0.0) != Some(std::cmp::Ordering::Greater)
    {
        return 0.0;
    }
    if individual.iter().any(|d| *d <= 0.0) {
        return 0.0;
    }
    let log_sum: f64 = individual
        .iter()
        .zip(weights)
        .map(|(d, w)| w * d.ln())
        .sum();
    (log_sum / total).exp().clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAX: Goal = Goal::Maximize {
        low: 0.0,
        target: 10.0,
        shape: 1.0,
    };

    #[test]
    fn maximize_is_zero_below_one_above_and_follows_the_shape_between() {
        assert_eq!(individual(&MAX, -3.0), 0.0);
        assert_eq!(individual(&MAX, 0.0), 0.0);
        assert!((individual(&MAX, 5.0) - 0.5).abs() < 1e-15);
        assert_eq!(individual(&MAX, 10.0), 1.0);
        assert_eq!(individual(&MAX, 99.0), 1.0);
        let squared = Goal::Maximize {
            low: 0.0,
            target: 10.0,
            shape: 2.0,
        };
        assert!((individual(&squared, 5.0) - 0.25).abs() < 1e-15);
        let root = Goal::Maximize {
            low: 0.0,
            target: 10.0,
            shape: 0.5,
        };
        assert!((individual(&root, 4.0) - 0.4_f64.sqrt()).abs() < 1e-15);
    }

    #[test]
    fn minimize_mirrors_maximize() {
        let g = Goal::Minimize {
            target: 2.0,
            high: 6.0,
            shape: 1.0,
        };
        assert_eq!(individual(&g, 1.0), 1.0);
        assert_eq!(individual(&g, 2.0), 1.0);
        assert!((individual(&g, 3.0) - 0.75).abs() < 1e-15);
        assert_eq!(individual(&g, 6.0), 0.0);
        assert_eq!(individual(&g, 7.0), 0.0);
    }

    #[test]
    fn target_is_one_at_the_target_and_zero_outside_the_limits() {
        let g = Goal::Target {
            low: 0.0,
            target: 4.0,
            high: 10.0,
            shape_low: 1.0,
            shape_high: 2.0,
        };
        assert_eq!(individual(&g, -0.1), 0.0);
        assert!((individual(&g, 2.0) - 0.5).abs() < 1e-15);
        assert_eq!(individual(&g, 4.0), 1.0);
        assert!((individual(&g, 7.0) - 0.25).abs() < 1e-15);
        assert_eq!(individual(&g, 10.1), 0.0);
    }

    #[test]
    fn range_is_all_or_nothing_and_non_finite_values_are_undesirable() {
        let g = Goal::Range {
            low: 1.0,
            high: 2.0,
        };
        assert_eq!(individual(&g, 1.0), 1.0);
        assert_eq!(individual(&g, 2.0), 1.0);
        assert_eq!(individual(&g, 2.0001), 0.0);
        assert_eq!(individual(&MAX, f64::NAN), 0.0);
    }

    #[test]
    fn global_is_the_weighted_geometric_mean_and_zero_if_any_is_zero() {
        assert!((global(&[0.25, 1.0], &[1.0, 1.0]) - 0.5).abs() < 1e-15);
        assert!((global(&[0.5, 0.5, 0.5], &[1.0, 2.0, 3.0]) - 0.5).abs() < 1e-15);
        // peso 3 em 0,8 e peso 1 em 0,2: (0,8³ · 0,2)^(1/4)
        let want = (0.8_f64.powi(3) * 0.2).powf(0.25);
        assert!((global(&[0.8, 0.2], &[3.0, 1.0]) - want).abs() < 1e-15);
        assert_eq!(global(&[0.9, 0.0], &[1.0, 1.0]), 0.0);
        assert_eq!(global(&[], &[]), 0.0);
        assert_eq!(global(&[1.0, 1.0], &[1.0, 1.0]), 1.0);
    }

    #[test]
    fn goals_are_validated() {
        assert!(MAX.validate().is_ok());
        assert!(
            Goal::Maximize {
                low: 5.0,
                target: 5.0,
                shape: 1.0
            }
            .validate()
            .is_err()
        );
        assert!(
            Goal::Minimize {
                target: 1.0,
                high: 2.0,
                shape: 0.0
            }
            .validate()
            .is_err()
        );
        assert!(
            Goal::Range {
                low: f64::NAN,
                high: 1.0
            }
            .validate()
            .is_err()
        );
    }
}
