//! Aleatorização reprodutível: PCG32 e embaralhamento de Fisher–Yates.
//!
//! **Gerador:** PCG-XSH-RR 64/32 (O'Neill, 2014), com a semente do usuário (64 bits) e a sequência
//! fixa 54, inicializado como em `pcg32_srandom_r`. **Embaralhamento:** Fisher–Yates de trás para
//! frente, com inteiros limitados sem viés (rejeição, como em `pcg32_boundedrand_r`). Todas as
//! operações são inteiras e idênticas no Windows e no WebAssembly: a mesma semente produz a mesma
//! ordem de execução.

const MULTIPLIER: u64 = 6_364_136_223_846_793_005;
/// Sequência (`initseq`) usada em todo o aplicativo.
pub const STREAM: u64 = 54;
/// Identificação do algoritmo, gravada no planejamento.
pub const ALGORITHM: &str = "pcg32-xsh-rr/fisher-yates";

/// Gerador PCG32.
#[derive(Debug, Clone)]
pub struct Pcg32 {
    state: u64,
    increment: u64,
}

impl Pcg32 {
    /// Inicializa como `pcg32_srandom_r(seed, STREAM)`.
    #[must_use]
    pub fn new(seed: u64) -> Self {
        let mut rng = Self {
            state: 0,
            increment: (STREAM << 1) | 1,
        };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(seed);
        rng.next_u32();
        rng
    }

    /// Próximo número de 32 bits.
    pub fn next_u32(&mut self) -> u32 {
        let old = self.state;
        self.state = old.wrapping_mul(MULTIPLIER).wrapping_add(self.increment);
        let xorshifted = (((old >> 18) ^ old) >> 27) as u32;
        let rotation = (old >> 59) as u32;
        xorshifted.rotate_right(rotation)
    }

    /// Inteiro uniforme em `[0, bound)` sem viés (`bound > 0`).
    pub fn bounded(&mut self, bound: u32) -> u32 {
        let threshold = bound.wrapping_neg() % bound;
        loop {
            let r = self.next_u32();
            if r >= threshold {
                return r % bound;
            }
        }
    }
}

/// Permutação de `0..n` por Fisher–Yates.
#[must_use]
pub fn permutation(n: usize, seed: u64) -> Vec<usize> {
    let mut rng = Pcg32::new(seed);
    let mut items: Vec<usize> = (0..n).collect();
    for i in (1..n).rev() {
        let j = rng.bounded(u32::try_from(i + 1).unwrap_or(u32::MAX)) as usize;
        items.swap(i, j);
    }
    items
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_the_pcg32_reference_demo_vector() {
        // pcg32_srandom_r(&rng, 42u, 54u): saída do programa demonstrativo oficial (pcg32-demo).
        let mut rng = Pcg32::new(42);
        let got: Vec<u32> = (0..6).map(|_| rng.next_u32()).collect();
        assert_eq!(
            got,
            [
                0xa15c_02b7,
                0x7b47_f409,
                0xba1d_3330,
                0x83d2_f293,
                0xbfa4_784b,
                0xcbed_606e
            ]
        );
    }

    #[test]
    fn same_seed_same_permutation_and_it_is_a_permutation() {
        let a = permutation(50, 12345);
        assert_eq!(a, permutation(50, 12345));
        assert_ne!(a, permutation(50, 12346));
        let mut sorted = a.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, (0..50).collect::<Vec<_>>());
        assert!(permutation(0, 1).is_empty());
        assert_eq!(permutation(1, 1), [0]);
    }

    #[test]
    fn bounded_values_stay_in_range_and_cover_it() {
        let mut rng = Pcg32::new(7);
        let mut seen = [false; 6];
        for _ in 0..2000 {
            let v = rng.bounded(6);
            assert!(v < 6);
            seen[v as usize] = true;
        }
        assert!(seen.iter().all(|s| *s));
    }

    #[test]
    fn positions_are_roughly_uniform() {
        // Frequência do elemento 0 em cada posição, 6000 embaralhamentos de 6 itens.
        let mut counts = [0_u32; 6];
        for seed in 0..6000_u64 {
            let p = permutation(6, seed);
            let pos = p.iter().position(|&x| x == 0).unwrap_or(0);
            counts[pos] += 1;
        }
        for c in counts {
            assert!((800..=1200).contains(&c), "{counts:?}");
        }
    }
}
