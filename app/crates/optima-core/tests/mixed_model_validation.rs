//! Modelo linear misto (intercepto aleatório, REML) e comparações pareadas contra as referências
//! independentes em Python (`validation/tools/make_mixed_model_cases.py`): `statsmodels.MixedLM`,
//! Satterthwaite por NumPy com a matriz `V` explícita, ANOVA de medidas repetidas, `scipy.stats`.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::comparisons::paired::{PairedRequest, compare};
use optima_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use optima_core::models::mixed::{MixedModelRequest, fit};
use optima_core::models::terms::{CategoricalCoding, ModelSpec, TermSpec};
use serde_json::Value;

fn load(relative: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases")
        .join(relative);
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn floats(v: &Value) -> Vec<f64> {
    v.as_array()
        .expect("lista")
        .iter()
        .map(|x| x.as_f64().expect("número"))
        .collect()
}

fn close(got: f64, want: f64, rel: f64, abs: f64, what: &str) {
    assert!(
        (got - want).abs() <= abs + rel * want.abs(),
        "{what}: {got} ≠ {want}"
    );
}

fn request_of(case: &Value) -> MixedModelRequest {
    let factors: Vec<Factor> = case["factors"]
        .as_array()
        .expect("fatores")
        .iter()
        .map(|f| Factor {
            id: id(f["name"].as_str().expect("nome")),
            name: f["name"].as_str().expect("nome").to_string(),
            kind: if f["kind"] == "numeric" {
                FactorKind::Numeric
            } else {
                FactorKind::Categorical
            },
            unit: None,
            levels: f["levels"]
                .as_array()
                .expect("níveis")
                .iter()
                .map(|s| s.as_str().expect("texto").to_string())
                .collect(),
        })
        .collect();
    let observations: Vec<Observation> = case["rows"]
        .as_array()
        .expect("linhas")
        .iter()
        .enumerate()
        .map(|(i, r)| Observation {
            id: id(&format!("o{}", i + 1)),
            unit_id: Some(id(r["unit"].as_str().expect("unidade"))),
            factors: r["factors"]
                .as_array()
                .expect("valores")
                .iter()
                .map(|v| {
                    Some(match v.as_f64() {
                        Some(n) => FactorValue::Number(n),
                        None => FactorValue::Text(v.as_str().expect("texto").to_string()),
                    })
                })
                .collect(),
            responses: vec![Some(r["y"].as_f64().expect("y"))],
        })
        .collect();
    let terms: Vec<TermSpec> = case["fixedTerms"]
        .as_array()
        .expect("termos")
        .iter()
        .map(|t| TermSpec::Main {
            factor_id: id(t.as_str().expect("termo")),
        })
        .collect();
    MixedModelRequest {
        dataset: Dataset {
            factors,
            responses: vec![Response {
                id: id("y"),
                name: "y".into(),
                unit: None,
            }],
            observations,
        },
        spec: ModelSpec {
            response_id: id("y"),
            intercept: true,
            terms,
            coding: CategoricalCoding::Treatment,
            confidence_level: 0.95,
        },
    }
}

#[test]
fn mixed_models_equal_statsmodels_and_the_independent_satterthwaite() {
    let v = load("linear_mixed_model/mixed.json");
    for case in v["cases"].as_array().expect("casos") {
        let name = case["name"].as_str().expect("nome");
        let e = &case["expected"];
        let got = fit(&request_of(case)).expect("ajuste");
        if e["boundary"] == true {
            assert!(got.boundary, "{name}: deveria estar na fronteira");
            assert!(e["anovaSu"].as_f64().expect("anova") < 0.0);
            for (j, c) in got.coefficients.iter().enumerate() {
                close(c.estimate, floats(&e["estimates"])[j], 1e-9, 1e-9, name);
                close(
                    c.std_error.value().expect("se"),
                    floats(&e["stdErrors"])[j],
                    1e-9,
                    1e-9,
                    name,
                );
                close(
                    c.df.value().expect("gl"),
                    e["dfOls"].as_f64().expect("gl"),
                    0.0,
                    1e-12,
                    name,
                );
            }
            close(
                got.variance_residual.value().expect("σ²"),
                e["varianceResidual"].as_f64().expect("σ²"),
                1e-9,
                1e-12,
                name,
            );
            continue;
        }
        assert!(!got.boundary, "{name}");
        close(
            got.variance_unit.value().expect("σᵤ²"),
            e["varianceUnit"].as_f64().expect("σᵤ²"),
            5e-4,
            1e-6,
            &format!("{name} σᵤ²"),
        );
        close(
            got.variance_residual.value().expect("σₑ²"),
            e["varianceResidual"].as_f64().expect("σₑ²"),
            5e-4,
            1e-6,
            &format!("{name} σₑ²"),
        );
        let estimates = floats(&e["estimates"]);
        let errors = floats(&e["stdErrors"]);
        let dfs = floats(&e["df"]);
        assert_eq!(got.coefficients.len(), estimates.len(), "{name}");
        for (j, c) in got.coefficients.iter().enumerate() {
            close(
                c.estimate,
                estimates[j],
                5e-4,
                1e-6,
                &format!("{name} β{j}"),
            );
            close(
                c.std_error.value().expect("se"),
                errors[j],
                5e-4,
                1e-6,
                &format!("{name} EP{j}"),
            );
            // Satterthwaite: mesma definição, derivadas numéricas nos dois lados.
            close(
                c.df.value().expect("gl"),
                dfs[j],
                2e-3,
                1e-3,
                &format!("{name} gl{j}"),
            );
        }
        // Dados balanceados: os coeficientes de tempo têm os graus de liberdade exatos da ANOVA.
        if let Some(exact) = e.get("exactDf") {
            let exact = floats(exact);
            for (j, want) in exact.iter().enumerate().skip(1) {
                close(
                    got.coefficients[j].df.value().expect("gl"),
                    *want,
                    1e-3,
                    1e-2,
                    &format!("{name} gl exato {j}"),
                );
            }
            close(
                got.variance_unit.value().expect("σᵤ²"),
                e["anovaSu"].as_f64().expect("anova"),
                1e-3,
                1e-4,
                &format!("{name} σᵤ² da ANOVA"),
            );
        }
        // BLUPs.
        for r in &got.random_effects {
            let want = e["blup"][r.unit.as_str()].as_f64().expect("BLUP");
            close(r.blup, want, 1e-3, 1e-4, &format!("{name} BLUP {}", r.unit));
        }
    }
}

#[test]
fn paired_tests_equal_scipy() {
    let v = load("paired_comparison/paired.json");
    for case in v["cases"].as_array().expect("casos") {
        let name = case["name"].as_str().expect("nome");
        let e = &case["expected"];
        let got = compare(&PairedRequest {
            first: floats(&case["first"]),
            second: floats(&case["second"]),
            alpha: 0.05,
        })
        .expect("pareado");
        let t = &got.t_test;
        close(
            t.mean_difference.value().expect("d"),
            e["meanDifference"].as_f64().expect("d"),
            1e-12,
            1e-12,
            name,
        );
        close(
            t.sd_difference.value().expect("sd"),
            e["sd"].as_f64().expect("sd"),
            1e-12,
            1e-12,
            name,
        );
        close(
            t.t.value().expect("t"),
            e["t"].as_f64().expect("t"),
            1e-10,
            1e-12,
            name,
        );
        assert_eq!(u64::from(t.df), e["df"].as_u64().expect("gl"), "{name}");
        close(
            t.p_value.value().expect("p"),
            e["p"].as_f64().expect("p"),
            1e-9,
            1e-14,
            name,
        );
        close(
            t.ci_lower.value().expect("ic"),
            e["ciLower"].as_f64().expect("ic"),
            1e-10,
            1e-12,
            name,
        );
        close(
            t.ci_upper.value().expect("ic"),
            e["ciUpper"].as_f64().expect("ic"),
            1e-10,
            1e-12,
            name,
        );
        close(
            t.effect_size.value().expect("dz"),
            e["dz"].as_f64().expect("dz"),
            1e-10,
            1e-12,
            name,
        );
        let w = got.wilcoxon.expect("wilcoxon");
        let want = &e["wilcoxon"];
        assert_eq!(
            u64::from(w.n_used),
            want["nUsed"].as_u64().expect("n"),
            "{name}"
        );
        assert_eq!(
            u64::from(w.n_zero),
            want["nZero"].as_u64().expect("zeros"),
            "{name}"
        );
        close(
            w.w_plus,
            want["wPlus"].as_f64().expect("W+"),
            1e-12,
            1e-12,
            name,
        );
        close(
            w.statistic,
            want["statistic"].as_f64().expect("W"),
            1e-12,
            1e-12,
            name,
        );
        assert_eq!(w.method, want["method"].as_str().expect("método"), "{name}");
        close(
            w.p_value.value().expect("p"),
            want["p"].as_f64().expect("p"),
            1e-9,
            1e-12,
            &format!("{name} p Wilcoxon"),
        );
    }
}
