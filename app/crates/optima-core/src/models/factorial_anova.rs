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
pub const METHOD_VERSION: u32 = 1;
/// Número máximo de fatores no modelo.
pub const MAX_FACTORS: usize = 6;
/// Número máximo de colunas do modelo.
pub const MAX_COLUMNS: usize = 400;

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
pub struct AnovaRow {
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
    pub terms: Vec<AnovaRow>,
    /// Resíduo.
    pub residual: AnovaRow,
    /// Total corrigido.
    pub total: AnovaRow,
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
    term.iter().map(|&p| factors[p].levels.len() - 1).product()
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

/// Inversa de `XᵀX` (Cholesky) e coeficientes `β`; `None` se `X` não tem posto completo.
fn normal_equations(x: &Matrix, y: &[f64]) -> Option<(Matrix, Vec<f64>)> {
    let p = x.cols();
    let xt = x.transpose();
    let xtx = xt.mul(x)?;
    // Cholesky.
    let mut l = Matrix::zeros(p, p);
    for i in 0..p {
        for j in 0..=i {
            let mut s = xtx[(i, j)];
            for k in 0..j {
                s -= l[(i, k)] * l[(j, k)];
            }
            if i == j {
                if s <= 1e-12 * xtx[(i, i)].abs().max(1.0) {
                    return None;
                }
                l[(i, i)] = s.sqrt();
            } else {
                l[(i, j)] = s / l[(j, j)];
            }
        }
    }
    let mut inverse = Matrix::zeros(p, p);
    for col in 0..p {
        // Resolve L z = e_col e Lᵀ x = z.
        let mut z = vec![0.0; p];
        for i in 0..p {
            let mut s = if i == col { 1.0 } else { 0.0 };
            for k in 0..i {
                s -= l[(i, k)] * z[k];
            }
            z[i] = s / l[(i, i)];
        }
        for i in (0..p).rev() {
            let mut s = z[i];
            for k in (i + 1)..p {
                s -= l[(k, i)] * inverse[(k, col)];
            }
            inverse[(i, col)] = s / l[(i, i)];
        }
    }
    let xty = xt.mul_vec(y)?;
    let beta = inverse.mul_vec(&xty)?;
    Some((inverse, beta))
}

/// Executa a análise.
///
/// # Errors
/// [`CoreError::InvalidInput`] para fatores inválidos, modelo sem graus de liberdade do erro ou
/// matriz de delineamento sem posto completo (células vazias).
pub fn analyze(request: &FactorialRequest) -> Result<FactorialResult, CoreError> {
    let dataset = &request.dataset;
    let mut issues = validate_dataset(dataset);
    let response = dataset.response_index(&request.response_id);
    if response.is_none() {
        issues.push(invalid("request.unknown_response").with_param("id", &request.response_id));
    }
    if !(request.alpha > 0.0 && request.alpha < 1.0) {
        issues.push(invalid("comparison.invalid_alpha"));
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
    let Some(response) = response else {
        return Err(CoreError::InvalidInput(issues));
    };
    if issues.iter().any(Issue::is_blocking) {
        return Err(CoreError::InvalidInput(issues));
    }

    // Linhas completas (resposta e todos os fatores presentes) e níveis na ordem de aparição.
    let mut codes: Vec<Vec<usize>> = Vec::new();
    let mut y = Vec::new();
    let mut seen: Vec<Vec<String>> = vec![Vec::new(); factors.len()];
    let mut raw: Vec<(Vec<String>, f64)> = Vec::new();
    for obs in &dataset.observations {
        let Some(value) = obs.responses[response] else {
            continue;
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
    let n = y.len();

    // Termos: efeitos principais, interações dos tratamentos até a ordem pedida e bloco.
    let treatment: Vec<usize> = factors
        .iter()
        .enumerate()
        .filter(|(_, f)| !f.is_block)
        .map(|(i, _)| i)
        .collect();
    let max_order = usize::from(request.interaction_order.clamp(1, 4));
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
    let all: Vec<usize> = (0..setup.terms.len()).collect();
    let Some((rss_full, rank_full)) = fit_rss(&setup, &all) else {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.design_failed",
        )]));
    };
    if n <= rank_full {
        return Err(CoreError::InvalidInput(vec![invalid(
            "anova.no_residual_df",
        )]));
    }
    if rank_full < width {
        issues.push(Issue::new("anova.empty_cells", Severity::Warning));
    }
    let df_res = n - rank_full;
    let mse = rss_full / df_res as f64;
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
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.design_failed",
            )]));
        };
        let df = rank_f.saturating_sub(rank_r);
        let ss = (rss_r - rss_f).max(0.0);
        let (ms, fv, p) = if df > 0 {
            let ms = ss / df as f64;
            let fv = ms / mse;
            (ms, fv, f::sf(fv, df as f64, df_res as f64))
        } else {
            (f64::NAN, f64::NAN, f64::NAN)
        };
        rows.push(AnovaRow {
            term: term_name(&setup.factors, term),
            factors: term.iter().map(|&p| setup.factors[p].id.clone()).collect(),
            is_block: term.len() == 1 && setup.factors[term[0]].is_block,
            df: u32::try_from(df).unwrap_or(u32::MAX),
            sum_squares: stat(ss),
            mean_square: stat(ms),
            f_value: stat(fv),
            p_value: stat(p),
        });
    }
    let blank = |term: &str, df: usize, ss: f64, ms: f64| AnovaRow {
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

    // Médias marginais e contrastes (modelo completo, posto completo).
    let mut marginals = Vec::new();
    let mut contrasts = Vec::new();
    if !(request.marginals.is_empty() && request.contrasts.is_empty()) {
        let Some(x) = design(&setup, &all) else {
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.design_failed",
            )]));
        };
        let Some((inverse, beta)) = normal_equations(&x, &setup.y) else {
            return Err(CoreError::InvalidInput(vec![invalid(
                "anova.cells_not_estimable",
            )]));
        };
        for m in &request.marginals {
            marginals.push(marginal(
                &setup,
                &all,
                &inverse,
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
            let (est, se) = estimate(&l, &inverse, &beta, mse);
            let t = est / se;
            let p = 2.0 * student_t::sf(t.abs(), df_res as f64);
            raw_p.push(p);
            let half = student_t::quantile_upper(request.alpha / 2.0, df_res as f64)
                .map_or(f64::NAN, |q| q * se);
            contrasts.push(ContrastResult {
                name: c.name.clone(),
                estimate: stat(est),
                std_error: stat(se),
                t_value: stat(t),
                df: u32::try_from(df_res).unwrap_or(u32::MAX),
                p_value: stat(p),
                p_adjusted: Stat::undefined(UndefinedReason::NotEstimable),
                ci_lower: stat(est - half),
                ci_upper: stat(est + half),
            });
        }
        let adjusted = adjust_p(&raw_p, Adjustment::Bonferroni);
        for (c, a) in contrasts.iter_mut().zip(adjusted) {
            c.p_adjusted = stat(a);
        }
    }

    Ok(FactorialResult {
        ss_type: request.ss_type,
        alpha: request.alpha,
        terms: rows,
        residual: blank("Resíduo", df_res, rss_full, mse),
        total: blank("Total", n - 1, ss_total, ss_total / (n - 1) as f64),
        r_squared: stat(r2),
        adjusted_r_squared: stat(adj),
        n: u32::try_from(n).unwrap_or(u32::MAX),
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
    let others: Vec<usize> = (0..setup.factors.len())
        .filter(|p| !positions.contains(p))
        .collect();
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
    let other_combos = combos_of(&others);
    let mut rows = Vec::with_capacity(combos.len());
    for combo in &combos {
        let mut acc: Option<Vec<f64>> = None;
        for oc in &other_combos {
            let mut codes = vec![0; setup.factors.len()];
            for (&p, &l) in positions.iter().zip(combo) {
                codes[p] = l;
            }
            for (&p, &l) in others.iter().zip(oc) {
                codes[p] = l;
            }
            let mut row = vec![1.0];
            for &t in all {
                row.extend(term_columns(&setup.factors, &setup.terms[t], &codes));
            }
            match &mut acc {
                None => acc = Some(row),
                Some(a) => a.iter_mut().zip(&row).for_each(|(x, y)| *x += y),
            }
        }
        let count = other_combos.len() as f64;
        rows.push(
            acc.unwrap_or_default()
                .into_iter()
                .map(|v| v / count)
                .collect(),
        );
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

fn estimate(l: &[f64], inverse: &Matrix, beta: &[f64], mse: f64) -> (f64, f64) {
    let est: f64 = l.iter().zip(beta).map(|(a, b)| a * b).sum();
    let p = l.len();
    let mut var = 0.0;
    for i in 0..p {
        for j in 0..p {
            var += l[i] * inverse[(i, j)] * l[j];
        }
    }
    (est, (mse * var).sqrt())
}

#[allow(clippy::too_many_arguments)]
fn marginal(
    setup: &Setup,
    all: &[usize],
    inverse: &Matrix,
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
    let means: Vec<(f64, f64)> = cells
        .rows
        .iter()
        .map(|l| estimate(l, inverse, beta, mse))
        .collect();
    let cell_rows: Vec<MarginalMean> = cells
        .combos
        .iter()
        .zip(&means)
        .map(|(combo, &(est, se))| MarginalMean {
            levels: cells
                .positions
                .iter()
                .zip(combo)
                .map(|(&p, &l)| setup.factors[p].levels[l].clone())
                .collect(),
            estimate: stat(est),
            std_error: stat(se),
            ci_lower: stat(est - half * se),
            ci_upper: stat(est + half * se),
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
        let (diff, se) = estimate(&diff_row, inverse, beta, mse);
        let t = diff / se;
        raw.push(2.0 * student_t::sf(t.abs(), df));
        stats_rows.push((diff, se, t));
    }
    let adjusted: Vec<f64> = match adjustment {
        PairwiseAdjustment::None => raw.clone(),
        PairwiseAdjustment::Bonferroni => adjust_p(&raw, Adjustment::Bonferroni),
        PairwiseAdjustment::Holm => adjust_p(&raw, Adjustment::Holm),
        PairwiseAdjustment::Tukey => {
            let kernel = StudentizedRange::tabulated(k.max(2), df).ok();
            stats_rows
                .iter()
                .map(|&(_, _, t)| {
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
        .map(|((&(a, b), &(diff, se, t)), (&p, &pa))| MarginalPair {
            cell_a: u32::try_from(a).unwrap_or(u32::MAX),
            cell_b: u32::try_from(b).unwrap_or(u32::MAX),
            difference: stat(diff),
            std_error: stat(se),
            t_value: stat(t),
            df: u32::try_from(df_res).unwrap_or(u32::MAX),
            p_value: stat(p),
            p_adjusted: stat(pa),
            significant: pa.is_finite().then_some(pa < alpha),
        })
        .collect();
    let letters = {
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
