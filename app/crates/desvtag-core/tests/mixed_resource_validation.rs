//! Qualified boundary against closed-form inference; larger requests are refused explicitly.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]
use desvtag_core::{
    errors::CoreError,
    models::mixed::{self, MixedModelRequest},
};
use serde_json::{Value, json};

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/repeated_covariance/resource_q12.json"
    ))
    .expect("closed-form independent reference")
}
fn assert_error(value: Value, code: &str) {
    let request: MixedModelRequest = serde_json::from_value(value).expect("typed request");
    let Err(CoreError::InvalidInput(issues)) = mixed::fit(&request) else {
        panic!("expected explicit {code}");
    };
    assert!(issues.iter().any(|i| i.code == code), "{issues:?}");
}
fn close(actual: f64, expected: &Value, tolerance: f64) {
    let expected = expected.as_f64().expect("reference number");
    assert!(
        (actual - expected).abs() < tolerance,
        "{actual} != {expected}"
    );
}

#[test]
fn twelve_occasion_un_matches_independent_covariance_and_one_sample_t_intervals() {
    let fixture = fixture();
    let request: MixedModelRequest =
        serde_json::from_value(fixture["request"].clone()).expect("request");
    let result = mixed::fit(&request).expect("qualified boundary");
    let advanced = result.advanced.expect("v2");
    assert!(advanced.inference_available);
    let expected = &fixture["expected"];
    close(
        advanced.reml_log_likelihood,
        &expected["remlLogLikelihood"],
        1e-8,
    );
    for (value, reference) in advanced
        .covariance_matrix
        .iter()
        .zip(expected["covarianceMatrix"].as_array().expect("matrix"))
    {
        close(*value, reference, 1e-8);
    }
    assert_eq!(advanced.mean_profiles.len(), 12);
    for (i, point) in advanced.mean_profiles.iter().enumerate() {
        close(point.inference.estimate, &expected["means"][i], 1e-8);
        close(
            point.inference.std_error.value().expect("se"),
            &expected["meanStandardErrors"][i],
            1e-8,
        );
        close(
            point.inference.df.value().expect("df"),
            &expected["df"],
            0.002,
        );
        close(
            point.inference.ci_lower.value().expect("lower"),
            &expected["lower"][i],
            1e-6,
        );
        close(
            point.inference.ci_upper.value().expect("upper"),
            &expected["upper"][i],
            1e-6,
        );
    }
}

#[test]
fn excessive_occasion_rows_and_fixed_columns_have_distinct_explicit_errors() {
    let old: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/repeated_covariance/pre_budget_q13.json"
    ))
    .expect("pre-budget compatibility fixture");
    assert_error(old["request"].clone(), "mixed.occasion_budget");
    let mut rows = fixture()["request"].clone();
    let prototype = rows["dataset"]["observations"][0].clone();
    rows["dataset"]["observations"] = Value::Array(
        (0..4097)
            .map(|i| {
                let mut row = prototype.clone();
                row["id"] = json!(format!("o{i}"));
                row
            })
            .collect(),
    );
    assert_error(rows, "mixed.row_budget");

    let mut wide = fixture()["request"].clone();
    wide["dataset"]["factors"] = json!([{"id":"f","name":"Factor","kind":"categorical","unit":null,"levels":(0..65).map(|i|format!("level{i}")).collect::<Vec<_>>()}]);
    wide["spec"]["terms"] = json!([{"type":"main","factorId":"f"}]);
    for row in wide["dataset"]["observations"]
        .as_array_mut()
        .expect("rows")
    {
        row["factors"] = json!(["level0"]);
    }
    assert_error(wide, "model.matrix_budget");
}

#[test]
fn oversized_dense_unit_is_refused_before_allocating_the_covariance_block() {
    let mut request = fixture()["request"].clone();
    request["advanced"] = json!({"covariance":"compoundSymmetry","timeEffect":"none","marginalFactors":[],"marginalTime":false,"adjustment":"bonferroni","references":[]});
    request["dataset"]["observations"] = Value::Array((0..4096).map(|i| {
        json!({"id":format!("o{i}"),"unitId":format!("u{}",i/2048),"factors":[],"responses":[1.+(i%7) as f64]})
    }).collect());
    assert_error(request, "mixed.work_budget");
}
