//! Planejamentos ótimos contra a referência independente em Python
//! (`validation/tools/make_optimal_cases.py`): métricas de planejamentos dados (NumPy) e o ótimo
//! global por busca exaustiva em problemas pequenos.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::designs::optimal::{
    LinearConstraint, OptimalCriterion, OptimalFactor, OptimalModel, OptimalSpec, evaluate,
    generate,
};
use desvtag_core::domain::StableId;
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
        categories: None,
        blocks: None,
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
fn extreme_ranges_preserve_criteria_and_unrepresentable_grids_are_refused() {
    let cases = load();
    let mut spec = spec_of(&cases["metricCases"][0]["spec"]);
    spec.factors.truncate(1);
    spec.model = OptimalModel::Quadratic;
    spec.levels = 5;
    spec.runs = 3;
    spec.constraints.clear();
    spec.fixed_runs.clear();
    let scale = 2.0_f64.powi(1023);
    for (low, high) in [(-1.0, 1.0), (-scale, scale), (scale, 1.5 * scale)] {
        spec.factors[0].low = low;
        spec.factors[0].high = high;
        let result = generate(&spec).expect("finite optimal design");
        let runs: Vec<_> = result.runs.iter().map(|run| run.real.clone()).collect();
        assert!(runs.iter().flatten().all(|value| value.is_finite()));
        let measured = evaluate(&spec, &runs).expect("evaluate decoded design");
        close(
            measured.log_det.expect("finite determinant"),
            4.0_f64.ln(),
            "reference log det",
        );
        close(
            result.metrics.log_det.expect("finite determinant"),
            4.0_f64.ln(),
            "design log det",
        );
    }
    spec.factors[0].low = 1.0;
    spec.factors[0].high = f64::from_bits(1.0_f64.to_bits() + 1);
    let error = generate(&spec).expect_err("adjacent values do not admit a five-level grid");
    assert!(
        matches!(error, desvtag_core::errors::CoreError::InvalidInput(issues)
        if issues.iter().any(|issue| issue.code == "design.optimal_unresolved_grid"))
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

#[test]
fn saturated_exchanges_are_stationary_against_independent_enumeration() {
    let v = load();
    let cases = v["exchangeCases"].as_array().expect("exchange cases");
    assert_eq!(cases.len(), 12);
    for case in cases {
        let mut successes = 0;
        for seed in 1..=5 {
            let mut spec = spec_of(&case["spec"]);
            spec.seed = seed;
            let got = match generate(&spec) {
                Ok(result) => result,
                Err(desvtag_core::errors::CoreError::InvalidInput(issues)) => {
                    // A single random start and its recovery can both be singular. This is
                    // an explicit failure, never a claim that a returned design is stationary.
                    assert!(
                        issues
                            .iter()
                            .any(|issue| issue.code == "design.optimal_singular")
                    );
                    continue;
                }
            };
            successes += 1;
            let free: Vec<_> = got.runs.iter().filter(|r| !r.fixed).collect();
            let stationary = case["stationary"].as_array().expect("stationary");
            let matched = stationary.iter().find(|candidate| {
                let mut remaining: Vec<_> = candidate["freeRuns"]
                    .as_array()
                    .expect("free runs")
                    .iter()
                    .map(floats)
                    .collect();
                for row in &free {
                    let Some(index) = remaining
                        .iter()
                        .position(|r| r.iter().zip(&row.real).all(|(a, b)| (a - b).abs() < 1e-12))
                    else {
                        return false;
                    };
                    remaining.remove(index);
                }
                remaining.is_empty()
            });
            assert!(
                matched.is_some(),
                "{} seed {seed}: improving swap remains: {:?}",
                case["name"],
                free
            );
            let reference = matched.expect("stationary design");
            let value = match spec.criterion {
                OptimalCriterion::D => got.metrics.log_det.expect("log det"),
                OptimalCriterion::I => -got.metrics.i_average.expect("I") / f64::from(spec.runs),
            };
            close(
                value,
                reference["value"].as_f64().expect("reference"),
                "stationary score",
            );
        }
        assert!(successes > 0, "{}: no successful starts", case["name"]);
    }
}

#[test]
fn evaluation_rejects_malformed_runs_and_infeasible_regions() {
    let fixture = load();
    let mut spec = spec_of(&fixture["exchangeCases"][0]["spec"]);
    for runs in [
        vec![],
        vec![vec![]],
        vec![vec![0.0, 1.0]],
        vec![vec![f64::NAN]],
        vec![vec![f64::INFINITY]],
        vec![vec![2.0]],
        vec![vec![0.0]; 61],
    ] {
        let result = std::panic::catch_unwind(|| evaluate(&spec, &runs));
        assert!(
            result.is_ok_and(|value| value.is_err()),
            "must reject without panic: {runs:?}"
        );
    }
    spec.constraints = vec![LinearConstraint {
        coefficients: vec![1.0],
        upper: 0.5,
    }];
    assert!(evaluate(&spec, &[vec![1.0]]).is_err());
    spec.constraints[0].upper = -2.0;
    assert!(evaluate(&spec, &[vec![-1.0]]).is_err());
    spec.constraints = vec![
        LinearConstraint {
            coefficients: vec![1.0],
            upper: -0.4,
        },
        LinearConstraint {
            coefficients: vec![-1.0],
            upper: 0.6,
        },
    ];
    let desvtag_core::errors::CoreError::InvalidInput(issues) =
        evaluate(&spec, &[vec![-0.5]]).expect_err("empty grid");
    assert!(
        issues
            .iter()
            .any(|issue| issue.code == "design.optimal_empty_region")
    );
}

#[test]
fn search_counts_attempts_and_preserves_legacy_deserialization() {
    let fixture = load();
    let mut spec = spec_of(&fixture["exchangeCases"][8]["spec"]);
    spec.starts = 20;
    spec.seed = 1;
    let result = generate(&spec).expect("design with singular starts");
    let search = result.search.as_ref().expect("search");
    assert_eq!(result.starts_run, spec.starts);
    assert_eq!(search.starts_attempted, spec.starts);
    assert_eq!(search.starts_succeeded + search.starts_failed, spec.starts);
    assert!(search.starts_failed > 0);
    assert!(search.singular_initial_starts > 0);
    assert_eq!(search.singular_initial_starts, search.recovery_attempts);
    assert!(search.evaluations > 0);
    assert!(result.starts_reaching_best <= search.starts_succeeded);
    let mut legacy = serde_json::to_value(&result).expect("json");
    legacy.as_object_mut().expect("object").remove("search");
    let old: desvtag_core::designs::optimal::GeneratedOptimal =
        serde_json::from_value(legacy).expect("legacy");
    assert!(old.search.is_none());
    assert_eq!(old.runs, result.runs);
}

#[test]
fn real_search_budget_preserves_a_usable_design_without_claiming_stationarity() {
    let fixture = load();
    let mut spec = spec_of(&fixture["metricCases"][1]["spec"]);
    for index in 3..=4 {
        spec.factors.push(OptimalFactor {
            id: StableId::new(format!("f{index}")).expect("id"),
            name: format!("X{index}"),
            low: 10.0,
            high: 30.0,
        });
    }
    spec.criterion = OptimalCriterion::I;
    spec.runs = 60;
    spec.levels = 5;
    spec.starts = 1;
    spec.seed = 1;
    let result = generate(&spec).expect("limited design");
    let search = result.search.as_ref().expect("search");
    assert_eq!(
        search.selected_stop,
        desvtag_core::designs::optimal::OptimalStop::PassLimit
    );
    assert_eq!(search.starts_limited, 1);
    assert_eq!(search.passes, 60);
    assert_eq!(search.evaluations, 2_246_400);
    assert_eq!(result.runs.len(), 60);
    assert!(result.metrics.log_det.is_some_and(f64::is_finite));
}

#[test]
fn evaluation_accepts_off_grid_points_and_returns_no_metrics_for_valid_singular_designs() {
    let fixture = load();
    let spec = spec_of(&fixture["exchangeCases"][0]["spec"]);
    let metrics = evaluate(&spec, &[vec![-0.25], vec![0.75]]).expect("off grid");
    close(
        metrics.log_det.expect("logdet"),
        0.0,
        "off-grid linear determinant",
    );
    let singular = evaluate(&spec, &[vec![0.25]]).expect("valid singular design");
    assert!(singular.log_det.is_none());
    assert!(singular.i_average.is_none());
}

/// Medição dos piores casos (não roda por padrão):
/// `cargo test --release -p desvtag-core --test optimal_validation -- --ignored --nocapture`.
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
            categories: None,
            blocks: None,
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
