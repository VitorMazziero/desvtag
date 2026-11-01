//! Soma compensada de Neumaier (Kahan–Babuška melhorada).
//!
//! Uma soma ingênua acumula erro de arredondamento proporcional ao número de
//! termos; a compensação mantém o erro acumulado em uma segunda variável e o
//! reincorpora ao final, de modo que o resultado é, em geral, o valor exato
//! arredondado uma única vez. Referência: A. Neumaier (1974), "Rundungsfehleranalyse
//! einiger Verfahren zur Summation endlicher Summen", ZAMM 54, 39–51.

/// Acumulador de soma compensada.
#[derive(Debug, Clone, Copy, Default)]
pub struct CompensatedSum {
    sum: f64,
    compensation: f64,
}

impl CompensatedSum {
    /// Acumulador vazio (soma zero).
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Acrescenta um termo.
    pub fn add(&mut self, x: f64) {
        let t = self.sum + x;
        if self.sum.abs() >= x.abs() {
            self.compensation += (self.sum - t) + x;
        } else {
            self.compensation += (x - t) + self.sum;
        }
        self.sum = t;
    }

    /// Soma acumulada, com a compensação incorporada.
    ///
    /// Se algum termo for infinito ou `NaN`, ou a soma estourar, o resultado
    /// não é finito; quem chama deve tratar isso como estado indefinido.
    #[must_use]
    pub fn total(&self) -> f64 {
        self.sum + self.compensation
    }
}

impl FromIterator<f64> for CompensatedSum {
    fn from_iter<I: IntoIterator<Item = f64>>(iter: I) -> Self {
        let mut acc = Self::new();
        for x in iter {
            acc.add(x);
        }
        acc
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sum(values: &[f64]) -> f64 {
        values.iter().copied().collect::<CompensatedSum>().total()
    }

    #[test]
    fn empty_sum_is_zero() {
        assert_eq!(sum(&[]), 0.0);
    }

    #[test]
    fn recovers_a_term_lost_by_naive_summation() {
        // A soma ingênua devolve 0.0; o valor exato é 1.0.
        let values = [1.0, 1e100, 1.0, -1e100];
        assert_eq!(values.iter().sum::<f64>(), 0.0);
        assert_eq!(sum(&values), 2.0);
    }

    #[test]
    fn many_small_terms_after_a_large_one() {
        let mut values = vec![1e16];
        values.extend(std::iter::repeat_n(1.0, 1000));
        // exato: 1e16 + 1000
        assert_eq!(sum(&values), 1e16 + 1000.0);
    }

    #[test]
    fn non_finite_inputs_stay_non_finite() {
        assert!(!sum(&[1.0, f64::INFINITY]).is_finite());
        assert!(!sum(&[f64::MAX, f64::MAX]).is_finite());
    }
}
