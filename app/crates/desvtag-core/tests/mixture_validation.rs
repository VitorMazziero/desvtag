//! Misturas contra as referências independentes em Python
//! (`validation/tools/make_mixture_cases.py`): geração (itertools + PCG32) e modelos de Scheffé
//! (statsmodels OLS sem intercepto, ANOVA centrada).
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use std::fs;
use std::path::PathBuf;

use desvtag_core::designs::mixture::{MixtureComponent, MixtureKind, MixtureSpec, generate};
use desvtag_core::domain::StableId;
use desvtag_core::models::mixture::{MixtureAnalysisRequest, MixtureModel, analyze};
use serde_json::Value;

fn load(relative: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../validation/cases")
        .join(relative);
    serde_json::from_str(&fs::read_to_string(path).expect("arquivo")).expect("json")
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

#[test]
fn designs_equal_the_independent_implementation() {
    let v = load("mixture_design/mixture.json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 6);
    for c in cases {
        let q = usize::try_from(c["q"].as_u64().expect("q")).expect("usize");
        let lowers = floats(&c["lowers"]);
        let kind = if c["kind"] == "lattice" {
            MixtureKind::Lattice {
                degree: u32::try_from(c["degree"].as_u64().expect("grau")).expect("u32"),
            }
        } else {
            MixtureKind::Centroid
        };
        let spec = MixtureSpec {
            upper_bounds: None,
            components: (0..q)
                .map(|i| MixtureComponent {
                    id: StableId::new(format!("f{}", i + 1)).expect("id"),
                    name: format!("C{}", i + 1),
                    lower: lowers[i],
                })
                .collect(),
            kind,
            replicates: u32::try_from(c["replicates"].as_u64().expect("repetições")).expect("u32"),
            center_points: u32::try_from(c["centerPoints"].as_u64().expect("centrais"))
                .expect("u32"),
            randomize: c["randomize"].as_bool().expect("bool"),
            seed: c["seed"].as_u64().expect("semente"),
        };
        let got = generate(&spec).expect("planejamento");
        assert_eq!(
            u64::from(got.base_points),
            c["baseCount"].as_u64().expect("base")
        );
        let want = c["runs"].as_array().expect("ensaios");
        assert_eq!(got.runs.len(), want.len(), "semente {}", spec.seed);
        for (r, w) in got.runs.iter().zip(want) {
            assert_eq!(
                u64::from(r.standard_order),
                w["standardOrder"].as_u64().expect("ordem")
            );
            assert_eq!(
                u64::from(r.support),
                w["support"].as_u64().expect("suporte")
            );
            assert_eq!(r.extra_center, w["extraCenter"].as_bool().expect("central"));
            assert_eq!(
                u64::from(r.replicate),
                w["replicate"].as_u64().expect("repetição")
            );
            for (a, b) in r.pseudo.iter().zip(floats(&w["pseudo"])) {
                close(*a, b, 0.0, 1e-14, "pseudo");
            }
            for (a, b) in r.proportions.iter().zip(floats(&w["proportions"])) {
                close(*a, b, 0.0, 1e-14, "proporção");
            }
        }
    }
}

#[test]
fn bounded_vertices_edges_and_subdivisions_match_scipy_halfspaces() {
    let fixture = load("mixture_design/mixture.json");
    let cases = fixture["boundedCases"].as_array().expect("bounded cases");
    assert_eq!(cases.len(), 7);
    for case in cases {
        let lower = floats(&case["lower"]);
        let spec = MixtureSpec {
            components: lower
                .iter()
                .enumerate()
                .map(|(index, &value)| MixtureComponent {
                    id: StableId::new(format!("c{index}")).expect("id"),
                    name: format!("C{index}"),
                    lower: value,
                })
                .collect(),
            upper_bounds: Some(floats(&case["upper"])),
            kind: MixtureKind::ExtremeVertices {
                degree: case["degree"].as_u64().expect("degree") as u32,
            },
            replicates: 2,
            center_points: 1,
            randomize: true,
            seed: 19,
        };
        let result = generate(&spec);
        if case["feasible"] == false {
            assert!(result.is_err(), "{}", case["name"]);
            continue;
        }
        let result = result.expect("bounded design");
        let region = result.region.as_ref().expect("region");
        assert_eq!(
            u64::from(region.dimension),
            case["dimension"].as_u64().expect("dimension")
        );
        let expected: Vec<_> = case["base"]
            .as_array()
            .expect("points")
            .iter()
            .map(floats)
            .collect();
        assert_eq!(
            result.base_points as usize,
            expected.len(),
            "{}",
            case["name"]
        );
        assert_eq!(
            region.vertices.len(),
            case["vertices"].as_array().expect("vertices").len()
        );
        assert_eq!(
            region.edges.len(),
            case["edges"].as_array().expect("edges").len()
        );
        assert_eq!(result.total as usize, 2 * expected.len() + 1);
        for row in &result.runs {
            let candidates = if row.extra_center {
                vec![floats(&case["vertexMean"])]
            } else {
                expected.clone()
            };
            assert!(
                candidates.iter().any(|candidate| candidate
                    .iter()
                    .zip(&row.proportions)
                    .all(|(a, b)| (a - b).abs() < 1e-10)),
                "{} {:?}",
                case["name"],
                row
            );
            close(row.proportions.iter().sum(), 1.0, 0.0, 1e-12, "sum");
        }
        assert_eq!(result.runs, generate(&spec).expect("repeat").runs);
    }
}

#[test]
fn scheffe_models_equal_statsmodels() {
    let v = load("mixture_model/scheffe.json");
    let cases = v["cases"].as_array().expect("casos");
    assert!(cases.len() >= 5);
    for c in cases {
        let name = c["name"].as_str().expect("nome");
        let r = &c["request"];
        let model = match r["model"].as_str().expect("modelo") {
            "linear" => MixtureModel::Linear,
            "quadratic" => MixtureModel::Quadratic,
            _ => MixtureModel::SpecialCubic,
        };
        let request = MixtureAnalysisRequest {
            optimization: None,
            cox_reference: None,
            upper_bounds: None,
            component_names: r["componentNames"]
                .as_array()
                .expect("nomes")
                .iter()
                .map(|s| s.as_str().expect("texto").to_string())
                .collect(),
            lower_bounds: floats(&r["lowerBounds"]),
            proportions: r["proportions"]
                .as_array()
                .expect("linhas")
                .iter()
                .map(floats)
                .collect(),
            response: floats(&r["response"]),
            model,
            alpha: r["alpha"].as_f64().expect("alfa"),
        };
        let got = analyze(&request).expect("ajuste");
        let e = &c["expected"];
        assert_eq!(
            u64::from(got.fit.rank),
            e["rank"].as_u64().expect("posto"),
            "{name}"
        );
        assert_eq!(
            u64::from(got.fit.df_residual),
            e["dfResidual"].as_u64().expect("gl"),
            "{name}"
        );
        let want = e["coefficients"].as_array().expect("coeficientes");
        assert_eq!(got.fit.coefficients.len(), want.len(), "{name}");
        for (row, w) in got.fit.coefficients.iter().zip(want) {
            let stat = |s: &desvtag_core::descriptive::Stat| s.value().expect("definido");
            close(
                stat(&row.estimate),
                w["estimate"].as_f64().expect("b"),
                1e-9,
                1e-9,
                &format!("{name} b"),
            );
            close(
                stat(&row.std_error),
                w["stdError"].as_f64().expect("se"),
                1e-9,
                1e-10,
                &format!("{name} se"),
            );
            close(
                stat(&row.t_value),
                w["t"].as_f64().expect("t"),
                1e-8,
                1e-9,
                &format!("{name} t"),
            );
            close(
                stat(&row.p_value),
                w["p"].as_f64().expect("p"),
                1e-7,
                1e-12,
                &format!("{name} p"),
            );
            close(
                stat(&row.ci_lower),
                w["ciLower"].as_f64().expect("ic"),
                1e-8,
                1e-9,
                &format!("{name} ic−"),
            );
            close(
                stat(&row.ci_upper),
                w["ciUpper"].as_f64().expect("ic"),
                1e-8,
                1e-9,
                &format!("{name} ic+"),
            );
        }
        let a = &got.fit.anova;
        close(
            a.total.sum_squares.value().expect("sst"),
            e["ssTotal"].as_f64().expect("sst"),
            1e-10,
            1e-10,
            "SST",
        );
        close(
            a.residual.sum_squares.value().expect("sse"),
            e["ssResidual"].as_f64().expect("sse"),
            1e-8,
            1e-10,
            "SSE",
        );
        close(
            a.f.value().expect("f"),
            e["f"].as_f64().expect("f"),
            1e-8,
            1e-9,
            &format!("{name} F"),
        );
        close(
            a.p_value.value().expect("p"),
            e["pValue"].as_f64().expect("p"),
            1e-7,
            1e-12,
            &format!("{name} p-F"),
        );
        close(
            a.r_squared.value().expect("r2"),
            e["rSquared"].as_f64().expect("r2"),
            1e-10,
            1e-12,
            "R²",
        );
        close(
            a.adjusted_r_squared.value().expect("r2aj"),
            e["adjustedRSquared"].as_f64().expect("r2aj"),
            1e-9,
            1e-12,
            "R² ajustado",
        );
    }
}

#[test]
fn bounded_analysis_predicts_only_estimable_points_in_the_declared_region() {
    let fixture = load("mixture_design/mixture.json");
    let points: Vec<_> = fixture["boundedCases"][0]["base"]
        .as_array()
        .expect("points")
        .iter()
        .map(floats)
        .collect();
    let truth = |p: &[f64]| 10.0 * p[0] + 20.0 * p[1] + 30.0 * p[2] + 8.0 * p[0] * p[1];
    let mut request = MixtureAnalysisRequest {
        optimization: None,
        cox_reference: None,
        component_names: vec!["A".into(), "B".into(), "C".into()],
        lower_bounds: vec![0.0; 3],
        upper_bounds: Some(vec![0.6; 3]),
        response: points.iter().map(|row| truth(row)).collect(),
        proportions: points,
        model: MixtureModel::Quadratic,
        alpha: 0.05,
    };
    let result = analyze(&request).expect("bounded fit");
    assert_eq!(result.fit.rank, 6);
    assert_eq!(result.grid_divisions, Some(24));
    assert_eq!(result.region.as_ref().expect("region").vertices.len(), 6);
    assert!(!result.grid.is_empty());
    assert!(result.grid.len() < 325);
    for point in &result.grid {
        assert!(point.proportions.iter().all(|x| *x <= 0.6 + 1e-12));
        close(
            point.value,
            truth(&point.proportions),
            1e-9,
            1e-9,
            "bounded prediction",
        );
    }
    request.proportions[0] = vec![0.7, 0.2, 0.1];
    assert!(analyze(&request).is_err());
    request.upper_bounds = Some(vec![0.6, 0.6]);
    assert!(analyze(&request).is_err());
}

#[test]
fn non_estimable_mixture_predictions_are_not_filled_with_zero_coefficients() {
    let request = MixtureAnalysisRequest {
        optimization: None,
        cox_reference: None,
        component_names: vec!["A".into(), "B".into(), "C".into()],
        lower_bounds: vec![0.0; 3],
        upper_bounds: None,
        proportions: vec![
            vec![1.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
            vec![0.5, 0.5, 0.0],
        ],
        response: vec![10.0, 20.0, 15.0],
        model: MixtureModel::Linear,
        alpha: 0.05,
    };
    let result = analyze(&request).expect("rank deficient fit");
    assert_eq!(result.fit.rank, 2);
    assert_eq!(result.grid_divisions, Some(24));
    assert!(result.grid.iter().all(|point| point.proportions[2] == 0.0));
    assert!(
        result
            .issues
            .iter()
            .any(|issue| issue.code == "mixture.predictions_not_estimable")
    );
    let mut quadratic = request;
    quadratic.proportions = vec![
        vec![1.0, 0.0, 0.0],
        vec![0.0, 1.0, 0.0],
        vec![0.0, 0.0, 1.0],
    ];
    quadratic.response = vec![10.0, 20.0, 30.0];
    quadratic.model = MixtureModel::Quadratic;
    let sparse = analyze(&quadratic).expect("vertex-only fit");
    assert_eq!(sparse.grid.len(), 3);
    assert_eq!(sparse.grid_divisions, Some(24));
}

#[test]
fn cox_paths_equal_independent_lp_and_lstsq_references() {
    let fixture = load("mixture_model/cox.json");
    for case in fixture["cases"].as_array().expect("cases") {
        let request: MixtureAnalysisRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = analyze(&request).expect("fit");
        let trace = result.cox_trace.expect("trace");
        let expected = case["series"].as_array().expect("series");
        assert_eq!(trace.series.len(), expected.len());
        for (series, want) in trace.series.iter().zip(expected) {
            assert_eq!(
                u64::from(series.component),
                want["component"].as_u64().expect("component")
            );
            if want["interval"].is_null() {
                assert!(series.interval.is_none());
                assert!(series.points.is_empty());
                assert!(
                    result
                        .issues
                        .iter()
                        .any(|issue| issue.code == "mixture.cox_direction_undefined")
                );
                continue;
            }
            let interval = series.interval.expect("interval");
            for (value, want) in interval.iter().zip(floats(&want["interval"])) {
                close(*value, want, 0.0, 1e-10, "interval");
            }
            let points = want["points"].as_array().expect("points");
            assert_eq!(series.points.len(), points.len(), "{}", case["name"]);
            assert!(series.points.iter().any(|point| point.delta == 0.0));
            for (point, want) in series.points.iter().zip(points) {
                close(
                    point.delta,
                    want["delta"].as_f64().expect("delta"),
                    0.0,
                    1e-10,
                    "delta",
                );
                close(point.proportions.iter().sum(), 1.0, 0.0, 1e-12, "sum");
                for (value, want) in point.proportions.iter().zip(floats(&want["proportions"])) {
                    close(*value, want, 0.0, 1e-10, "real");
                }
                for (value, want) in point.pseudo.iter().zip(floats(&want["pseudo"])) {
                    close(*value, want, 0.0, 1e-10, "pseudo");
                }
                if let Some(value) = want["value"].as_f64() {
                    close(
                        point.value.value().expect("defined"),
                        value,
                        1e-8,
                        1e-8,
                        &format!(
                            "{} component {} delta {} prediction",
                            case["name"], series.component, point.delta
                        ),
                    );
                } else {
                    assert_eq!(
                        point.value,
                        desvtag_core::descriptive::Stat::Undefined {
                            reason: desvtag_core::descriptive::UndefinedReason::NotEstimable
                        }
                    );
                }
            }
        }
    }
}

#[test]
fn cox_reference_rejects_invalid_sum_shape_bounds_and_nonfinite_values() {
    let fixture = load("mixture_model/cox.json");
    let original: MixtureAnalysisRequest =
        serde_json::from_value(fixture["cases"][1]["request"].clone()).expect("request");
    for reference in [
        vec![0.2, 0.3, 0.4],
        vec![0.5, 0.5],
        vec![0.7, 0.2, 0.1],
        vec![-0.1, 0.5, 0.6],
        vec![f64::NAN, 0.5, 0.5],
        vec![f64::INFINITY, 0.5, 0.5],
    ] {
        let mut request = original.clone();
        request.cox_reference = Some(reference);
        assert!(
            std::panic::catch_unwind(|| analyze(&request))
                .expect("no panic")
                .is_err()
        );
    }
    let mut rounded = original;
    rounded.cox_reference = Some(vec![0.25, 0.35, 0.4000000001]);
    let trace = analyze(&rounded)
        .expect("roundoff sum")
        .cox_trace
        .expect("trace");
    close(
        trace.reference.iter().sum(),
        1.0,
        0.0,
        1e-15,
        "normalized reference",
    );
}

#[test]
fn simplex_optimization_matches_independent_lp_slsqp_and_grid_references() {
    let fixture = load("mixture_model/optimization.json");
    for case in fixture["cases"].as_array().expect("cases") {
        let request: MixtureAnalysisRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = analyze(&request);
        if let Some(code) = case["expectedError"].as_str() {
            let desvtag_core::errors::CoreError::InvalidInput(issues) =
                result.expect_err("domain refusal");
            assert!(
                issues.iter().any(|issue| issue.code == code),
                "{} {:?}",
                case["name"],
                issues
            );
            continue;
        }
        assert!(result.is_ok(), "{} {:?}", case["name"], result);
        let result = result.expect("reference fit").optimum.expect("optimum");
        assert!(result.evaluations <= result.evaluation_budget);
        if let Some(limit) = case["maximumEvaluations"].as_u64() {
            assert!(
                u64::from(result.evaluations) < limit,
                "{}: {} evaluations",
                case["name"],
                result.evaluations
            );
        }
        assert_eq!(
            result.evaluations,
            result
                .starts
                .iter()
                .map(|start| start.evaluations)
                .sum::<u32>()
        );
        if case["feasible"] == false {
            assert_eq!(
                result.status,
                desvtag_core::optimization::optimize::OptimizationStatus::Infeasible,
                "{}",
                case["name"]
            );
            assert!(result.candidates.is_empty());
            continue;
        }
        let best = result.candidates.first().expect("feasible candidate");
        close(
            best.desirability,
            case["bestDesirability"].as_f64().expect("desirability"),
            0.0,
            1e-6,
            &format!("{} desirability", case["name"]),
        );
        for candidate in &result.candidates {
            close(candidate.proportions.iter().sum(), 1.0, 0.0, 1e-10, "sum");
            for (i, x) in candidate.proportions.iter().enumerate() {
                assert!(*x >= request.lower_bounds[i] - 1e-10);
                assert!(*x <= request.upper_bounds.as_ref().expect("upper")[i] + 1e-10);
            }
            assert!(
                candidate.predictions.iter().all(|prediction| prediction
                    .prediction
                    .fitted
                    .value()
                    .is_some())
            );
        }
    }
}

#[test]
fn simplex_search_reports_actual_global_budget_and_retains_feasible_candidates() {
    let fixture = load("mixture_model/optimization.json");
    let mut request: MixtureAnalysisRequest =
        serde_json::from_value(fixture["cases"][7]["request"].clone()).expect("request");
    let spec = request.optimization.as_mut().expect("spec");
    spec.setup.search.starts = 128;
    spec.setup.responses[0].goal = desvtag_core::optimization::Goal::Range {
        low: 0.0,
        high: 50.0,
    };
    let result = analyze(&request)
        .expect("limited search")
        .optimum
        .expect("optimum");
    assert!(result.budget_reached);
    assert_eq!(result.evaluations, result.evaluation_budget);
    assert!(result.starts.len() < 128);
    assert_eq!(
        result.starts.last().expect("last").stop,
        desvtag_core::optimization::mixture::MixtureStartStop::EvaluationBudget
    );
    assert_eq!(result.candidates[0].desirability, 1.0);
    assert!(
        result
            .issues
            .iter()
            .any(|issue| issue.code == "mixture.optimization_search_budget")
    );
}

#[test]
fn simplex_configuration_rejects_adversarial_inputs_before_fitting() {
    let fixture = load("mixture_model/optimization.json");
    let original: MixtureAnalysisRequest =
        serde_json::from_value(fixture["cases"][0]["request"].clone()).expect("request");
    for variant in 0..10 {
        let mut request = original.clone();
        let spec = request.optimization.as_mut().expect("spec");
        match variant {
            0 => spec.setup.search.starts = 0,
            1 => spec.setup.search.starts = 129,
            2 => spec.setup.responses[0].importance = f64::NAN,
            3 => spec.data[0].response[0] = f64::INFINITY,
            4 => spec.data[0].proportions[0].pop().map(|_| ()).unwrap_or(()),
            5 => spec.data.push(spec.data[0].clone()),
            6 => spec.setup.responses.push(spec.setup.responses[0].clone()),
            7 => spec.setup.alpha = 0.2,
            8 => spec.setup.search.cluster_tolerance = -1.0,
            _ => {
                spec.setup.responses[0].goal = desvtag_core::optimization::Goal::Maximize {
                    low: 2.0,
                    target: 1.0,
                    shape: 1.0,
                }
            }
        }
        assert!(
            std::panic::catch_unwind(|| analyze(&request))
                .expect("no panic")
                .is_err(),
            "variant {variant}"
        );
    }
}
