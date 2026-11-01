//! Ajuste de mínimos quadrados por QR com pivoteamento (C06).
//!
//! **Algoritmo.** `X·P = Q·R` (colunas normalizadas). `c = Qᵀy`; os coeficientes vêm de
//! `R₁₁·b = c₁` (nunca de `(XᵀX)⁻¹Xᵀy`); a soma de quadrados residual é `Σ cᵢ²` para `i > posto`;
//! os valores ajustados e os resíduos são `Q·[c₁, 0]` e `Q·[0, c₂]`. Colunas aliasadas (posto menor
//! que o número de colunas) recebem estado explícito "não estimável" e aparecem em `aliased`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::covariance::unscaled_variances;
use super::design_matrix::{self, ExcludedObservation};
use super::terms::ModelSpec;
use crate::descriptive::{Stat, UndefinedReason};
use crate::diagnostics::{influence, residuals};
use crate::domain::{Dataset, StableId};
use crate::errors::CoreError;
use crate::inference::intervals::{symmetric_interval, t_critical, two_sided_p};
use crate::inference::regression_anova::{self, Partition, RegressionAnova};
use crate::numeric::qr::default_rank_tolerance;
use crate::numeric::svd::condition_number;
use crate::numeric::{CompensatedSum, Matrix, QrDecomposition};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "linear_model";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Número de condição (colunas normalizadas) a partir do qual se avisa perda de precisão.
pub const ILL_CONDITIONED_THRESHOLD: f64 = 1e8;

/// Solicitação de ajuste linear sobre um conjunto de dados.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LinearModelRequest {
    /// Dados.
    pub dataset: Dataset,
    /// Modelo.
    pub spec: ModelSpec,
}

/// Linha da tabela de coeficientes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CoefficientRow {
    /// Rótulo da coluna.
    pub label: String,
    /// Estimativa.
    pub estimate: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Estatística t.
    pub t_value: Stat,
    /// Valor-p bilateral.
    pub p_value: Stat,
    /// Limite inferior do intervalo de confiança.
    pub ci_lower: Stat,
    /// Limite superior do intervalo de confiança.
    pub ci_upper: Stat,
}

/// Diagnóstico por observação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ObservationDiagnostics {
    /// Observação do conjunto de dados (ausente nos ajustes sobre matrizes).
    pub observation_id: Option<StableId>,
    /// Linha usada no ajuste (0-based).
    pub row: u32,
    /// Valor observado.
    pub observed: f64,
    /// Valor ajustado.
    pub fitted: f64,
    /// Resíduo `y − ŷ`.
    pub residual: f64,
    /// Alavancagem `hᵢᵢ`.
    pub leverage: f64,
    /// Resíduo internamente studentizado (padronizado).
    pub standardized_residual: Stat,
    /// Resíduo externamente studentizado (deletado).
    pub studentized_residual: Stat,
    /// Distância de Cook.
    pub cooks_distance: Stat,
}

/// Resultado do ajuste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LinearFit {
    /// Observações usadas.
    pub n_observations: u32,
    /// Colunas do modelo.
    pub n_columns: u32,
    /// Posto numérico da matriz do modelo.
    pub rank: u32,
    /// Graus de liberdade residuais.
    pub df_residual: u32,
    /// Nível de confiança dos intervalos.
    pub confidence_level: f64,
    /// Coeficientes, na ordem das colunas.
    pub coefficients: Vec<CoefficientRow>,
    /// Rótulos das colunas não estimáveis (combinações lineares das demais).
    pub aliased: Vec<String>,
    /// ANOVA da regressão e medidas de ajuste.
    pub anova: RegressionAnova,
    /// Variância residual `σ̂²`.
    pub residual_variance: Stat,
    /// Desvio-padrão residual `σ̂`.
    pub residual_sd: Stat,
    /// Número de condição das colunas retidas, normalizadas pela norma.
    pub condition_number: Stat,
    /// Diagnósticos por observação.
    pub observations: Vec<ObservationDiagnostics>,
    /// Observações fora do ajuste (dados ausentes).
    pub excluded: Vec<ExcludedObservation>,
    /// Avisos do ajuste (posto, graus de liberdade, condicionamento…).
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

/// Fatoração e estimativas mantidas em memória para predição (não serializado).
#[derive(Debug, Clone)]
pub struct LinearModel {
    qr: QrDecomposition,
    coefficients: Vec<Option<f64>>,
    sigma: Option<f64>,
    df_residual: usize,
}

impl LinearModel {
    /// Fatoração QR da matriz do modelo.
    #[must_use]
    pub const fn factorization(&self) -> &QrDecomposition {
        &self.qr
    }

    /// Coeficientes na ordem das colunas (`None` = não estimável).
    #[must_use]
    pub fn coefficients(&self) -> &[Option<f64>] {
        &self.coefficients
    }

    /// Desvio-padrão residual, se houver graus de liberdade residuais.
    #[must_use]
    pub const fn sigma(&self) -> Option<f64> {
        self.sigma
    }

    /// Graus de liberdade residuais.
    #[must_use]
    pub const fn df_residual(&self) -> usize {
        self.df_residual
    }
}

/// Ajuste sobre uma matriz, com o modelo para predições.
#[derive(Debug, Clone)]
pub struct MatrixFit {
    /// Relatório serializável.
    pub report: LinearFit,
    /// Fatoração e estimativas.
    pub model: LinearModel,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn warning(code: &str) -> Issue {
    Issue::new(code, Severity::Warning)
}

fn sum_of_squares(values: impl IntoIterator<Item = f64>) -> f64 {
    let mut acc = CompensatedSum::new();
    for v in values {
        acc.add(v * v);
    }
    acc.total()
}

/// Ajusta `y = X·β + ε` por mínimos quadrados.
///
/// `intercept` indica que a **primeira coluna** de `x` é o intercepto (define a soma total
/// centrada e os graus de liberdade do modelo).
///
/// # Errors
/// Diagnósticos de erro quando as dimensões não coincidem, não há observações, algum valor não é
/// finito ou o posto é zero.
pub fn fit_matrix(
    x: &Matrix,
    y: &[f64],
    labels: &[String],
    intercept: bool,
    confidence_level: f64,
) -> Result<MatrixFit, Vec<Issue>> {
    let (n, p) = (x.rows(), x.cols());
    if n == 0 || p == 0 || y.len() != n || labels.len() != p {
        return Err(vec![error("model.invalid_dimensions")]);
    }
    if !(confidence_level > 0.0 && confidence_level < 1.0) {
        return Err(vec![error("model.invalid_confidence_level")]);
    }
    let finite =
        y.iter().all(|v| v.is_finite()) && (0..n).all(|i| (0..p).all(|j| x[(i, j)].is_finite()));
    if !finite {
        return Err(vec![error("model.non_finite_input")]);
    }

    let qr = QrDecomposition::new(x, default_rank_tolerance(n, p));
    let rank = qr.rank;
    if rank == 0 {
        return Err(vec![error("model.zero_rank")]);
    }
    let mut issues = Vec::new();

    // Coeficientes.
    let c = qr.apply_qt(y);
    let scaled = qr.solve_upper(&c[..rank]);
    let mut coefficients: Vec<Option<f64>> = vec![None; p];
    for (k, b) in scaled.iter().enumerate() {
        let original = qr.perm[k];
        coefficients[original] = Some(b / qr.column_norms[original]);
    }
    let aliased: Vec<String> = (0..p)
        .filter(|&j| coefficients[j].is_none())
        .map(|j| labels[j].clone())
        .collect();
    if !aliased.is_empty() {
        issues.push(
            warning("model.rank_deficient")
                .with_param("rank", &rank)
                .with_param("columns", &p)
                .with_param("aliased", &aliased.join(", ")),
        );
    }

    // Ajustados, resíduos e somas de quadrados.
    let df_residual = n - rank;
    let mut fitted_z = vec![0.0; n];
    fitted_z[..rank].copy_from_slice(&c[..rank]);
    let fitted = qr.apply_q(&fitted_z);
    let ss_residual = sum_of_squares(c[rank..].iter().copied());
    let mut residual_z = vec![0.0; n];
    residual_z[rank..].copy_from_slice(&c[rank..]);
    let residuals_vec = qr.apply_q(&residual_z);

    let (ss_total, ss_model, df_model, df_total) = if intercept {
        let mean = {
            let mut acc = CompensatedSum::new();
            y.iter().for_each(|v| acc.add(*v));
            acc.total() / n as f64
        };
        (
            sum_of_squares(y.iter().map(|v| v - mean)),
            sum_of_squares(fitted.iter().map(|v| v - mean)),
            rank.saturating_sub(1),
            n - 1,
        )
    } else {
        (
            sum_of_squares(y.iter().copied()),
            sum_of_squares(fitted.iter().copied()),
            rank,
            n,
        )
    };
    let anova = regression_anova::build(Partition {
        ss_model,
        ss_residual,
        ss_total,
        df_model,
        df_residual,
        df_total,
        centered: intercept,
    });
    if ss_total <= 0.0 {
        issues.push(warning("model.constant_response"));
    }

    // Variância residual e erros-padrão.
    let sigma = (df_residual > 0).then(|| (ss_residual / df_residual as f64).sqrt());
    let (residual_variance, residual_sd) = match sigma {
        Some(s) => (Stat::finite(s * s), Stat::finite(s)),
        None => {
            issues.push(warning("model.no_residual_df"));
            let u = Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom);
            (u, u)
        }
    };
    let variances = unscaled_variances(&qr, p);
    let critical = t_critical(confidence_level, df_residual as f64);
    let table = labels
        .iter()
        .enumerate()
        .map(|(j, label)| {
            let undefined = |reason| {
                let u = Stat::undefined(reason);
                CoefficientRow {
                    label: label.clone(),
                    estimate: u,
                    std_error: u,
                    t_value: u,
                    p_value: u,
                    ci_lower: u,
                    ci_upper: u,
                }
            };
            let Some(estimate) = coefficients[j] else {
                return undefined(UndefinedReason::NotEstimable);
            };
            let (Some(s), Some(v), Some(crit)) = (sigma, variances[j], critical) else {
                let mut row = undefined(UndefinedReason::NoResidualDegreesOfFreedom);
                row.estimate = Stat::finite(estimate);
                return row;
            };
            let se = s * v.sqrt();
            let t = estimate / se;
            let (lo, hi) = symmetric_interval(estimate, crit, se);
            CoefficientRow {
                label: label.clone(),
                estimate: Stat::finite(estimate),
                std_error: Stat::finite(se),
                t_value: Stat::finite(t),
                p_value: if t.is_finite() {
                    Stat::finite(two_sided_p(t, df_residual as f64))
                } else {
                    Stat::undefined(UndefinedReason::NonFiniteResult)
                },
                ci_lower: Stat::finite(lo),
                ci_upper: Stat::finite(hi),
            }
        })
        .collect();

    // Condicionamento das colunas retidas (normalizadas).
    let mut retained = Matrix::zeros(n, rank);
    for k in 0..rank {
        let original = qr.perm[k];
        let norm = qr.column_norms[original];
        for i in 0..n {
            retained[(i, k)] = x[(i, original)] / norm;
        }
    }
    let condition = condition_number(&retained);
    let condition_stat = condition.map_or(
        Stat::undefined(UndefinedReason::NonFiniteResult),
        Stat::finite,
    );
    if let Some(value) = condition
        && (value >= ILL_CONDITIONED_THRESHOLD || !value.is_finite())
    {
        issues.push(
            warning("model.ill_conditioned").with_param("condition", &format!("{value:.3e}")),
        );
    }

    // Diagnósticos por observação.
    let leverage = influence::leverages(&qr, n);
    let observations = (0..n)
        .map(|i| {
            let internal = sigma
                .and_then(|s| residuals::internally_studentized(residuals_vec[i], leverage[i], s));
            let external = internal.and_then(|r| residuals::externally_studentized(r, df_residual));
            let cook = internal.and_then(|r| influence::cooks_distance(r, leverage[i], rank));
            let stat = |value: Option<f64>| {
                value.map_or(Stat::undefined(UndefinedReason::NotEstimable), Stat::finite)
            };
            ObservationDiagnostics {
                observation_id: None,
                row: u32::try_from(i).unwrap_or(u32::MAX),
                observed: y[i],
                fitted: fitted[i],
                residual: residuals_vec[i],
                leverage: leverage[i],
                standardized_residual: stat(internal),
                studentized_residual: stat(external),
                cooks_distance: stat(cook),
            }
        })
        .collect();

    // Entradas finitas podem estourar nos produtos internos (escala extrema): nunca devolver `NaN`.
    let all_finite = coefficients.iter().flatten().all(|v| v.is_finite())
        && fitted
            .iter()
            .chain(&residuals_vec)
            .chain(&leverage)
            .all(|v| v.is_finite())
        && ss_residual.is_finite()
        && ss_total.is_finite();
    if !all_finite {
        return Err(vec![error("model.non_finite_result")]);
    }

    let to_u32 = |v: usize| u32::try_from(v).unwrap_or(u32::MAX);
    let report = LinearFit {
        n_observations: to_u32(n),
        n_columns: to_u32(p),
        rank: to_u32(rank),
        df_residual: to_u32(df_residual),
        confidence_level,
        coefficients: table,
        aliased,
        anova,
        residual_variance,
        residual_sd,
        condition_number: condition_stat,
        observations,
        excluded: Vec::new(),
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    };
    Ok(MatrixFit {
        report,
        model: LinearModel {
            qr,
            coefficients,
            sigma,
            df_residual,
        },
    })
}

/// Ajusta o modelo descrito por `request.spec` sobre `request.dataset`.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando os dados ou o modelo são inválidos.
pub fn fit_model(request: &LinearModelRequest) -> Result<LinearFit, CoreError> {
    fit_model_with_predictions(request).map(|fit| fit.report)
}

/// Como [`fit_model`], mantendo o modelo para predições.
///
/// # Errors
/// [`CoreError::InvalidInput`] quando os dados ou o modelo são inválidos.
pub fn fit_model_with_predictions(request: &LinearModelRequest) -> Result<MatrixFit, CoreError> {
    let design =
        design_matrix::build(&request.dataset, &request.spec).map_err(CoreError::InvalidInput)?;
    let mut fit = fit_matrix(
        &design.x,
        &design.y,
        &design.labels,
        design.has_intercept,
        request.spec.confidence_level,
    )
    .map_err(CoreError::InvalidInput)?;
    for (obs, id) in fit
        .report
        .observations
        .iter_mut()
        .zip(&design.observation_ids)
    {
        obs.observation_id = Some(id.clone());
    }
    fit.report.excluded = design.excluded;
    if !fit.report.excluded.is_empty() {
        fit.report.issues.push(
            warning("model.excluded_observations").with_param("count", &fit.report.excluded.len()),
        );
    }
    Ok(fit)
}
