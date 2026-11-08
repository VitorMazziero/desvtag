//! Extreme, nontrivial noncentral tails against independent SciPy.
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::distributions::noncentral::{ncf_sf, nct_cdf};
use serde_json::Value;
fn value(v: &Value, key: &str) -> f64 {
    v[key].as_f64().expect("number")
}
#[test]
fn centered_poisson_and_conditional_quadrature_match_independent_scipy() {
    let cases: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/noncentral_extreme/tails.json"
    ))
    .expect("cases");
    for c in cases["f"].as_array().expect("F cases") {
        let got = ncf_sf(
            value(c, "x"),
            value(c, "d1"),
            value(c, "d2"),
            value(c, "noncentrality"),
        );
        assert!(
            (got - value(c, "expected")).abs() < 2e-9,
            "F {c}: got {got}"
        );
    }
    for c in cases["t"].as_array().expect("t cases") {
        let got = nct_cdf(value(c, "x"), value(c, "df"), value(c, "noncentrality"));
        assert!(
            (got - value(c, "expected")).abs() < 2e-9,
            "t {c}: got {got}"
        );
    }
}
#[test]
fn extreme_budget_never_runs_an_unbounded_loop_or_invents_a_tail() {
    assert_eq!(ncf_sf(3.0, 2.0, 20.0, 1e100), 1.0);
    assert!(ncf_sf(1e100, 2.0, 1.0, 1e100).is_nan());
    for invalid in [f64::NAN, f64::INFINITY, -1.0] {
        assert!(ncf_sf(3.0, 2.0, 20.0, invalid).is_nan());
    }
    assert!(nct_cdf(1.0, f64::INFINITY, 40.0).is_nan());
    assert_eq!(ncf_sf(0.0, 1.0, 1.0, 100.0), 1.0);
    assert_eq!(ncf_sf(f64::INFINITY, 1.0, 1.0, 100.0), 0.0);
}

#[test]
fn large_effect_and_small_sample_power_does_not_turn_into_false_certainty() {
    let cases: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/noncentral_extreme/tails.json"
    ))
    .expect("cases");
    let request: desvtag_core::power::PowerRequest =
        serde_json::from_value(cases["power"]["request"].clone()).expect("request");
    let result = desvtag_core::power::analyze(&request).expect("power");
    assert!(
        (result.power.value().expect("defined")
            - cases["power"]["expected"].as_f64().expect("reference"))
        .abs()
            < 2e-9
    );
    assert!(result.power.value().expect("defined") < 0.6);
    let outside = desvtag_core::power::PowerRequest {
        design: desvtag_core::power::PowerDesign::Anova {
            means: vec![0.0, 100000.0],
        },
        alpha: 1e-12,
        ..request
    };
    let error =
        desvtag_core::power::analyze(&outside).expect_err("not certified within numerical budget");
    let desvtag_core::errors::CoreError::InvalidInput(issues) = error;
    assert!(issues.iter().any(|i| i.code == "power.numerical_failure"));
    assert!(ncf_sf(1.0, 0.5, 1.0, 1e100).is_nan());
}
