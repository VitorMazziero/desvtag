//! Avaliação em lote de funções de distribuição por contrato serializável.
//!
//! Permite que a interface (e a verificação nativo × WebAssembly) peçam valores de `cdf`, cauda
//! superior e quantis pelo mesmo protocolo dos demais métodos. Argumentos fora do domínio devolvem
//! `Stat::Undefined`, nunca `NaN`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::studentized_range::StudentizedRange;
use super::{chi_square, f, normal, student_t};
use crate::descriptive::{Stat, UndefinedReason};
use crate::errors::CoreError;
use crate::validation::{Issue, Severity};

/// Distribuição e seus parâmetros.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum Distribution {
    /// Normal padrão.
    Normal,
    /// t de Student.
    #[serde(rename_all = "camelCase")]
    StudentT {
        /// Graus de liberdade (> 0).
        df: f64,
    },
    /// Qui-quadrado.
    #[serde(rename_all = "camelCase")]
    ChiSquare {
        /// Graus de liberdade (> 0).
        df: f64,
    },
    /// Amplitude studentizada (base do Tukey); só `cdf`, `sf` e `quantileUpper`.
    #[serde(rename_all = "camelCase")]
    StudentizedRange {
        /// Número de grupos (≥ 2).
        groups: u32,
        /// Graus de liberdade do erro (> 0).
        df: f64,
    },
    /// F de Snedecor.
    #[serde(rename_all = "camelCase")]
    F {
        /// Graus de liberdade do numerador (> 0).
        df1: f64,
        /// Graus de liberdade do denominador (> 0).
        df2: f64,
    },
}

/// Função avaliada.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum DistributionFunction {
    /// `P(X ≤ x)`.
    Cdf,
    /// `P(X > x)`, com precisão relativa em probabilidades pequenas.
    Sf,
    /// `x` tal que `P(X > x) = q`.
    QuantileUpper,
    /// `x` tal que `P(X ≤ x) = p`.
    QuantileLower,
}

/// Solicitação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DistributionRequest {
    /// Distribuição.
    pub distribution: Distribution,
    /// Função.
    pub function: DistributionFunction,
    /// Argumentos (`x` para `cdf` e `sf`; probabilidade para os quantis).
    pub values: Vec<f64>,
}

/// Resultado: um valor por argumento, na mesma ordem.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DistributionResult {
    /// Valores.
    pub values: Vec<Stat>,
}

fn invalid(code: &str) -> CoreError {
    CoreError::InvalidInput(vec![Issue::new(code, Severity::Error)])
}

fn stat(value: f64) -> Stat {
    if value.is_nan() {
        Stat::undefined(UndefinedReason::OutOfDomain)
    } else {
        Stat::finite(value)
    }
}

fn quantile(result: Result<f64, super::quantile::QuantileError>) -> Stat {
    result.map_or(Stat::undefined(UndefinedReason::OutOfDomain), Stat::finite)
}

/// Avalia a função em cada argumento.
///
/// # Errors
/// [`CoreError::InvalidInput`] se algum parâmetro de forma não for finito e positivo.
pub fn evaluate(request: &DistributionRequest) -> Result<DistributionResult, CoreError> {
    use DistributionFunction::{Cdf, QuantileLower, QuantileUpper, Sf};
    let positive = |v: f64| v.is_finite() && v > 0.0;
    let values = match (&request.distribution, request.function) {
        (Distribution::Normal, function) => request
            .values
            .iter()
            .map(|&v| match function {
                Cdf => stat(normal::cdf(v)),
                Sf => stat(normal::sf(v)),
                QuantileUpper => quantile(normal::quantile_upper(v)),
                QuantileLower => quantile(normal::quantile(v)),
            })
            .collect(),
        (Distribution::StudentT { df }, function) => {
            if !positive(*df) {
                return Err(invalid("distribution.invalid_parameter"));
            }
            request
                .values
                .iter()
                .map(|&v| match function {
                    Cdf => stat(student_t::cdf(v, *df)),
                    Sf => stat(student_t::sf(v, *df)),
                    QuantileUpper => quantile(student_t::quantile_upper(v, *df)),
                    QuantileLower => quantile(student_t::quantile(v, *df)),
                })
                .collect()
        }
        (Distribution::ChiSquare { df }, function) => {
            if !positive(*df) {
                return Err(invalid("distribution.invalid_parameter"));
            }
            request
                .values
                .iter()
                .map(|&v| match function {
                    Cdf => stat(chi_square::cdf(v, *df)),
                    Sf => stat(chi_square::sf(v, *df)),
                    QuantileUpper => quantile(chi_square::quantile_upper(v, *df)),
                    QuantileLower => quantile(chi_square::quantile(v, *df)),
                })
                .collect()
        }
        (Distribution::StudentizedRange { groups, df }, function) => {
            let kernel = StudentizedRange::new(*groups as usize, *df)
                .map_err(|_| invalid("distribution.invalid_parameter"))?;
            if function == QuantileLower {
                return Err(invalid("distribution.unsupported_function"));
            }
            request
                .values
                .iter()
                .map(|&v| match function {
                    Cdf => stat(kernel.cdf(v)),
                    Sf => stat(kernel.sf(v)),
                    QuantileUpper => quantile(kernel.quantile_upper(v)),
                    QuantileLower => Stat::undefined(UndefinedReason::OutOfDomain),
                })
                .collect()
        }
        (Distribution::F { df1, df2 }, function) => {
            if !positive(*df1) || !positive(*df2) {
                return Err(invalid("distribution.invalid_parameter"));
            }
            request
                .values
                .iter()
                .map(|&v| match function {
                    Cdf => stat(f::cdf(v, *df1, *df2)),
                    Sf => stat(f::sf(v, *df1, *df2)),
                    QuantileUpper => quantile(f::quantile_upper(v, *df1, *df2)),
                    QuantileLower => quantile(f::quantile(v, *df1, *df2)),
                })
                .collect()
        }
    };
    Ok(DistributionResult { values })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evaluates_in_batch_and_marks_out_of_domain() {
        let result = evaluate(&DistributionRequest {
            distribution: Distribution::Normal,
            function: DistributionFunction::QuantileLower,
            values: vec![0.5, 0.975, 1.5, f64::NAN],
        })
        .unwrap_or_else(|_| unreachable!());
        assert_eq!(result.values[0].value(), Some(0.0));
        assert!((result.values[1].value().unwrap_or(0.0) - 1.959_963_984_540_054).abs() < 1e-12);
        let out = Stat::Undefined {
            reason: UndefinedReason::OutOfDomain,
        };
        assert_eq!(result.values[2], out);
        assert_eq!(result.values[3], out);
    }

    #[test]
    fn rejects_invalid_shape_parameters() {
        for distribution in [
            Distribution::StudentT { df: 0.0 },
            Distribution::ChiSquare { df: -1.0 },
            Distribution::F {
                df1: 1.0,
                df2: f64::NAN,
            },
        ] {
            let err = evaluate(&DistributionRequest {
                distribution,
                function: DistributionFunction::Cdf,
                values: vec![1.0],
            });
            assert!(matches!(err, Err(CoreError::InvalidInput(_))));
        }
    }
}
