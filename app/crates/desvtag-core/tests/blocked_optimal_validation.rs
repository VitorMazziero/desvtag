//! Independent blocked-design enumeration and public API boundaries (ET25 T06).
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::designs::optimal::{
    OptimalMetrics, OptimalSpec, evaluate, evaluate_with_blocks, generate,
};
use serde_json::Value;

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/optimal_design/blocked.json"
    ))
    .expect("independent fixture")
}

fn close(a: f64, b: f64) {
    assert!((a - b).abs() <= 1e-8 * (1.0 + b.abs()), "{a} != {b}");
}

fn objective(spec: &OptimalSpec, metrics: &OptimalMetrics) -> f64 {
    if spec.criterion == desvtag_core::designs::optimal::OptimalCriterion::D {
        metrics.log_det.expect("full rank")
    } else {
        -metrics.i_average.expect("full rank") / f64::from(spec.runs)
    }
}

#[test]
fn blocked_metrics_and_exchange_stationarity_match_numpy_enumeration() {
    let fixture = fixture();
    for case in fixture["cases"].as_array().expect("cases") {
        let mut spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        if case["fullRank"] == 0 {
            assert!(generate(&spec).is_err(), "{}", case["name"]);
            continue;
        }
        let real = serde_json::from_value::<Vec<Vec<f64>>>(case["bestRuns"].clone()).expect("runs");
        let blocks =
            serde_json::from_value::<Vec<u32>>(case["bestBlocks"].clone()).expect("blocks");
        let got =
            serde_json::to_value(evaluate_with_blocks(&spec, &real, &blocks).expect("evaluation"))
                .expect("metrics");
        for (key, value) in case["metrics"].as_object().expect("reference metrics") {
            close(
                got[key].as_f64().expect("numeric metric"),
                value.as_f64().expect("reference value"),
            );
        }
        for seed in 0..6 {
            spec.seed = seed;
            let result = generate(&spec).expect("blocked search");
            let value = objective(&spec, &result.metrics);
            assert!(
                value <= case["best"].as_f64().expect("best") + 1e-8,
                "{}",
                case["name"]
            );
            assert!(
                case["stationary"]
                    .as_array()
                    .expect("stationary values")
                    .iter()
                    .any(|v| (v.as_f64().expect("value") - value).abs() < 1e-8),
                "{}: {value}",
                case["name"]
            );
            for (i, run) in result.runs.iter().take(spec.fixed_runs.len()).enumerate() {
                assert!(run.fixed);
                assert_eq!(run.real, spec.fixed_runs[i]);
                assert_eq!(
                    run.block,
                    Some(spec.blocks.as_ref().expect("blocks").fixed_blocks[i])
                );
            }
            for (b, &n) in spec
                .blocks
                .as_ref()
                .expect("blocks")
                .new_runs
                .iter()
                .enumerate()
            {
                assert_eq!(
                    result
                        .runs
                        .iter()
                        .filter(|r| !r.fixed && r.block == Some(b as u32))
                        .count(),
                    n as usize
                );
            }
            let actual_real = result
                .runs
                .iter()
                .map(|r| r.real.clone())
                .collect::<Vec<_>>();
            let actual_blocks = result
                .runs
                .iter()
                .map(|r| r.block.expect("block"))
                .collect::<Vec<_>>();
            assert_eq!(
                result.metrics,
                evaluate_with_blocks(&spec, &actual_real, &actual_blocks)
                    .expect("recomputed criteria")
            );
            let search = result.search.expect("search accounting");
            assert_eq!(search.starts_attempted, spec.starts);
            assert_eq!(search.starts_failed + search.starts_succeeded, spec.starts);
        }
    }
}

#[test]
fn randomization_is_deterministic_and_preserves_fixed_rows_and_block_allocation() {
    let mut spec: OptimalSpec =
        serde_json::from_value(fixture()["cases"][3]["spec"].clone()).expect("spec");
    let ordered = generate(&spec).expect("ordered");
    spec.randomize = true;
    let randomized = generate(&spec).expect("randomized");
    assert_eq!(randomized, generate(&spec).expect("repeat"));
    let a = serde_json::to_value(&ordered.metrics).expect("metrics");
    let b = serde_json::to_value(&randomized.metrics).expect("metrics");
    for (key, value) in a.as_object().expect("object") {
        close(
            value.as_f64().expect("value"),
            b[key].as_f64().expect("value"),
        );
    }
    assert_eq!(
        &ordered.runs[..spec.fixed_runs.len()],
        &randomized.runs[..spec.fixed_runs.len()]
    );
    let assignments = randomized
        .runs
        .iter()
        .skip(spec.fixed_runs.len())
        .map(|r| r.block.expect("block"))
        .collect::<Vec<_>>();
    assert!(assignments.windows(2).all(|w| w[0] <= w[1]));
}

#[test]
fn invalid_associations_and_allocations_are_refused_before_algebra() {
    let original: OptimalSpec =
        serde_json::from_value(fixture()["cases"][0]["spec"].clone()).expect("spec");
    for mutation in 0..10 {
        let mut spec = original.clone();
        let blocks = spec.blocks.as_mut().expect("blocks");
        match mutation {
            0 => blocks.labels.clear(),
            1 => blocks.labels[1] = blocks.labels[0].clone(),
            2 => blocks.new_runs.pop().map(|_| ()).expect("allocation"),
            3 => blocks.new_runs[1] = u32::MAX,
            4 => blocks.fixed_blocks.clear(),
            5 => blocks.fixed_blocks[0] = 9,
            6 => blocks.labels[0] = " ".into(),
            7 => spec.fixed_runs[0].push(0.0),
            8 => spec.fixed_runs[0][0] = f64::NAN,
            _ => spec.fixed_runs[0][0] = 2.0,
        }
        assert!(generate(&spec).is_err(), "mutation {mutation}");
    }
    let rows = vec![vec![-1.], vec![0.], vec![1.]];
    assert!(
        evaluate(&original, &rows).is_err(),
        "never infer block from position"
    );
    assert!(evaluate_with_blocks(&original, &rows, &[0, 1]).is_err());
    assert!(evaluate_with_blocks(&original, &rows, &[0, 1, 2]).is_err());
    assert!(evaluate_with_blocks(&original, &[vec![]], &[0]).is_err());
    assert!(evaluate_with_blocks(&original, &[], &[]).is_err());
    assert!(
        evaluate_with_blocks(&original, &rows, &[0, 0, 0])
            .expect("valid singular design")
            .log_det
            .is_none()
    );
}

#[test]
fn explicit_evaluation_replaces_the_generator_allocation_and_completed_rows() {
    let original: OptimalSpec =
        serde_json::from_value(fixture()["cases"][0]["spec"].clone()).expect("spec");
    let rows = vec![vec![0.25], vec![-1.], vec![1.]];
    let expected =
        evaluate_with_blocks(&original, &rows, &[0, 1, 1]).expect("full-rank evaluation");
    let mut spec = original;
    spec.runs = 0;
    spec.fixed_runs = vec![vec![f64::NAN]];
    let blocks = spec.blocks.as_mut().expect("labels");
    blocks.fixed_blocks = vec![99];
    blocks.new_runs.clear();
    assert_eq!(
        expected,
        evaluate_with_blocks(&spec, &rows, &[0, 1, 1])
            .expect("explicit rows and block identities override the unused allocation")
    );
    assert!(
        evaluate_with_blocks(&spec, &rows[..2], &[0, 1])
            .expect("singular evaluation with fewer rows than columns")
            .log_det
            .is_none()
    );
}
