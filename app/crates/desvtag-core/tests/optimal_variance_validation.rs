//! ET25 T07: explicit finite-region prediction variance against independent NumPy.
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::designs::optimal::variance::{OptimalVarianceRequest, prediction_variance};
use desvtag_core::designs::optimal::{evaluate, evaluate_with_blocks};
use serde_json::Value;

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/optimal_design/variance.json"
    ))
    .expect("fixture")
}
fn close(a: f64, b: f64) {
    assert!((a - b).abs() <= 1e-9 * (1.0 + b.abs()), "{a} != {b}");
}

#[test]
fn every_candidate_variance_distribution_and_i_g_identity_equal_numpy() {
    for case in fixture()["cases"].as_array().expect("cases") {
        let request: OptimalVarianceRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = prediction_variance(&request).expect("profile");
        assert_eq!(
            u64::from(result.parameters),
            case["parameters"].as_u64().expect("parameters")
        );
        assert_eq!(
            result.points.len(),
            case["points"].as_array().expect("points").len()
        );
        for point in &result.points {
            let expected = case["points"]
                .as_array()
                .expect("points")
                .iter()
                .find(|v| {
                    let coded: Vec<f64> =
                        serde_json::from_value(v["coded"].clone()).expect("coded");
                    coded == point.coded
                })
                .expect("candidate identity");
            assert_eq!(
                point.values.len(),
                expected["relative"].as_array().expect("blocks").len()
            );
            for (i, value) in point.values.iter().enumerate() {
                close(value.relative, expected["relative"][i].as_f64().expect("h"));
                close(value.scaled, expected["scaled"][i].as_f64().expect("nh"));
            }
            for (i, value) in point.real.iter().enumerate() {
                close(*value, expected["real"][i].as_f64().expect("coordinate"));
            }
        }
        assert_eq!(
            result.curves.len(),
            case["summaries"].as_array().expect("summaries").len()
        );
        for (curve, reference) in result
            .curves
            .iter()
            .zip(case["summaries"].as_array().expect("summaries"))
        {
            assert_eq!(curve.block.map(u64::from), reference["block"].as_u64());
            for (value, key) in [
                (curve.minimum, "minimum"),
                (curve.average, "average"),
                (curve.maximum, "maximum"),
            ] {
                close(value.relative, reference[key].as_f64().expect("summary"));
                close(value.scaled, f64::from(result.runs) * value.relative);
            }
            assert_eq!(
                curve.quantiles.len(),
                reference["ordered"].as_array().expect("ordered").len()
            );
            for (i, item) in curve.quantiles.iter().enumerate() {
                close(item.fraction, (i + 1) as f64 / curve.quantiles.len() as f64);
                close(
                    item.value.relative,
                    reference["ordered"][i].as_f64().expect("quantile"),
                );
                assert_eq!(
                    item.value,
                    result.points[item.point as usize].values[item.block.unwrap_or(0) as usize]
                );
            }
        }
        let metrics = match &request.run_blocks {
            Some(blocks) => evaluate_with_blocks(&request.spec, &request.runs_real, blocks),
            None => evaluate(&request.spec, &request.runs_real),
        }
        .expect("metrics");
        close(
            result.curves[0].average.scaled,
            metrics.i_average.expect("I"),
        );
        close(
            f64::from(result.parameters) / result.curves[0].maximum.scaled,
            metrics.g_efficiency.expect("G"),
        );
        close(
            result.curves[0].average.scaled,
            case["iAverage"].as_f64().expect("I reference"),
        );
        close(
            metrics.g_efficiency.expect("G"),
            case["gEfficiency"].as_f64().expect("G reference"),
        );
    }
}

#[test]
fn malformed_inputs_associations_and_singular_models_have_explicit_diagnostics() {
    let cases = fixture();
    let base: OptimalVarianceRequest =
        serde_json::from_value(cases["cases"][0]["request"].clone()).expect("request");
    let blocked: OptimalVarianceRequest =
        serde_json::from_value(cases["cases"][5]["request"].clone()).expect("blocked request");
    let mut requests = vec![];
    let mut r = base.clone();
    r.run_blocks = Some(vec![]);
    requests.push((r, "design.optimal_variance_block_association"));
    let mut r = base.clone();
    r.runs_real[0].pop();
    requests.push((r, "design.optimal_invalid_evaluation_run"));
    let mut r = base.clone();
    r.runs_real[0][0] = f64::NAN;
    requests.push((r, "design.optimal_invalid_evaluation_run"));
    let mut r = base.clone();
    r.runs_real = vec![r.runs_real[0].clone(); r.runs_real.len()];
    requests.push((r, "design.optimal_variance_singular"));
    let mut r = blocked.clone();
    r.run_blocks = None;
    requests.push((r, "design.optimal_variance_block_association"));
    let mut r = blocked.clone();
    r.run_blocks = Some(vec![u32::MAX; r.runs_real.len()]);
    requests.push((r, "design.optimal_invalid_evaluation_block"));
    for (request, code) in requests {
        let error = prediction_variance(&request).expect_err(code);
        assert!(format!("{error:?}").contains(code), "{error:?}");
    }
}

#[test]
fn irrelevant_search_choices_do_not_change_the_geometric_values() {
    let mut request: OptimalVarianceRequest =
        serde_json::from_value(fixture()["cases"][0]["request"].clone()).expect("request");
    let original = prediction_variance(&request).expect("profile");
    request.spec.seed = u64::MAX;
    request.spec.starts = 1;
    request.spec.randomize = !request.spec.randomize;
    request.spec.criterion = desvtag_core::designs::optimal::OptimalCriterion::I;
    let changed = prediction_variance(&request).expect("same design");
    assert_eq!(changed.points, original.points);
    assert_eq!(changed.curves, original.curves);
}
