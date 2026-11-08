//! C08b — ANOVA multifatorial (com blocos), médias marginais e contrastes.
//!
//! Modelo linear com fatores categóricos codificados por **soma zero** (efeitos): intercepto, um
//! termo por fator e por interação até a ordem pedida; um fator de **bloco** entra só como efeito
//! principal aditivo (sem interação). As somas de quadrados vêm de diferenças de soma de
//! quadrados do resíduo entre modelos encaixados:
//!
//! - **Tipo I** (sequencial): cada termo, depois dos anteriores;
//! - **Tipo II**: cada termo, depois de todos os que **não o contêm** (princípio da marginalidade);
//! - **Tipo III**: cada termo, depois de todos os outros (codificação de soma zero).
//!
//! **Médias marginais** (mínimos quadrados): para as células de um subconjunto de fatores, a
//! média das predições do modelo sobre todas as combinações dos demais fatores com pesos iguais;
//! o erro-padrão é `√(QMR·L(XᵀX)⁻¹Lᵀ)`. Comparações entre células com ajuste de Tukey (amplitude
//! studentizada, Tukey–Kramer), Bonferroni, Holm ou nenhum; contrastes pelo usuário com teste *t*.
//! Especificação em `docs/metodos/anova-multifatorial.md` e `medias-marginais-contrastes.md`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::covariance::quadratic_form;
use super::resource_budget::WorkBudget;
use crate::comparisons::letters::{self, Letters, Relation};
use crate::comparisons::procedures::{Adjustment, adjust_p};
use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::studentized_range::StudentizedRange;
use crate::distributions::{f, student_t};
use crate::domain::{Dataset, FactorValue, StableId};
use crate::errors::CoreError;
use crate::numeric::Matrix;
use crate::numeric::qr::{QrDecomposition, default_rank_tolerance};
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity, validate_dataset};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "factorial_anova";
/// Versão do método.
pub const METHOD_VERSION: u32 = 2;
/// Número máximo de fatores no modelo.
pub const MAX_FACTORS: usize = 6;
/// Número máximo de colunas do modelo.
pub const MAX_COLUMNS: usize = 400;
/// Maximum materialized model/reference-vector cells per operation.
pub const MAX_MATRIX_CELLS: usize = 262_144;
/// Maximum planned pairwise comparisons, accumulated across all requested marginal families.
pub const MAX_PAIRS: usize = 20_000;
/// Per-request deterministic algebra proxy; measured together with the ET28 resource envelope.
pub const MAX_ALGEBRA_WORK: u64 = 3_000_000_000;

/// Tipo de soma de quadrados.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum SumOfSquaresType {
    /// Sequencial.
    TypeI,
    /// Marginal (hierárquica).
    TypeII,
    /// Marginal com soma zero.
    TypeIII,
}

/// Ajuste das comparações entre médias marginais.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum PairwiseAdjustment {
    /// Tukey–Kramer (amplitude studentizada).
    Tukey,
    /// Sem ajuste.
    None,
    /// Bonferroni.
    Bonferroni,
    /// Holm.
    Holm,
}

/// Médias marginais de um subconjunto de fatores.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MarginalRequest {
    /// Fatores que definem as células (do modelo).
    pub factors: Vec<StableId>,
    /// Ajuste das comparações pareadas.
    pub adjustment: PairwiseAdjustment,
}

/// Contraste definido pelo usuário sobre as células de um subconjunto de fatores.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContrastRequest {
    /// Nome apresentado.
    pub name: String,
    /// Fatores que definem as células.
    pub factors: Vec<StableId>,
    /// Coeficientes, um por célula, na ordem das células (o primeiro fator varia mais devagar).
    pub coefficients: Vec<f64>,
}

/// Configuração da ANOVA multifatorial (tudo o que não são os dados).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialSetup {
    /// Fatores de tratamento.
    pub factor_ids: Vec<StableId>,
    /// Fator de bloco (efeito principal aditivo), se houver.
    pub block_id: Option<StableId>,
    /// Maior ordem das interações (1 = só efeitos principais).
    pub interaction_order: u8,
    /// Tipo de soma de quadrados.
    pub ss_type: SumOfSquaresType,
    /// Médias marginais pedidas.
    pub marginals: Vec<MarginalRequest>,
    /// Contrastes pedidos.
    pub contrasts: Vec<ContrastRequest>,
}

/// Solicitação.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialRequest {
    /// Dados.
    pub dataset: Dataset,
    /// Resposta.
    pub response_id: StableId,
    /// Fatores de tratamento.
    pub factor_ids: Vec<StableId>,
    /// Fator de bloco (efeito principal aditivo), se houver.
    pub block_id: Option<StableId>,
    /// Maior ordem das interações (1 = só efeitos principais).
    pub interaction_order: u8,
    /// Tipo de soma de quadrados.
    pub ss_type: SumOfSquaresType,
    /// Nível de significância.
    pub alpha: f64,
    /// Médias marginais pedidas.
    pub marginals: Vec<MarginalRequest>,
    /// Contrastes pedidos.
    pub contrasts: Vec<ContrastRequest>,
}

/// Linha da tabela de ANOVA.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialAnovaRow {
    /// Termo (`A`, `A × B`, `Resíduo`, `Total`).
    pub term: String,
    /// Fatores do termo (vazio no resíduo e no total).
    pub factors: Vec<StableId>,
    /// É o efeito do bloco.
    pub is_block: bool,
    /// Graus de liberdade.
    pub df: u32,
    /// Soma de quadrados.
    pub sum_squares: Stat,
    /// Quadrado médio.
    pub mean_square: Stat,
    /// Estatística `F`.
    pub f_value: Stat,
    /// Valor-p.
    pub p_value: Stat,
}

/// Média marginal de uma célula.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MarginalMean {
    /// Níveis da célula, na ordem dos fatores pedidos.
    pub levels: Vec<String>,
    /// Estimativa.
    pub estimate: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Limite inferior do IC (nível `1 − α`, sem ajuste).
    pub ci_lower: Stat,
    /// Limite superior do IC.
    pub ci_upper: Stat,
}

/// Comparação entre duas células.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MarginalPair {
    /// Índice da primeira célula.
    pub cell_a: u32,
    /// Índice da segunda célula.
    pub cell_b: u32,
    /// Diferença `a − b`.
    pub difference: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Estatística `t`.
    pub t_value: Stat,
    /// Graus de liberdade (do resíduo).
    pub df: u32,
    /// Valor-p sem ajuste.
    pub p_value: Stat,
    /// Valor-p ajustado.
    pub p_adjusted: Stat,
    /// `p_adjusted < α`.
    pub significant: Option<bool>,
}

/// Resultado das médias marginais de um subconjunto de fatores.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MarginalResult {
    /// Fatores.
    pub factors: Vec<StableId>,
    /// Nomes dos fatores.
    pub factor_names: Vec<String>,
    /// Ajuste usado nas comparações.
    pub adjustment: PairwiseAdjustment,
    /// Células.
    pub cells: Vec<MarginalMean>,
    /// Comparações pareadas.
    pub pairs: Vec<MarginalPair>,
    /// Letras (células ordenadas por média decrescente), quando calculáveis.
    pub letters: Option<Letters>,
}

/// Resultado de um contraste.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContrastResult {
    /// Nome.
    pub name: String,
    /// Estimativa `Σ cᵢ·média_i`.
    pub estimate: Stat,
    /// Erro-padrão.
    pub std_error: Stat,
    /// Estatística `t`.
    pub t_value: Stat,
    /// Graus de liberdade.
    pub df: u32,
    /// Valor-p sem ajuste.
    pub p_value: Stat,
    /// Valor-p ajustado por Bonferroni entre os contrastes pedidos.
    pub p_adjusted: Stat,
    /// Limite inferior do IC.
    pub ci_lower: Stat,
    /// Limite superior do IC.
    pub ci_upper: Stat,
}

/// A sum-coded model column; uniqueness is tested for its individual coefficient.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialColumnGeometry {
    /// Factor/level labels in the original model order.
    pub label: String,
    /// Whether this coefficient is uniquely identified, independently of pivot selection.
    pub estimable: bool,
}

/// Independently identifiable dimensions within one term, conditional on all the other terms.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialTermGeometry {
    /// Display name.
    pub term: String,
    /// Stable factor identifiers.
    pub factors: Vec<StableId>,
    /// Nominal sum-contrast dimensions.
    pub nominal_df: u32,
    /// Rank gained after all the other terms; does not assert that the whole effect is identified.
    pub estimable_df: u32,
}

/// Geometry of the actual complete rows, without requiring residual degrees of freedom.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialEstimability {
    /// None: all rows with complete selected factors, regardless of their responses.
    pub response_id: Option<StableId>,
    /// Rows in the dataset.
    pub total_rows: u32,
    /// Complete rows actually represented by this diagnosis.
    pub used_rows: u32,
    /// Number of model parameters, including the intercept.
    pub parameters: u32,
    /// Numerical rank of the sum-coded matrix.
    pub rank: u32,
    /// Complete rows minus rank (geometry only, not an error-variance estimate).
    pub residual_df: u32,
    /// Original parameter order.
    pub columns: Vec<FactorialColumnGeometry>,
    /// Pure-term dimensions, distinct from Type I/II sequential projection tests.
    pub terms: Vec<FactorialTermGeometry>,
    /// Basis vectors N with X N = 0, in the original column order. Each vector has max |N| = 1.
    pub null_relations: Vec<Vec<f64>>,
    /// Method identity of the diagnostic.
    pub provenance: Provenance,
}

/// Explicit model-geometry request, also usable before response collection.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialGeometryRequest {
    /// Conditions/observations to diagnose.
    pub dataset: Dataset,
    /// Model, including its block and interaction order; marginal requests are not evaluated.
    pub setup: FactorialSetup,
    /// Optional response determines complete-response rows; None uses conditions alone.
    pub response_id: Option<StableId>,
}

/// Resultado da análise.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FactorialResult {
    /// Tipo de soma de quadrados usado.
    pub ss_type: SumOfSquaresType,
    /// Nível de significância.
    pub alpha: f64,
    /// Termos do modelo.
    pub terms: Vec<FactorialAnovaRow>,
    /// Resíduo.
    pub residual: FactorialAnovaRow,
    /// Total corrigido.
    pub total: FactorialAnovaRow,
    /// `R²`.
    pub r_squared: Stat,
    /// `R²` ajustado.
    pub adjusted_r_squared: Stat,
    /// Observações usadas.
    pub n: u32,
    /// Médias marginais.
    pub marginals: Vec<MarginalResult>,
    /// Contrastes.
    pub contrasts: Vec<ContrastResult>,
    /// Model geometry captured with this result; absent in historical v1 results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub estimability: Option<FactorialEstimability>,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn invalid(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn stat(value: f64) -> Stat {
    if value.is_finite() {
        Stat::finite(value)
    } else {
        Stat::undefined(UndefinedReason::NonFiniteResult)
    }
}

fn label(value: &FactorValue) -> String {
    match value {
        FactorValue::Text(t) => t.clone(),
        FactorValue::Number(n) => format!("{n}"),
    }
}

/// Fator do modelo: índice no conjunto de dados, nome, níveis.
struct ModelFactor {
    index: usize,
    id: StableId,
    name: String,
    levels: Vec<String>,
    is_block: bool,
}

/// Um termo é um conjunto de posições em `factors` (ordenado).
type Term = Vec<usize>;

struct Setup {
    factors: Vec<ModelFactor>,
    terms: Vec<Term>,
    /// Linhas usadas: nível de cada fator e resposta.
    codes: Vec<Vec<usize>>,
    y: Vec<f64>,
    budget: WorkBudget,
}

fn subsets(n: usize, max_order: usize) -> Vec<Term> {
    let mut out: Vec<Term> = Vec::new();
    for mask in 1_u32..(1 << n) {
        let term: Term = (0..n).filter(|i| mask >> i & 1 == 1).collect();
        if term.len() <= max_order {
            out.push(term);
        }
    }
    out.sort_by(|a, b| a.len().cmp(&b.len()).then_with(|| a.cmp(b)));
    out
}

/// Colunas de contraste de soma zero de um fator com `levels` níveis: `L − 1` colunas.
fn effect_columns(code: usize, levels: usize) -> Vec<f64> {
    (0..levels - 1)
        .map(|c| {
            if code == c {
                1.0
            } else if code == levels - 1 {
                -1.0
            } else {
                0.0
            }
        })
        .collect()
}

/// Colunas de um termo para uma linha de códigos (produto de Kronecker das colunas de cada fator).
fn term_columns(setup_factors: &[ModelFactor], term: &Term, codes: &[usize]) -> Vec<f64> {
    let mut out = vec![1.0];
    for &p in term {
        let cols = effect_columns(codes[p], setup_factors[p].levels.len());
        let mut next = Vec::with_capacity(out.len() * cols.len());
        for a in &out {
            for b in &cols {
                next.push(a * b);
            }
        }
        out = next;
    }
    out
}

fn term_width(factors: &[ModelFactor], term: &Term) -> usize {
    term.iter().fold(1usize, |n, &p| {
        n.saturating_mul(factors[p].levels.len() - 1)
            .min(MAX_COLUMNS + 1)
    })
}

fn design(setup: &Setup, term_indices: &[usize]) -> Option<Matrix> {
    let rows: Vec<Vec<f64>> = setup
        .codes
        .iter()
        .map(|codes| {
            let mut row = vec![1.0];
            for &t in term_indices {
                row.extend(term_columns(&setup.factors, &setup.terms[t], codes));
            }
            row
        })
        .collect();
    Matrix::from_rows(&rows)
}

/// `(soma de quadrados do resíduo, posto)` do modelo com os termos dados.
fn fit_rss(setup: &Setup, term_indices: &[usize]) -> Option<(f64, usize)> {
    let width = 1 + term_indices
        .iter()
        .map(|&t| term_width(&setup.factors, &setup.terms[t]))
        .sum::<usize>();
    if !setup.budget.charge(
        (setup.codes.len() as u64)
            .saturating_mul(width as u64)
            .saturating_mul(width as u64),
    ) {
        return None;
    }
    let x = design(setup, term_indices)?;
    let qr = QrDecomposition::new(&x, default_rank_tolerance(x.rows(), x.cols()));
    let qty = qr.apply_qt(&setup.y);
    let rss: f64 = qty.iter().skip(qr.rank).map(|v| v * v).sum();
    Some((rss, qr.rank))
}

fn term_name(factors: &[ModelFactor], term: &Term) -> String {
    term.iter()
        .map(|&p| factors[p].name.as_str())
        .collect::<Vec<_>>()
        .join(" × ")
}

fn resource_error() -> CoreError {
    CoreError::InvalidInput(vec![
        invalid("anova.resource_limit")
            .with_param("matrixCells", &MAX_MATRIX_CELLS)
            .with_param("pairs", &MAX_PAIRS)
            .with_param("work", &MAX_ALGEBRA_WORK),
    ])
}

fn prepare(
    dataset: &Dataset,
    request: &FactorialSetup,
    response_id: Option<&StableId>,
) -> Result<(Setup, Vec<Issue>), CoreError> {
    let mut issues = validate_dataset(dataset);
    let response = response_id.and_then(|id| dataset.response_index(id));
    if let (Some(id), None) = (response_id, response) {
        issues.push(invalid("request.unknown_response").with_param("id", id));
    }
    if request.factor_ids.is_empty() {
        issues.push(invalid("anova.no_factors"));
    }
    if request.factor_ids.len() + usize::from(request.block_id.is_some()) > MAX_FACTORS {
        issues.push(invalid("anova.too_many_factors").with_param("max", &MAX_FACTORS));
    }
    let mut ids: Vec<(StableId, bool)> = request
        .factor_ids
        .iter()
        .map(|i| (i.clone(), false))
        .collect();
    if let Some(b) = &request.block_id {
        ids.push((b.clone(), true));
    }
    let mut factors: Vec<ModelFactor> = Vec::new();
    for (id, is_block) in &ids {
        match dataset.factor_index(id) {
            Some(index) if !factors.iter().any(|f| f.index == index) => {
                let f = &dataset.factors[index];
                factors.push(ModelFactor {
                    index,
                    id: id.clone(),
                    name: f.name.clone(),
                    levels: f.levels.clone(),
                    is_block: *is_block,
                });
            }
            Some(_) => issues.push(invalid("anova.duplicate_factor").with_param("id", id)),
            None => issues.push(invalid("request.unknown_group_factor").with_param("id", id)),
        }
    }
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }

    // Linhas completas (resposta e todos os fatores presentes) e níveis na ordem de aparição.
    let mut codes: Vec<Vec<usize>> = Vec::new();
    let mut y = Vec::new();
    let mut seen: Vec<Vec<String>> = vec![Vec::new(); factors.len()];
    let mut raw: Vec<(Vec<String>, f64)> = Vec::new();
    for obs in &dataset.observations {
        let value = match response {
            Some(index) => match obs.responses[index] {
                Some(v) => v,
                None => continue,
            },
            None => 0.0, // Geometry uses only factors; this placeholder is never fitted as response data.
        };
        let labels: Option<Vec<String>> = factors
            .iter()
            .map(|f| obs.factors[f.index].as_ref().map(label))
            .collect();
        let Some(labels) = labels else { continue };
        for (i, l) in labels.iter().enumerate() {
            if !seen[i].contains(l) {
                seen[i].push(l.clone());
            }
        }
        raw.push((labels, value));
    }
    for (i, f) in factors.iter_mut().enumerate() {
        if f.levels.is_empty() {
            f.levels.clone_from(&seen[i]);
        }
        if f.levels.len() < 2 {
            return Err(CoreError::InvalidInput(vec![
                invalid("anova.factor_needs_two_levels").with_param("factor", &f.name),
            ]));
        }
    }
    for (labels, value) in raw {
        let row: Option<Vec<usize>> = labels
            .iter()
            .zip(&factors)
            .map(|(l, f)| f.levels.iter().position(|x| x == l))
            .collect();
        if let Some(row) = row {
            codes.push(row);
            y.push(value);
        }
    }

    // Termos: efeitos principais, interações dos tratamentos até a ordem pedida e bloco.
    let treatment: Vec<usize> = factors
        .iter()
        .enumerate()
        .filter(|(_, f)| !f.is_block)
        .map(|(i, _)| i)
        .collect();
    if !(1..=4).contains(&request.interaction_order) {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.invalid_interaction_order",
        )]));
    }
    let max_order = usize::from(request.interaction_order);
    let mut terms: Vec<Term> = subsets(treatment.len(), max_order)
        .into_iter()
        .map(|t| t.into_iter().map(|i| treatment[i]).collect())
        .collect();
    if let Some(block) = factors.iter().position(|f| f.is_block) {
        terms.insert(0, vec![block]);
    }
    let setup = Setup {
        factors,
        terms,
        codes,
        y,
        budget: WorkBudget::new(MAX_ALGEBRA_WORK, "factorial_anova"),
    };
    let width: usize = 1 + setup
        .terms
        .iter()
        .map(|t| term_width(&setup.factors, t))
        .sum::<usize>();
    if width > MAX_COLUMNS {
        return Err(CoreError::InvalidInput(vec![
            invalid("anova.too_many_columns")
                .with_param("columns", &width)
                .with_param("max", &MAX_COLUMNS),
        ]));
    }
    if setup.codes.len().saturating_mul(width) > MAX_MATRIX_CELLS {
        return Err(resource_error());
    }
    Ok((setup, issues))
}

/// Factorizes once for RSS, geometry and all linear functions. A pivot solution is an
/// internal representative only; no individual coefficient is published without a row-space test.
fn factorize(
    setup: &Setup,
    all: &[usize],
) -> Result<(QrDecomposition, Vec<f64>, Vec<f64>), CoreError> {
    let width = 1 + all
        .iter()
        .map(|&t| term_width(&setup.factors, &setup.terms[t]))
        .sum::<usize>();
    if !setup.budget.charge(
        (setup.codes.len() as u64)
            .saturating_mul(width as u64)
            .saturating_mul(width as u64),
    ) {
        return Err(resource_error());
    }
    let x = design(setup, all)
        .ok_or_else(|| CoreError::InvalidInput(vec![invalid("anova.design_failed")]))?;
    let qr = QrDecomposition::new(&x, default_rank_tolerance(x.rows(), x.cols()));
    let qty = qr.apply_qt(&setup.y);
    let scaled = qr.solve_upper(&qty);
    let mut beta = vec![0.0; width];
    for (k, value) in scaled.iter().enumerate() {
        let original = qr.perm[k];
        beta[original] = value / qr.column_norms[original];
    }
    Ok((qr, qty, beta))
}

fn geometry(
    setup: &Setup,
    qr: &QrDecomposition,
    response_id: Option<StableId>,
    total_rows: usize,
) -> Result<FactorialEstimability, CoreError> {
    let width = qr.perm.len();
    if !setup.budget.charge((width as u64).pow(3)) {
        return Err(resource_error());
    }
    let mut labels = vec!["Intercept".to_string()];
    for term in &setup.terms {
        let mut components = vec![String::new()];
        for &p in term {
            let factor = &setup.factors[p];
            components = components
                .iter()
                .flat_map(|base| {
                    factor.levels[..factor.levels.len() - 1]
                        .iter()
                        .map(move |level| {
                            format!(
                                "{base}{}{}[{level}]",
                                if base.is_empty() { "" } else { ":" },
                                factor.name
                            )
                        })
                })
                .collect();
        }
        labels.extend(components);
    }
    let columns = labels
        .into_iter()
        .enumerate()
        .map(|(i, label)| {
            let mut unit = vec![0.0; width];
            unit[i] = 1.0;
            FactorialColumnGeometry {
                label,
                estimable: quadratic_form(qr, &unit).is_some(),
            }
        })
        .collect();
    let mut terms = Vec::new();
    for (i, term) in setup.terms.iter().enumerate() {
        let reduced = (0..setup.terms.len())
            .filter(|&j| j != i)
            .collect::<Vec<_>>();
        let (_, rank) = fit_rss(setup, &reduced).ok_or_else(resource_error)?;
        terms.push(FactorialTermGeometry {
            term: term_name(&setup.factors, term),
            factors: term.iter().map(|&p| setup.factors[p].id.clone()).collect(),
            nominal_df: term_width(&setup.factors, term) as u32,
            estimable_df: qr.rank.saturating_sub(rank) as u32,
        });
    }
    let mut null_relations = Vec::new();
    for k in qr.rank..width {
        let original = qr.perm[k];
        let mut relation = vec![0.0; width];
        relation[original] = 1.0;
        if qr.column_norms[original] > 0.0 {
            let column = (0..qr.rank).map(|i| qr.r[(i, k)]).collect::<Vec<_>>();
            for (j, value) in qr.solve_upper(&column).iter().enumerate() {
                let retained = qr.perm[j];
                relation[retained] = -value * qr.column_norms[original] / qr.column_norms[retained];
            }
        }
        let scale = relation.iter().map(|v| v.abs()).fold(0.0_f64, f64::max);
        relation.iter_mut().for_each(|v| *v /= scale);
        null_relations.push(relation);
    }
    Ok(FactorialEstimability {
        response_id,
        total_rows: total_rows as u32,
        used_rows: setup.codes.len() as u32,
        parameters: width as u32,
        rank: qr.rank as u32,
        residual_df: setup.codes.len().saturating_sub(qr.rank) as u32,
        columns,
        terms,
        null_relations,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

/// Diagnoses the selected sum-coded model without inferring a response or an error variance.
/// # Errors
/// Invalid model/conditions, no complete factor rows, or the resource envelope is exceeded.
pub fn diagnose(request: &FactorialGeometryRequest) -> Result<FactorialEstimability, CoreError> {
    let (setup, _) = prepare(
        &request.dataset,
        &request.setup,
        request.response_id.as_ref(),
    )?;
    let all = (0..setup.terms.len()).collect::<Vec<_>>();
    let (qr, _, _) = factorize(&setup, &all)?;
    geometry(
        &setup,
        &qr,
        request.response_id.clone(),
        request.dataset.observations.len(),
    )
}

fn check_outputs(setup: &Setup, request: &FactorialRequest) -> Result<(), CoreError> {
    let width = 1 + setup
        .terms
        .iter()
        .map(|t| term_width(&setup.factors, t))
        .sum::<usize>();
    let count = |ids: &[StableId]| -> Result<usize, CoreError> {
        if ids.is_empty() {
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.marginal_no_factors",
            )]));
        }
        let mut n = 1usize;
        for (i, id) in ids.iter().enumerate() {
            if ids[..i].contains(id) {
                return Err(CoreError::InvalidInput(vec![
                    invalid("anova.duplicate_factor").with_param("id", id),
                ]));
            }
            let f = setup.factors.iter().find(|f| &f.id == id).ok_or_else(|| {
                CoreError::InvalidInput(vec![
                    invalid("anova.marginal_unknown_factor").with_param("id", id),
                ])
            })?;
            n = n.checked_mul(f.levels.len()).ok_or_else(resource_error)?;
        }
        if n.saturating_mul(width) > MAX_MATRIX_CELLS {
            return Err(resource_error());
        }
        Ok(n)
    };
    let mut pairs = 0usize;
    let mut functions = 0usize;
    for m in &request.marginals {
        let cells = count(&m.factors)?;
        let family = cells.saturating_mul(cells.saturating_sub(1)) / 2;
        pairs = pairs.saturating_add(family);
        functions = functions.saturating_add(cells).saturating_add(family);
    }
    for c in &request.contrasts {
        let cells = count(&c.factors)?;
        if cells != c.coefficients.len() {
            return Err(CoreError::InvalidInput(vec![
                invalid("anova.contrast_length")
                    .with_param("expected", &cells)
                    .with_param("got", &c.coefficients.len()),
            ]));
        }
        let Some((scale, weights)) = normalized_function(&c.coefficients) else {
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.invalid_contrast",
            )]));
        };
        if c.name.trim().is_empty()
            || scale == 0.0
            || weights.iter().sum::<f64>().abs()
                > 1e-10 * weights.iter().map(|v| v.abs()).sum::<f64>()
        {
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.invalid_contrast",
            )]));
        }
        functions = functions.saturating_add(cells).saturating_add(1);
    }
    let work = (functions as u64)
        .saturating_mul(width as u64)
        .saturating_mul(width as u64);
    if pairs > MAX_PAIRS || !setup.budget.charge(work) {
        return Err(resource_error());
    }
    Ok(())
}

/// Analyze a sum-coded categorical model, evaluating each requested linear function separately.
/// # Errors
/// Invalid factors/requests, no complete observations, or the declared resource envelope is exceeded.
pub fn analyze(request: &FactorialRequest) -> Result<FactorialResult, CoreError> {
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        return Err(CoreError::InvalidInput(vec![invalid(
            "comparison.invalid_alpha",
        )]));
    }
    let model = FactorialSetup {
        factor_ids: request.factor_ids.clone(),
        block_id: request.block_id.clone(),
        interaction_order: request.interaction_order,
        ss_type: request.ss_type,
        marginals: request.marginals.clone(),
        contrasts: request.contrasts.clone(),
    };
    let (setup, mut issues) = prepare(&request.dataset, &model, Some(&request.response_id))?;
    check_outputs(&setup, request)?;
    let n = setup.y.len();
    let all: Vec<usize> = (0..setup.terms.len()).collect();
    let (qr, qty, beta) = factorize(&setup, &all)?;
    let rank_full = qr.rank;
    let width = qr.perm.len();
    let rss_full = qty.iter().skip(rank_full).map(|v| v * v).sum::<f64>();
    let estimability = geometry(
        &setup,
        &qr,
        Some(request.response_id.clone()),
        request.dataset.observations.len(),
    )?;
    if n == 0 {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.design_failed",
        )]));
    };
    if n == rank_full {
        issues.push(Issue::new("anova.no_residual_df", Severity::Warning));
    }
    if rank_full < width {
        issues.push(Issue::new("anova.empty_cells", Severity::Warning));
    }
    let df_res = n - rank_full;
    let mse = if df_res > 0 {
        rss_full / df_res as f64
    } else {
        f64::NAN
    };
    let mean_y = setup.y.iter().sum::<f64>() / n as f64;
    let ss_total: f64 = setup.y.iter().map(|v| (v - mean_y).powi(2)).sum();

    // Tabela.
    let mut rows = Vec::with_capacity(setup.terms.len());
    for (t, term) in setup.terms.iter().enumerate() {
        let contains = |u: &Term| term.iter().all(|p| u.contains(p));
        let (reduced, full): (Vec<usize>, Vec<usize>) = match request.ss_type {
            SumOfSquaresType::TypeI => ((0..t).collect(), (0..=t).collect()),
            SumOfSquaresType::TypeII => {
                let r: Vec<usize> = all
                    .iter()
                    .copied()
                    .filter(|&u| !contains(&setup.terms[u]))
                    .collect();
                let mut f = r.clone();
                f.push(t);
                (r, f)
            }
            SumOfSquaresType::TypeIII => (
                all.iter().copied().filter(|&u| u != t).collect(),
                all.clone(),
            ),
        };
        let (Some((rss_r, rank_r)), Some((rss_f, rank_f))) =
            (fit_rss(&setup, &reduced), fit_rss(&setup, &full))
        else {
            return Err(resource_error());
        };
        let df = rank_f.saturating_sub(rank_r);
        let ss = if df > 0 {
            (rss_r - rss_f).max(0.0)
        } else {
            f64::NAN
        };
        let (ms, fv, p) = if df > 0 && df_res > 0 {
            let ms = ss / df as f64;
            let fv = ms / mse;
            (ms, fv, f::sf(fv, df as f64, df_res as f64))
        } else {
            (f64::NAN, f64::NAN, f64::NAN)
        };
        rows.push(FactorialAnovaRow {
            term: term_name(&setup.factors, term),
            factors: term.iter().map(|&p| setup.factors[p].id.clone()).collect(),
            is_block: term.len() == 1 && setup.factors[term[0]].is_block,
            df: u32::try_from(df).unwrap_or(u32::MAX),
            sum_squares: if df == 0 {
                Stat::undefined(UndefinedReason::NotEstimable)
            } else {
                stat(ss)
            },
            mean_square: function_stat(ms, df > 0, df_res, true),
            f_value: function_stat(fv, df > 0, df_res, true),
            p_value: function_stat(p, df > 0, df_res, true),
        });
    }
    let blank = |term: &str, df: usize, ss: f64, ms: f64| FactorialAnovaRow {
        term: term.to_string(),
        factors: Vec::new(),
        is_block: false,
        df: u32::try_from(df).unwrap_or(u32::MAX),
        sum_squares: stat(ss),
        mean_square: stat(ms),
        f_value: Stat::undefined(UndefinedReason::NotEstimable),
        p_value: Stat::undefined(UndefinedReason::NotEstimable),
    };
    let r2 = if ss_total > 0.0 {
        1.0 - rss_full / ss_total
    } else {
        f64::NAN
    };
    let adj = if ss_total > 0.0 {
        1.0 - (rss_full / df_res as f64) / (ss_total / (n - 1) as f64)
    } else {
        f64::NAN
    };

    // A function may be estimable even when its component marginal means are not.
    let mut marginals = Vec::new();
    let mut contrasts = Vec::new();
    if !(request.marginals.is_empty() && request.contrasts.is_empty()) {
        for m in &request.marginals {
            marginals.push(marginal(
                &setup,
                &all,
                &qr,
                &beta,
                mse,
                df_res,
                request.alpha,
                &m.factors,
                m.adjustment,
            )?);
        }
        let mut raw_p = Vec::new();
        for c in &request.contrasts {
            let cells = cell_vectors(&setup, &all, &c.factors)?;
            if cells.rows.len() != c.coefficients.len() {
                return Err(CoreError::InvalidInput(vec![
                    invalid("anova.contrast_length")
                        .with_param("expected", &cells.rows.len())
                        .with_param("got", &c.coefficients.len()),
                ]));
            }
            let l = combine(&cells.rows, &c.coefficients);
            let (est, se, estimable) = estimate(&l, &qr, &beta, mse);
            let t = est / se;
            let p = if t.is_nan() || df_res == 0 {
                f64::NAN
            } else {
                2.0 * student_t::sf(t.abs(), df_res as f64)
            };
            raw_p.push(p);
            let half = student_t::quantile_upper(request.alpha / 2.0, df_res as f64)
                .map_or(f64::NAN, |q| q * se);
            contrasts.push(ContrastResult {
                name: c.name.clone(),
                estimate: function_stat(est, estimable, df_res, false),
                std_error: function_stat(se, estimable, df_res, true),
                t_value: function_stat(t, estimable, df_res, true),
                df: u32::try_from(df_res).unwrap_or(u32::MAX),
                p_value: function_stat(p, estimable, df_res, true),
                p_adjusted: Stat::undefined(UndefinedReason::NotEstimable),
                ci_lower: function_stat(est - half, estimable, df_res, true),
                ci_upper: function_stat(est + half, estimable, df_res, true),
            });
        }
        let adjusted = adjust_p(&raw_p, Adjustment::Bonferroni);
        for (c, a) in contrasts.iter_mut().zip(adjusted) {
            c.p_adjusted = if c.p_value.value().is_none() {
                c.p_value
            } else {
                stat(a)
            };
        }
    }

    Ok(FactorialResult {
        ss_type: request.ss_type,
        alpha: request.alpha,
        terms: rows,
        residual: FactorialAnovaRow {
            mean_square: function_stat(mse, true, df_res, true),
            ..blank("Resíduo", df_res, rss_full, mse)
        },
        total: blank("Total", n - 1, ss_total, ss_total / (n - 1) as f64),
        r_squared: stat(r2),
        adjusted_r_squared: stat(adj),
        n: u32::try_from(n).unwrap_or(u32::MAX),
        estimability: Some(estimability),
        marginals,
        contrasts,
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

struct Cells {
    /// Posições (em `setup.factors`) dos fatores que definem as células.
    positions: Vec<usize>,
    /// Combinações de níveis de cada célula.
    combos: Vec<Vec<usize>>,
    /// Linha `L` (média das predições sobre os demais fatores) de cada célula.
    rows: Vec<Vec<f64>>,
}

fn cell_vectors(setup: &Setup, all: &[usize], ids: &[StableId]) -> Result<Cells, CoreError> {
    let mut positions = Vec::new();
    for id in ids {
        let Some(p) = setup.factors.iter().position(|f| &f.id == id) else {
            return Err(CoreError::InvalidInput(vec![
                invalid("anova.marginal_unknown_factor").with_param("id", id),
            ]));
        };
        positions.push(p);
    }
    if positions.is_empty() {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.marginal_no_factors",
        )]));
    }
    if positions
        .iter()
        .enumerate()
        .any(|(i, p)| positions[..i].contains(p))
    {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.duplicate_factor",
        )]));
    }
    let count = positions
        .iter()
        .try_fold(1usize, |n, &p| n.checked_mul(setup.factors[p].levels.len()))
        .ok_or_else(resource_error)?;
    let width = 1 + all
        .iter()
        .map(|&t| term_width(&setup.factors, &setup.terms[t]))
        .sum::<usize>();
    if count.saturating_mul(width) > MAX_MATRIX_CELLS {
        return Err(resource_error());
    }
    let combos_of = |ps: &[usize]| -> Vec<Vec<usize>> {
        let mut out: Vec<Vec<usize>> = vec![Vec::new()];
        for &p in ps {
            let mut next = Vec::new();
            for base in &out {
                for l in 0..setup.factors[p].levels.len() {
                    let mut v = base.clone();
                    v.push(l);
                    next.push(v);
                }
            }
            out = next;
        }
        out
    };
    let combos = combos_of(&positions);
    let mut rows = Vec::with_capacity(combos.len());
    for combo in &combos {
        let mut codes = vec![0; setup.factors.len()];
        for (&p, &l) in positions.iter().zip(combo) {
            codes[p] = l;
        }
        let mut row = vec![1.0];
        // Uniform averaging factorizes. Every sum-coded contrast of an averaged factor
        // has expectation zero, so every term containing that factor vanishes exactly.
        for &t in all {
            let term = &setup.terms[t];
            if term.iter().all(|p| positions.contains(p)) {
                row.extend(term_columns(&setup.factors, term, &codes));
            } else {
                row.resize(row.len() + term_width(&setup.factors, term), 0.0);
            }
        }
        rows.push(row);
    }
    Ok(Cells {
        positions,
        combos,
        rows,
    })
}

fn combine(rows: &[Vec<f64>], weights: &[f64]) -> Vec<f64> {
    let mut out = vec![0.0; rows.first().map_or(0, Vec::len)];
    for (row, w) in rows.iter().zip(weights) {
        for (o, v) in out.iter_mut().zip(row) {
            *o += w * v;
        }
    }
    out
}

fn function_stat(value: f64, estimable: bool, df_res: usize, inference: bool) -> Stat {
    if !estimable {
        Stat::undefined(UndefinedReason::NotEstimable)
    } else if inference && df_res == 0 {
        Stat::undefined(UndefinedReason::NoResidualDegreesOfFreedom)
    } else {
        stat(value)
    }
}

fn normalized_function(l: &[f64]) -> Option<(f64, Vec<f64>)> {
    if l.iter().any(|v| !v.is_finite()) {
        return None;
    }
    let scale = l.iter().map(|v| v.abs()).fold(0.0_f64, f64::max);
    Some((
        scale,
        if scale == 0.0 {
            l.to_vec()
        } else {
            l.iter().map(|v| v / scale).collect()
        },
    ))
}

fn estimate(l: &[f64], qr: &QrDecomposition, beta: &[f64], mse: f64) -> (f64, f64, bool) {
    let Some((scale, normalized)) = normalized_function(l) else {
        return (f64::NAN, f64::NAN, false);
    };
    let Some(q) = quadratic_form(qr, &normalized) else {
        return (f64::NAN, f64::NAN, false);
    };
    let est = scale * normalized.iter().zip(beta).map(|(a, b)| a * b).sum::<f64>();
    (est, scale * (mse * q).sqrt(), true)
}

#[allow(clippy::too_many_arguments)]
fn marginal(
    setup: &Setup,
    all: &[usize],
    qr: &QrDecomposition,
    beta: &[f64],
    mse: f64,
    df_res: usize,
    alpha: f64,
    ids: &[StableId],
    adjustment: PairwiseAdjustment,
) -> Result<MarginalResult, CoreError> {
    let cells = cell_vectors(setup, all, ids)?;
    let df = df_res as f64;
    let half = student_t::quantile_upper(alpha / 2.0, df).unwrap_or(f64::NAN);
    let means: Vec<(f64, f64, bool)> = cells
        .rows
        .iter()
        .map(|l| estimate(l, qr, beta, mse))
        .collect();
    let cell_rows: Vec<MarginalMean> = cells
        .combos
        .iter()
        .zip(&means)
        .map(|(combo, &(est, se, estimable))| MarginalMean {
            levels: cells
                .positions
                .iter()
                .zip(combo)
                .map(|(&p, &l)| setup.factors[p].levels[l].clone())
                .collect(),
            estimate: function_stat(est, estimable, df_res, false),
            std_error: function_stat(se, estimable, df_res, true),
            ci_lower: function_stat(est - half * se, estimable, df_res, true),
            ci_upper: function_stat(est + half * se, estimable, df_res, true),
        })
        .collect();
    let k = cells.rows.len();
    let mut idx = Vec::new();
    for a in 0..k {
        for b in (a + 1)..k {
            idx.push((a, b));
        }
    }
    let mut raw = Vec::with_capacity(idx.len());
    let mut stats_rows = Vec::with_capacity(idx.len());
    for &(a, b) in &idx {
        let diff_row = combine(
            &[cells.rows[a].clone(), cells.rows[b].clone()],
            &[1.0, -1.0],
        );
        let (diff, se, estimable) = estimate(&diff_row, qr, beta, mse);
        let t = diff / se;
        raw.push(if t.is_nan() || df_res == 0 {
            f64::NAN
        } else {
            2.0 * student_t::sf(t.abs(), df)
        });
        stats_rows.push((diff, se, t, estimable));
    }
    let adjusted: Vec<f64> = match adjustment {
        PairwiseAdjustment::None => raw.clone(),
        PairwiseAdjustment::Bonferroni => adjust_p(&raw, Adjustment::Bonferroni),
        PairwiseAdjustment::Holm => adjust_p(&raw, Adjustment::Holm),
        PairwiseAdjustment::Tukey => {
            let kernel = StudentizedRange::tabulated(k.max(2), df).ok();
            stats_rows
                .iter()
                .map(|&(_, _, t, _)| {
                    if t.is_nan() || df_res == 0 {
                        return f64::NAN;
                    }
                    kernel
                        .as_ref()
                        .map_or(f64::NAN, |d| d.sf(t.abs() * std::f64::consts::SQRT_2))
                })
                .collect()
        }
    };
    let pairs: Vec<MarginalPair> = idx
        .iter()
        .zip(&stats_rows)
        .zip(raw.iter().zip(&adjusted))
        .map(
            |((&(a, b), &(diff, se, t, estimable)), (&p, &pa))| MarginalPair {
                cell_a: u32::try_from(a).unwrap_or(u32::MAX),
                cell_b: u32::try_from(b).unwrap_or(u32::MAX),
                difference: function_stat(diff, estimable, df_res, false),
                std_error: function_stat(se, estimable, df_res, true),
                t_value: function_stat(t, estimable, df_res, true),
                df: u32::try_from(df_res).unwrap_or(u32::MAX),
                p_value: function_stat(p, estimable, df_res, true),
                p_adjusted: function_stat(pa, estimable, df_res, true),
                significant: pa.is_finite().then_some(pa < alpha),
            },
        )
        .collect();
    let letters = if means.iter().any(|(est, _, _)| !est.is_finite())
        || pairs.iter().any(|p| p.significant.is_none())
    {
        None
    } else {
        let mut relation = vec![vec![Relation::Unknown; k]; k];
        for p in &pairs {
            let r = match p.significant {
                Some(true) => Relation::Different,
                Some(false) => Relation::NotDifferent,
                None => Relation::Unknown,
            };
            relation[p.cell_a as usize][p.cell_b as usize] = r;
            relation[p.cell_b as usize][p.cell_a as usize] = r;
        }
        let mut order: Vec<usize> = (0..k).collect();
        order.sort_by(|&a, &b| means[b].0.total_cmp(&means[a].0));
        letters::compute(k, &order, |i, j| relation[i][j])
    };
    Ok(MarginalResult {
        factors: ids.to_vec(),
        factor_names: cells
            .positions
            .iter()
            .map(|&p| setup.factors[p].name.clone())
            .collect(),
        adjustment,
        cells: cell_rows,
        pairs,
        letters,
    })
}
