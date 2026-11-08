//! Letras de comparação por inserção e absorção (Piepho, 2004).
//!
//! **Garantia.** Dois grupos compartilham ao menos uma letra **se e somente se** o par **não** foi
//! declarado diferente. Pares sem resultado (`Unknown`) são tratados como diferentes: nunca se
//! afirma igualdade sem teste. Compartilhar letra indica diferença *não detectada*, não
//! equivalência.
//!
//! **Algoritmo.** Cada coluna é um conjunto de grupos. Parte-se de uma coluna com todos. Para cada
//! par diferente `(i, j)`, toda coluna que contém `i` e `j` é substituída por duas cópias, uma sem
//! `i` e outra sem `j` (inserção); em seguida colunas vazias, repetidas ou contidas em outra são
//! removidas (absorção). As colunas são ordenadas pelo primeiro grupo (na ordem de apresentação) e
//! recebem as letras `a, b, …, z, aa, ab, …`.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Relação entre dois grupos.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Relation {
    /// Diferença não detectada.
    NotDifferent,
    /// Diferença detectada.
    Different,
    /// Par não testado ou não estimável.
    Unknown,
}

/// Letras por grupo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Letters {
    /// Letras de cada grupo (na ordem de entrada), por exemplo `"ab"`.
    pub letters: Vec<String>,
    /// Índices (0-based) das letras de cada grupo; evita ambiguidade ao separar nomes como `aa`.
    pub memberships: Vec<Vec<u32>>,
    /// Número de letras distintas usadas.
    pub n_letters: u32,
    /// Havia pares sem resultado, tratados como diferentes.
    pub has_unknown_pairs: bool,
}

/// Nome da `n`-ésima letra (0-based): `a…z`, `aa…az`, `ba…`.
#[must_use]
pub fn letter_name(mut n: usize) -> String {
    let mut out = Vec::new();
    loop {
        out.push(b'a' + u8::try_from(n % 26).unwrap_or(0));
        if n < 26 {
            break;
        }
        n = n / 26 - 1;
    }
    out.reverse();
    String::from_utf8(out).unwrap_or_default()
}

/// Número máximo de colunas intermediárias; acima disso as letras são declaradas indisponíveis
/// (grafos de pares muito irregulares, que não ocorrem com médias ordenadas).
pub const MAX_COLUMNS: usize = 2000;

/// Calcula as letras. `order` é a ordem de apresentação das colunas (por exemplo, médias
/// decrescentes: a primeira letra vai ao grupo de maior média); `relation(i, j)` vale para
/// `i != j`. Devolve `None` se o número de colunas exceder [`MAX_COLUMNS`].
#[must_use]
pub fn compute(
    groups: usize,
    order: &[usize],
    relation: impl Fn(usize, usize) -> Relation,
) -> Option<Letters> {
    let mut has_unknown = false;
    let mut columns: Vec<BTreeSet<usize>> = vec![(0..groups).collect()];
    for (pi, &i) in order.iter().enumerate() {
        for &j in &order[pi + 1..] {
            let rel = relation(i, j);
            if rel == Relation::Unknown {
                has_unknown = true;
            }
            if rel == Relation::NotDifferent {
                continue;
            }
            let mut next = Vec::with_capacity(columns.len() * 2);
            for column in columns {
                if column.contains(&i) && column.contains(&j) {
                    let mut without_i = column.clone();
                    without_i.remove(&i);
                    let mut without_j = column;
                    without_j.remove(&j);
                    next.push(without_i);
                    next.push(without_j);
                } else {
                    next.push(column);
                }
            }
            columns = absorb(next);
            if columns.len() > MAX_COLUMNS {
                return None;
            }
        }
    }
    // Ordem das colunas: pela posição do primeiro grupo (na ordem de apresentação), depois pelo tamanho.
    let position = |g: usize| order.iter().position(|&x| x == g).unwrap_or(usize::MAX);
    columns.sort_by_key(|c| {
        let mut members: Vec<usize> = c.iter().map(|&g| position(g)).collect();
        members.sort_unstable();
        members
    });
    let mut letters = vec![String::new(); groups];
    let mut memberships = vec![Vec::new(); groups];
    for (index, column) in columns.iter().enumerate() {
        let name = letter_name(index);
        for &g in column {
            letters[g].push_str(&name);
            memberships[g].push(u32::try_from(index).unwrap_or(u32::MAX));
        }
    }
    Some(Letters {
        letters,
        memberships,
        n_letters: u32::try_from(columns.len()).unwrap_or(u32::MAX),
        has_unknown_pairs: has_unknown,
    })
}

/// Remove colunas vazias, repetidas e contidas em outra.
fn absorb(columns: Vec<BTreeSet<usize>>) -> Vec<BTreeSet<usize>> {
    let mut keep = vec![true; columns.len()];
    for (a, ca) in columns.iter().enumerate() {
        if ca.is_empty() {
            keep[a] = false;
            continue;
        }
        for (b, cb) in columns.iter().enumerate() {
            if a == b || !keep[b] {
                continue;
            }
            // `ca` é absorvida se for subconjunto de `cb` (iguais: mantém a de menor índice).
            if ca.is_subset(cb) && (ca.len() < cb.len() || b < a) {
                keep[a] = false;
                break;
            }
        }
    }
    columns
        .into_iter()
        .zip(keep)
        .filter_map(|(c, k)| k.then_some(c))
        .collect()
}

#[cfg(test)]
#[allow(clippy::needless_range_loop)]
mod tests {
    use super::*;

    fn run(groups: usize, different: &[(usize, usize)]) -> Letters {
        let order: Vec<usize> = (0..groups).collect();
        compute(groups, &order, |i, j| {
            if different.contains(&(i, j)) || different.contains(&(j, i)) {
                Relation::Different
            } else {
                Relation::NotDifferent
            }
        })
        .unwrap_or_else(|| unreachable!())
    }

    #[test]
    fn letter_names_go_beyond_26() {
        assert_eq!(letter_name(0), "a");
        assert_eq!(letter_name(25), "z");
        assert_eq!(letter_name(26), "aa");
        assert_eq!(letter_name(27), "ab");
        assert_eq!(letter_name(51), "az");
        assert_eq!(letter_name(52), "ba");
    }

    #[test]
    fn no_difference_gives_one_shared_letter() {
        assert_eq!(run(3, &[]).letters, ["a", "a", "a"]);
    }

    #[test]
    fn all_different_gives_distinct_letters() {
        assert_eq!(run(3, &[(0, 1), (0, 2), (1, 2)]).letters, ["a", "b", "c"]);
    }

    #[test]
    fn overlapping_classes_get_shared_letters() {
        // Médias em ordem: A–C diferem; B é indistinguível de ambos ⇒ a, ab, b.
        assert_eq!(run(3, &[(0, 2)]).letters, ["a", "ab", "b"]);
        // Cadeia: 0≠2, 0≠3, 1≠3 ⇒ 0:a, 1:ab, 2:bc, 3:c.
        assert_eq!(
            run(4, &[(0, 2), (0, 3), (1, 3)]).letters,
            ["a", "ab", "bc", "c"]
        );
    }

    #[test]
    fn unknown_pairs_are_treated_as_different_and_flagged() {
        let order = [0, 1, 2];
        let r = compute(3, &order, |i, j| {
            if (i, j) == (0, 1) || (i, j) == (1, 0) {
                Relation::Unknown
            } else {
                Relation::NotDifferent
            }
        })
        .unwrap_or_else(|| unreachable!());
        assert!(r.has_unknown_pairs);
        let share = |a: usize, b: usize| {
            r.memberships[a]
                .iter()
                .any(|c| r.memberships[b].contains(c))
        };
        assert!(!share(0, 1) && share(0, 2) && share(1, 2));
    }

    fn check_invariant(groups: usize, diff: &[Vec<bool>], what: &str) {
        let order: Vec<usize> = (0..groups).collect();
        let r = compute(groups, &order, |i, j| {
            if diff[i][j] {
                Relation::Different
            } else {
                Relation::NotDifferent
            }
        })
        .unwrap_or_else(|| unreachable!("{what}: colunas demais"));
        for i in 0..groups {
            assert!(!r.memberships[i].is_empty(), "{what}: grupo sem letra");
            for j in (i + 1)..groups {
                let share = r.memberships[i]
                    .iter()
                    .any(|c| r.memberships[j].contains(c));
                assert_eq!(share, !diff[i][j], "{what}: par ({i},{j})");
            }
        }
    }

    #[test]
    fn invariant_holds_for_random_graphs() {
        // Gerador xorshift determinístico.
        let mut state = 0x2545_F491_4F6C_DD1D_u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        for groups in [2, 5, 9, 12] {
            for density in [0, 20, 50, 80, 100] {
                let mut diff = vec![vec![false; groups]; groups];
                for i in 0..groups {
                    for j in (i + 1)..groups {
                        let d = next() % 100 < density;
                        diff[i][j] = d;
                        diff[j][i] = d;
                    }
                }
                check_invariant(groups, &diff, &format!("aleatório g={groups} d={density}"));
            }
        }
    }

    #[test]
    fn invariant_holds_with_ordered_means_and_more_than_26_groups() {
        // Médias ordenadas com limiar de diferença: o grafo de pares não significativos é de intervalos.
        for groups in [27_usize, 40, 60] {
            for width in [1_usize, 3, 8] {
                let diff: Vec<Vec<bool>> = (0..groups)
                    .map(|i| (0..groups).map(|j| i.abs_diff(j) > width).collect())
                    .collect();
                check_invariant(groups, &diff, &format!("intervalos g={groups} w={width}"));
            }
        }
        // Todos diferentes com 30 grupos: 30 letras, a última com nome de duas letras.
        let diff: Vec<Vec<bool>> = (0..30).map(|i| (0..30).map(|j| i != j).collect()).collect();
        let order: Vec<usize> = (0..30).collect();
        let r = compute(30, &order, |i, j| {
            if diff[i][j] {
                Relation::Different
            } else {
                Relation::NotDifferent
            }
        })
        .unwrap_or_else(|| unreachable!());
        assert_eq!(r.n_letters, 30);
        assert_eq!(r.letters[0], "a");
        assert_eq!(r.letters[26], "aa");
    }

    #[test]
    fn pathological_graphs_are_declared_unavailable_instead_of_hanging() {
        // Complemento de um emparelhamento perfeito em 24 vértices: 2^12 cliques maximais.
        let groups = 24;
        let order: Vec<usize> = (0..groups).collect();
        let r = compute(groups, &order, |i, j| {
            if i / 2 == j / 2 {
                Relation::NotDifferent
            } else {
                Relation::Different
            }
        });
        // Os pares (2m, 2m+1) são iguais, todos os demais diferentes: 12 colunas, sem explosão.
        assert!(r.is_some());
        let r = compute(groups, &order, |i, j| {
            if i / 2 == j / 2 {
                Relation::Different
            } else {
                Relation::NotDifferent
            }
        });
        assert!(r.is_none(), "esperava recusar 2^12 colunas intermediárias");
    }
}
