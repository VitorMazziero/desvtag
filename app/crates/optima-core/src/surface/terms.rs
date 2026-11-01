//! Termos de segunda ordem: principais, interações de dois fatores e quadráticos.

use crate::domain::StableId;
use crate::models::TermSpec;
use crate::validation::{Issue, Severity};

/// Termo interpretado (índices dos fatores na ordem do planejamento).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Monomial {
    /// `xᵢ`.
    Main(usize),
    /// `xᵢ²`.
    Square(usize),
    /// `xᵢ·xⱼ`, com `i < j`.
    Cross(usize, usize),
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Modelo completo de segunda ordem: principais, quadráticos e interações de dois fatores.
#[must_use]
pub fn full_quadratic(factor_ids: &[StableId]) -> Vec<TermSpec> {
    let k = factor_ids.len();
    let mut terms: Vec<TermSpec> = factor_ids
        .iter()
        .map(|id| TermSpec::Main {
            factor_id: id.clone(),
        })
        .collect();
    for id in factor_ids {
        terms.push(TermSpec::Power {
            factor_id: id.clone(),
            degree: 2,
        });
    }
    for i in 0..k {
        for j in (i + 1)..k {
            terms.push(TermSpec::Interaction {
                factor_ids: vec![factor_ids[i].clone(), factor_ids[j].clone()],
            });
        }
    }
    terms
}

/// Interpreta os termos.
///
/// # Errors
/// `surface.unsupported_term` (grau ≠ 2, interação de ≠ 2 fatores), `surface.term_not_in_design`,
/// `surface.duplicate_term`, `surface.no_terms`.
pub fn parse(terms: &[TermSpec], factor_ids: &[StableId]) -> Result<Vec<Monomial>, Vec<Issue>> {
    let position = |id: &StableId| factor_ids.iter().position(|f| f == id);
    let mut issues = Vec::new();
    let mut out: Vec<Monomial> = Vec::with_capacity(terms.len());
    for (n, term) in terms.iter().enumerate() {
        let parsed = match term {
            TermSpec::Main { factor_id } => position(factor_id).map(Monomial::Main),
            TermSpec::Power { factor_id, degree } if *degree == 2 => {
                position(factor_id).map(Monomial::Square)
            }
            TermSpec::Interaction { factor_ids: ids } if ids.len() == 2 && ids[0] != ids[1] => {
                match (position(&ids[0]), position(&ids[1])) {
                    (Some(a), Some(b)) => Some(Monomial::Cross(a.min(b), a.max(b))),
                    _ => None,
                }
            }
            _ => {
                issues.push(error("surface.unsupported_term").with_param("term", &(n + 1)));
                continue;
            }
        };
        match parsed {
            Some(m) if out.contains(&m) => {
                issues.push(error("surface.duplicate_term").with_param("term", &(n + 1)));
            }
            Some(m) => out.push(m),
            None => issues.push(error("surface.term_not_in_design").with_param("term", &(n + 1))),
        }
    }
    if terms.is_empty() {
        issues.push(error("surface.no_terms"));
    }
    if issues.is_empty() {
        Ok(out)
    } else {
        Err(issues)
    }
}

/// Valor de cada termo para um ponto codificado.
#[must_use]
pub fn model_row(monomials: &[Monomial], coded: &[f64]) -> Vec<f64> {
    let mut row = Vec::with_capacity(monomials.len() + 1);
    row.push(1.0);
    for m in monomials {
        row.push(match *m {
            Monomial::Main(i) => coded[i],
            Monomial::Square(i) => coded[i] * coded[i],
            Monomial::Cross(i, j) => coded[i] * coded[j],
        });
    }
    row
}

/// Termos cuja hierarquia está incompleta: quadrático ou interação sem os efeitos principais dos
/// fatores envolvidos. Devolve rótulos do tipo `A²` e `A:B`.
#[must_use]
pub fn hierarchy_gaps(monomials: &[Monomial], names: &[String]) -> Vec<String> {
    let has_main = |i: usize| monomials.contains(&Monomial::Main(i));
    monomials
        .iter()
        .filter_map(|m| match *m {
            Monomial::Square(i) if !has_main(i) => Some(format!("{}²", names[i])),
            Monomial::Cross(i, j) if !has_main(i) || !has_main(j) => {
                Some(format!("{}:{}", names[i], names[j]))
            }
            _ => None,
        })
        .collect()
}

/// Rótulo do termo.
#[must_use]
pub fn label(m: Monomial, names: &[String]) -> String {
    match m {
        Monomial::Main(i) => names[i].clone(),
        Monomial::Square(i) => format!("{}²", names[i]),
        Monomial::Cross(i, j) => format!("{}:{}", names[i], names[j]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(n: usize) -> Vec<StableId> {
        (0..n)
            .map(|i| StableId::new(format!("f{}", i + 1)).unwrap_or_else(|_| unreachable!()))
            .collect()
    }

    #[test]
    fn full_quadratic_has_k_plus_k_plus_pairs_terms() {
        for k in 2..=5 {
            let terms = full_quadratic(&ids(k));
            assert_eq!(terms.len(), 2 * k + k * (k - 1) / 2);
            assert!(parse(&terms, &ids(k)).is_ok());
        }
    }

    #[test]
    fn rejects_cubes_triple_interactions_unknown_and_duplicates() {
        let f = ids(3);
        let cube = TermSpec::Power {
            factor_id: f[0].clone(),
            degree: 3,
        };
        assert!(parse(&[cube], &f).is_err());
        let triple = TermSpec::Interaction {
            factor_ids: f.clone(),
        };
        assert!(parse(&[triple], &f).is_err());
        let unknown = TermSpec::Main {
            factor_id: StableId::new("zz").unwrap_or_else(|_| unreachable!()),
        };
        assert!(parse(&[unknown], &f).is_err());
        let main = TermSpec::Main {
            factor_id: f[0].clone(),
        };
        assert!(parse(&[main.clone(), main], &f).is_err());
        assert!(parse(&[], &f).is_err());
    }

    #[test]
    fn interaction_order_does_not_matter_and_rows_follow_the_terms() {
        let f = ids(2);
        let ab = TermSpec::Interaction {
            factor_ids: vec![f[1].clone(), f[0].clone()],
        };
        let m = parse(&[ab], &f).unwrap_or_else(|_| unreachable!());
        assert_eq!(m, [Monomial::Cross(0, 1)]);
        assert_eq!(model_row(&m, &[2.0, -3.0]), [1.0, -6.0]);
        let q = [Monomial::Square(1)];
        assert_eq!(model_row(&q, &[2.0, -3.0]), [1.0, 9.0]);
    }

    #[test]
    fn hierarchy_gaps_name_squares_and_interactions_without_their_main_effects() {
        let names = vec!["A".to_string(), "B".to_string()];
        let monomials = [
            Monomial::Main(0),
            Monomial::Square(1),
            Monomial::Cross(0, 1),
        ];
        assert_eq!(hierarchy_gaps(&monomials, &names), ["B²", "A:B"]);
    }
}
