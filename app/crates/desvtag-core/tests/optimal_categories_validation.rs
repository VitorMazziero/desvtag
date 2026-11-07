//! Nominal D/I candidates, metrics, fixed runs and profiles against independent NumPy references.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]
use desvtag_core::designs::optimal::variance::{OptimalVarianceRequest, prediction_variance};
use desvtag_core::designs::optimal::{self, OptimalSpec};
use serde_json::Value;

fn references() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/optimal/categories.json"
    ))
    .expect("references")
}

fn numeric(row: &Value) -> Vec<f64> {
    serde_json::from_value(row["real"].clone()).expect("real")
}
fn labels(row: &Value) -> Vec<String> {
    serde_json::from_value(row["categories"].clone()).expect("labels")
}
fn near(actual: f64, expected: f64, description: &str) {
    assert!(
        (actual - expected).abs() <= 2e-8 * expected.abs().max(1.),
        "{description}: {actual} != {expected}"
    );
}

#[test]
fn criteria_and_every_prediction_variance_match_the_independent_mixed_matrix() {
    for case in references()["cases"].as_array().expect("cases") {
        let spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        let rows = case["explicitRuns"].as_array().expect("rows");
        let runs = rows.iter().map(numeric).collect::<Vec<_>>();
        let cats = rows.iter().map(labels).collect::<Vec<_>>();
        let blocks = spec.blocks.as_ref().map(|_| {
            rows.iter()
                .map(|r| r["block"].as_u64().expect("block") as u32)
                .collect::<Vec<_>>()
        });
        let actual = optimal::evaluate_with_categories(&spec, &runs, &cats, blocks.as_deref())
            .expect("evaluation");
        let json = serde_json::to_value(&actual).expect("metrics");
        for key in [
            "logDet",
            "dEfficiency",
            "aEfficiency",
            "gEfficiency",
            "iAverage",
        ] {
            near(
                json[key].as_f64().expect("metric"),
                case["metrics"][key].as_f64().expect("reference"),
                &format!("{} {key}", case["name"]),
            );
        }
        assert_eq!(
            actual.parameters as u64,
            case["metrics"]["parameters"].as_u64().expect("p")
        );
        let profile = prediction_variance(&OptimalVarianceRequest {
            spec: spec.clone(),
            runs_real: runs,
            run_blocks: blocks,
            run_categories: Some(cats),
        })
        .expect("profile");
        let count = case["points"].as_array().expect("points").len();
        assert_eq!(profile.points.len(), count);
        for (i, point) in profile.points.iter().enumerate() {
            assert_eq!(point.real, numeric(&case["points"][i]));
            assert_eq!(
                point.categories.as_ref().expect("categories"),
                &labels(&case["points"][i])
            );
            for (b, value) in point.values.iter().enumerate() {
                let reference = case["variances"][b * count + i].as_f64().expect("h");
                near(value.relative, reference, "point h");
                near(value.scaled, reference * rows.len() as f64, "point n*h");
            }
        }
        near(
            profile.curves[0].average.scaled,
            actual.i_average.expect("I"),
            "mean recovers I",
        );
        near(
            profile.parameters as f64 / profile.curves[0].maximum.scaled,
            actual.g_efficiency.expect("G"),
            "maximum recovers G",
        );
    }
}

#[test]
fn small_generated_mixed_designs_reach_the_enumerated_optima_and_preserve_fixed_tuples() {
    for case in references()["cases"].as_array().expect("cases") {
        if case["exhaustive"].is_null() {
            continue;
        }
        let spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        let result = optimal::generate(&spec).unwrap_or_else(|e| panic!("{}: {e:?}", case["name"]));
        let objective = if spec.criterion == optimal::OptimalCriterion::D {
            result.metrics.log_det.expect("det")
        } else {
            -result.metrics.i_average.expect("I") / spec.runs as f64
        };
        near(
            objective,
            case["exhaustive"]["bestObjective"].as_f64().expect("best"),
            &format!("{} exhaustive optimum", case["name"]),
        );
        assert_eq!(result.runs.len(), spec.runs as usize);
        assert_eq!(
            result.candidates as usize,
            case["points"].as_array().expect("points").len()
        );
        for (i, fixed) in spec.fixed_runs.iter().enumerate() {
            assert!(result.runs[i].fixed);
            assert_eq!(&result.runs[i].real, fixed);
            assert_eq!(
                result.runs[i]
                    .categories
                    .as_ref()
                    .expect("fixed categories"),
                &spec
                    .categories
                    .as_ref()
                    .expect("spec categories")
                    .fixed_runs[i]
            );
        }
        if let Some(blocks) = &spec.blocks {
            for (b, &count) in blocks.new_runs.iter().enumerate() {
                assert_eq!(
                    result
                        .runs
                        .iter()
                        .filter(|r| !r.fixed && r.block == Some(b as u32))
                        .count(),
                    count as usize
                );
            }
        }
        let restored: optimal::GeneratedOptimal =
            serde_json::from_value(serde_json::to_value(&result).expect("serialize"))
                .expect("deserialize");
        assert_eq!(restored, result);
    }
}

#[test]
fn changing_the_sum_coding_baseline_preserves_prediction_criteria() {
    let data = references();
    let case = &data["cases"][13];
    let mut spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
    let rows = case["explicitRuns"].as_array().expect("rows");
    let runs = rows.iter().map(numeric).collect::<Vec<_>>();
    let cats = rows.iter().map(labels).collect::<Vec<_>>();
    let before = optimal::evaluate_with_categories(&spec, &runs, &cats, None).expect("original");
    for factor in &mut spec.categories.as_mut().expect("categories").factors {
        factor.levels.rotate_left(1);
    }
    let after =
        optimal::evaluate_with_categories(&spec, &runs, &cats, None).expect("permuted levels");
    near(
        after.i_average.expect("I"),
        before.i_average.expect("I"),
        "basis-independent I",
    );
    near(
        after.g_efficiency.expect("G"),
        before.g_efficiency.expect("G"),
        "basis-independent G",
    );
    near(
        after.log_det.expect("D"),
        before.log_det.expect("D"),
        "unit-determinant level permutation",
    );
}

#[test]
fn explicit_category_associations_and_admissible_tuples_are_required() {
    let data = references();
    let mut spec: OptimalSpec =
        serde_json::from_value(data["cases"][7]["spec"].clone()).expect("spec");
    assert!(optimal::evaluate(&spec, &[vec![]]).is_err());
    assert!(optimal::evaluate_with_categories(&spec, &[vec![]], &[], None).is_err());
    assert!(
        optimal::evaluate_with_categories(&spec, &[vec![]], &[vec!["A".into(), "R".into()]], None)
            .is_err()
    );
    let metrics =
        optimal::evaluate_with_categories(&spec, &[vec![]], &[vec!["A".into(), "P".into()]], None)
            .expect("valid singular row");
    assert!(metrics.log_det.is_none() && metrics.i_average.is_none());
    spec.categories.as_mut().expect("categories").factors[0].levels = vec!["A".into(), "A".into()];
    assert!(optimal::generate(&spec).is_err());
}

#[test]
fn exact_mixed_model_fits_and_identifiable_coefficients_match_statsmodels() {
    let data = references();
    let cases = data["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .map(|c| &c["analysis"])
        .chain(std::iter::once(&data["missingResponseAnalysis"]));
    for reference in cases {
        let request: optimal::model::OptimalModelRequest =
            serde_json::from_value(reference["request"].clone()).expect("fit request");
        let result = optimal::model::analyze(&request).expect("mixed optimal model");
        let report = &result.fit;
        assert_eq!(
            report.rank as u64,
            reference["rank"].as_u64().expect("rank")
        );
        assert_eq!(
            report.df_residual as u64,
            reference["dfResidual"].as_u64().expect("df")
        );
        near(
            report.anova.residual.sum_squares.value().expect("SSE"),
            reference["sse"].as_f64().expect("SSE"),
            "mixed model SSE",
        );
        for (i, coefficient) in report.coefficients.iter().enumerate() {
            for (actual, expected) in [
                (coefficient.estimate, &reference["coefficients"][i]),
                (coefficient.std_error, &reference["stdErrors"][i]),
                (coefficient.p_value, &reference["pValues"][i]),
                (
                    coefficient.ci_lower,
                    &reference["confidenceIntervals"][i][0],
                ),
                (
                    coefficient.ci_upper,
                    &reference["confidenceIntervals"][i][1],
                ),
            ] {
                if let Some(e) = expected.as_f64() {
                    near(
                        actual.value().expect("identifiable"),
                        e,
                        "mixed model coefficient inference",
                    );
                } else {
                    assert!(
                        actual.value().is_none(),
                        "unidentifiable coefficient published: {coefficient:?}"
                    );
                }
            }
        }
        for (i, point) in report.observations.iter().enumerate() {
            near(
                point.fitted,
                reference["fitted"][i].as_f64().expect("fitted"),
                "prediction",
            );
            assert_eq!(
                point.observation_id.as_ref().expect("ID").as_str(),
                reference["usedIds"][i].as_str().expect("ID")
            );
        }
        let restored: optimal::model::OptimalModelResult =
            serde_json::from_value(serde_json::to_value(&result).expect("serialize fit"))
                .expect("restore fit");
        assert_eq!(restored, result);
    }
}
