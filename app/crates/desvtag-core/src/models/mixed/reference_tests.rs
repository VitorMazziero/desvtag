//! Referências independentes SciPy (matriz V densa; não usa o algoritmo de blocos).
#![allow(clippy::expect_used)]
use super::{
    covariance::Structure,
    estimation::{Data, evaluate, fit},
};
use serde::Deserialize;
#[derive(Deserialize)]
struct Fixture {
    cases: Vec<Case>,
}
#[derive(Deserialize)]
struct Case {
    name: String,
    structure: String,
    x: Vec<Vec<f64>>,
    y: Vec<f64>,
    times: Vec<f64>,
    groups: Vec<Vec<usize>>,
    q: usize,
    expected: Expected,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Expected {
    nll: f64,
    beta: Vec<f64>,
    fixed_covariance: Vec<f64>,
    theta: Vec<f64>,
    boundary: bool,
}
fn close(a: f64, b: f64, tol: f64, label: &str) {
    assert!((a - b).abs() < tol, "{label}: {a} != {b} (tol {tol})");
}
#[test]
fn reml_covariances_equal_independent_dense_scipy() {
    let fixture: Fixture = serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../validation/cases/repeated_covariance/reml.json"
    )))
    .expect("fixture");
    for c in fixture.cases {
        let structure = match c.structure.as_str() {
            "cs" => Structure::CompoundSymmetry,
            "ar1" => Structure::Ar1,
            "unstructured" => Structure::Unstructured,
            _ => unreachable!(),
        };
        let data = Data {
            budget: crate::models::resource_budget::WorkBudget::new(
                super::MAX_ALGEBRA_WORK,
                "budget.mixed_units",
            ),
            x: c.x,
            y: c.y,
            times: c.times,
            groups: c.groups,
            occasions: (0..c.q).map(|i| i as f64).collect(),
            scale: 1.,
        };
        let at_reference = evaluate(&data, structure, &c.expected.theta, c.expected.boundary)
            .expect("reference evaluates");
        close(at_reference.nll, c.expected.nll, 1e-10, &c.name);
        let got = fit(&data, structure).expect("convergent REML");
        assert_eq!(got.boundary, c.expected.boundary, "{}", c.name);
        close(got.solution.nll, c.expected.nll, 2e-7, &c.name);
        for (a, b) in got.solution.beta.iter().zip(&c.expected.beta) {
            close(*a, *b, 2e-5, &c.name);
        }
        for (a, b) in got
            .solution
            .covariance
            .iter()
            .zip(&c.expected.fixed_covariance)
        {
            close(*a, *b, 3e-5, &c.name);
        }
        for (a, b) in got.optimum.theta.iter().zip(&c.expected.theta) {
            close(*a, *b, 2e-4, &c.name);
        }
        assert!(got.optimum.gradient_norm < 2e-5);
        assert!(got.optimum.iterations > 0);
    }
}
