//! Fixed-block polynomial fits and predictions against statsmodels (ET25 T06).
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::descriptive::Stat;
use desvtag_core::optimization::{
    DomainSpec, EvaluateRequest, Goal, OptimizationRequest, OptimizationSetup, ResponseGoal,
    evaluate_points,
};
use desvtag_core::surface::{GridRequest, SurfaceGridFit, SurfaceRequest, analyze, compute_grid};
use serde_json::Value;

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/response_surface/blocked.json"
    ))
    .expect("fixture")
}
fn close(a: f64, b: f64) {
    assert!((a - b).abs() <= 1e-9 * (1.0 + b.abs()), "{a} != {b}");
}

#[test]
fn fixed_block_coefficients_uncertainty_and_pure_error_equal_statsmodels() {
    for case in fixture()["cases"].as_array().expect("cases") {
        let request: SurfaceRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let result = analyze(&request).expect("fit");
        let block = result.block.as_ref().expect("block result");
        assert_eq!(
            block.context.reference,
            request.block.as_ref().expect("selection").reference
        );
        let coefficients = std::iter::once(&result.intercept)
            .chain(&result.terms)
            .chain(&block.coefficients)
            .collect::<Vec<_>>();
        assert_eq!(
            coefficients.len(),
            case["coefficients"].as_array().expect("coefficients").len()
        );
        for (i, row) in coefficients.iter().enumerate() {
            close(
                row.estimate.value().expect("estimate"),
                case["coefficients"][i].as_f64().expect("reference"),
            );
            close(
                row.std_error.value().expect("SE"),
                case["stdErrors"][i].as_f64().expect("reference"),
            );
            close(
                row.ci_lower.value().expect("CI"),
                case["ci"][i][0].as_f64().expect("reference"),
            );
            close(
                row.ci_upper.value().expect("CI"),
                case["ci"][i][1].as_f64().expect("reference"),
            );
        }
        close(
            result.anova.residual.sum_squares.value().expect("SSE"),
            case["sse"].as_f64().expect("reference"),
        );
        let pure = result.lack_of_fit.expect("replicates within blocks");
        close(
            pure.ss_pure_error,
            case["pureError"].as_f64().expect("reference"),
        );
        assert_eq!(
            u64::from(pure.df_pure_error),
            case["dfPureError"].as_u64().expect("df")
        );
        assert_eq!(
            u64::from(result.fit.df_residual),
            case["dfResidual"].as_u64().expect("df")
        );
        for (point, expected) in result
            .fit_points
            .iter()
            .zip(case["fitted"].as_array().expect("fitted"))
        {
            close(point.predicted, expected.as_f64().expect("reference"));
        }
    }
}

#[test]
fn grid_and_optimization_predictions_keep_the_explicit_reference_block() {
    for case in fixture()["cases"].as_array().expect("cases") {
        let request: SurfaceRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let grid = if request.factors.len() >= 2 {
            let result = analyze(&request).expect("fit");
            let mut grid_request = GridRequest {
                fitted: None,
                surface: request.clone(),
                x_factor: request.factors[0].id.clone(),
                y_factor: request.factors[1].id.clone(),
                fixed: vec![],
                steps_x: 9,
                steps_y: 9,
                contour_levels: 5,
            };
            let grid = compute_grid(&grid_request).expect("grid");
            grid_request.fitted = Some(SurfaceGridFit::from(&result));
            assert_eq!(compute_grid(&grid_request).expect("saved block grid"), grid);
            Some(grid)
        } else {
            None
        };
        if let Some(grid) = &grid {
            assert_eq!(
                grid.block.as_ref().expect("reference").reference,
                request.block.as_ref().expect("request reference").reference
            );
        }
        let goals = vec![ResponseGoal {
            response_id: request.response_id.clone(),
            terms: vec![],
            goal: Goal::Range {
                low: -100.,
                high: 100.,
            },
            importance: 1.,
        }];
        let points = case["probes"]
            .as_array()
            .expect("probes")
            .iter()
            .map(|p| serde_json::from_value(p["coded"].clone()).expect("point"))
            .collect();
        let evaluation = evaluate_points(&EvaluateRequest {
            optimization: OptimizationRequest {
                block: request.block.clone(),
                dataset: request.dataset.clone(),
                factors: request.factors.clone(),
                setup: OptimizationSetup {
                    responses: goals,
                    limits: vec![],
                    domain: DomainSpec::Region,
                    search: Default::default(),
                    alpha: request.alpha,
                },
            },
            points,
        })
        .expect("prediction intervals");
        assert_eq!(
            evaluation.block.as_ref().expect("reference"),
            &desvtag_core::surface::model::SurfaceBlockContext {
                factor_id: request.block.as_ref().expect("request").factor_id.clone(),
                name: "Etapa de execução".into(),
                reference: request.block.as_ref().expect("request").reference.clone()
            }
        );
        for (point, reference) in evaluation
            .points
            .iter()
            .zip(case["probes"].as_array().expect("probes"))
        {
            let prediction = &point.predictions[0].prediction;
            let actual = serde_json::to_value(prediction).expect("prediction");
            for key in [
                "fitted",
                "meanLower",
                "meanUpper",
                "predictionLower",
                "predictionUpper",
            ] {
                close(
                    actual[key]["value"].as_f64().expect("defined prediction"),
                    reference[key].as_f64().expect("reference"),
                );
            }
            if let Some(grid) = &grid {
                let ix = ((reference["coded"][0].as_f64().expect("x") + 1.) * 4.).round() as usize;
                let iy = ((reference["coded"][1].as_f64().expect("y") + 1.) * 4.).round() as usize;
                close(
                    grid.z[iy][ix].value().expect("grid value"),
                    reference["fitted"].as_f64().expect("reference"),
                );
            }
        }
    }
}

#[test]
fn invalid_block_references_or_numeric_columns_are_refused() {
    let original: SurfaceRequest =
        serde_json::from_value(fixture()["cases"][0]["request"].clone()).expect("request");
    for (factor, level) in [("unknown", "Antes"), ("x1", "Antes"), ("block", "unknown")] {
        let mut request = original.clone();
        request.block.as_mut().expect("block").factor_id =
            desvtag_core::domain::StableId::new(factor).expect("id");
        request.block.as_mut().expect("block").reference = level.into();
        let desvtag_core::errors::CoreError::InvalidInput(issues) =
            analyze(&request).expect_err("invalid reference");
        assert!(
            issues
                .iter()
                .any(|issue| issue.code == "surface.invalid_block")
        );
    }
}

#[test]
fn an_archived_grid_uses_the_saved_coefficients_and_checks_geometric_identity() {
    let mut request: SurfaceRequest = fixture()["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .map(|case| {
            serde_json::from_value::<SurfaceRequest>(case["request"].clone()).expect("request")
        })
        .find(|request| request.factors.len() >= 2)
        .expect("two numeric factors");
    request.factors[0].low = 0.1;
    request.factors[0].high = 0.3;
    let result = analyze(&request).expect("fit");
    let mut grid_request = GridRequest {
        x_factor: request.factors[0].id.clone(),
        y_factor: request.factors[1].id.clone(),
        fitted: Some(SurfaceGridFit::from(&result)),
        surface: request,
        fixed: vec![],
        steps_x: 9,
        steps_y: 9,
        contour_levels: 5,
    };
    let original = compute_grid(&grid_request).expect("saved grid");
    let range = &result.ranges[0];
    grid_request.surface.factors[0].low = range.center - range.half_range;
    grid_request.surface.factors[0].high = range.center + range.half_range;
    assert_ne!(
        (grid_request.surface.factors[0].high - grid_request.surface.factors[0].low) / 2.0,
        range.half_range,
    );
    assert_eq!(
        compute_grid(&grid_request).expect("saved decimal coding"),
        original,
    );
    let fit = grid_request.fitted.as_mut().expect("saved fit");
    let intercept = fit.coefficients[0].estimate.value().expect("intercept");
    fit.coefficients[0].estimate = Stat::Defined {
        value: intercept + 2.5,
    };
    let shifted = compute_grid(&grid_request).expect("archived coefficients");
    assert_eq!(original.extrapolated, shifted.extrapolated);
    for (before, after) in original.z.iter().flatten().zip(shifted.z.iter().flatten()) {
        close(
            after.value().expect("after") - before.value().expect("before"),
            2.5,
        );
    }
    let fit = grid_request.fitted.as_mut().expect("saved fit");
    fit.observation_ids.swap(0, 1);
    let error = compute_grid(&grid_request).expect_err("wrong observation order");
    assert!(format!("{error:?}").contains("surface.grid_fit_mismatch"));
}
