//! Codificação reversível dos níveis: `x_cod = (x − centro)/meia-amplitude`, com
//! `centro = (baixo + alto)/2` e `meia-amplitude = (alto − baixo)/2`. Baixo → −1, alto → +1,
//! ponto central → 0.

/// Níveis de um fator.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Levels {
    /// Nível baixo (real).
    pub low: f64,
    /// Nível alto (real).
    pub high: f64,
}

impl Levels {
    /// Níveis válidos: finitos e `low < high`.
    #[must_use]
    pub fn valid(&self) -> bool {
        self.low.is_finite()
            && self.high.is_finite()
            && self.low < self.high
            && self.half_range() > 0.0
    }

    /// Centro.
    #[must_use]
    pub fn center(&self) -> f64 {
        let sum = self.low + self.high;
        if sum.is_infinite() {
            self.low * 0.5 + self.high * 0.5
        } else {
            sum * 0.5
        }
    }

    /// Meia-amplitude.
    #[must_use]
    pub fn half_range(&self) -> f64 {
        let span = self.high - self.low;
        if span.is_infinite() {
            self.high * 0.5 - self.low * 0.5
        } else {
            span * 0.5
        }
    }

    /// Valor codificado de um valor real.
    #[must_use]
    pub fn encode(&self, real: f64) -> f64 {
        let center = self.center();
        let half = self.half_range();
        let delta = real - center;
        if delta.is_infinite() && real.is_finite() && center.is_finite() {
            (real * 0.5 - center * 0.5) / (half * 0.5)
        } else {
            delta / half
        }
    }

    /// Valor real de um valor codificado. Os extremos −1 e +1 devolvem exatamente `low` e `high`.
    #[must_use]
    pub fn decode(&self, coded: f64) -> f64 {
        if coded == -1.0 {
            self.low
        } else if coded == 1.0 {
            self.high
        } else {
            let offset = coded * self.half_range();
            if offset.is_infinite() && coded.is_finite() {
                coded.mul_add(self.half_range(), self.center())
            } else {
                self.center() + offset
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_and_decode_are_inverse_and_exact_at_the_extremes() {
        let l = Levels {
            low: 20.0,
            high: 40.0,
        };
        assert_eq!(l.encode(20.0), -1.0);
        assert_eq!(l.encode(40.0), 1.0);
        assert_eq!(l.encode(30.0), 0.0);
        assert_eq!(l.decode(-1.0), 20.0);
        assert_eq!(l.decode(1.0), 40.0);
        assert_eq!(l.decode(0.0), 30.0);
        for x in [20.0, 23.3, 30.0, 37.1, 40.0, 55.0] {
            assert!((l.decode(l.encode(x)) - x).abs() < 1e-12);
        }
    }

    #[test]
    fn rejects_degenerate_or_non_finite_levels() {
        assert!(
            !Levels {
                low: 1.0,
                high: 1.0
            }
            .valid()
        );
        assert!(
            !Levels {
                low: 2.0,
                high: 1.0
            }
            .valid()
        );
        assert!(
            !Levels {
                low: f64::NAN,
                high: 1.0
            }
            .valid()
        );
        assert!(
            Levels {
                low: -1e-3,
                high: 1e-3
            }
            .valid()
        );
    }
}
