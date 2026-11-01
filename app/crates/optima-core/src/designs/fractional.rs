//! Fatoriais fracionários regulares `2^(k−p)`: geradores, matriz e catálogo de referência.
//!
//! Os `k − p` primeiros fatores (letras `A`, `B`, …) formam um fatorial completo; cada gerador
//! define o próximo fator como produto de fatores anteriores, por exemplo `D=ABC` ou `D=-ABC`.

use super::alias::{Word, defining_relation, letter, resolution};
use super::factorial::full_factorial;
use crate::validation::{Issue, Severity};

/// Gerador interpretado.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Generator {
    /// Índice do fator gerado.
    pub target: usize,
    /// Máscara dos fatores do lado direito.
    pub rhs: u32,
    /// Sinal.
    pub sign: i8,
}

impl Generator {
    /// Palavra da relação definidora: `I = sinal · (fator gerado × lado direito)`.
    #[must_use]
    pub fn word(&self) -> Word {
        Word {
            mask: self.rhs | (1 << self.target),
            sign: self.sign,
        }
    }
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

/// Interpreta os geradores de um fracionário com `k` fatores.
///
/// # Errors
/// Diagnósticos `design.generator_*` quando a sintaxe, as letras ou a quantidade não conferem.
pub fn parse_generators(k: usize, generators: &[String]) -> Result<Vec<Generator>, Vec<Issue>> {
    let p = generators.len();
    if p == 0 || p >= k || k - p < 2 || k > 26 {
        return Err(vec![
            error("design.generator_count")
                .with_param("k", &k)
                .with_param("p", &p),
        ]);
    }
    let base = k - p;
    let mut out = Vec::with_capacity(p);
    for (i, text) in generators.iter().enumerate() {
        let cleaned: String = text
            .chars()
            .filter(|c| !c.is_whitespace())
            .map(|c| if c == '−' { '-' } else { c })
            .collect::<String>()
            .to_ascii_uppercase();
        let target = base + i;
        let (left, right) = cleaned
            .split_once('=')
            .ok_or_else(|| vec![error("design.generator_syntax").with_param("generator", text)])?;
        if left.chars().count() != 1 || !left.starts_with(letter(target)) {
            return Err(vec![
                error("design.generator_target")
                    .with_param("generator", text)
                    .with_param("expected", &letter(target)),
            ]);
        }
        let (sign, word) = match right.strip_prefix('-') {
            Some(rest) => (-1_i8, rest),
            None => (1_i8, right.strip_prefix('+').unwrap_or(right)),
        };
        let mut mask = 0_u32;
        for c in word.chars() {
            let index = (c as usize).wrapping_sub('A' as usize);
            if !c.is_ascii_uppercase() || index >= target || (mask >> index) & 1 == 1 {
                return Err(vec![
                    error("design.generator_letters").with_param("generator", text),
                ]);
            }
            mask |= 1 << index;
        }
        if mask.count_ones() < 2 {
            return Err(vec![
                error("design.generator_letters").with_param("generator", text),
            ]);
        }
        out.push(Generator {
            target,
            rhs: mask,
            sign,
        });
    }
    Ok(out)
}

/// Matriz codificada (±1) em ordem padrão: `2^(k−p)` linhas e `k` colunas.
#[must_use]
pub fn fractional_matrix(k: usize, generators: &[Generator]) -> Vec<Vec<f64>> {
    let base = k - generators.len();
    let mut rows = full_factorial(base);
    for row in &mut rows {
        row.resize(k, 0.0);
        for g in generators {
            let product: f64 = (0..g.target)
                .filter(|j| (g.rhs >> j) & 1 == 1)
                .map(|j| row[j])
                .product();
            row[g.target] = f64::from(g.sign) * product;
        }
    }
    rows
}

/// Palavras da relação definidora e resolução de um conjunto de geradores.
#[must_use]
pub fn relation_and_resolution(generators: &[Generator]) -> (Vec<Word>, Option<u32>) {
    let words = defining_relation(&generators.iter().map(Generator::word).collect::<Vec<_>>());
    let r = resolution(&words);
    (words, r)
}

/// Entrada do catálogo de fracionários de referência (aberração mínima, Box, Hunter e Hunter;
/// Montgomery, *Design and Analysis of Experiments*, tabela de fracionários).
#[derive(Debug, Clone, Copy)]
pub struct CatalogEntry {
    /// Número de fatores.
    pub k: usize,
    /// Número de geradores.
    pub p: usize,
    /// Resolução esperada.
    pub resolution: u32,
    /// Geradores.
    pub generators: &'static [&'static str],
}

/// Fracionários recomendados de 8 a 256 ensaios (3 a 8 fatores).
pub const CATALOG: &[CatalogEntry] = &[
    CatalogEntry {
        k: 3,
        p: 1,
        resolution: 3,
        generators: &["C=AB"],
    },
    CatalogEntry {
        k: 4,
        p: 1,
        resolution: 4,
        generators: &["D=ABC"],
    },
    CatalogEntry {
        k: 5,
        p: 1,
        resolution: 5,
        generators: &["E=ABCD"],
    },
    CatalogEntry {
        k: 5,
        p: 2,
        resolution: 3,
        generators: &["D=AB", "E=AC"],
    },
    CatalogEntry {
        k: 6,
        p: 1,
        resolution: 6,
        generators: &["F=ABCDE"],
    },
    CatalogEntry {
        k: 6,
        p: 2,
        resolution: 4,
        generators: &["E=ABC", "F=BCD"],
    },
    CatalogEntry {
        k: 6,
        p: 3,
        resolution: 3,
        generators: &["D=AB", "E=AC", "F=BC"],
    },
    CatalogEntry {
        k: 7,
        p: 1,
        resolution: 7,
        generators: &["G=ABCDEF"],
    },
    CatalogEntry {
        k: 7,
        p: 2,
        resolution: 4,
        generators: &["F=ABCD", "G=ABDE"],
    },
    CatalogEntry {
        k: 7,
        p: 3,
        resolution: 4,
        generators: &["E=ABC", "F=BCD", "G=ACD"],
    },
    CatalogEntry {
        k: 7,
        p: 4,
        resolution: 3,
        generators: &["D=AB", "E=AC", "F=BC", "G=ABC"],
    },
    CatalogEntry {
        k: 8,
        p: 2,
        resolution: 5,
        generators: &["G=ABCD", "H=ABEF"],
    },
    CatalogEntry {
        k: 8,
        p: 3,
        resolution: 4,
        generators: &["F=ABC", "G=ABD", "H=BCDE"],
    },
    CatalogEntry {
        k: 8,
        p: 4,
        resolution: 4,
        generators: &["E=BCD", "F=ACD", "G=ABC", "H=ABD"],
    },
];

/// Entrada do catálogo para `k` fatores e `p` geradores.
#[must_use]
pub fn catalog_entry(k: usize, p: usize) -> Option<&'static CatalogEntry> {
    CATALOG.iter().find(|e| e.k == k && e.p == p)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn strings(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn catalog_entries_have_the_declared_resolution_and_are_orthogonal() {
        for e in CATALOG {
            let gens = parse_generators(e.k, &strings(e.generators))
                .unwrap_or_else(|_| unreachable!("{e:?}"));
            let (_, resolution) = relation_and_resolution(&gens);
            assert_eq!(resolution, Some(e.resolution), "k={} p={}", e.k, e.p);
            let m = fractional_matrix(e.k, &gens);
            assert_eq!(m.len(), 1 << (e.k - e.p));
            for a in 0..e.k {
                assert_eq!(m.iter().map(|r| r[a]).sum::<f64>(), 0.0, "balanço");
                for b in (a + 1)..e.k {
                    assert_eq!(
                        m.iter().map(|r| r[a] * r[b]).sum::<f64>(),
                        0.0,
                        "ortogonalidade {a}{b}"
                    );
                }
            }
        }
    }

    #[test]
    fn generated_column_is_the_signed_product() {
        let gens = parse_generators(4, &strings(&["D=-ABC"])).unwrap_or_else(|_| unreachable!());
        let m = fractional_matrix(4, &gens);
        for r in &m {
            assert_eq!(r[3], -r[0] * r[1] * r[2]);
        }
        assert_eq!(gens[0].word().sign, -1);
    }

    #[test]
    fn syntax_and_letter_errors_are_coded() {
        let code = |k: usize, g: &[&str]| {
            parse_generators(k, &strings(g))
                .err()
                .map(|i| i[0].code.clone())
                .unwrap_or_default()
        };
        assert_eq!(code(4, &["D ABC"]), "design.generator_syntax");
        assert_eq!(code(4, &["E=ABC"]), "design.generator_target");
        assert_eq!(code(4, &["D=AB D"]), "design.generator_letters");
        assert_eq!(code(4, &["D=A"]), "design.generator_letters");
        assert_eq!(code(4, &["D=AAB"]), "design.generator_letters");
        assert_eq!(code(4, &[]), "design.generator_count");
        assert_eq!(code(3, &["C=AB", "D=AB"]), "design.generator_count");
        // minúsculas, espaços e o sinal de menos tipográfico são aceitos.
        assert!(parse_generators(4, &strings(&["d = −abc"])).is_ok());
    }
}
