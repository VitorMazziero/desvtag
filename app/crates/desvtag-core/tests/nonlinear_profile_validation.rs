//! NIST certified estimates and independent SciPy Gaussian likelihood profiles.
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::models::nonlinear::{NonlinearRequest, ProfileEndpointStatus, fit};
use serde_json::Value;
fn cases() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/nonlinear_profile/profile.json"
    ))
    .expect("cases")
}
fn close(a: f64, b: f64, tol: f64) {
    assert!((a - b).abs() <= tol * b.abs().max(1e-8), "{a} != {b}");
}
#[test]
fn likelihood_profiles_equal_independent_scipy_and_nist_certificates() {
    for case in cases()["cases"].as_array().expect("cases") {
        let request: NonlinearRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let got = fit(&request).expect("fit");
        assert!(got.converged, "{}", case["name"]);
        close(
            got.sse,
            case["expected"]["sse"].as_f64().expect("sse"),
            2e-7,
        );
        for (i, profile) in got.profiles.as_ref().expect("profiles").iter().enumerate() {
            assert!(
                profile.unimodal_in_examined_range,
                "{} {} {:?}",
                case["name"], i, profile
            );
            assert_eq!(profile.lower_status, ProfileEndpointStatus::Crossing);
            assert_eq!(profile.upper_status, ProfileEndpointStatus::Crossing);
            close(
                profile.lower.value().expect("lower"),
                case["expected"]["intervals"][i][0].as_f64().expect("lower"),
                3e-4,
            );
            close(
                profile.upper.value().expect("upper"),
                case["expected"]["intervals"][i][1].as_f64().expect("upper"),
                3e-4,
            );
            close(
                got.parameters[i].estimate,
                case["expected"]["estimates"][i].as_f64().expect("estimate"),
                2e-5,
            );
        }
        if case["name"] == "nist_misra1d" {
            let c = &case["certified"];
            close(
                got.parameters[0].estimate,
                c["b1"].as_f64().expect("b1"),
                1e-7,
            );
            close(
                1.0 / got.parameters[1].estimate,
                c["b2"].as_f64().expect("b2"),
                1e-7,
            );
            close(
                got.parameters[0].std_error.value().expect("se1"),
                c["stdB1"].as_f64().expect("sd"),
                2e-6,
            );
            close(
                got.parameters[1].std_error.value().expect("se2")
                    / got.parameters[1].estimate.powi(2),
                c["stdB2"].as_f64().expect("sd"),
                2e-6,
            );
            for start in c["starts"].as_array().expect("starts") {
                let mut other = request.clone();
                other.initial = Some(serde_json::from_value(start.clone()).expect("start"));
                other.profile = None;
                let result = fit(&other).expect("published start");
                assert!(result.converged);
                close(result.sse, c["sse"].as_f64().expect("sse"), 2e-8);
            }
        }
    }
}
#[test]
fn domain_bounds_and_exact_fit_are_not_reported_as_finite_profile_limits() {
    let mut request: NonlinearRequest =
        serde_json::from_value(cases()["cases"][0]["request"].clone()).expect("request");
    let base = fit(&request).expect("fit");
    let a = base.parameters[0].estimate;
    request.initial = None;
    request.lower = Some(vec![Some(a * 0.999), None]);
    request.upper = Some(vec![Some(a * 1.001), None]);
    let got = fit(&request).expect("bounded");
    let profile = &got.profiles.expect("profiles")[0];
    assert_eq!(profile.lower_status, ProfileEndpointStatus::DomainBound);
    assert_eq!(profile.upper_status, ProfileEndpointStatus::DomainBound);
    assert!(profile.lower.value().is_none() && profile.upper.value().is_none());
    request.lower = None;
    request.upper = None;
    request.y = request.x.iter().map(|x| 3.0 * x / (2.5 + x)).collect();
    let exact = fit(&request).expect("exact");
    assert!(
        exact
            .profiles
            .expect("profiles")
            .iter()
            .all(|p| p.lower.value().is_none())
    );
}
#[test]
fn invalid_bounds_and_initial_values_never_panic() {
    let request: NonlinearRequest =
        serde_json::from_value(cases()["cases"][0]["request"].clone()).expect("request");
    for bounds in [
        vec![Some(-1.0), None],
        vec![Some(f64::NAN), None],
        vec![Some(10.0), None],
    ] {
        let mut bad = request.clone();
        bad.lower = Some(bounds);
        bad.upper = Some(vec![Some(5.0), None]);
        assert!(fit(&bad).is_err());
    }
    let mut bad = request.clone();
    bad.initial = Some(vec![0.0, 1.0]);
    assert!(fit(&bad).is_err());
    let mut bad = request;
    bad.upper = Some(vec![Some(f64::INFINITY), None]);
    assert!(fit(&bad).is_err());
}
