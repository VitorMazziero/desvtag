//! Casos de borda e erros de `linear_model`: estados indefinidos explícitos, entradas inválidas e
//! predição. Os valores numéricos de referência vêm de `scipy.stats` (ver comentários).
#![allow(clippy::expect_used, clippy::panic, clippy::indexing_slicing)]

use optima_core::descriptive::{Stat, UndefinedReason};
use optima_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use optima_core::errors::CoreError;
use optima_core::models::linear::{fit_matrix, fit_model, fit_model_with_predictions};
use optima_core::models::prediction::predict_row;
use optima_core::models::{CategoricalCoding, LinearModelRequest, ModelSpec, TermSpec};
use optima_core::numeric::Matrix;

fn id(text: &str) -> StableId {
    StableId::new(text.to_string()).expect("id")
}

fn numeric_factor(name: &str) -> Factor {
    Factor {
        id: id(name),
        name: name.into(),
        kind: FactorKind::Numeric,
        unit: None,
        levels: vec![],
    }
}

fn dataset(x: &[Option<f64>], y: &[Option<f64>]) -> Dataset {
    Dataset {
        factors: vec![numeric_factor("x")],
        responses: vec![Response {
            id: id("y"),
            name: "y".into(),
            unit: None,
        }],
        observations: x
            .iter()
            .zip(y)
            .enumerate()
            .map(|(i, (x, y))| Observation {
                id: id(&format!("o{}", i + 1)),
                unit_id: None,
                factors: vec![x.map(FactorValue::Number)],
                responses: vec![*y],
            })
            .collect(),
    }
}

fn simple_request(terms: Vec<TermSpec>, d: Dataset) -> LinearModelRequest {
    LinearModelRequest {
        dataset: d,
        spec: ModelSpec {
            response_id: id("y"),
            intercept: true,
            terms,
            coding: CategoricalCoding::Treatment,
            confidence_level: 0.95,
        },
    }
}

fn main_x() -> TermSpec {
    TermSpec::Main { factor_id: id("x") }
}

fn some(values: &[f64]) -> Vec<Option<f64>> {
    values.iter().map(|v| Some(*v)).collect()
}

fn codes(err: &CoreError) -> Vec<String> {
    let CoreError::InvalidInput(issues) = err;
    issues.iter().map(|i| i.code.clone()).collect()
}

fn labels(n: usize) -> Vec<String> {
    (0..n).map(|i| format!("c{i}")).collect()
}

#[test]
fn prediction_matches_scipy() {
    let x = some(&[1.0, 2.0, 3.0, 4.0, 5.0]);
    let y = some(&[1.0, 3.0, 2.0, 5.0, 4.0]);
    let fit = fit_model_with_predictions(&simple_request(vec![main_x()], dataset(&x, &y)))
        .expect("ajuste");
    // numpy.polyfit + scipy.stats.t.ppf(0.975, 3) = 3.182446305284263
    let p3 = predict_row(&fit.model, &[1.0, 3.0], 0.95);
    let get = |s: Stat| s.value().expect("definido");
    assert!((get(p3.fitted) - 3.0).abs() < 1e-12);
    assert!((get(p3.mean_std_error) - 0.489_897_948_556_635_6).abs() < 1e-12);
    assert!((get(p3.mean_lower) - 1.440_926_083_649_867_2).abs() < 1e-11);
    assert!((get(p3.mean_upper) - 4.559_073_916_350_133).abs() < 1e-11);
    assert!((get(p3.prediction_lower) + 0.818_935_566_340_449).abs() < 1e-11);
    assert!((get(p3.prediction_upper) - 6.818_935_566_340_449).abs() < 1e-11);
    let p6 = predict_row(&fit.model, &[1.0, 6.0], 0.95);
    assert!((get(p6.fitted) - 5.4).abs() < 1e-12);
    assert!((get(p6.mean_std_error) - 1.148_912_529_307_605_7).abs() < 1e-12);
    assert!((get(p6.prediction_upper) - 10.451_976_890_758_218).abs() < 1e-11);
    // Linha de comprimento errado: não estimável.
    assert_eq!(
        predict_row(&fit.model, &[1.0], 0.95).fitted,
        Stat::Undefined {
            reason: UndefinedReason::NotEstimable
        }
    );
}

#[test]
fn constant_response_and_intercept_only_are_explicit() {
    let x = some(&[1.0, 2.0, 3.0, 4.0]);
    let fit = fit_model(&simple_request(
        vec![main_x()],
        dataset(&x, &some(&[7.0; 4])),
    ))
    .expect("ajuste");
    assert_eq!(
        fit.anova.r_squared,
        Stat::Undefined {
            reason: UndefinedReason::ConstantResponse
        }
    );
    assert_eq!(
        fit.anova.f,
        Stat::Undefined {
            reason: UndefinedReason::ConstantResponse
        }
    );
    assert!(
        fit.issues
            .iter()
            .any(|i| i.code == "model.constant_response")
    );
    // Coeficiente da inclinação nulo (a mesma resposta em todos os x), interceptos exatos.
    assert!(
        fit.coefficients[0]
            .estimate
            .value()
            .is_some_and(|v| (v - 7.0).abs() < 1e-12)
    );

    let only_intercept = fit_model(&simple_request(
        vec![],
        dataset(&x, &some(&[1.0, 2.0, 4.0, 9.0])),
    ))
    .expect("ajuste");
    assert_eq!(only_intercept.rank, 1);
    assert_eq!(only_intercept.df_residual, 3);
    assert_eq!(
        only_intercept.anova.f,
        Stat::Undefined {
            reason: UndefinedReason::NoModelTerms
        }
    );
    // t da média: 4 / (sd/√n), sd = √(minha variância 12,6666…).
    let mean = only_intercept.coefficients[0]
        .estimate
        .value()
        .expect("média");
    assert!((mean - 4.0).abs() < 1e-14);
}

#[test]
fn one_observation_has_no_uncertainty() {
    let fit = fit_model(&simple_request(
        vec![],
        dataset(&some(&[1.0]), &some(&[5.0])),
    ))
    .expect("ajuste");
    assert_eq!(fit.df_residual, 0);
    assert_eq!(
        fit.residual_sd,
        Stat::Undefined {
            reason: UndefinedReason::NoResidualDegreesOfFreedom
        }
    );
    assert!(
        fit.coefficients[0]
            .estimate
            .value()
            .is_some_and(|v| (v - 5.0).abs() < 1e-14)
    );
}

#[test]
fn matrix_level_errors_are_blocking_diagnostics() {
    let ok = Matrix::from_rows(&[vec![1.0, 1.0], vec![1.0, 2.0], vec![1.0, 4.0]]).expect("matriz");
    let first = |r: Result<_, Vec<optima_core::validation::Issue>>| match r {
        Ok(_) => "ok".to_string(),
        Err(issues) => issues[0].code.clone(),
    };
    assert_eq!(
        first(fit_matrix(&ok, &[1.0, 2.0], &labels(2), true, 0.95)),
        "model.invalid_dimensions"
    );
    assert_eq!(
        first(fit_matrix(&ok, &[1.0, 2.0, 3.0], &labels(1), true, 0.95)),
        "model.invalid_dimensions"
    );
    assert_eq!(
        first(fit_matrix(
            &ok,
            &[1.0, 2.0, f64::NAN],
            &labels(2),
            true,
            0.95
        )),
        "model.non_finite_input"
    );
    assert_eq!(
        first(fit_matrix(&ok, &[1.0, 2.0, 3.0], &labels(2), true, 1.0)),
        "model.invalid_confidence_level"
    );
    assert_eq!(
        first(fit_matrix(
            &ok,
            &[1.0, 2.0, 3.0],
            &labels(2),
            true,
            f64::NAN
        )),
        "model.invalid_confidence_level"
    );
    let zeros = Matrix::zeros(3, 2);
    assert_eq!(
        first(fit_matrix(&zeros, &[1.0, 2.0, 3.0], &labels(2), true, 0.95)),
        "model.zero_rank"
    );
    let empty = Matrix::zeros(0, 0);
    assert_eq!(
        first(fit_matrix(&empty, &[], &[], true, 0.95)),
        "model.invalid_dimensions"
    );
}

#[test]
fn zero_column_is_aliased_not_a_failure() {
    let x = Matrix::from_rows(&[
        vec![1.0, 0.0, 1.0],
        vec![1.0, 0.0, 2.0],
        vec![1.0, 0.0, 4.0],
        vec![1.0, 0.0, 5.0],
    ])
    .expect("matriz");
    let fit = fit_matrix(&x, &[1.0, 2.0, 2.5, 4.0], &labels(3), true, 0.95).expect("ajuste");
    assert_eq!(fit.report.rank, 2);
    assert_eq!(fit.report.aliased, vec!["c1".to_string()]);
    assert_eq!(
        fit.report.coefficients[1].estimate,
        Stat::Undefined {
            reason: UndefinedReason::NotEstimable
        }
    );
}

#[test]
fn invalid_model_specifications_are_reported_by_code() {
    let x = some(&[1.0, 2.0, 3.0, 4.0]);
    let y = some(&[1.0, 2.0, 2.0, 5.0]);
    let run = |terms: Vec<TermSpec>, d: Dataset| {
        codes(&fit_model(&simple_request(terms, d)).expect_err("deveria falhar"))
    };
    assert!(
        run(vec![TermSpec::Main { factor_id: id("z") }], dataset(&x, &y))
            .contains(&"request.unknown_group_factor".to_string())
    );
    assert!(
        run(
            vec![
                main_x(),
                TermSpec::Power {
                    factor_id: id("x"),
                    degree: 1
                }
            ],
            dataset(&x, &y)
        )
        .contains(&"model.invalid_power".to_string())
    );
    assert!(
        run(vec![main_x(), main_x()], dataset(&x, &y))
            .contains(&"model.duplicate_term".to_string())
    );
    assert!(
        run(
            vec![TermSpec::Interaction {
                factor_ids: vec![id("x"), id("x")]
            }],
            dataset(&x, &y)
        )
        .contains(&"model.invalid_interaction".to_string())
    );
    assert!(
        run(vec![main_x()], dataset(&x, &[None, None, None, None]))
            .contains(&"model.no_complete_rows".to_string())
    );
    // Resposta desconhecida.
    let mut request = simple_request(vec![main_x()], dataset(&x, &y));
    request.spec.response_id = id("outra");
    assert!(
        codes(&fit_model(&request).expect_err("deveria falhar"))
            .contains(&"request.unknown_response".to_string())
    );
}

#[test]
fn missing_values_are_excluded_with_reason_never_imputed() {
    let x = vec![Some(1.0), Some(2.0), None, Some(4.0), Some(5.0), Some(6.0)];
    let y = vec![Some(1.0), None, Some(3.0), Some(4.0), Some(6.0), Some(6.5)];
    let fit = fit_model(&simple_request(vec![main_x()], dataset(&x, &y))).expect("ajuste");
    assert_eq!(fit.n_observations, 4);
    assert_eq!(fit.excluded.len(), 2);
    assert!(
        fit.issues
            .iter()
            .any(|i| i.code == "model.excluded_observations")
    );
    let json = serde_json::to_string(&fit).expect("serializa");
    assert!(!json.contains("NaN") && !json.contains("null,\"stdError\""));
    let back: optima_core::models::LinearFit = serde_json::from_str(&json).expect("lê de volta");
    assert_eq!(back, fit);
}

#[test]
fn leave_one_out_identity_for_externally_studentized_residuals() {
    // t_i externo = e_i / (σ_(i) √(1 − h_i)), com σ_(i) do ajuste sem a observação i.
    let x = some(&[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]);
    let y = some(&[1.1, 2.3, 2.8, 4.4, 4.9, 6.5, 6.8]);
    let full = fit_model(&simple_request(vec![main_x()], dataset(&x, &y))).expect("ajuste");
    for i in 0..7 {
        let (mut xs, mut ys) = (x.clone(), y.clone());
        xs.remove(i);
        ys.remove(i);
        let loo = fit_model(&simple_request(vec![main_x()], dataset(&xs, &ys))).expect("ajuste");
        let sigma_i = loo.residual_sd.value().expect("σ");
        let o = &full.observations[i];
        let expected = o.residual / (sigma_i * (1.0 - o.leverage).sqrt());
        let got = o.studentized_residual.value().expect("definido");
        assert!(
            (got - expected).abs() < 1e-11,
            "obs {i}: {got} vs {expected}"
        );
    }
}

fn fit_xy(x: &[f64], y: &[f64]) -> optima_core::models::LinearFit {
    fit_model(&simple_request(vec![main_x()], dataset(&some(x), &some(y)))).expect("ajuste")
}

#[test]
fn estimates_scale_with_the_data_units() {
    // y = a + b·x: trocar a unidade de x por c e a de y por d multiplica b por d/c e a por d.
    let x = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    let y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2];
    let base = fit_xy(&x, &y);
    let (b0, b1) = (
        base.coefficients[0].estimate.value().expect("a"),
        base.coefficients[1].estimate.value().expect("b"),
    );
    let p_base = base.coefficients[1].p_value.value().expect("p");
    for (c, d) in [
        (1e-6, 1.0),
        (1e6, 1e-3),
        (1e-3, 1e8),
        (1e8, 1e8),
        (1e-8, 1e-8),
    ] {
        let xs: Vec<f64> = x.iter().map(|v| v * c).collect();
        let ys: Vec<f64> = y.iter().map(|v| v * d).collect();
        let fit = fit_xy(&xs, &ys);
        let a = fit.coefficients[0].estimate.value().expect("a");
        let b = fit.coefficients[1].estimate.value().expect("b");
        assert!((a / d - b0).abs() < 1e-9 * b0.abs(), "a com c={c} d={d}");
        assert!(
            (b * c / d - b1).abs() < 1e-9 * b1.abs(),
            "b com c={c} d={d}"
        );
        // Estatísticas sem unidade não mudam.
        let p = fit.coefficients[1].p_value.value().expect("p");
        assert!(
            (p - p_base).abs() < 1e-9 * p_base.max(1e-300),
            "p com c={c} d={d}"
        );
        assert!(
            (fit.anova.r_squared.value().expect("r2") - base.anova.r_squared.value().expect("r2"))
                .abs()
                < 1e-10
        );
    }
}

#[test]
fn overflowing_scale_is_an_error_not_nan() {
    let result = fit_model(&simple_request(
        vec![main_x()],
        dataset(
            &some(&[1e200, 2e200, 3e200, 4e200]),
            &some(&[1.0, 2.0, 2.5, 4.0]),
        ),
    ));
    match result {
        Ok(fit) => {
            // Se o ajuste ocorrer, nenhum valor pode ser não finito.
            let json = serde_json::to_string(&fit).expect("serializa");
            assert!(!json.contains("NaN") && !json.contains("Infinity"));
        }
        Err(err) => assert!(codes(&err).iter().any(|c| c == "model.non_finite_result")),
    }
}

#[test]
fn row_order_does_not_change_the_fit() {
    let x = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
    let y = [1.1, 2.3, 2.8, 4.4, 4.9, 6.5, 6.8];
    let a = fit_xy(&x, &y);
    let order = [4, 0, 6, 2, 5, 1, 3];
    let xs: Vec<f64> = order.iter().map(|&i| x[i]).collect();
    let ys: Vec<f64> = order.iter().map(|&i| y[i]).collect();
    let b = fit_xy(&xs, &ys);
    for (ra, rb) in a.coefficients.iter().zip(&b.coefficients) {
        let (ea, eb) = (
            ra.estimate.value().expect("e"),
            rb.estimate.value().expect("e"),
        );
        assert!((ea - eb).abs() < 1e-12 * ea.abs().max(1.0));
        let (sa, sb) = (
            ra.std_error.value().expect("s"),
            rb.std_error.value().expect("s"),
        );
        assert!((sa - sb).abs() < 1e-12 * sa.abs());
    }
}
