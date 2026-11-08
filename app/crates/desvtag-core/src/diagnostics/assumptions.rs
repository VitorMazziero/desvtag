//! Verificações dos pressupostos da ANOVA: homogeneidade das variâncias.
//!
//! **Brown–Forsythe** (Levene pela mediana): ANOVA de um fator sobre `|y − mediana do grupo|`. É
//! uma evidência a ser lida junto com os desvios-padrão por grupo e os gráficos de resíduos; o
//! motor **não** troca de método automaticamente em função dela. A normalidade é avaliada
//! visualmente (gráfico quantil–quantil) e não por teste automático.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::distributions::f;
use crate::inference::one_way_anova::partition;
use crate::visualization::boxplot::quantile_sorted;

/// Resultado do teste de Brown–Forsythe.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BrownForsythe {
    /// Estatística F.
    pub f: Stat,
    /// Graus de liberdade do numerador (`k − 1`).
    pub df_between: u32,
    /// Graus de liberdade do denominador (`N − k`).
    pub df_within: u32,
    /// Valor-p.
    pub p_value: Stat,
}

fn median(values: &[f64]) -> f64 {
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    quantile_sorted(&sorted, 0.5).unwrap_or(0.0)
}

/// Brown–Forsythe para os grupos dados.
#[must_use]
pub fn brown_forsythe(groups: &[&[f64]]) -> BrownForsythe {
    let deviations: Vec<Vec<f64>> = groups
        .iter()
        .map(|g| {
            let m = median(g);
            g.iter().map(|v| (v - m).abs()).collect()
        })
        .collect();
    let refs: Vec<&[f64]> = deviations.iter().map(Vec::as_slice).collect();
    let k = groups.len();
    let n: usize = groups.iter().map(|g| g.len()).sum();
    let (df1, df2) = (k.saturating_sub(1), n.saturating_sub(k));
    let to_u32 = |v: usize| u32::try_from(v).unwrap_or(u32::MAX);
    let undefined = |reason| BrownForsythe {
        f: Stat::undefined(reason),
        df_between: to_u32(df1),
        df_within: to_u32(df2),
        p_value: Stat::undefined(reason),
    };
    if df1 == 0 || df2 == 0 {
        return undefined(UndefinedReason::NoResidualDegreesOfFreedom);
    }
    let Some(p) = partition(&refs) else {
        return undefined(UndefinedReason::NonFiniteResult);
    };
    if p.ss_within <= 0.0 {
        // Desvios idênticos dentro de cada grupo: a razão não está definida.
        return undefined(UndefinedReason::ConstantResponse);
    }
    let value = (p.ss_between / df1 as f64) / (p.ss_within / df2 as f64);
    BrownForsythe {
        f: Stat::finite(value),
        df_between: to_u32(df1),
        df_within: to_u32(df2),
        p_value: Stat::finite(f::sf(value, df1 as f64, df2 as f64)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_a_clear_variance_difference_and_not_an_equal_one() {
        let narrow: &[f64] = &[10.0, 10.1, 9.9, 10.05, 9.95, 10.0, 10.02, 9.98];
        let wide: &[f64] = &[10.0, 12.0, 8.0, 11.0, 9.0, 13.0, 7.0, 10.5];
        let unequal = brown_forsythe(&[narrow, wide]);
        assert!(
            unequal.p_value.value().is_some_and(|p| p < 0.01),
            "{unequal:?}"
        );
        let same = brown_forsythe(&[wide, wide]);
        assert!(same.p_value.value().is_some_and(|p| p > 0.99), "{same:?}");
    }

    #[test]
    fn matches_a_hand_calculation() {
        // Grupos (1,2,6) e (3,4,5): medianas 2 e 4 ⇒ |dev| = (1,0,4) e (1,0,1).
        // Médias 5/3 e 2/3; média geral 7/6; SQ_ent = 3(½)²·2 = 1,5; SQ_dent = (14/3 + 2/3)... :
        // grupo 1: Σ(d − 5/3)² = 4/9+25/9+49/9 = 78/9; grupo 2: Σ(d − 2/3)² = 1/9+4/9+1/9 = 6/9 ⇒ 84/9.
        // F = (1,5/1)/((84/9)/4) = 1,5/(2,3333…) = 0,642857…
        let r = brown_forsythe(&[&[1.0, 2.0, 6.0], &[3.0, 4.0, 5.0]]);
        assert!(
            (r.f.value().unwrap_or(f64::NAN) - 0.642_857_142_857_142_9).abs() < 1e-12,
            "{r:?}"
        );
        assert_eq!((r.df_between, r.df_within), (1, 4));
    }

    #[test]
    fn degenerate_inputs_are_explicit() {
        let r = brown_forsythe(&[&[1.0], &[2.0]]);
        assert_eq!(
            r.f,
            Stat::Undefined {
                reason: UndefinedReason::NoResidualDegreesOfFreedom
            }
        );
    }
}
