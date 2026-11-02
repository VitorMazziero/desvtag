//! C15 — potência, tamanho de amostra e precisão para os desenhos do aplicativo.
//!
//! - **ANOVA de um fator:** `F′` não central com `λ = n·Σ(μᵢ − μ̄)²/σ²` (`n` por grupo),
//!   `gl₁ = k − 1`, `gl₂ = k(n − 1)`.
//! - **t de uma amostra e pareado:** `T′` não central, `δ = d·√n/σ`, `gl = n − 1`.
//! - **t de duas amostras** (variâncias iguais, `n` por grupo): `δ = d·√(n/2)/σ`, `gl = 2n − 2`.
//! - **Precisão:** menor `n` com semiamplitude do intervalo `t₁₋α/₂·σ·√(c/n) ≤ h` (`c = 1` ou `2`).
//!
//! As fórmulas são exatas (distribuições não centrais), **sem simulação**; a potência vale para o
//! `σ` e o efeito informados, que são suposições do usuário. Especificação em
//! `docs/metodos/potencia.md`.

mod anova;
mod t_test;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "power_analysis";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Maior `n` por grupo examinado.
pub const MAX_N: u32 = 100_000;
/// Pontos da curva de potência.
const CURVE_POINTS: usize = 40;

/// Desenho cuja potência se calcula.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum PowerDesign {
    /// ANOVA de um fator com as médias esperadas dos grupos (≥ 2) e `n` por grupo.
    #[serde(rename_all = "camelCase")]
    Anova {
        /// Médias esperadas dos grupos.
        means: Vec<f64>,
    },
    /// t de uma amostra: diferença esperada em relação ao valor de referência.
    #[serde(rename_all = "camelCase")]
    OneSampleT {
        /// Diferença esperada.
        difference: f64,
    },
    /// t pareado: diferença média esperada entre as condições.
    #[serde(rename_all = "camelCase")]
    PairedT {
        /// Diferença esperada.
        difference: f64,
    },
    /// t de duas amostras independentes (variâncias iguais, `n` por grupo).
    #[serde(rename_all = "camelCase")]
    TwoSampleT {
        /// Diferença esperada entre as médias.
        difference: f64,
    },
}

/// O que calcular.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum PowerGoal {
    /// Potência para um `n` dado (por grupo, ou número de unidades/pares).
    #[serde(rename_all = "camelCase")]
    PowerAt {
        /// Tamanho da amostra.
        n: u32,
    },
    /// Menor `n` que atinge a potência-alvo.
    #[serde(rename_all = "camelCase")]
    SampleSizeFor {
        /// Potência-alvo (0 a 1, exclusivo).
        power: f64,
    },
    /// Menor `n` para uma semiamplitude do intervalo de confiança (só testes t).
    #[serde(rename_all = "camelCase")]
    PrecisionFor {
        /// Semiamplitude desejada.
        half_width: f64,
    },
}

/// Solicitação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerRequest {
    /// Desenho.
    pub design: PowerDesign,
    /// Desvio-padrão esperado do erro (σ > 0).
    pub sigma: f64,
    /// Nível de significância (0 a 1, exclusivo).
    pub alpha: f64,
    /// Teste bilateral (nos testes t); a ANOVA é sempre «unilateral» na cauda superior de F.
    pub two_sided: bool,
    /// Objetivo.
    pub goal: PowerGoal,
}

/// Ponto da curva de potência.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerPoint {
    /// Tamanho da amostra.
    pub n: u32,
    /// Potência.
    pub power: f64,
}

/// Resultado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerResult {
    /// `n` por grupo (ANOVA e duas amostras) ou número de unidades/pares.
    pub n: u32,
    /// Total de observações do estudo.
    pub total: u32,
    /// Potência em `n`.
    pub power: Stat,
    /// Parâmetro de não centralidade (`λ` na ANOVA, `δ` nos testes t).
    pub noncentrality: f64,
    /// Graus de liberdade do numerador (ANOVA) ou do teste (t).
    pub df1: f64,
    /// Graus de liberdade do denominador (ANOVA); 0 nos testes t.
    pub df2: f64,
    /// Valor crítico usado.
    pub critical: f64,
    /// Semiamplitude do intervalo de confiança em `n` (só nos testes t).
    pub half_width: Stat,
    /// Curva de potência em função de `n`.
    pub curve: Vec<PowerPoint>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Potência e quantidades auxiliares em um `n`.
pub(crate) struct Evaluation {
    pub power: f64,
    pub noncentrality: f64,
    pub df1: f64,
    pub df2: f64,
    pub critical: f64,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn evaluate(request: &PowerRequest, n: u32) -> Option<Evaluation> {
    match &request.design {
        PowerDesign::Anova { means } => anova::power(means, request.sigma, request.alpha, n),
        PowerDesign::OneSampleT { difference } | PowerDesign::PairedT { difference } => {
            t_test::power(
                *difference,
                request.sigma,
                request.alpha,
                request.two_sided,
                n,
                false,
            )
        }
        PowerDesign::TwoSampleT { difference } => t_test::power(
            *difference,
            request.sigma,
            request.alpha,
            request.two_sided,
            n,
            true,
        ),
    }
}

fn minimum_n(request: &PowerRequest, target: f64) -> Option<u32> {
    let reaches = |n: u32| evaluate(request, n).is_some_and(|e| e.power >= target);
    let mut high = 2_u32;
    while !reaches(high) {
        if high >= MAX_N {
            return None;
        }
        high = (high * 2).min(MAX_N);
    }
    let mut low = 2_u32; // `low` pode já atingir
    if reaches(low) {
        return Some(low);
    }
    while high - low > 1 {
        let mid = low + (high - low) / 2;
        if reaches(mid) {
            high = mid;
        } else {
            low = mid;
        }
    }
    Some(high)
}

fn validate(request: &PowerRequest) -> Vec<Issue> {
    let mut issues = Vec::new();
    if !(request.sigma.is_finite() && request.sigma > 0.0) {
        issues.push(error("power.invalid_sigma"));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(error("power.invalid_alpha"));
    }
    match &request.design {
        PowerDesign::Anova { means } => {
            if means.len() < 2 || means.iter().any(|m| !m.is_finite()) {
                issues.push(error("power.invalid_means"));
            } else if means.iter().all(|m| (*m - means[0]).abs() == 0.0) {
                issues.push(error("power.no_effect"));
            }
            if matches!(request.goal, PowerGoal::PrecisionFor { .. }) {
                issues.push(error("power.precision_needs_t"));
            }
        }
        PowerDesign::OneSampleT { difference }
        | PowerDesign::PairedT { difference }
        | PowerDesign::TwoSampleT { difference } => {
            if !difference.is_finite() {
                issues.push(error("power.invalid_difference"));
            } else if *difference == 0.0 && !matches!(request.goal, PowerGoal::PrecisionFor { .. })
            {
                issues.push(error("power.no_effect"));
            }
        }
    }
    match request.goal {
        PowerGoal::PowerAt { n } if n < 2 => issues.push(error("power.invalid_n")),
        PowerGoal::SampleSizeFor { power } if !(power > 0.0 && power < 1.0) => {
            issues.push(error("power.invalid_target"));
        }
        PowerGoal::PrecisionFor { half_width } if !(half_width.is_finite() && half_width > 0.0) => {
            issues.push(error("power.invalid_half_width"));
        }
        _ => {}
    }
    issues
}

/// Calcula potência, tamanho de amostra ou precisão.
///
/// # Errors
/// [`CoreError::InvalidInput`] para solicitação inválida ou objetivo inalcançável até [`MAX_N`].
pub fn analyze(request: &PowerRequest) -> Result<PowerResult, CoreError> {
    let issues = validate(request);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let two_groups = matches!(request.design, PowerDesign::TwoSampleT { .. });
    let groups = match &request.design {
        PowerDesign::Anova { means } => means.len() as u32,
        PowerDesign::TwoSampleT { .. } => 2,
        _ => 1,
    };
    let n = match request.goal {
        PowerGoal::PowerAt { n } => n,
        PowerGoal::SampleSizeFor { power } => minimum_n(request, power).ok_or_else(|| {
            CoreError::InvalidInput(vec![error("power.unreachable").with_param("max", &MAX_N)])
        })?,
        PowerGoal::PrecisionFor { half_width } => {
            t_test::precision_n(request.sigma, request.alpha, half_width, two_groups).ok_or_else(
                || {
                    CoreError::InvalidInput(vec![
                        error("power.unreachable").with_param("max", &MAX_N),
                    ])
                },
            )?
        }
    };
    let at = evaluate(request, n)
        .ok_or_else(|| CoreError::InvalidInput(vec![error("power.invalid_n")]))?;
    let curve_end = (n.saturating_mul(2)).clamp(10, 400);
    let curve: Vec<PowerPoint> = (0..CURVE_POINTS)
        .filter_map(|i| {
            let m = 2 + ((curve_end - 2) as usize * i / (CURVE_POINTS - 1)) as u32;
            evaluate(request, m).map(|e| PowerPoint {
                n: m,
                power: e.power,
            })
        })
        .collect();
    let half_width = if matches!(request.design, PowerDesign::Anova { .. }) {
        Stat::undefined(UndefinedReason::NoModelTerms)
    } else {
        t_test::half_width(request.sigma, request.alpha, n, two_groups).map_or(
            Stat::undefined(UndefinedReason::NonFiniteResult),
            Stat::finite,
        )
    };
    let mut notes = Vec::new();
    if n < 5 {
        notes.push(Issue::new("power.small_n", Severity::Warning));
    }
    Ok(PowerResult {
        n,
        total: n.saturating_mul(if matches!(request.design, PowerDesign::Anova { .. }) {
            groups
        } else if two_groups {
            2
        } else {
            1
        }),
        power: Stat::finite(at.power),
        noncentrality: at.noncentrality,
        df1: at.df1,
        df2: at.df2,
        critical: at.critical,
        half_width,
        curve,
        issues: notes,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn anova(goal: PowerGoal) -> PowerRequest {
        PowerRequest {
            design: PowerDesign::Anova {
                means: vec![10.0, 12.0, 14.0, 12.0],
            },
            sigma: 3.0,
            alpha: 0.05,
            two_sided: true,
            goal,
        }
    }

    #[test]
    fn power_grows_with_n_and_the_sample_size_search_is_minimal() {
        let small = analyze(&anova(PowerGoal::PowerAt { n: 4 })).expect("n=4");
        let large = analyze(&anova(PowerGoal::PowerAt { n: 20 })).expect("n=20");
        assert!(large.power.value() > small.power.value());
        let found = analyze(&anova(PowerGoal::SampleSizeFor { power: 0.8 })).expect("tamanho");
        assert!(found.power.value().expect("p") >= 0.8);
        let below = analyze(&anova(PowerGoal::PowerAt { n: found.n - 1 })).expect("n−1");
        assert!(below.power.value().expect("p") < 0.8);
        assert_eq!(found.total, found.n * 4);
    }

    #[test]
    fn t_tests_and_precision_work() {
        let paired = PowerRequest {
            design: PowerDesign::PairedT { difference: 1.0 },
            sigma: 1.5,
            alpha: 0.05,
            two_sided: true,
            goal: PowerGoal::SampleSizeFor { power: 0.9 },
        };
        let r = analyze(&paired).expect("pareado");
        assert!(r.power.value().expect("p") >= 0.9);
        let two = analyze(&PowerRequest {
            design: PowerDesign::TwoSampleT { difference: 1.0 },
            goal: PowerGoal::SampleSizeFor { power: 0.9 },
            ..paired.clone()
        })
        .expect("duas amostras");
        assert!(two.n > r.n);
        assert_eq!(two.total, two.n * 2);
        let precision = analyze(&PowerRequest {
            goal: PowerGoal::PrecisionFor { half_width: 0.5 },
            ..paired
        })
        .expect("precisão");
        assert!(precision.half_width.value().expect("h") <= 0.5);
    }

    #[test]
    fn invalid_or_unreachable_requests_are_refused() {
        let mut bad = anova(PowerGoal::PowerAt { n: 1 });
        assert!(analyze(&bad).is_err());
        bad.goal = PowerGoal::SampleSizeFor { power: 1.0 };
        assert!(analyze(&bad).is_err());
        let none = PowerRequest {
            design: PowerDesign::Anova {
                means: vec![5.0, 5.0],
            },
            ..anova(PowerGoal::PowerAt { n: 5 })
        };
        assert!(analyze(&none).is_err());
        let tiny = PowerRequest {
            design: PowerDesign::OneSampleT { difference: 1e-9 },
            goal: PowerGoal::SampleSizeFor { power: 0.9 },
            ..anova(PowerGoal::PowerAt { n: 5 })
        };
        assert!(analyze(&tiny).is_err());
    }
}
