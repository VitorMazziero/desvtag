//! Regras que transformam resultados em fatos.

use super::facts::Fact;
use crate::descriptive::{GroupSummary, Summary};

/// Fatos do resumo descritivo.
///
/// - `descriptive.independence_not_assessed` sempre aparece: contar linhas não
///   estabelece réplicas independentes.
/// - `descriptive.no_valid_observations`, `descriptive.missing_excluded`,
///   `descriptive.excluded_missing_factor` e `descriptive.group_too_small` aparecem
///   apenas quando se aplicam.
#[must_use]
pub fn descriptive_facts(
    overall: &Summary,
    groups: &[GroupSummary],
    excluded_missing_factor: u32,
) -> Vec<Fact> {
    let mut facts = Vec::new();
    if overall.n_valid == 0 {
        facts.push(Fact::new("descriptive.no_valid_observations"));
    }
    if overall.n_missing > 0 {
        facts.push(
            Fact::new("descriptive.missing_excluded").with_param("count", &overall.n_missing),
        );
    }
    if excluded_missing_factor > 0 {
        facts.push(
            Fact::new("descriptive.excluded_missing_factor")
                .with_param("count", &excluded_missing_factor),
        );
    }
    for group in groups.iter().filter(|g| g.summary.n_valid < 2) {
        let name = group
            .labels
            .iter()
            .map(|l| l.label.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        facts.push(
            Fact::new("descriptive.group_too_small")
                .with_param("group", &name)
                .with_param("count", &group.summary.n_valid),
        );
    }
    facts.push(Fact::new("descriptive.independence_not_assessed"));
    facts
}

/// Fatos da comparação de tratamentos de um fator.
///
/// - `anova.significant` / `anova.not_significant` (F, gl, p, α): sempre um dos dois, se F é definido;
/// - `tukey.pairs_different` (contagem, total, α) e `tukey.kramer` (tamanhos desiguais);
/// - `letters.meaning` sempre que há letras: compartilhar letra é diferença **não detectada**;
///   `letters.unknown_pairs` quando algum par não pôde ser testado;
/// - `diagnostics.homogeneity_signal` / `diagnostics.homogeneity_not_detected` (p de Brown–Forsythe),
///   `diagnostics.outliers` (contagem), `diagnostics.normality_visual` e
///   `diagnostics.independence_not_assessed` (sempre);
/// - `comparison.singleton_groups`, `comparison.excluded_observations`.
#[must_use]
pub fn one_way_facts(
    anova: &crate::inference::one_way_anova::OneWayAnova,
    tukey: Option<&crate::comparisons::TukeyResult>,
    letters: Option<&crate::comparisons::Letters>,
    diagnostics: &crate::comparisons::OneWayDiagnostics,
    sizes: &[usize],
    excluded: usize,
    alpha: f64,
) -> Vec<Fact> {
    use crate::comparisons::tukey::TukeyVariant;
    let mut facts = Vec::new();
    if let (Some(f), Some(p)) = (anova.f.value(), anova.p_value.value()) {
        let key = if p < alpha {
            "anova.significant"
        } else {
            "anova.not_significant"
        };
        facts.push(
            Fact::new(key)
                .with_param("f", &f)
                .with_param("df1", &anova.between.df)
                .with_param("df2", &anova.within.df)
                .with_param("p", &p)
                .with_param("alpha", &alpha),
        );
    }
    if let Some(t) = tukey {
        let different = t
            .comparisons
            .iter()
            .filter(|c| c.significant == Some(true))
            .count();
        facts.push(
            Fact::new("tukey.pairs_different")
                .with_param("count", &different)
                .with_param("total", &t.comparisons_count)
                .with_param("alpha", &alpha),
        );
        if t.variant == TukeyVariant::TukeyKramer {
            facts.push(Fact::new("tukey.kramer"));
        }
    }
    if let Some(l) = letters {
        facts.push(Fact::new("letters.meaning"));
        if l.has_unknown_pairs {
            facts.push(Fact::new("letters.unknown_pairs"));
        }
    }
    match diagnostics.brown_forsythe.p_value.value() {
        Some(p) if p < 0.05 => {
            facts.push(Fact::new("diagnostics.homogeneity_signal").with_param("p", &p));
        }
        Some(p) => {
            facts.push(Fact::new("diagnostics.homogeneity_not_detected").with_param("p", &p))
        }
        None => {}
    }
    let outliers: usize = diagnostics
        .residuals
        .iter()
        .filter(|r| r.standardized.value().is_some_and(|z| z.abs() > 3.0))
        .count();
    if outliers > 0 {
        facts.push(Fact::new("diagnostics.outliers").with_param("count", &outliers));
    }
    facts.push(Fact::new("diagnostics.normality_visual"));
    facts.push(Fact::new("diagnostics.independence_not_assessed"));
    let singletons = sizes.iter().filter(|&&s| s < 2).count();
    if singletons > 0 {
        facts.push(Fact::new("comparison.singleton_groups").with_param("count", &singletons));
    }
    if excluded > 0 {
        facts.push(Fact::new("comparison.excluded_observations").with_param("count", &excluded));
    }
    facts
}

/// Entradas das regras de interpretação de planejamentos de dois níveis.
pub struct DesignFactsInput<'a> {
    /// Termos estimados.
    pub effects: &'a [crate::designs::analysis::EffectRow],
    /// Curvatura, se testada.
    pub curvature: Option<&'a crate::designs::analysis::CurvatureTest>,
    /// Falta de ajuste, se calculável.
    pub lack_of_fit: Option<&'a crate::inference::lack_of_fit::LackOfFit>,
    /// Graus de liberdade residuais.
    pub df_residual: u32,
    /// O método de Lenth foi a única referência de inferência.
    pub lenth_used: bool,
    /// Tipo de planejamento.
    pub kind: &'a crate::designs::spec::DesignKind,
    /// Nível de significância.
    pub alpha: f64,
    /// Ensaios com níveis diferentes de −1, 0 e +1.
    pub unexpected_levels: usize,
    /// Termos não estimáveis.
    pub not_estimable: usize,
}

/// Fatos da análise de planejamentos de dois níveis.
///
/// - `design.active_effects` (`terms`, `count`, `basis` = `p` ou `lenth`) quando há termos ativos;
///   `design.no_active_effects` quando nenhum;
/// - `design.saturated` e `design.lenth_only` sem graus de liberdade do erro (valores-p não existem);
/// - `design.curvature_detected` / `design.curvature_not_detected` (p) e `design.curvature_unavailable`;
/// - `design.lack_of_fit_significant` / `design.lack_of_fit_not_significant` (p);
/// - `design.aliased_active` (termos ativos com confundimento), `design.screening_pb` (Plackett–Burman:
///   triagem, aliasing parcial), `design.not_estimable`, `design.unexpected_levels`;
/// - `design.independence_not_assessed` sempre.
#[must_use]
pub fn design_facts(input: &DesignFactsInput<'_>) -> Vec<Fact> {
    use crate::designs::spec::DesignKind;
    let mut facts = Vec::new();
    let active: Vec<&crate::designs::analysis::EffectRow> = input
        .effects
        .iter()
        .filter(|e| {
            if input.df_residual > 0 {
                e.p_value.value().is_some_and(|p| p < input.alpha)
            } else {
                e.lenth_active == Some(true)
            }
        })
        .collect();
    if input.df_residual == 0 {
        facts.push(Fact::new("design.saturated"));
        if !input.lenth_used {
            facts.push(Fact::new("design.no_inference"));
        }
    }
    if input.lenth_used {
        facts.push(Fact::new("design.lenth_only"));
    }
    if input.df_residual > 0 || input.lenth_used {
        if active.is_empty() {
            facts.push(Fact::new("design.no_active_effects").with_param("alpha", &input.alpha));
        } else {
            facts.push(
                Fact::new("design.active_effects")
                    .with_param(
                        "terms",
                        &active
                            .iter()
                            .map(|e| e.label.as_str())
                            .collect::<Vec<_>>()
                            .join("; "),
                    )
                    .with_param("count", &active.len())
                    .with_param("basis", &if input.df_residual > 0 { "p" } else { "lenth" })
                    .with_param("alpha", &input.alpha),
            );
        }
    }
    let aliased: Vec<&str> = active
        .iter()
        .filter(|e| !e.aliased_with.is_empty())
        .map(|e| e.label.as_str())
        .collect();
    if !aliased.is_empty() {
        facts.push(Fact::new("design.aliased_active").with_param("terms", &aliased.join("; ")));
    }
    if let Some(c) = input.curvature {
        match c.p_value.value() {
            Some(p) if p < input.alpha => {
                facts.push(Fact::new("design.curvature_detected").with_param("p", &p));
            }
            Some(p) => facts.push(Fact::new("design.curvature_not_detected").with_param("p", &p)),
            None => facts.push(Fact::new("design.curvature_unavailable")),
        }
    }
    if let Some(l) = input.lack_of_fit
        && let Some(p) = l.p_value.value()
    {
        let key = if p < input.alpha {
            "design.lack_of_fit_significant"
        } else {
            "design.lack_of_fit_not_significant"
        };
        facts.push(Fact::new(key).with_param("p", &p));
    }
    if matches!(input.kind, DesignKind::PlackettBurman { .. }) {
        facts.push(Fact::new("design.screening_pb"));
    }
    if input.not_estimable > 0 {
        facts.push(Fact::new("design.not_estimable").with_param("count", &input.not_estimable));
    }
    if input.unexpected_levels > 0 {
        facts.push(
            Fact::new("design.unexpected_levels").with_param("count", &input.unexpected_levels),
        );
    }
    facts.push(Fact::new("design.independence_not_assessed"));
    facts
}
