//! Ajuste avançado contra SciPy densa e inferência independente.
#![allow(clippy::expect_used)]
use desvtag_core::models::mixed::{MixedModelRequest, fit};
use serde_json::{Value, json};
fn fixture() -> Value {
    serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../validation/cases/repeated_covariance/reml.json"
    )))
    .expect("fixture")
}
fn request(case: &Value) -> MixedModelRequest {
    let observations:Vec<Value>=case["rows"].as_array().expect("rows").iter().enumerate().map(|(i,r)|json!({"id":format!("o{}",i+1),"unitId":r["unit"],"factors":[],"responses":[r["y"]]})).collect();
    serde_json::from_value(json!({"dataset":{"factors":[],"responses":[{"id":"y","name":"Response","unit":null}],"observations":observations},"spec":{"responseId":"y","intercept":true,"terms":[],"coding":"treatment","confidenceLevel":0.95},"advanced":{"covariance":if case["structure"]=="cs" {"compoundSymmetry"} else {case["structure"].as_str().expect("structure")},"times":case["times"],"timeEffect":"categorical","marginalFactors":[],"marginalTime":true,"adjustment":"bonferroni","references":[]}})).expect("request")
}
fn num(v: &Value) -> f64 {
    v.as_f64().expect("number")
}
fn close(a: f64, b: f64, tolerance: f64, label: &str) {
    assert!(
        (a - b).abs() <= 1e-7 + tolerance * b.abs(),
        "{label}: {a} != {b}"
    );
}
#[test]
fn advanced_reml_inference_emm_and_profiles_equal_dense_scipy() {
    for case in fixture()["cases"].as_array().expect("cases") {
        let name = case["name"].as_str().expect("name");
        let expected = &case["expected"];
        let result = fit(&request(case)).expect("fit");
        assert_eq!(result.provenance.method_version, 2);
        let advanced = result.advanced.as_ref().expect("advanced");
        assert!(advanced.inference_available, "{name}");
        close(
            advanced.reml_log_likelihood,
            -num(&expected["nll"]),
            1e-9,
            name,
        );
        for (got, want) in result
            .coefficients
            .iter()
            .zip(expected["coefficients"].as_array().expect("coefficients"))
        {
            close(got.estimate, num(&want["estimate"]), 1e-5, name);
            close(
                got.std_error.value().expect("se"),
                num(&want["stdError"]),
                3e-5,
                name,
            );
            close(got.df.value().expect("df"), num(&want["df"]), 0.003, name);
            close(
                got.p_value.value().expect("p"),
                num(&want["pValue"]),
                0.003,
                name,
            );
        }
        let test = &advanced.term_tests[0];
        let reference = &expected["termTest"];
        close(
            test.f_value.value().expect("F"),
            num(&reference["f"]),
            3e-5,
            name,
        );
        close(
            test.denominator_df.value().expect("df"),
            num(&reference["denominatorDf"]),
            0.003,
            name,
        );
        close(
            test.p_value.value().expect("p"),
            num(&reference["pValue"]),
            0.003,
            name,
        );
        for (got, want) in advanced
            .marginal_means
            .iter()
            .zip(expected["means"].as_array().expect("means"))
        {
            close(got.inference.estimate, num(&want["estimate"]), 1e-5, name);
            close(
                got.inference.ci_lower.value().expect("lower"),
                num(&want["ciLower"]),
                0.003,
                name,
            );
            close(
                got.inference.df.value().expect("df"),
                num(&want["df"]),
                0.003,
                name,
            );
        }
        for (got, want) in advanced
            .comparisons
            .iter()
            .zip(expected["comparisons"].as_array().expect("comparisons"))
        {
            close(got.inference.estimate, num(&want["estimate"]), 1e-5, name);
            close(
                got.adjusted_p_value.value().expect("adjusted"),
                num(&want["adjustedPValue"]),
                0.003,
                name,
            );
            close(
                got.inference.ci_lower.value().expect("lower"),
                num(&want["ciLower"]),
                0.003,
                name,
            );
        }
        assert_eq!(
            advanced.profiles.len(),
            case["rows"].as_array().expect("rows").len()
        );
        assert_eq!(
            advanced.mean_profiles.len(),
            case["q"].as_u64().expect("q") as usize
        );
        for point in &advanced.profiles {
            close(
                point.observed - point.population,
                point.residual,
                1e-12,
                name,
            );
        }
        if case["structure"] == "unstructured" {
            assert!(result.variance_unit.value().is_none());
            assert!(result.icc.value().is_none());
            assert!(result.random_effects.is_empty());
            assert!(
                advanced
                    .profiles
                    .iter()
                    .all(|p| p.conditional.value().is_none())
            );
            for (got, want) in advanced
                .covariance_matrix
                .iter()
                .zip(expected["matrix"].as_array().expect("matrix"))
            {
                close(*got, num(want), 3e-5, name);
            }
        }
    }
}
#[test]
fn requested_structure_is_not_replaced_on_invalid_time_or_missing_pairs() {
    let c = &fixture()["cases"][1];
    let mut r = request(c);
    r.advanced
        .as_mut()
        .expect("advanced")
        .times
        .as_mut()
        .expect("times")[1] = Some(0.);
    assert!(fit(&r).is_err());
    let mut r = request(c);
    r.advanced
        .as_mut()
        .expect("advanced")
        .times
        .as_mut()
        .expect("times")[1] = Some(0.5);
    assert!(fit(&r).is_err());
    let mut r = request(c);
    r.advanced.as_mut().expect("advanced").times = Some(vec![None; r.dataset.observations.len()]);
    assert!(fit(&r).is_err());
}

#[test]
fn factorial_interactions_covariate_reference_and_holm_equal_scipy() {
    let fixture: Value = serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../validation/cases/repeated_covariance/factorial.json"
    )))
    .expect("factorial fixture");
    for case in fixture["cases"].as_array().expect("cases") {
        let request: MixedModelRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = fit(&request).expect("factorial fit");
        let advanced = result.advanced.expect("advanced");
        let want = &case["expected"];
        let name = case["name"].as_str().expect("name");
        assert_eq!(advanced.term_tests.len(), 4);
        assert_eq!(advanced.marginal_means.len(), 3);
        assert_eq!(advanced.comparisons.len(), 3);
        assert_eq!(advanced.reference_grid.cells, 9);
        close(advanced.reference_grid.numeric[0].value, 2.25, 1e-12, name);
        close(advanced.reml_log_likelihood, -num(&want["nll"]), 1e-9, name);
        for (got, want) in result
            .coefficients
            .iter()
            .zip(want["beta"].as_array().expect("beta"))
        {
            close(got.estimate, num(want), 1e-5, name);
        }
        for (got, want) in advanced
            .term_tests
            .iter()
            .zip(want["termTests"].as_array().expect("term tests"))
        {
            close(got.f_value.value().expect("F"), num(&want["f"]), 3e-5, name);
            close(
                got.denominator_df.value().expect("df"),
                num(&want["df"]),
                0.003,
                name,
            );
            close(
                got.p_value.value().expect("p"),
                num(&want["pValue"]),
                0.003,
                name,
            );
        }
        for (got, want) in advanced
            .marginal_means
            .iter()
            .zip(want["means"].as_array().expect("means"))
        {
            close(got.inference.estimate, num(&want["estimate"]), 1e-5, name);
            close(
                got.inference.df.value().expect("df"),
                num(&want["df"]),
                0.003,
                name,
            );
            close(
                got.inference.ci_upper.value().expect("upper"),
                num(&want["ciUpper"]),
                0.003,
                name,
            );
        }
        for (got, want) in advanced
            .comparisons
            .iter()
            .zip(want["comparisons"].as_array().expect("comparisons"))
        {
            close(got.inference.estimate, num(&want["estimate"]), 1e-5, name);
            close(
                got.adjusted_p_value.value().expect("Holm p"),
                num(&want["adjustedPValue"]),
                0.003,
                name,
            );
            close(
                got.inference.ci_upper.value().expect("Bonferroni upper"),
                num(&want["ciUpper"]),
                0.003,
                name,
            );
        }
        let one = &advanced.term_tests[3];
        let coefficient = &result.coefficients[9];
        close(
            one.f_value.value().expect("F1"),
            coefficient.t_value.value().expect("t").powi(2),
            1e-12,
            name,
        );
        close(
            one.p_value.value().expect("p F1"),
            coefficient.p_value.value().expect("p t"),
            1e-10,
            name,
        );
    }
}
fn code(request: &MixedModelRequest, expected: &str) {
    let desvtag_core::errors::CoreError::InvalidInput(issues) =
        fit(request).expect_err("invalid request");
    assert!(
        issues.iter().any(|i| i.code == expected),
        "wanted {expected}, got {issues:?}"
    );
}
#[test]
fn unidentifiable_covariances_and_invalid_occasion_labels_are_explicit() {
    let fixture = fixture();
    let mut two = request(&fixture["cases"][1]);
    let mut observations = Vec::new();
    let mut times = Vec::new();
    for (o, t) in two.dataset.observations.iter().zip(
        two.advanced
            .as_ref()
            .expect("advanced")
            .times
            .as_ref()
            .expect("times"),
    ) {
        if t.is_some_and(|v| v < 2.) {
            observations.push(o.clone());
            times.push(*t);
        }
    }
    two.dataset.observations = observations;
    two.advanced.as_mut().expect("advanced").times = Some(times);
    code(&two, "mixed.ar1_not_identifiable");
    let mut even = request(&fixture["cases"][1]);
    for time in even
        .advanced
        .as_mut()
        .expect("advanced")
        .times
        .as_mut()
        .expect("times")
        .iter_mut()
        .flatten()
    {
        *time *= 2.;
    }
    code(&even, "mixed.ar1_not_identifiable");
    let mut invalid = request(&fixture["cases"][1]);
    invalid.advanced.as_mut().expect("advanced").time_labels = vec![
        desvtag_core::models::mixed::MixedTimeLabel {
            index: 0.,
            label: "Before".into(),
        },
        desvtag_core::models::mixed::MixedTimeLabel {
            index: 0.,
            label: "After".into(),
        },
    ];
    code(&invalid, "mixed.invalid_time_values");
}
#[test]
fn missing_time_is_excluded_by_name_and_permuting_input_preserves_the_fit() {
    let fixture = fixture();
    let mut missing = request(&fixture["cases"][1]);
    missing
        .advanced
        .as_mut()
        .expect("advanced")
        .times
        .as_mut()
        .expect("times")[0] = None;
    let result = fit(&missing).expect("fit excludes missing time");
    assert_eq!(
        result.n_observations + 1,
        missing.dataset.observations.len() as u32
    );
    assert!(
        result
            .excluded
            .iter()
            .any(|e| e.observation_id == missing.dataset.observations[0].id
                && e.reason == desvtag_core::models::design_matrix::ExclusionReason::MissingTime)
    );
    let original = request(&fixture["cases"][1]);
    let original_fit = fit(&original).expect("fit");
    let mut permuted = original.clone();
    permuted.dataset.observations.reverse();
    permuted
        .advanced
        .as_mut()
        .expect("advanced")
        .times
        .as_mut()
        .expect("times")
        .reverse();
    let result = fit(&permuted).expect("permuted");
    for (a, b) in result.coefficients.iter().zip(&original_fit.coefficients) {
        close(a.estimate, b.estimate, 1e-8, "permutation");
        close(
            a.std_error.value().expect("se"),
            b.std_error.value().expect("se"),
            1e-6,
            "permutation",
        );
    }
}

#[test]
fn zero_rank_term_is_undefined_instead_of_an_invented_f_test() {
    use desvtag_core::{
        descriptive::{Stat, UndefinedReason},
        domain::{Factor, FactorKind, FactorValue},
        models::{
            mixed::{MixedCovariance, MixedTimeEffect},
            terms::TermSpec,
        },
    };
    let fixture = fixture();
    let mut request = request(&fixture["cases"][0]);
    let id = desvtag_core::domain::StableId::new("constant").expect("id");
    request.dataset.factors.push(Factor {
        id: id.clone(),
        name: "Constant level".into(),
        kind: FactorKind::Categorical,
        unit: None,
        levels: vec!["A".into()],
    });
    for row in &mut request.dataset.observations {
        row.factors.push(Some(FactorValue::Text("A".into())));
    }
    request.spec.terms = vec![TermSpec::Main { factor_id: id }];
    let config = request.advanced.as_mut().expect("advanced");
    config.covariance = MixedCovariance::CompoundSymmetry;
    config.time_effect = MixedTimeEffect::None;
    config.marginal_time = false;
    let result = fit(&request).expect("remaining model is estimable");
    let test = &result.advanced.expect("advanced").term_tests[0];
    assert_eq!(test.numerator_df, 0);
    assert!(matches!(
        test.f_value,
        Stat::Undefined {
            reason: UndefinedReason::NotEstimable
        }
    ));
    assert!(test.p_value.value().is_none());
}

#[test]
fn reference_grid_budget_is_an_explicit_error_before_large_cartesian_allocation() {
    use desvtag_core::domain::{Factor, FactorKind, FactorValue, StableId};
    use desvtag_core::models::{mixed::MixedTimeEffect, terms::TermSpec};
    let fixture = fixture();
    let mut request = request(&fixture["cases"][0]);
    request.spec.terms.clear();
    // Keep the fixed matrix at its 64-column envelope, so this still isolates
    // the reference-grid budget rather than the earlier matrix admission guard.
    for index in 0..7 {
        let id = StableId::new(format!("factor-{index}")).expect("id");
        request.dataset.factors.push(Factor {
            id: id.clone(),
            name: format!("Factor {index}"),
            kind: FactorKind::Categorical,
            unit: None,
            levels: (0..10).map(|i| format!("L{i}")).collect(),
        });
        request.spec.terms.push(TermSpec::Main { factor_id: id });
    }
    for observation in &mut request.dataset.observations {
        observation.factors = vec![Some(FactorValue::Text("L0".into())); 7];
    }
    let config = request.advanced.as_mut().expect("advanced");
    config.time_effect = MixedTimeEffect::None;
    config.marginal_time = false;
    code(&request, "mixed.reference_grid_too_large");
}
