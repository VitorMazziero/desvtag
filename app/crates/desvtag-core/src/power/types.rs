use crate::descriptive::Stat;
use crate::provenance::Provenance;
use crate::validation::Issue;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
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
    /// Fixed predictor matrix per replicate; test all slopes jointly, with an intercept.
    #[serde(rename_all = "camelCase")]
    Regression {
        /// Rows of predictors in the base design (without the intercept).
        predictors: Vec<Vec<f64>>,
        /// Expected slopes in predictor units.
        coefficients: Vec<f64>,
    },
    /// One planned contrast of independent group means.
    #[serde(rename_all = "camelCase")]
    Contrast {
        /// Expected group means.
        means: Vec<f64>,
        /// Contrast weights, summing to zero.
        weights: Vec<f64>,
        /// Positive integer group counts in one base replicate.
        allocation: Vec<u32>,
    },
    /// One effect in a full two-level factorial; effects are high-minus-low, twice beta.
    #[serde(rename_all = "camelCase")]
    TwoLevel {
        /// Number of two-level factors.
        factors: u32,
        /// Distinct nonempty subsets of zero-based factor indices, including fitted interactions.
        terms: Vec<Vec<u32>>,
        /// Expected high-minus-low effects, one per term.
        effects: Vec<f64>,
        /// Index of the tested term in terms/effects.
        target: u32,
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
    /// Optional reproducible Gaussian test-statistic simulation at the resulting n.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub simulation: Option<PowerSimulation>,
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
    #[serde(default)]
    pub noncentrality: Option<f64>,
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
    /// Monte Carlo verification, distinct from analytical power and its curve.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub simulation: Option<PowerSimulationResult>,
}

/// Reproducible Monte Carlo options (Gaussian fixed-design tests).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerSimulation {
    /// PCG32 seed; stream 54 is fixed.
    pub seed: u32,
    /// Number of simulated studies, 1,000 through 1,000,000.
    pub replications: u32,
}
/// Binomial uncertainty of the Monte Carlo rejection proportion.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PowerSimulationResult {
    /// Seed used for this simulation.
    pub seed: u32,
    /// Number of simulated studies.
    pub replications: u32,
    /// Studies rejecting the recorded null hypothesis.
    pub rejections: u32,
    /// Empirical rejection proportion (not the analytical power).
    pub estimate: f64,
    /// Monte Carlo standard error of that proportion.
    pub standard_error: f64,
    /// Wilson 95% binomial lower limit.
    pub ci_lower: f64,
    /// Wilson 95% binomial upper limit.
    pub ci_upper: f64,
    /// Versioned generator/statistic algorithm identifier.
    pub algorithm: String,
}
