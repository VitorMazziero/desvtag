//! Recomendação curta de planejamento por número de fatores e orçamento de ensaios.
//!
//! Regra (documentada em `docs/metodos/fatorial-dois-niveis.md`): entre as opções que cabem no
//! orçamento (ensaios básicos, sem réplicas nem pontos centrais), recomenda-se a **de maior
//! resolução**; em empate, a de **mais ensaios** (mais informação). Se nenhuma cabe, devolve-se a
//! menor opção, sinalizando que excede o orçamento. Opções:
//! fatorial completo (`2ᵏ`), fracionários do catálogo (aberração mínima) e Plackett–Burman
//! (resolução III, a partir de 8 ensaios).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::fractional::CATALOG;
use super::plackett_burman::SUPPORTED_RUNS;
use super::spec::{DesignKind, MAX_FULL_FACTORS};

/// Uma opção de planejamento.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Candidate {
    /// Tipo, pronto para compor a especificação.
    pub kind: DesignKind,
    /// Ensaios do planejamento básico.
    pub base_runs: u32,
    /// Resolução (`None` no fatorial completo, que não confunde efeitos).
    pub resolution: Option<u32>,
    /// Cabe no orçamento informado.
    pub within_budget: bool,
    /// É a opção recomendada.
    pub recommended: bool,
}

/// Lista de opções (envelope serializável do resultado).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DesignOptions {
    /// Opções em ordem crescente de ensaios.
    pub candidates: Vec<Candidate>,
}

/// Opções para `k` fatores, em ordem crescente de ensaios; `max_runs` é o orçamento (ensaios
/// básicos).
#[must_use]
pub fn candidates(k: usize, max_runs: Option<u32>) -> Vec<Candidate> {
    let mut out: Vec<Candidate> = Vec::new();
    let mut push = |kind: DesignKind, runs: usize, resolution: Option<u32>| {
        let base_runs = u32::try_from(runs).unwrap_or(u32::MAX);
        out.push(Candidate {
            kind,
            base_runs,
            resolution,
            within_budget: max_runs.is_none_or(|m| base_runs <= m),
            recommended: false,
        });
    };
    if (2..=MAX_FULL_FACTORS).contains(&k) {
        push(DesignKind::FullFactorial, 1 << k, None);
    }
    for e in CATALOG.iter().filter(|e| e.k == k) {
        push(
            DesignKind::Fractional {
                generators: e.generators.iter().map(|g| (*g).to_string()).collect(),
            },
            1 << (k - e.p),
            Some(e.resolution),
        );
    }
    if let Some(&n) = SUPPORTED_RUNS.iter().find(|&&n| n > k) {
        push(
            DesignKind::PlackettBurman {
                runs: u32::try_from(n).unwrap_or(0),
            },
            n,
            Some(3),
        );
    }
    out.sort_by_key(|c| c.base_runs);
    // Resolução efetiva: fatorial completo = infinita.
    let rank = |c: &Candidate| (c.resolution.unwrap_or(u32::MAX), c.base_runs);
    let best = out
        .iter()
        .enumerate()
        .filter(|(_, c)| c.within_budget)
        .max_by_key(|(_, c)| rank(c))
        .map(|(i, _)| i);
    let fallback = if best.is_none() {
        (!out.is_empty()).then_some(0)
    } else {
        None
    };
    if let Some(i) = best.or(fallback) {
        out[i].recommended = true;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn recommended(k: usize, budget: Option<u32>) -> Option<Candidate> {
        candidates(k, budget).into_iter().find(|c| c.recommended)
    }

    #[test]
    fn few_factors_recommend_the_full_factorial() {
        let c = recommended(3, None).unwrap_or_else(|| unreachable!());
        assert_eq!((c.kind, c.base_runs), (DesignKind::FullFactorial, 8));
    }

    #[test]
    fn a_budget_pushes_towards_fractions_with_the_highest_resolution_that_fits() {
        // 5 fatores, orçamento 16: 2^(5−1) V (16 ensaios) é a melhor que cabe.
        let c = recommended(5, Some(16)).unwrap_or_else(|| unreachable!());
        assert_eq!(c.resolution, Some(5));
        assert_eq!(c.base_runs, 16);
        // Orçamento 8: 2^(5−2) III.
        let c = recommended(5, Some(8)).unwrap_or_else(|| unreachable!());
        assert_eq!((c.resolution, c.base_runs), (Some(3), 8));
    }

    #[test]
    fn screening_many_factors_falls_back_to_plackett_burman() {
        let c = recommended(11, Some(12)).unwrap_or_else(|| unreachable!());
        assert_eq!(c.kind, DesignKind::PlackettBurman { runs: 12 });
        assert!(
            candidates(11, None)
                .iter()
                .any(|c| c.kind == DesignKind::PlackettBurman { runs: 12 })
        );
    }

    #[test]
    fn when_nothing_fits_the_smallest_is_recommended_but_not_within_budget() {
        let all = candidates(6, Some(4));
        assert!(all.iter().all(|c| !c.within_budget));
        let c = recommended(6, Some(4)).unwrap_or_else(|| unreachable!());
        assert!(!c.within_budget);
        assert_eq!(c.base_runs, all[0].base_runs);
    }
}
