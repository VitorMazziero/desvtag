//! Planejamentos ótimos contra a referência independente em Python
//! (`validation/tools/make_optimal_cases.py`): métricas de planejamentos dados (NumPy) e o ótimo
//! global por busca exaustiva em problemas pequenos.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use optima_core::designs::optimal::{
    LinearConstraint, OptimalCriterion, OptimalFactor, OptimalModel, OptimalSpec, evaluate,
    generate,
};
use optima_core::domain::StableId;
use serde_json::Value;

fn load() -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases/optimal_design/optimal.json");
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
}

fn floats(v: &Value) -> Vec<f64> {
    v.as_array()
        .expect("lista")
        .iter()
        .map(|x| x.as_f64().expect("número"))
        .collect()
}

fn spec_of(v: &Value) -> OptimalSpec {
    OptimalSpec {
        factors: v["factors"]
            .as_array()
            .expect("fatores")
            .iter()
            .enumerate()
            .map(|(i, f)| OptimalFactor {
                id: StableId::new(format!("f{}", i + 1)).expect("id"),
                name: f["name"].as_str().expect("nome").to_string(),
                low: f["low"].as_f64().expect("low"),
                high: f["high"].as_f64().expect("high"),
            })
            .collect(),
        model: match v["model"].as_str().expect("modelo") {
            "linear" => OptimalModel::Linear,
            "interactions" => OptimalModel::Interactions,
            _ => OptimalModel::Quadratic,
        },
        criterion: if v["criterion"] == "d" {
            OptimalCriterion::D
        } else {
            OptimalCriterion::I
        },
        runs: u32::try_from(v["runs"].as_u64().expect("ensaios")).expect("u32"),
        levels: u32::try_from(v["levels"].as_u64().expect("níveis")).expect("u32"),
        constraints: v["constraints"]
            .as_array()
            .expect("restrições")
            .iter()
            .map(|c| LinearConstraint {
                coefficients: floats(&c["coefficients"]),
                upper: c["upper"].as_f64().expect("limite"),
            })
            .collect(),
        fixed_runs: v["fixedRuns"]
            .as_array()
            .expect("fixos")
            .iter()
            .map(floats)
            .collect(),
        starts: u32::try_from(v["starts"].as_u64().expect("inícios")).expect("u32"),
        randomize: v["randomize"].as_bool().expect("bool"),
        seed: v["seed"].as_u64().expect("semente"),
    }
}

fn close(got: f64, want: f64, what: &str) {
    assert!(
        (got - want).abs() <= 1e-9 * (1.0 + want.abs()),
        "{what}: {got} ≠ {want}"
    );
}

#[test]
fn metrics_equal_numpy_for_given_designs() {
    let v = load();
    let cases = v["metricCases"].as_array().expect("casos");
    assert!(cases.len() >= 5);
    for c in cases {
        let name = c["name"].as_str().expect("nome");
        let spec = spec_of(&c["spec"]);
        let runs: Vec<Vec<f64>> = c["runsReal"]
            .as_array()
            .expect("ensaios")
            .iter()
            .map(floats)
            .collect();
        let got = evaluate(&spec, &runs).expect("métricas");
        let want = &c["expected"];
        assert_eq!(
            u64::from(got.parameters),
            want["parameters"].as_u64().expect("p"),
            "{name}"
        );
        close(
            got.log_det.expect("ln det"),
            want["logDet"].as_f64().expect("ln det"),
            name,
        );
        close(
            got.d_efficiency.expect("D"),
            want["dEfficiency"].as_f64().expect("D"),
            name,
        );
        close(
            got.a_efficiency.expect("A"),
            want["aEfficiency"].as_f64().expect("A"),
            name,
        );
        close(
            got.g_efficiency.expect("G"),
            want["gEfficiency"].as_f64().expect("G"),
            name,
        );
        close(
            got.i_average.expect("I"),
            want["iAverage"].as_f64().expect("I"),
            name,
        );
    }
}

#[test]
fn the_exchange_reaches_the_global_optimum_of_exhaustive_search() {
    let v = load();
    let cases = v["exhaustiveCases"].as_array().expect("casos");
    assert!(cases.len() >= 6);
    for c in cases {
        let name = c["name"].as_str().expect("nome");
        let spec = spec_of(&c["spec"]);
        let want = c["expected"]["best"].as_f64().expect("melhor");
        let got = generate(&spec).expect("planejamento");
        let m = &got.metrics;
        // D: maximizar ln|M|; I: a referência guarda −tr(M⁻¹W) (maximizar) e o motor relata n·tr.
        let value = match spec.criterion {
            OptimalCriterion::D => m.log_det.expect("ln det"),
            OptimalCriterion::I => -m.i_average.expect("I") / f64::from(spec.runs),
        };
        close(value, want, name);
        assert_eq!(got.runs.len(), spec.runs as usize, "{name}");
        assert_eq!(
            got.runs.iter().filter(|r| r.fixed).count(),
            spec.fixed_runs.len(),
            "{name}"
        );
        for r in &got.runs {
            for c in &spec.constraints {
                let s: f64 = c.coefficients.iter().zip(&r.real).map(|(a, x)| a * x).sum();
                assert!(s <= c.upper + 1e-9, "{name}: restrição violada");
            }
        }
    }
}

/// Medição dos piores casos (não roda por padrão):
/// `cargo test --release -p optima-core --test optimal_validation -- --ignored --nocapture`.
#[test]
#[ignore = "medição de desempenho; rodar em modo release"]
fn worst_cases_timing() {
    use std::time::Instant;
    for (k, levels, runs, model) in [
        (5_usize, 3_u32, 40_u32, OptimalModel::Quadratic),
        (4, 5, 30, OptimalModel::Quadratic),
        (3, 5, 20, OptimalModel::Quadratic),
    ] {
        let spec = OptimalSpec {
            factors: (0..k)
                .map(|i| OptimalFactor {
                    id: StableId::new(format!("f{}", i + 1)).expect("id"),
                    name: format!("X{}", i + 1),
                    low: 0.0,
                    high: 1.0,
                })
                .collect(),
            model,
            criterion: OptimalCriterion::I,
            runs,
            levels,
            constraints: Vec::new(),
            fixed_runs: Vec::new(),
            starts: 10,
            randomize: false,
            seed: 1,
        };
        let t = Instant::now();
        let g = generate(&spec).expect("planejamento");
        println!(
            "k={k} níveis={levels} ensaios={runs} candidatos={} inícios=10 (I): {:.2} s",
            g.candidates,
            t.elapsed().as_secs_f64()
        );
    }
}
