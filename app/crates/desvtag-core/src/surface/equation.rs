//! Equação do modelo em unidades codificadas e em unidades reais.
//!
//! Com `xᵢ = (zᵢ − cᵢ)/hᵢ` (centro `cᵢ` e meia-amplitude `hᵢ` do fator `i`), o polinômio
//! `b₀ + Σ bᵢxᵢ + Σ bᵢᵢxᵢ² + Σ bᵢⱼxᵢxⱼ` vira, em `z`:
//!
//! - `a₀ = b₀ − Σ bᵢcᵢ/hᵢ + Σ bᵢᵢcᵢ²/hᵢ² + Σ bᵢⱼcᵢcⱼ/(hᵢhⱼ)`
//! - `aᵢ = bᵢ/hᵢ − 2bᵢᵢcᵢ/hᵢ² − Σⱼ bᵢⱼcⱼ/(hᵢhⱼ)`
//! - `aᵢᵢ = bᵢᵢ/hᵢ²`  e  `aᵢⱼ = bᵢⱼ/(hᵢhⱼ)`.
//!
//! A substituição é exata (não é um reajuste): o preditor em unidades reais coincide com o
//! codificado a menos de arredondamento.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::terms::Monomial;
use crate::descriptive::{Stat, UndefinedReason};

/// Tipo do termo da equação.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum EquationTermKind {
    /// Constante.
    Intercept,
    /// Linear em um fator.
    Linear,
    /// Quadrático em um fator.
    Square,
    /// Produto de dois fatores.
    Interaction,
}

/// Termo da equação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EquationTerm {
    /// Tipo.
    pub kind: EquationTermKind,
    /// Índices dos fatores (0, 1 ou 2 elementos conforme o tipo).
    #[ts(type = "Array<number>")]
    pub factors: Vec<usize>,
    /// Coeficiente.
    pub coefficient: Stat,
}

/// Equação nas duas escalas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Equation {
    /// Termos na escala codificada, na ordem do modelo (intercepto primeiro).
    pub coded: Vec<EquationTerm>,
    /// Termos em unidades reais: intercepto, lineares de todos os fatores, quadráticos e
    /// interações presentes no modelo. `None` quando algum coeficiente não é estimável.
    pub real: Option<Vec<EquationTerm>>,
}

/// Monta a equação a partir das estimativas (intercepto e depois uma por termo).
///
/// `centers` e `half_ranges` por fator; `estimates[0]` é o intercepto.
#[must_use]
pub fn build(
    monomials: &[Monomial],
    estimates: &[Option<f64>],
    centers: &[f64],
    half_ranges: &[f64],
) -> Equation {
    let k = centers.len();
    let stat =
        |v: Option<f64>| v.map_or(Stat::undefined(UndefinedReason::NotEstimable), Stat::finite);
    let mut coded = vec![EquationTerm {
        kind: EquationTermKind::Intercept,
        factors: Vec::new(),
        coefficient: stat(estimates[0]),
    }];
    for (m, e) in monomials.iter().zip(&estimates[1..]) {
        let (kind, factors) = match *m {
            Monomial::Main(i) => (EquationTermKind::Linear, vec![i]),
            Monomial::Square(i) => (EquationTermKind::Square, vec![i]),
            Monomial::Cross(i, j) => (EquationTermKind::Interaction, vec![i, j]),
        };
        coded.push(EquationTerm {
            kind,
            factors,
            coefficient: stat(*e),
        });
    }
    let real = if estimates.iter().all(Option::is_some) {
        Some(real_terms(monomials, estimates, centers, half_ranges, k))
    } else {
        None
    };
    Equation { coded, real }
}

fn real_terms(
    monomials: &[Monomial],
    estimates: &[Option<f64>],
    c: &[f64],
    h: &[f64],
    k: usize,
) -> Vec<EquationTerm> {
    let value = |m: Monomial| {
        monomials
            .iter()
            .position(|x| *x == m)
            .and_then(|p| estimates[p + 1])
            .unwrap_or(0.0)
    };
    let b0 = estimates[0].unwrap_or(0.0);
    let mut a0 = b0;
    for i in 0..k {
        a0 += -value(Monomial::Main(i)) * c[i] / h[i]
            + value(Monomial::Square(i)) * c[i] * c[i] / (h[i] * h[i]);
        for j in (i + 1)..k {
            a0 += value(Monomial::Cross(i, j)) * c[i] * c[j] / (h[i] * h[j]);
        }
    }
    let mut terms = vec![EquationTerm {
        kind: EquationTermKind::Intercept,
        factors: Vec::new(),
        coefficient: Stat::finite(a0),
    }];
    for i in 0..k {
        let mut a = value(Monomial::Main(i)) / h[i]
            - 2.0 * value(Monomial::Square(i)) * c[i] / (h[i] * h[i]);
        for j in 0..k {
            if j != i {
                a -= value(Monomial::Cross(i.min(j), i.max(j))) * c[j] / (h[i] * h[j]);
            }
        }
        terms.push(EquationTerm {
            kind: EquationTermKind::Linear,
            factors: vec![i],
            coefficient: Stat::finite(a),
        });
    }
    for m in monomials {
        match *m {
            Monomial::Square(i) => terms.push(EquationTerm {
                kind: EquationTermKind::Square,
                factors: vec![i],
                coefficient: Stat::finite(value(*m) / (h[i] * h[i])),
            }),
            Monomial::Cross(i, j) => terms.push(EquationTerm {
                kind: EquationTermKind::Interaction,
                factors: vec![i, j],
                coefficient: Stat::finite(value(*m) / (h[i] * h[j])),
            }),
            Monomial::Main(_) => {}
        }
    }
    terms
}

/// Avalia a equação (soma dos termos) num ponto, na escala em que ela foi escrita.
///
/// `None` se algum coeficiente é indefinido.
#[must_use]
pub fn evaluate(terms: &[EquationTerm], point: &[f64]) -> Option<f64> {
    let mut total = 0.0;
    for t in terms {
        let c = t.coefficient.value()?;
        total += c * match t.kind {
            EquationTermKind::Intercept => 1.0,
            EquationTermKind::Linear => point[t.factors[0]],
            EquationTermKind::Square => point[t.factors[0]] * point[t.factors[0]],
            EquationTermKind::Interaction => point[t.factors[0]] * point[t.factors[1]],
        };
    }
    Some(total)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real_equation_equals_the_coded_one_at_arbitrary_points() {
        let monomials = [
            Monomial::Main(0),
            Monomial::Main(1),
            Monomial::Square(0),
            Monomial::Square(1),
            Monomial::Cross(0, 1),
        ];
        let est = [
            Some(10.0),
            Some(1.5),
            Some(-2.0),
            Some(-0.7),
            Some(0.4),
            Some(0.9),
        ];
        let (c, h) = ([35.0, 6.5], [5.0, 1.5]);
        let eq = build(&monomials, &est, &c, &h);
        let real = eq.real.as_ref().unwrap_or_else(|| unreachable!());
        for z in [[35.0, 6.5], [30.0, 5.0], [42.5, 8.0], [28.0, 9.3]] {
            let x = [(z[0] - c[0]) / h[0], (z[1] - c[1]) / h[1]];
            let coded = evaluate(&eq.coded, &x).unwrap_or(f64::NAN);
            let in_real = evaluate(real, &z).unwrap_or(f64::NAN);
            assert!(
                (coded - in_real).abs() < 1e-10 * coded.abs().max(1.0),
                "{z:?}"
            );
        }
    }

    #[test]
    fn a_missing_main_effect_still_yields_a_linear_real_term() {
        // Sem o termo principal: a substituição de x² cria um termo linear em z.
        let monomials = [Monomial::Square(0), Monomial::Main(1)];
        let est = [Some(1.0), Some(2.0), Some(3.0)];
        let eq = build(&monomials, &est, &[10.0, 0.0], &[2.0, 1.0]);
        let real = eq.real.as_ref().unwrap_or_else(|| unreachable!());
        assert!(
            real.iter()
                .any(|t| t.kind == EquationTermKind::Linear && t.factors == [0])
        );
        let z = [13.0, 0.4];
        let x = [1.5, 0.4];
        let diff =
            evaluate(&eq.coded, &x).unwrap_or(f64::NAN) - evaluate(real, &z).unwrap_or(f64::NAN);
        assert!(diff.abs() < 1e-12);
    }

    #[test]
    fn non_estimable_coefficients_leave_the_real_equation_undefined() {
        let monomials = [Monomial::Main(0)];
        let eq = build(&monomials, &[Some(1.0), None], &[0.0], &[1.0]);
        assert!(eq.real.is_none());
        assert!(eq.coded[1].coefficient.value().is_none());
        assert_eq!(evaluate(&eq.coded, &[1.0]), None);
    }
}
