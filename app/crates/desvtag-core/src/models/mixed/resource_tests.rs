//! Resource exhaustion cannot turn a partial optimizer or information matrix into full inference.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]
use super::{MAX_ALGEBRA_WORK, MixedModelRequest, advanced};
use crate::{errors::CoreError, models::resource_budget::WorkBudget};
use serde_json::{Value, json};

fn request() -> MixedModelRequest {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../../../../validation/cases/repeated_covariance/reml.json"
    ))
    .expect("independent fixture");
    let case = &fixture["cases"][0];
    let rows: Vec<_> = case["rows"].as_array().expect("rows").iter().enumerate()
        .map(|(i, row)| json!({"id":format!("o{i}"),"unitId":row["unit"],"factors":[],"responses":[row["y"]]})).collect();
    serde_json::from_value(json!({
        "dataset":{"factors":[],"responses":[{"id":"y","name":"Response","unit":null}],"observations":rows},
        "spec":{"responseId":"y","intercept":true,"terms":[],"coding":"treatment","confidenceLevel":0.95},
        "advanced":{"covariance":"compoundSymmetry","times":case["times"],"timeEffect":"categorical","marginalFactors":[],"marginalTime":true,"adjustment":"bonferroni","references":[]}
    })).expect("request")
}

#[test]
fn budget_refuses_unfinished_fit_and_preserves_complete_fit_when_information_is_unavailable() {
    let req = request();
    let spec = req.advanced.as_ref().expect("advanced");
    let measure = WorkBudget::new(MAX_ALGEBRA_WORK, "test.mixed");
    let full = advanced::fit_with_budget(&req, spec, measure.clone()).expect("full inference");
    assert!(
        full.advanced
            .as_ref()
            .expect("advanced")
            .inference_available
    );
    let Err(CoreError::InvalidInput(issues)) =
        advanced::fit_with_budget(&req, spec, WorkBudget::new(1, "test.mixed"))
    else {
        panic!("unfinished fit must be an error")
    };
    assert!(issues.iter().any(|i| i.code == "mixed.work_budget"));
    let partial = advanced::fit_with_budget(
        &req,
        spec,
        WorkBudget::new(measure.spent() - 1, "test.mixed"),
    )
    .expect("fit survives unavailable information");
    assert_eq!(partial.reml_profile, full.reml_profile);
    assert_eq!(partial.variance_unit, full.variance_unit);
    assert_eq!(partial.variance_residual, full.variance_residual);
    assert!(
        !partial
            .advanced
            .as_ref()
            .expect("advanced")
            .inference_available
    );
    assert!(
        partial
            .issues
            .iter()
            .any(|i| i.code == "mixed.inference_budget")
    );
    for (a, b) in partial.coefficients.iter().zip(&full.coefficients) {
        assert_eq!(a.estimate, b.estimate);
        assert_eq!(a.std_error, b.std_error);
        assert!(a.df.value().is_none() && a.p_value.value().is_none());
        assert!(a.ci_lower.value().is_none() && a.ci_upper.value().is_none());
    }
    for mean in &partial.advanced.as_ref().expect("advanced").marginal_means {
        assert!(mean.inference.df.value().is_none());
        assert!(mean.inference.ci_lower.value().is_none());
    }
}
