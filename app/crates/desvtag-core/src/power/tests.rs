use super::*;
fn anova(goal: PowerGoal) -> PowerRequest {
    PowerRequest {
        design: PowerDesign::Anova {
            means: vec![10.0, 12.0, 14.0, 12.0],
        },
        sigma: 3.0,
        alpha: 0.05,
        two_sided: true,
        simulation: None,
        goal,
    }
}

#[test]
fn power_grows_with_n_and_the_sample_size_search_is_minimal() {
    let small = analyze(&anova(PowerGoal::PowerAt { n: 4 })).expect("n=4");
    let large = analyze(&anova(PowerGoal::PowerAt { n: 20 })).expect("n=20");
    assert!(large.power.value() > small.power.value());
    let found = analyze(&anova(PowerGoal::SampleSizeFor { power: 0.8 })).expect("tamanho");
    assert!(found.power.value().expect("p") >= 0.8);
    let below = analyze(&anova(PowerGoal::PowerAt { n: found.n - 1 })).expect("n−1");
    assert!(below.power.value().expect("p") < 0.8);
    assert_eq!(found.total, found.n * 4);
}

#[test]
fn t_tests_and_precision_work() {
    let paired = PowerRequest {
        design: PowerDesign::PairedT { difference: 1.0 },
        sigma: 1.5,
        alpha: 0.05,
        two_sided: true,
        simulation: None,
        goal: PowerGoal::SampleSizeFor { power: 0.9 },
    };
    let r = analyze(&paired).expect("pareado");
    assert!(r.power.value().expect("p") >= 0.9);
    let two = analyze(&PowerRequest {
        design: PowerDesign::TwoSampleT { difference: 1.0 },
        goal: PowerGoal::SampleSizeFor { power: 0.9 },
        ..paired.clone()
    })
    .expect("duas amostras");
    assert!(two.n > r.n);
    assert_eq!(two.total, two.n * 2);
    let precision = analyze(&PowerRequest {
        goal: PowerGoal::PrecisionFor { half_width: 0.5 },
        ..paired
    })
    .expect("precisão");
    assert!(precision.half_width.value().expect("h") <= 0.5);
}

#[test]
fn invalid_or_unreachable_requests_are_refused() {
    let mut bad = anova(PowerGoal::PowerAt { n: 1 });
    assert!(analyze(&bad).is_err());
    bad.goal = PowerGoal::SampleSizeFor { power: 1.0 };
    assert!(analyze(&bad).is_err());
    let none = PowerRequest {
        design: PowerDesign::Anova {
            means: vec![5.0, 5.0],
        },
        ..anova(PowerGoal::PowerAt { n: 5 })
    };
    assert!(
        (analyze(&none)
            .expect("null calibration")
            .power
            .value()
            .expect("power")
            - 0.05)
            .abs()
            < 1e-10
    );
    let tiny = PowerRequest {
        design: PowerDesign::OneSampleT { difference: 1e-9 },
        goal: PowerGoal::SampleSizeFor { power: 0.9 },
        ..anova(PowerGoal::PowerAt { n: 5 })
    };
    assert!(analyze(&tiny).is_err());
}
