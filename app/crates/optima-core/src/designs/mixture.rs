//! Planejamentos de **misturas**: simplex-lattice `{q, m}` e simplex-centroide, com limites
//! inferiores nos componentes (pseudocomponentes), repetições, pontos centrais extras e ordem de
//! execução aleatorizada com semente registrada.
//!
//! Os componentes somam 1. Com limites inferiores `Lᵢ` (`ΣLᵢ < 1`), a região viável é um simplex
//! menor; o planejamento é gerado em **pseudocomponentes** `x′ᵢ = (xᵢ − Lᵢ) / (1 − ΣL)` e convertido
//! em proporções reais `xᵢ = Lᵢ + (1 − ΣL)·x′ᵢ`. Limites superiores (região que não é um simplex)
//! não fazem parte desta versão.
//!
//! **Ordem padrão.** Lattice `{q, m}`: vetores inteiros `a` (soma `m`) em ordem lexicográfica
//! crescente (o primeiro componente varia mais devagar), pseudocomponentes `a / m`. Centroide:
//! subconjuntos não vazios por tamanho crescente e, dentro do tamanho, em ordem lexicográfica dos
//! índices, com pseudocomponentes `1/k` nos componentes do subconjunto. Cada repetição repete todos
//! os pontos; os pontos centrais extras vêm por último. A execução é uma permutação da ordem
//! padrão (PCG32 e Fisher–Yates de [`super::randomization`]).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::randomization::{ALGORITHM, permutation};
use super::spec::MAX_RUNS;
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::provenance::Provenance;
use crate::validation::{Issue, Severity};

/// Identificador do método no registro.
pub const METHOD_ID: &str = "mixture_design";
/// Versão do método.
pub const METHOD_VERSION: u32 = 1;
/// Número máximo de componentes.
pub const MAX_COMPONENTS: usize = 8;
/// Grau máximo do lattice.
pub const MAX_DEGREE: u32 = 6;
/// Máximo de pontos centrais extras.
pub const MAX_CENTER_POINTS: u32 = 100;

/// Componente da mistura.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureComponent {
    /// Identificador do fator no experimento.
    pub id: StableId,
    /// Nome do componente.
    pub name: String,
    /// Limite inferior da proporção (0 ≤ L < 1).
    pub lower: f64,
}

/// Tipo de planejamento de misturas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum MixtureKind {
    /// Simplex-lattice `{q, m}` de grau `m`.
    #[serde(rename_all = "camelCase")]
    Lattice {
        /// Grau `m` (1 a 6).
        degree: u32,
    },
    /// Simplex-centroide: todos os subconjuntos de componentes em partes iguais.
    Centroid,
}

/// Especificação do planejamento de misturas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureSpec {
    /// Componentes (2 a 8).
    pub components: Vec<MixtureComponent>,
    /// Tipo de planejamento.
    pub kind: MixtureKind,
    /// Repetições de todos os pontos (≥ 1).
    pub replicates: u32,
    /// Pontos centrais extras (centroide geral), além dos do planejamento.
    pub center_points: u32,
    /// Aleatorizar a ordem de execução.
    pub randomize: bool,
    /// Semente da aleatorização; inteiro de até 2⁵³ − 1 na interface.
    #[ts(type = "number")]
    pub seed: u64,
}

/// Um ensaio.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MixtureRun {
    /// Posição de execução (1-based).
    pub run: u32,
    /// Posição na ordem padrão (1-based).
    pub standard_order: u32,
    /// Quantidade de componentes presentes (> 0) no ponto: 1 = vértice, 2 = aresta…
    pub support: u32,
    /// Ponto central extra.
    pub extra_center: bool,
    /// Pseudocomponentes (somam 1).
    pub pseudo: Vec<f64>,
    /// Proporções reais (somam 1).
    pub proportions: Vec<f64>,
    /// Repetição (1-based; nos centrais extras, o número do ponto).
    pub replicate: u32,
}

/// Planejamento gerado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct GeneratedMixture {
    /// Especificação usada.
    pub spec: MixtureSpec,
    /// Pontos distintos do planejamento (sem repetições nem centrais extras).
    pub base_points: u32,
    /// Total de ensaios.
    pub total: u32,
    /// Ensaios na ordem de execução.
    pub runs: Vec<MixtureRun>,
    /// Algoritmo de aleatorização (ou a ordem padrão).
    pub randomization_algorithm: String,
    /// Avisos.
    pub issues: Vec<Issue>,
    /// Proveniência.
    pub provenance: Provenance,
}

fn error(code: &str) -> Issue {
    Issue::new(code, Severity::Error)
}

fn validate(spec: &MixtureSpec) -> Vec<Issue> {
    let mut issues = Vec::new();
    let q = spec.components.len();
    if q < 2 {
        issues.push(error("design.mixture_too_few_components").with_param("count", &q));
    }
    if q > MAX_COMPONENTS {
        issues.push(
            error("design.mixture_too_many_components")
                .with_param("count", &q)
                .with_param("max", &MAX_COMPONENTS),
        );
    }
    let mut names: Vec<&str> = spec.components.iter().map(|c| c.name.trim()).collect();
    if names.iter().any(|n| n.is_empty()) {
        issues.push(error("design.mixture_empty_component_name"));
    }
    names.sort_unstable();
    if let Some(dup) = names.windows(2).find(|w| w[0] == w[1] && !w[0].is_empty()) {
        issues.push(error("design.mixture_duplicate_component").with_param("component", &dup[0]));
    }
    if spec
        .components
        .iter()
        .any(|c| !c.lower.is_finite() || c.lower < 0.0 || c.lower >= 1.0)
    {
        issues.push(error("design.mixture_invalid_lower_bound"));
    } else if spec.components.iter().map(|c| c.lower).sum::<f64>() >= 1.0 - 1e-9 {
        issues.push(error("design.mixture_lower_bounds_sum"));
    }
    if let MixtureKind::Lattice { degree } = &spec.kind
        && !(1..=MAX_DEGREE).contains(degree)
    {
        issues.push(
            error("design.mixture_invalid_degree")
                .with_param("degree", degree)
                .with_param("max", &MAX_DEGREE),
        );
    }
    if spec.replicates == 0 {
        issues.push(error("design.invalid_replicates"));
    }
    if spec.center_points > MAX_CENTER_POINTS {
        issues.push(
            error("design.mixture_too_many_center_points").with_param("max", &MAX_CENTER_POINTS),
        );
    }
    issues
}

/// Vetores inteiros de `q` partes com soma `m`, em ordem lexicográfica crescente.
fn compositions(q: usize, m: u32) -> Vec<Vec<u32>> {
    fn fill(prefix: &mut Vec<u32>, remaining: u32, parts_left: usize, out: &mut Vec<Vec<u32>>) {
        if parts_left == 1 {
            prefix.push(remaining);
            out.push(prefix.clone());
            prefix.pop();
            return;
        }
        for value in 0..=remaining {
            prefix.push(value);
            fill(prefix, remaining - value, parts_left - 1, out);
            prefix.pop();
        }
    }
    let mut out = Vec::new();
    fill(&mut Vec::with_capacity(q), m, q, &mut out);
    out
}

/// Subconjuntos não vazios de `0..q` por tamanho crescente e, dentro do tamanho, lexicográficos.
fn subsets(q: usize) -> Vec<Vec<usize>> {
    fn choose(start: usize, q: usize, k: usize, cur: &mut Vec<usize>, out: &mut Vec<Vec<usize>>) {
        if cur.len() == k {
            out.push(cur.clone());
            return;
        }
        for i in start..q {
            cur.push(i);
            choose(i + 1, q, k, cur, out);
            cur.pop();
        }
    }
    let mut out = Vec::new();
    for k in 1..=q {
        choose(0, q, k, &mut Vec::new(), &mut out);
    }
    out
}

/// Pontos do planejamento em pseudocomponentes, na ordem padrão.
fn base_pseudo(spec: &MixtureSpec) -> Vec<Vec<f64>> {
    let q = spec.components.len();
    match &spec.kind {
        MixtureKind::Lattice { degree } => compositions(q, *degree)
            .into_iter()
            .map(|a| {
                a.iter()
                    .map(|&v| f64::from(v) / f64::from(*degree))
                    .collect()
            })
            .collect(),
        MixtureKind::Centroid => subsets(q)
            .into_iter()
            .map(|set| {
                let share = 1.0 / set.len() as f64;
                (0..q)
                    .map(|i| if set.contains(&i) { share } else { 0.0 })
                    .collect()
            })
            .collect(),
    }
}

fn base_count(spec: &MixtureSpec) -> u64 {
    let q = spec.components.len() as u64;
    match &spec.kind {
        MixtureKind::Lattice { degree } => {
            // C(m + q − 1, q − 1)
            let (n, k) = (u64::from(*degree) + q - 1, q - 1);
            (1..=k).fold(1_u64, |acc, i| acc * (n - k + i) / i)
        }
        MixtureKind::Centroid => (1_u64 << q.min(62)) - 1,
    }
}

/// Total de ensaios, sem gerar o planejamento: `(pontos distintos, total)`.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou acima de [`MAX_RUNS`].
pub fn count_runs(spec: &MixtureSpec) -> Result<(u32, u32), CoreError> {
    let issues = validate(spec);
    if !issues.is_empty() {
        return Err(CoreError::InvalidInput(issues));
    }
    let base = base_count(spec);
    let total = base * u64::from(spec.replicates) + u64::from(spec.center_points);
    if total > u64::from(MAX_RUNS) {
        return Err(CoreError::InvalidInput(vec![
            error("design.too_many_runs")
                .with_param("runs", &total)
                .with_param("max", &MAX_RUNS),
        ]));
    }
    Ok((
        u32::try_from(base).unwrap_or(u32::MAX),
        u32::try_from(total).unwrap_or(u32::MAX),
    ))
}

/// Gera o planejamento de misturas.
///
/// # Errors
/// [`CoreError::InvalidInput`] para especificações inválidas ou grandes demais.
pub fn generate(spec: &MixtureSpec) -> Result<GeneratedMixture, CoreError> {
    let (base_points, total) = count_runs(spec)?;
    let q = spec.components.len();
    let lowers: Vec<f64> = spec.components.iter().map(|c| c.lower).collect();
    let scale = 1.0 - lowers.iter().sum::<f64>();
    let base = base_pseudo(spec);
    // Ordem padrão: repetição 1 com todos os pontos, …; centrais extras por último.
    let mut standard: Vec<(Vec<f64>, u32, bool)> = Vec::with_capacity(total as usize);
    for replicate in 1..=spec.replicates {
        for point in &base {
            standard.push((point.clone(), replicate, false));
        }
    }
    for number in 1..=spec.center_points {
        standard.push((vec![1.0 / q as f64; q], number, true));
    }
    let order: Vec<usize> = if spec.randomize {
        permutation(standard.len(), spec.seed)
    } else {
        (0..standard.len()).collect()
    };
    let runs: Vec<MixtureRun> = order
        .iter()
        .enumerate()
        .filter_map(|(position, &index)| {
            let (pseudo, replicate, extra) = standard.get(index)?;
            Some(MixtureRun {
                run: u32::try_from(position + 1).unwrap_or(u32::MAX),
                standard_order: u32::try_from(index + 1).unwrap_or(u32::MAX),
                support: u32::try_from(pseudo.iter().filter(|&&v| v > 0.0).count())
                    .unwrap_or(u32::MAX),
                extra_center: *extra,
                pseudo: pseudo.clone(),
                proportions: pseudo
                    .iter()
                    .zip(&lowers)
                    .map(|(&p, &l)| l + scale * p)
                    .collect(),
                replicate: *replicate,
            })
        })
        .collect();
    let mut issues = Vec::new();
    if spec.replicates == 1 && spec.center_points == 0 {
        issues.push(Issue::new(
            "design.mixture_no_pure_error",
            Severity::Warning,
        ));
    }
    Ok(GeneratedMixture {
        spec: spec.clone(),
        base_points,
        total,
        runs,
        randomization_algorithm: if spec.randomize {
            ALGORITHM.to_string()
        } else {
            "standard-order".to_string()
        },
        issues,
        provenance: Provenance::current(METHOD_ID, METHOD_VERSION),
    })
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    fn component(i: usize, lower: f64) -> MixtureComponent {
        MixtureComponent {
            id: StableId::new(format!("f{}", i + 1)).expect("id"),
            name: format!("C{}", i + 1),
            lower,
        }
    }

    fn spec(q: usize, kind: MixtureKind, lowers: &[f64]) -> MixtureSpec {
        MixtureSpec {
            components: (0..q)
                .map(|i| component(i, lowers.get(i).copied().unwrap_or(0.0)))
                .collect(),
            kind,
            replicates: 1,
            center_points: 0,
            randomize: false,
            seed: 0,
        }
    }

    #[test]
    fn lattice_3_2_has_six_points_in_lexicographic_order() {
        let g = generate(&spec(3, MixtureKind::Lattice { degree: 2 }, &[])).expect("lattice");
        assert_eq!(g.base_points, 6);
        let a: Vec<Vec<f64>> = g.runs.iter().map(|r| r.pseudo.clone()).collect();
        assert_eq!(a[0], vec![0.0, 0.0, 1.0]);
        assert_eq!(a[1], vec![0.0, 0.5, 0.5]);
        assert_eq!(a[2], vec![0.0, 1.0, 0.0]);
        assert_eq!(a[5], vec![1.0, 0.0, 0.0]);
        assert!(
            g.runs
                .iter()
                .all(|r| (r.proportions.iter().sum::<f64>() - 1.0).abs() < 1e-12)
        );
    }

    #[test]
    fn centroid_has_two_to_the_q_minus_one_points() {
        let g = generate(&spec(4, MixtureKind::Centroid, &[])).expect("centroide");
        assert_eq!(g.base_points, 15);
        assert_eq!(g.runs[0].support, 1);
        assert_eq!(g.runs[14].pseudo, vec![0.25; 4]);
        assert_eq!(g.runs[14].support, 4);
    }

    #[test]
    fn lower_bounds_shrink_the_simplex_and_keep_the_sum() {
        let g = generate(&spec(
            3,
            MixtureKind::Lattice { degree: 1 },
            &[0.1, 0.2, 0.0],
        ))
        .expect("limites");
        for r in &g.runs {
            assert!((r.proportions.iter().sum::<f64>() - 1.0).abs() < 1e-12);
            assert!(r.proportions[0] >= 0.1 - 1e-12 && r.proportions[1] >= 0.2 - 1e-12);
        }
        // O vértice do componente 3 vale 1 − 0,1 − 0,2 = 0,7.
        let v3 = g.runs.iter().find(|r| r.pseudo[2] == 1.0).expect("vértice");
        assert!((v3.proportions[2] - 0.7).abs() < 1e-12);
    }

    #[test]
    fn replicates_and_extra_centers_are_counted_and_randomized_reproducibly() {
        let mut s = spec(3, MixtureKind::Lattice { degree: 2 }, &[]);
        s.replicates = 2;
        s.center_points = 3;
        s.randomize = true;
        s.seed = 11;
        let a = generate(&s).expect("a");
        let b = generate(&s).expect("b");
        assert_eq!(a.total, 15);
        assert_eq!(a.runs, b.runs);
        assert_eq!(a.runs.iter().filter(|r| r.extra_center).count(), 3);
        let mut standard: Vec<u32> = a.runs.iter().map(|r| r.standard_order).collect();
        standard.sort_unstable();
        assert_eq!(standard, (1..=15).collect::<Vec<_>>());
    }

    #[test]
    fn invalid_specifications_are_rejected() {
        assert!(generate(&spec(1, MixtureKind::Centroid, &[])).is_err());
        assert!(generate(&spec(3, MixtureKind::Lattice { degree: 0 }, &[])).is_err());
        assert!(
            generate(&spec(
                3,
                MixtureKind::Lattice { degree: 2 },
                &[0.5, 0.5, 0.0]
            ))
            .is_err()
        );
        assert!(generate(&spec(3, MixtureKind::Lattice { degree: 2 }, &[-0.1])).is_err());
        let mut dup = spec(3, MixtureKind::Centroid, &[]);
        dup.components[1].name = "C1".into();
        assert!(generate(&dup).is_err());
        let mut big = spec(8, MixtureKind::Lattice { degree: 6 }, &[]);
        big.replicates = 50;
        let CoreError::InvalidInput(issues) = count_runs(&big).expect_err("grande demais");
        assert!(issues.iter().any(|i| i.code == "design.too_many_runs"));
    }
}
