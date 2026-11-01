//! Seleção e comparação de modelos de superfície contra o statsmodels
//! (`validation/cases/surface_model_selection/selection.json`, gerado por
//! `make_selection_cases.py`): métricas de cada modelo (R² ajustado e predito, PRESS, AIC, AICc,
//! BIC, falta de ajuste) e a sequência de eliminação regressiva com hierarquia.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::descriptive::Stat;
use optima_core::designs::spec::DesignFactor;
use optima_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use optima_core::surface::SurfaceRequest;
use optima_core::surface::selection::{ModelMetrics, select};
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
        got.value().expect("definida"),
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

#[test]
fn metrics_and_backward_sequence_match_statsmodels() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/surface_model_selection/selection.json");
    let v: Value = serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 3);
    for case in cases {
        let name = case["id"].as_str().expect("id").to_string();
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
        let result = select(&SurfaceRequest {
            dataset,
            response_id: id("y"),
            factors,
            terms: Vec::new(),
            alpha: case["alpha"].as_f64().expect("alpha"),
        })
        .unwrap_or_else(|e| panic!("{name}: {e:?}"));
        check(&result.full, &case["full"], &format!("{name} completo"));
        let steps = case["steps"].as_array().expect("passos");
        assert_eq!(
            result.steps.len(),
            steps.len(),
            "{name}: passos da eliminação"
        );
        for (i, (got, w)) in result.steps.iter().zip(steps).enumerate() {
            check(&got.metrics, &w["metrics"], &format!("{name} passo {i}"));
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
