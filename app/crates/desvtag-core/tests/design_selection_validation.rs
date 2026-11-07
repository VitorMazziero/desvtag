//! Seleção de modelos de efeitos de planejamentos de dois níveis contra o statsmodels
//! (`validation/cases/two_level_model_selection/selection.json`, gerado por
//! `make_design_selection_cases.py`): métricas de cada modelo e sequência de eliminação regressiva
//! com hierarquia.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::descriptive::Stat;
use desvtag_core::designs::analysis::DesignAnalysisRequest;
use desvtag_core::designs::selection::select;
use desvtag_core::designs::spec::{DesignFactor, DesignKind, DesignSpec};
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use desvtag_core::models::TermSpec;
use desvtag_core::surface::selection::ModelMetrics;
use serde_json::Value;

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn near(got: &Stat, want: &Value, rel: f64, abs: f64, what: &str) {
    if want.is_null() {
        assert!(got.value().is_none(), "{what}: deveria ser indefinido");
        return;
    }
    let (g, w) = (
        got.value()
            .unwrap_or_else(|| panic!("{what}: indefinido, esperado {want}")),
        want.as_f64().expect("número"),
    );
    assert!(
        (g - w).abs() <= abs + rel * w.abs(),
        "{what}: obtido {g:e}, esperado {w:e}"
    );
}

fn check(m: &ModelMetrics, w: &Value, name: &str) {
    assert_eq!(
        u64::from(m.parameters),
        w["parameters"].as_u64().expect("k"),
        "{name}: parâmetros"
    );
    assert_eq!(
        u64::from(m.df_error),
        w["df_error"].as_u64().expect("gl"),
        "{name}: gl do erro"
    );
    near(&m.r_squared, &w["r2"], 1e-9, 1e-10, &format!("{name} R²"));
    near(
        &m.adjusted_r_squared,
        &w["adj_r2"],
        1e-9,
        1e-10,
        &format!("{name} R² ajustado"),
    );
    near(
        &m.predicted_r_squared,
        &w["pred_r2"],
        1e-8,
        1e-9,
        &format!("{name} R² predito"),
    );
    near(&m.press, &w["press"], 1e-8, 1e-10, &format!("{name} PRESS"));
    near(&m.rmse, &w["rmse"], 1e-9, 1e-10, &format!("{name} RMSE"));
    near(
        &m.model_p_value,
        &w["model_p"],
        1e-6,
        1e-12,
        &format!("{name} p do modelo"),
    );
    near(
        &m.lack_of_fit_p_value,
        &w["lof_p"],
        1e-6,
        1e-10,
        &format!("{name} p da falta de ajuste"),
    );
    near(&m.aic, &w["aic"], 1e-10, 1e-8, &format!("{name} AIC"));
    near(&m.aicc, &w["aicc"], 1e-10, 1e-8, &format!("{name} AICc"));
    near(&m.bic, &w["bic"], 1e-10, 1e-8, &format!("{name} BIC"));
}

fn kind_of(kind: &Value) -> DesignKind {
    match kind["type"].as_str() {
        Some("fractional") => DesignKind::Fractional {
            generators: kind["generators"]
                .as_array()
                .expect("geradores")
                .iter()
                .map(|g| g.as_str().expect("gerador").to_string())
                .collect(),
        },
        Some("plackett_burman") => DesignKind::PlackettBurman {
            runs: u32::try_from(kind["runs"].as_u64().expect("ensaios")).expect("u32"),
        },
        _ => DesignKind::FullFactorial,
    }
}

fn request(case: &Value) -> DesignAnalysisRequest {
    let k = usize::try_from(case["k"].as_u64().expect("k")).expect("usize");
    let (low, high) = (&case["low"], &case["high"]);
    let factors: Vec<DesignFactor> = (0..k)
        .map(|i| DesignFactor {
            id: id(&format!("f{}", i + 1)),
            name: format!("x{}", i + 1),
            low: low[i].as_f64().expect("baixo"),
            high: high[i].as_f64().expect("alto"),
            unit: None,
        })
        .collect();
    let observations = case["real"]
        .as_array()
        .expect("linhas")
        .iter()
        .zip(case["y"].as_array().expect("y"))
        .enumerate()
        .map(|(i, (row, y))| Observation {
            id: id(&format!("o{}", i + 1)),
            unit_id: None,
            factors: row
                .as_array()
                .expect("fatores")
                .iter()
                .map(|x| Some(FactorValue::Number(x.as_f64().expect("x"))))
                .collect(),
            responses: vec![Some(y.as_f64().expect("y"))],
        })
        .collect();
    let dataset = Dataset {
        factors: factors
            .iter()
            .map(|f| Factor {
                id: f.id.clone(),
                name: f.name.clone(),
                kind: FactorKind::Numeric,
                unit: None,
                levels: Vec::new(),
            })
            .collect(),
        responses: vec![Response {
            id: id("y"),
            name: "y".into(),
            unit: None,
        }],
        observations,
    };
    DesignAnalysisRequest {
        dataset,
        response_id: id("y"),
        spec: DesignSpec {
            kind: kind_of(&case["kind"]),
            factors,
            replicates: 1,
            center_points: 0,
            randomize: false,
            seed: 1,
        },
        terms: case["start"]
            .as_array()
            .map(|terms| {
                terms
                    .iter()
                    .map(|term| {
                        let at =
                            |i: usize| id(&format!("f{}", term[i].as_u64().expect("fator") + 1));
                        match term[0].as_str() {
                            Some("main") => TermSpec::Main { factor_id: at(1) },
                            _ => TermSpec::Interaction {
                                factor_ids: vec![at(1), at(2)],
                            },
                        }
                    })
                    .collect()
            })
            .unwrap_or_default(),
        alpha: case["alpha"].as_f64().expect("alpha"),
        include_curvature: case["curvature"].as_bool().expect("curvatura"),
    }
}

#[test]
fn metrics_and_backward_sequence_match_statsmodels() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/two_level_model_selection/selection.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(
        cases.len() >= 8,
        "fatoriais completos, fracionários e Plackett–Burman"
    );
    for case in cases {
        let name = case["id"].as_str().expect("id").to_string();
        let result = select(&request(case)).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        check(&result.full, &case["full"], &format!("{name} completo"));
        let steps = case["steps"].as_array().expect("passos");
        assert_eq!(
            result.steps.len(),
            steps.len(),
            "{name}: passos da eliminação"
        );
        for (i, (got, w)) in result.steps.iter().zip(steps).enumerate() {
            check(&got.metrics, &w["metrics"], &format!("{name} passo {i}"));
            assert_eq!(
                got.metrics.terms.len() as u64,
                w["n_terms"].as_u64().expect("termos"),
                "{name} passo {i}: número de termos"
            );
            if i > 0 {
                near(
                    &got.removed_p_value,
                    &w["removed_p"],
                    1e-6,
                    1e-10,
                    &format!("{name} p removido {i}"),
                );
            }
        }
        assert_eq!(
            result.stopped_because,
            case["stopped"].as_str().expect("parada"),
            "{name}: motivo da parada"
        );
    }
}

#[test]
fn a_main_effect_stays_while_one_of_its_interactions_remains() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/two_level_model_selection/selection.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    for case in v["cases"].as_array().expect("casos") {
        let result = select(&request(case)).expect("seleção");
        for step in &result.steps {
            for term in &step.metrics.terms {
                if let desvtag_core::models::TermSpec::Interaction { factor_ids } = term {
                    for factor in factor_ids {
                        assert!(
                            step.metrics.terms.iter().any(|t| matches!(
                                t,
                                desvtag_core::models::TermSpec::Main { factor_id } if factor_id == factor
                            )),
                            "{}: interação sem o efeito principal de {factor:?}",
                            case["id"]
                        );
                    }
                }
            }
        }
    }
}
