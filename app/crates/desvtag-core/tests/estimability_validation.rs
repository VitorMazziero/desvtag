//! ET25 T08: incomplete mixed-level factorials against independent SVD references.
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]
use desvtag_core::comparisons::procedures::{Adjustment, adjust_p};
use desvtag_core::descriptive::Stat;
use desvtag_core::models::factorial_anova::{
    FactorialGeometryRequest, FactorialRequest, FactorialSetup, PairwiseAdjustment,
    SumOfSquaresType, analyze, diagnose,
};
use serde_json::Value;

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/factorial_anova/estimability.json"
    ))
    .expect("fixture")
}

#[test]
fn estimable_difference_survives_nonestimable_individual_marginal_means() {
    let data = fixture();
    let case = data["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .find(|c| c["name"] == "three-cells-additive")
        .expect("case");
    let request: FactorialRequest =
        serde_json::from_value(case["request"].clone()).expect("request");
    let result = analyze(&request)
        .expect("the estimable comparisons must not be rejected with the nonestimable means");
    let means = result
        .marginals
        .iter()
        .find(|m| m.factors.len() == 1 && m.factors[0].as_str() == "B")
        .expect("B");
    assert!(
        means
            .cells
            .iter()
            .all(|cell| matches!(cell.estimate, Stat::Undefined { .. }))
    );
    let pair = means
        .pairs
        .iter()
        .find(|p| p.cell_a == 1 && p.cell_b == 2)
        .expect("B2-B3");
    assert!((pair.difference.value().expect("estimable difference") + 4.0).abs() < 1e-9);
    assert!((pair.std_error.value().expect("SE") - (2.0_f64 / 3.0).sqrt()).abs() < 1e-9);
}

#[test]
fn multiplicity_adjustment_does_not_turn_an_undefined_p_value_into_one() {
    for method in [Adjustment::Bonferroni, Adjustment::Holm] {
        let result = adjust_p(&[0.02, f64::NAN, 0.04], method);
        assert!(result[1].is_nan(), "undefined p became {}", result[1]);
        assert!(result[0].is_finite() && result[2].is_finite());
    }
}

fn check(actual: Stat, expected: &Value, label: &str) {
    if expected.is_null() {
        assert!(actual.value().is_none(), "{label}: unexpected {actual:?}");
    } else {
        let e = expected.as_f64().expect("number");
        let a = actual
            .value()
            .unwrap_or_else(|| panic!("{label}: undefined instead of {e}"));
        assert!(
            (a - e).abs() <= (2e-8 * e.abs()).max(2e-12),
            "{label}: {a} != {e}"
        );
    }
}

#[test]
fn all_independent_geometries_and_linear_functions_match_svd() {
    for case in fixture()["cases"].as_array().expect("cases") {
        let request: FactorialRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = analyze(&request).unwrap_or_else(|e| panic!("{}: {e:?}", case["name"]));
        let geo = result.estimability.as_ref().expect("geometry");
        assert_eq!(
            geo.rank as u64,
            case["rank"].as_u64().expect("rank"),
            "{}",
            case["name"]
        );
        assert_eq!(
            geo.parameters as u64,
            case["parameters"].as_u64().expect("p")
        );
        assert_eq!(geo.used_rows as u64, case["usedRows"].as_u64().expect("n"));
        assert_eq!(geo.residual_df, result.residual.df);
        assert_eq!(
            geo.null_relations.len(),
            (geo.parameters - geo.rank) as usize
        );
        for (i, column) in geo.columns.iter().enumerate() {
            assert_eq!(column.label, case["columns"][i].as_str().expect("label"));
            assert_eq!(
                column.estimable,
                case["coefficientEstimable"][i]
                    .as_bool()
                    .expect("estimable"),
                "{} column {i}",
                case["name"]
            );
        }
        // Check the returned null-space basis itself, without requiring NumPy's arbitrary orientation.
        for null in &geo.null_relations {
            for row in case["matrix"].as_array().expect("X") {
                let dot: f64 = row
                    .as_array()
                    .expect("row")
                    .iter()
                    .zip(null)
                    .map(|(x, n)| x.as_f64().expect("x") * n)
                    .sum();
                assert!(dot.abs() < 1e-9, "X N != 0: {dot}");
            }
        }
        for (t, reference) in geo
            .terms
            .iter()
            .zip(case["terms"].as_array().expect("terms"))
        {
            assert_eq!(
                t.nominal_df as u64,
                reference["nominalDf"].as_u64().expect("nominal")
            );
            assert_eq!(
                t.estimable_df as u64,
                reference["estimableDf"].as_u64().expect("identifiable")
            );
        }
        check(result.residual.sum_squares, &case["sse"], "SSE");
        check(result.residual.mean_square, &case["mse"], "MSE");
        for (m, r) in result
            .marginals
            .iter()
            .zip(case["marginals"].as_array().expect("marginals"))
        {
            for (c, v) in m.cells.iter().zip(r["cells"].as_array().expect("cells")) {
                check(c.estimate, &v["estimate"], "mean");
                check(c.std_error, &v["stdError"], "SE mean");
                check(c.ci_lower, &v["ci"][0], "mean CI lower");
                check(c.ci_upper, &v["ci"][1], "mean CI upper");
            }
            for (c, v) in m.pairs.iter().zip(r["pairs"].as_array().expect("pairs")) {
                check(c.difference, &v["estimate"], "difference");
                check(c.std_error, &v["stdError"], "SE difference");
                check(c.p_value, &v["p"], "p difference");
                if !v["estimable"].as_bool().expect("estimable") {
                    assert!(c.significant.is_none());
                    assert!(m.letters.is_none());
                }
            }
        }
        for (c, v) in result
            .contrasts
            .iter()
            .zip(case["contrasts"].as_array().expect("contrasts"))
        {
            if c.name.contains("scaled") && !v["estimate"].is_null() {
                let scale = if c.name.contains("-1000000000000") {
                    -1e12
                } else {
                    1e-12
                };
                assert!(
                    (c.estimate.value().expect("scaled") / scale
                        - v["estimate"].as_f64().expect("reference") / scale)
                        .abs()
                        < 1e-8
                );
                assert!(
                    (c.std_error.value().expect("scaled SE") / scale.abs()
                        - v["stdError"].as_f64().expect("reference SE") / scale.abs())
                    .abs()
                        < 1e-8
                );
            }
            check(c.estimate, &v["estimate"], "contrast");
            check(c.std_error, &v["stdError"], "SE contrast");
            check(c.p_value, &v["p"], "p contrast");
            check(c.p_adjusted, &v["pAdjusted"], "adjusted contrast");
        }
        for (ss_type, key) in [
            (SumOfSquaresType::TypeI, "typeI"),
            (SumOfSquaresType::TypeII, "typeII"),
            (SumOfSquaresType::TypeIII, "typeIII"),
        ] {
            let mut alternate = request.clone();
            alternate.ss_type = ss_type;
            alternate.marginals.clear();
            alternate.contrasts.clear();
            let output = analyze(&alternate).expect("SS analysis");
            for (r, v) in output
                .terms
                .iter()
                .zip(case["anova"][key].as_array().expect("anova"))
            {
                assert_eq!(r.df as u64, v["df"].as_u64().expect("df"));
                check(r.sum_squares, &v["ss"], "term SS");
                check(r.f_value, &v["f"], "F");
                check(r.p_value, &v["p"], "F p");
            }
        }
        let planned = diagnose(&FactorialGeometryRequest {
            dataset: request.dataset.clone(),
            response_id: None,
            setup: FactorialSetup {
                factor_ids: request.factor_ids.clone(),
                block_id: request.block_id.clone(),
                interaction_order: request.interaction_order,
                ss_type: request.ss_type,
                marginals: vec![],
                contrasts: vec![],
            },
        })
        .expect("planned geometry without a response");
        assert_eq!(
            planned.rank as u64,
            case["plannedRank"].as_u64().expect("planned rank")
        );
        assert_eq!(
            planned.used_rows as u64,
            case["plannedRows"].as_u64().expect("planned rows")
        );
        // Public response contains no nonfinite JSON numbers and survives serde round-trip.
        let json = serde_json::to_value(&result).expect("serialize");
        let restored: desvtag_core::models::factorial_anova::FactorialResult =
            serde_json::from_value(json).expect("deserialize");
        assert_eq!(restored, result);
    }
}

#[test]
fn partial_family_adjustments_preserve_missing_tests_and_the_declared_family() {
    let data = fixture();
    let case = data["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .find(|c| c["name"] == "three-cells-additive")
        .expect("case");
    let mut request: FactorialRequest =
        serde_json::from_value(case["request"].clone()).expect("request");
    request.contrasts.clear();
    request
        .marginals
        .retain(|m| m.factors.len() == 1 && m.factors[0].as_str() == "B");
    let reference = analyze(&request).expect("raw");
    let raw = reference.marginals[0].pairs[2]
        .p_value
        .value()
        .expect("valid pair");
    for adjustment in [
        PairwiseAdjustment::Bonferroni,
        PairwiseAdjustment::Holm,
        PairwiseAdjustment::Tukey,
    ] {
        request.marginals[0].adjustment = adjustment;
        let result = analyze(&request).expect("adjusted");
        let family = &result.marginals[0];
        assert!(
            family.pairs[0].p_adjusted.value().is_none()
                && family.pairs[1].p_adjusted.value().is_none()
        );
        assert!(family.letters.is_none());
        let adjusted = family.pairs[2]
            .p_adjusted
            .value()
            .expect("valid adjusted pair");
        if adjustment != PairwiseAdjustment::Tukey {
            assert!((adjusted - (raw * 3.).min(1.)).abs() < 1e-10);
        }
        assert!(adjusted >= raw && adjusted <= 1.);
    }
}

#[test]
fn large_nuisance_reference_grid_is_never_materialized_and_requests_are_bounded() {
    let data = fixture();
    let mut request = data["cases"][0]["request"].clone();
    let ids = (0..6).map(|i| format!("F{i}")).collect::<Vec<_>>();
    let levels = (0..50).map(|i| format!("L{i}")).collect::<Vec<_>>();
    request["dataset"]["factors"]=serde_json::json!(ids.iter().map(|id|serde_json::json!({"id":id,"name":id,"kind":"categorical","unit":null,"levels":levels})).collect::<Vec<_>>());
    request["dataset"]["observations"]=serde_json::json!((0..50).flat_map(|i|(0..3).map(move |r|serde_json::json!({"id":format!("o{i}_{r}"),"unitId":null,"factors":vec![format!("L{i}");6],"responses":[i as f64 + r as f64 * 0.1]}))).collect::<Vec<_>>());
    request["factorIds"] = serde_json::json!(ids);
    request["interactionOrder"] = serde_json::json!(1);
    request["marginals"] = serde_json::json!([{"factors":["F0"],"adjustment":"none"}]);
    request["contrasts"] = serde_json::json!([]);
    let mut request: FactorialRequest = serde_json::from_value(request).expect("large request");
    let started = std::time::Instant::now();
    let result =
        analyze(&request).expect("50^5 nuisance combinations require no Cartesian allocation");
    eprintln!(
        "six factors x 50 levels, 150 observed rows, 295 parameters, 1225 pairs: {:?}",
        started.elapsed()
    );
    assert_eq!(result.estimability.as_ref().expect("geometry").rank, 50);
    assert!(
        result.marginals[0]
            .cells
            .iter()
            .all(|m| m.estimate.value().is_none())
    );
    request.marginals[0].factors = request.factor_ids.clone();
    assert!(
        format!(
            "{:?}",
            analyze(&request).expect_err("50^6 target cells refused before allocation")
        )
        .contains("anova.resource_limit")
    );
    request.marginals = vec![
        desvtag_core::models::factorial_anova::MarginalRequest {
            factors: vec![request.factor_ids[0].clone()],
            adjustment: PairwiseAdjustment::None
        };
        17
    ];
    assert!(
        format!(
            "{:?}",
            analyze(&request).expect_err("cumulative pair family refused")
        )
        .contains("anova.resource_limit")
    );
}

#[test]
fn invalid_contrasts_are_rejected_before_inference_independently_of_weight_scale() {
    let data = fixture();
    let mut request: FactorialRequest =
        serde_json::from_value(data["cases"][0]["request"].clone()).expect("request");
    request.contrasts.truncate(1);
    for coefficients in [
        vec![0., 0.],
        vec![1e-12, -0.5e-12],
        vec![f64::NAN, 1.],
        vec![f64::INFINITY, 1.],
    ] {
        request.contrasts[0].coefficients = coefficients;
        assert!(
            format!("{:?}", analyze(&request).expect_err("invalid contrast"))
                .contains("anova.invalid_contrast")
        );
    }
}
