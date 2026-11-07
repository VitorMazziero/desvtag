//! Fixed-design power against SciPy and independent raw-normal-data OLS simulation.
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::power::{
    PowerDesign, PowerGoal, PowerRequest, PowerResult, PowerSimulation, analyze,
};
use serde_json::Value;
fn cases() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/power_advanced/power.json"
    ))
    .expect("reference cases")
}
fn number(value: &Value, key: &str) -> f64 {
    value[key].as_f64().expect("number")
}
fn close(a: f64, b: f64) {
    assert!((a - b).abs() < 1e-9 * (1.0 + b.abs()), "{a} != {b}");
}
#[test]
fn all_ten_fixed_designs_equal_scipy_including_minimum_integer_replication_and_precision() {
    for c in cases()["cases"].as_array().expect("cases") {
        let request: PowerRequest = serde_json::from_value(c["request"].clone()).expect("request");
        let result = analyze(&request).expect("analytical power");
        let restored: PowerResult =
            serde_json::from_slice(&serde_json::to_vec(&result).expect("encode actual result"))
                .expect("decode typed power contract");
        assert_eq!(restored, result);
        let expected = &c["expected"];
        assert_eq!(
            result.n,
            expected["n"].as_u64().expect("n") as u32,
            "{}",
            c["name"]
        );
        assert_eq!(
            result.total,
            expected["total"].as_u64().expect("total") as u32
        );
        close(
            result.power.value().expect("power"),
            number(expected, "power"),
        );
        close(
            result.noncentrality.expect("finite noncentrality"),
            number(expected, "noncentrality"),
        );
        close(result.df1, number(expected, "df1"));
        close(result.df2, number(expected, "df2"));
        close(result.critical, number(expected, "critical"));
        if let Some(h) = expected["halfWidth"].as_f64() {
            close(result.half_width.value().expect("half width"), h);
        } else {
            assert!(result.half_width.value().is_none());
        }
        assert_eq!(result.provenance.method_version, 2);
        assert!(result.curve.windows(2).all(|p| p[0].n < p[1].n));
        if result.n > 1 && !matches!(request.goal, PowerGoal::PowerAt { .. }) {
            let below = analyze(&PowerRequest {
                goal: PowerGoal::PowerAt { n: result.n - 1 },
                ..request
            });
            if let Ok(below) = below {
                match c["request"]["goal"]["type"].as_str().expect("goal") {
                    "sampleSizeFor" => assert!(
                        below.power.value().expect("power")
                            < number(&c["request"]["goal"], "power")
                    ),
                    _ => assert!(
                        below.half_width.value().expect("half width")
                            > number(&c["request"]["goal"], "halfWidth")
                    ),
                }
            }
        }
    }
}
#[test]
fn simulated_rejections_agree_with_analytical_power_and_independent_raw_data_ols() {
    for (i, c) in cases()["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .enumerate()
    {
        let mut request: PowerRequest =
            serde_json::from_value(c["request"].clone()).expect("request");
        request.simulation = Some(PowerSimulation {
            seed: 20261104 + i as u32,
            replications: 50000,
        });
        let result = analyze(&request).expect("simulation");
        let sim = result.simulation.as_ref().expect("simulation");
        let exact = number(&c["expected"], "power");
        let tolerance = 6.0 * (exact * (1.0 - exact) / 50000.0).sqrt() + 2.0 / 50000.0;
        assert!(
            (sim.estimate - exact).abs() < tolerance,
            "{} sim {} != exact {exact}",
            c["name"],
            sim.estimate
        );
        let independent = &c["simulation"];
        let comparison = 6.0
            * (sim.standard_error.powi(2) + number(independent, "mcse").powi(2)).sqrt()
            + 2.0 / 50000.0;
        assert!(
            (sim.estimate - number(independent, "estimate")).abs() < comparison,
            "{} independent MC",
            c["name"]
        );
        assert!(sim.ci_lower <= sim.estimate && sim.ci_upper >= sim.estimate);
        assert!(sim.ci_lower >= 0.0 && sim.ci_upper <= 1.0 && sim.ci_lower < sim.ci_upper);
        let repeated = analyze(&request).expect("same seed");
        assert_eq!(repeated.simulation, result.simulation);
        if let Ok(directory) = std::env::var("OPTIMA_POWER_NATIVE_FIXTURES") {
            let directory = std::path::PathBuf::from(directory);
            std::fs::create_dir_all(&directory).expect("fixture directory");
            let path = directory.join(format!("{}.json", c["name"].as_str().expect("name")));
            std::fs::write(
                path,
                serde_json::to_vec_pretty(&serde_json::json!({"request":request,"result":result}))
                    .expect("fixture JSON"),
            )
            .expect("native fixture");
        }
    }
}
#[test]
fn simulation_calibrates_legacy_nulls_and_retains_small_sample_noncentral_t_uncertainty() {
    let base = PowerRequest {
        design: PowerDesign::Anova {
            means: vec![0.0, 0.0, 0.0],
        },
        sigma: 1.0,
        alpha: 0.05,
        two_sided: true,
        goal: PowerGoal::PowerAt { n: 4 },
        simulation: Some(PowerSimulation {
            seed: 42,
            replications: 100000,
        }),
    };
    for design in [
        PowerDesign::Anova {
            means: vec![0.0, 0.0, 0.0],
        },
        PowerDesign::OneSampleT { difference: 0.0 },
        PowerDesign::PairedT { difference: 0.0 },
        PowerDesign::TwoSampleT { difference: 0.0 },
    ] {
        let result = analyze(&PowerRequest {
            design,
            ..base.clone()
        })
        .expect("null calibration");
        let sim = result.simulation.expect("simulation");
        assert!((sim.estimate - 0.05).abs() < 6.0 * (0.05_f64 * 0.95 / 100000.0).sqrt());
        close(result.power.value().expect("power"), 0.05);
    }
    let reference: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/noncentral_extreme/tails.json"
    ))
    .expect("extreme");
    let mut request: PowerRequest =
        serde_json::from_value(reference["power"]["request"].clone()).expect("request");
    request.simulation = base.simulation;
    let result = analyze(&request).expect("small sample");
    let sim = result.simulation.expect("simulation");
    assert!(
        sim.estimate < 0.6
            && (sim.estimate - number(&reference["power"], "expected")).abs()
                < 6.0 * sim.standard_error
    );
}
#[test]
fn malformed_nonestimable_and_over_budget_designs_are_rejected_without_panic() {
    let base: PowerRequest =
        serde_json::from_value(cases()["cases"][0]["request"].clone()).expect("request");
    let bad = [
        PowerDesign::Regression {
            predictors: vec![vec![1.0]; 5],
            coefficients: vec![1.0],
        },
        PowerDesign::Regression {
            predictors: vec![vec![1.0, 1.0], vec![2.0, 2.0], vec![3.0, 3.0]],
            coefficients: vec![1.0, 1.0],
        },
        PowerDesign::Regression {
            predictors: vec![vec![f64::NAN]; 5],
            coefficients: vec![1.0],
        },
        PowerDesign::Contrast {
            means: vec![1.0, 2.0],
            weights: vec![1.0, 1.0],
            allocation: vec![1, 1],
        },
        PowerDesign::Contrast {
            means: vec![1.0, 2.0],
            weights: vec![-1.0, 1.0],
            allocation: vec![0, 1],
        },
        PowerDesign::TwoLevel {
            factors: 3,
            terms: vec![vec![0, 1], vec![1, 0]],
            effects: vec![1.0, 1.0],
            target: 0,
        },
        PowerDesign::TwoLevel {
            factors: 3,
            terms: vec![vec![3]],
            effects: vec![1.0],
            target: 0,
        },
    ];
    for design in bad {
        assert!(
            analyze(&PowerRequest {
                design,
                ..base.clone()
            })
            .is_err()
        );
    }
    assert!(
        analyze(&PowerRequest {
            goal: PowerGoal::PowerAt { n: u32::MAX },
            ..base.clone()
        })
        .is_err()
    );
    assert!(
        analyze(&PowerRequest {
            simulation: Some(PowerSimulation {
                seed: 0,
                replications: 999
            }),
            ..base.clone()
        })
        .is_err()
    );
    assert!(
        analyze(&PowerRequest {
            goal: PowerGoal::PrecisionFor { half_width: 1.0 },
            ..base
        })
        .is_err()
    );
}
#[test]
fn wilson_intervals_remain_non_degenerate_at_zero_or_all_rejections() {
    let base: PowerRequest =
        serde_json::from_value(cases()["cases"][2]["request"].clone()).expect("request");
    let result = analyze(&PowerRequest {
        goal: PowerGoal::PowerAt { n: 500 },
        simulation: Some(PowerSimulation {
            seed: 0,
            replications: 1000,
        }),
        ..base
    })
    .expect("all rejects");
    let sim = result.simulation.expect("simulation");
    assert_eq!(sim.rejections, 1000);
    assert!(sim.ci_lower < 1.0 && sim.ci_upper <= 1.0);
    let zero = analyze(&PowerRequest {
        design: PowerDesign::OneSampleT { difference: 0.0 },
        sigma: 1.0,
        alpha: 1e-10,
        two_sided: true,
        goal: PowerGoal::PowerAt { n: 10 },
        simulation: Some(PowerSimulation {
            seed: 42,
            replications: 1000,
        }),
    })
    .expect("no rejections")
    .simulation
    .expect("simulation");
    assert_eq!(zero.rejections, 0);
    assert_eq!(zero.ci_lower, 0.0);
    assert!(zero.ci_upper > 0.0);
}

#[test]
fn response_units_preserve_all_advanced_power_goals() {
    for case in cases()["cases"].as_array().expect("cases") {
        let original: PowerRequest =
            serde_json::from_value(case["request"].clone()).expect("request");
        let baseline = analyze(&original).expect("baseline");
        for scale in [1e-160, 1e-10, 1e10, 1e160] {
            let mut scaled = original.clone();
            scaled.sigma *= scale;
            match &mut scaled.design {
                PowerDesign::Regression { coefficients, .. } => {
                    coefficients.iter_mut().for_each(|x| *x *= scale)
                }
                PowerDesign::Contrast { means, .. } => means.iter_mut().for_each(|x| *x *= scale),
                PowerDesign::TwoLevel { effects, .. } => {
                    effects.iter_mut().for_each(|x| *x *= scale)
                }
                _ => unreachable!(),
            }
            if let PowerGoal::PrecisionFor { half_width } = &mut scaled.goal {
                *half_width *= scale;
            }
            let result = analyze(&scaled).expect("equivalent units");
            assert_eq!(result.n, baseline.n);
            close(
                result.power.value().expect("power"),
                baseline.power.value().expect("power"),
            );
            close(
                result.noncentrality.expect("finite noncentrality"),
                baseline.noncentrality.expect("finite noncentrality"),
            );
            if let (Some(a), Some(b)) = (result.half_width.value(), baseline.half_width.value()) {
                close(a / scale, b);
            }
        }
    }
}
#[test]
fn contrast_weight_scale_preserves_power_and_scales_precision() {
    let original: PowerRequest =
        serde_json::from_value(cases()["cases"][2]["request"].clone()).expect("request");
    let baseline = analyze(&original).expect("baseline");
    for scale in [1e-160, -1e-160, 1e160] {
        let mut request = original.clone();
        if let PowerDesign::Contrast { weights, .. } = &mut request.design {
            weights.iter_mut().for_each(|x| *x *= scale);
        }
        let r = analyze(&request).expect("weights");
        close(
            r.power.value().expect("power"),
            baseline.power.value().expect("power"),
        );
        close(
            r.half_width.value().expect("width") / scale.abs(),
            baseline.half_width.value().expect("width"),
        );
    }
}

#[test]
fn reciprocal_response_and_contrast_units_do_not_overflow_intermediate_products() {
    for scale in [1e-308, 1.0, 1e308] {
        let result = analyze(&PowerRequest {
            design: PowerDesign::Contrast {
                means: vec![0.0, scale],
                weights: vec![-1.0 / scale, 1.0 / scale],
                allocation: vec![1, 1],
            },
            sigma: scale,
            alpha: 0.05,
            two_sided: true,
            goal: PowerGoal::PowerAt { n: 10 },
            simulation: None,
        })
        .expect("representable contrast standard error");
        close(result.power.value().expect("power"), 0.5620066465862328);
        close(
            result.half_width.value().expect("width"),
            0.9395608994813021,
        );
    }
}

#[test]
fn valid_precision_survives_unrepresentable_effect_power_and_optional_simulation() {
    for design in [
        PowerDesign::OneSampleT { difference: 1e308 },
        PowerDesign::TwoSampleT { difference: 1e308 },
        PowerDesign::PairedT { difference: 1e308 },
        PowerDesign::Contrast {
            means: vec![0.0, 1e308],
            weights: vec![-1.0, 1.0],
            allocation: vec![1, 1],
        },
        PowerDesign::TwoLevel {
            factors: 1,
            terms: vec![vec![0]],
            effects: vec![1e308],
            target: 0,
        },
    ] {
        for simulation in [
            None,
            Some(PowerSimulation {
                seed: 42,
                replications: 1000,
            }),
        ] {
            let request = PowerRequest {
                design: design.clone(),
                sigma: 1e-308,
                alpha: 0.05,
                two_sided: true,
                goal: PowerGoal::PrecisionFor { half_width: 1e-307 },
                simulation,
            };
            let result = analyze(&request).expect("precision is independent of assumed effect");
            assert_eq!(result.n, 2);
            assert!(
                result
                    .half_width
                    .value()
                    .is_some_and(|h| h > 0.0 && h <= 1e-307)
            );
            assert!(result.power.value().is_none());
            assert!(result.noncentrality.is_none());
            assert!(result.curve.is_empty());
            assert!(
                result
                    .issues
                    .iter()
                    .any(|i| i.code == "power.analytical_unavailable")
            );
            assert_eq!(result.provenance.method_version, 2);
            assert!(result.simulation.is_none());
            assert_eq!(
                result
                    .issues
                    .iter()
                    .any(|i| i.code == "power.simulation_unavailable"),
                request.simulation.is_some()
            );
            let restored: PowerResult =
                serde_json::from_slice(&serde_json::to_vec(&result).expect("JSON"))
                    .expect("typed result");
            assert_eq!(restored, result);
            assert!(
                analyze(&PowerRequest {
                    goal: PowerGoal::PowerAt { n: 2 },
                    ..request
                })
                .is_err()
            );
        }
    }
}

#[test]
fn precision_search_balances_intermediate_overflow_and_matches_independent_scipy() {
    for (design, n, expected) in [
        (
            PowerDesign::OneSampleT { difference: 0.0 },
            7,
            0.9248457483180448,
        ),
        (
            PowerDesign::Contrast {
                means: vec![0.0, 0.0],
                weights: vec![-2.0, 2.0],
                allocation: vec![1, 1],
            },
            32,
            0.9994857585166896,
        ),
    ] {
        for sigma in [1.0, 1e308] {
            let result = analyze(&PowerRequest {
                design: design.clone(),
                sigma,
                alpha: 0.05,
                two_sided: true,
                goal: PowerGoal::PrecisionFor { half_width: sigma },
                simulation: None,
            })
            .expect("representable precision");
            assert_eq!(result.n, n);
            close(result.half_width.value().expect("width") / sigma, expected);
        }
    }
}

#[test]
fn simulation_budget_does_not_discard_a_valid_two_group_precision() {
    let result = analyze(&PowerRequest {
        design: PowerDesign::TwoSampleT { difference: 0.01 },
        sigma: 1.0,
        alpha: 0.05,
        two_sided: true,
        goal: PowerGoal::PrecisionFor { half_width: 0.01 },
        simulation: Some(PowerSimulation {
            seed: 42,
            replications: 1000,
        }),
    })
    .expect("precision within per-group search budget");
    assert!(result.total > 100000);
    assert!(
        result
            .half_width
            .value()
            .is_some_and(|h| h > 0.0 && h <= 0.01)
    );
    assert!(result.power.value().is_some());
    assert!(result.simulation.is_none());
    assert!(
        result
            .issues
            .iter()
            .any(|i| i.code == "power.simulation_total_budget")
    );
}

#[test]
fn precision_minimum_can_be_one_complete_base_replicate() {
    for design in [
        PowerDesign::Contrast {
            means: vec![0.0, 1.0],
            weights: vec![-1.0, 1.0],
            allocation: vec![2, 2],
        },
        PowerDesign::TwoLevel {
            factors: 2,
            terms: vec![vec![0]],
            effects: vec![1.0],
            target: 0,
        },
    ] {
        let result = analyze(&PowerRequest {
            design,
            sigma: 1.0,
            alpha: 0.05,
            two_sided: true,
            goal: PowerGoal::PrecisionFor { half_width: 10.0 },
            simulation: None,
        })
        .expect("one admissible base replicate");
        assert_eq!((result.n, result.total), (1, 4));
        close(result.df1, 2.0);
        close(result.half_width.value().expect("width"), 4.302652729696144);
    }
}
