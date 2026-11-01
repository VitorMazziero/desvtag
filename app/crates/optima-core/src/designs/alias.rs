//! Estrutura de confundimento de fracionários regulares, em álgebra sobre GF(2).
//!
//! Uma palavra é um conjunto de fatores representado por uma máscara de bits (fator `i` = bit `i`);
//! o produto de duas palavras é o XOR das máscaras. A relação definidora `I = w₁ = w₂ = …` reúne
//! as palavras dos geradores e todos os seus produtos; o **sinal** de cada palavra vem do sinal
//! dos geradores (`D = −ABC` ⇒ `I = −ABCD`).

/// Palavra com sinal: `sign = +1` ou `−1`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Word {
    /// Máscara dos fatores.
    pub mask: u32,
    /// Sinal (+1 ou −1).
    pub sign: i8,
}

/// Número de fatores de uma palavra (comprimento).
#[must_use]
pub const fn length(mask: u32) -> u32 {
    mask.count_ones()
}

/// Todas as palavras da relação definidora: produtos de todo subconjunto não vazio dos geradores.
#[must_use]
pub fn defining_relation(generators: &[Word]) -> Vec<Word> {
    let p = generators.len();
    let mut words: Vec<Word> = (1_u32..(1 << p))
        .map(|subset| {
            let (mut mask, mut sign) = (0_u32, 1_i8);
            for (i, g) in generators.iter().enumerate() {
                if (subset >> i) & 1 == 1 {
                    mask ^= g.mask;
                    sign *= g.sign;
                }
            }
            Word { mask, sign }
        })
        .collect();
    words.sort_by_key(|w| (length(w.mask), w.mask));
    words
}

/// Resolução: comprimento da menor palavra (`None` se não há palavras, isto é, fatorial completo).
#[must_use]
pub fn resolution(words: &[Word]) -> Option<u32> {
    words.iter().map(|w| length(w.mask)).min()
}

/// Efeito (máscara) e os efeitos confundidos com ele, com o sinal do confundimento.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AliasSet {
    /// Efeito de referência.
    pub effect: u32,
    /// Efeitos confundidos `(máscara, sinal)`, ordenados por ordem e máscara.
    pub aliases: Vec<(u32, i8)>,
}

/// Confundimento de cada efeito de ordem 1 ou 2 entre os `k` fatores.
#[must_use]
pub fn alias_sets(k: usize, words: &[Word]) -> Vec<AliasSet> {
    let mut effects: Vec<u32> = Vec::new();
    for a in 0..k {
        effects.push(1 << a);
    }
    for a in 0..k {
        for b in (a + 1)..k {
            effects.push((1 << a) | (1 << b));
        }
    }
    effects
        .into_iter()
        .map(|e| {
            let mut aliases: Vec<(u32, i8)> = words.iter().map(|w| (e ^ w.mask, w.sign)).collect();
            aliases.sort_by_key(|(m, _)| (length(*m), *m));
            AliasSet { effect: e, aliases }
        })
        .collect()
}

/// Nome do efeito pelas letras dos fatores (`A`, `AB`, …).
#[must_use]
pub fn effect_name(mask: u32) -> String {
    (0..32)
        .filter(|i| (mask >> i) & 1 == 1)
        .map(|i| letter(i as usize))
        .collect()
}

/// Letra do fator `i` (`A`…`Z`).
#[must_use]
pub fn letter(i: usize) -> char {
    char::from(b'A' + u8::try_from(i % 26).unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn word(mask: u32) -> Word {
        Word { mask, sign: 1 }
    }

    #[test]
    fn half_fraction_of_four_factors_has_resolution_four() {
        // D = ABC ⇒ I = ABCD.
        let words = defining_relation(&[word(0b1111)]);
        assert_eq!(words.len(), 1);
        assert_eq!(resolution(&words), Some(4));
        let sets = alias_sets(4, &words);
        let a = &sets[0]; // A ≡ BCD
        assert_eq!(effect_name(a.effect), "A");
        assert_eq!(
            a.aliases
                .iter()
                .map(|(m, _)| effect_name(*m))
                .collect::<Vec<_>>(),
            ["BCD"]
        );
        let ab = sets
            .iter()
            .find(|s| s.effect == 0b0011)
            .map(|s| s.aliases[0].0);
        assert_eq!(ab.map(effect_name).as_deref(), Some("CD")); // AB ≡ CD
    }

    #[test]
    fn products_of_generators_complete_the_defining_relation() {
        // 2^(5-2): D = AB, E = AC ⇒ I = ABD = ACE = BCDE.
        let words = defining_relation(&[word(0b01011), word(0b10101)]);
        let names: Vec<String> = words.iter().map(|w| effect_name(w.mask)).collect();
        assert_eq!(names, ["ABD", "ACE", "BCDE"]);
        assert_eq!(resolution(&words), Some(3));
    }

    #[test]
    fn negative_generators_flip_the_sign_of_the_words() {
        // D = −ABC ⇒ I = −ABCD.
        let words = defining_relation(&[Word {
            mask: 0b1111,
            sign: -1,
        }]);
        assert_eq!(words[0].sign, -1);
        let words2 = defining_relation(&[
            Word {
                mask: 0b0111,
                sign: -1,
            },
            Word {
                mask: 0b1011,
                sign: -1,
            },
        ]);
        // Produto de dois geradores negativos: sinal positivo.
        assert!(
            words2
                .iter()
                .any(|w| w.mask == 0b0111 ^ 0b1011 && w.sign == 1)
        );
    }

    #[test]
    fn full_factorial_has_no_resolution() {
        assert_eq!(resolution(&[]), None);
    }
}
