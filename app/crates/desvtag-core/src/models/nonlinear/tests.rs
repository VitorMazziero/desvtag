use super::*;
fn request(model: SaturationModel, x: &[f64], y: &[f64]) -> NonlinearRequest {
    NonlinearRequest {
        x: x.to_vec(),
        y: y.to_vec(),
        model,
        initial: None,
        lower: None,
        upper: None,
        alpha: 0.05,
        profile: None,
    }
}

#[test]
fn unfinished_main_search_is_an_error_but_unfinished_profiles_preserve_the_fit() {
    use crate::models::resource_budget::WorkBudget;
    let mut req = request(
        SaturationModel::Monod,
        &[0.1, 0.5, 1., 2., 4., 8., 12., 16.],
        &[0.15, 0.59, 1.01, 1.49, 2.01, 2.39, 2.58, 2.66],
    );
    let measure = WorkBudget::new(MAX_ROW_WORK, "test.nonlinear");
    let full = fitting::fit_with_budget(&req, measure.clone()).expect("complete point fit");
    let incomplete =
        fitting::fit_with_budget(&req, WorkBudget::new(measure.spent() - 1, "test.nonlinear"));
    let CoreError::InvalidInput(issues) =
        incomplete.expect_err("unfinished multistart must not be published");
    assert!(issues.iter().any(|i| i.code == "nonlinear.work_budget"));

    req.profile = Some(true);
    let partial =
        fitting::fit_with_budget(&req, WorkBudget::new(measure.spent() + 1, "test.nonlinear"))
            .expect("complete fit survives unavailable profile");
    assert_eq!(partial.parameters, full.parameters);
    assert_eq!(partial.sse, full.sse);
    assert_eq!(partial.curve, full.curve);
    assert_eq!(partial.residuals, full.residuals);
    assert!(
        partial
            .issues
            .iter()
            .any(|i| i.code == "nonlinear.profile_budget")
    );
    for profile in partial.profiles.as_ref().expect("profiles") {
        assert_eq!(profile.lower_status, ProfileEndpointStatus::ResourceLimit);
        assert_eq!(profile.upper_status, ProfileEndpointStatus::ResourceLimit);
        assert!(profile.lower.value().is_none() && profile.upper.value().is_none());
        assert!(!profile.unimodal_in_examined_range);
        assert!(
            profile
                .points
                .iter()
                .all(|p| p.likelihood_ratio.is_finite())
        );
    }
    let restored: NonlinearResult =
        serde_json::from_slice(&serde_json::to_vec(&partial).expect("serialize partial result"))
            .expect("explicit partial result contract");
    assert_eq!(restored, partial);
}

#[test]
fn nonlinear_row_envelope_accepts_the_boundary_without_truncation() {
    let x: Vec<f64> = (0..MAX_OBSERVATIONS)
        .map(|i| 0.5 + (i % 8) as f64)
        .collect();
    let y: Vec<f64> = x.iter().map(|s| 3. * s / (2.5 + s)).collect();
    let mut req = request(SaturationModel::Monod, &x, &y);
    req.initial = Some(vec![3., 2.5]);
    let fit = fit(&req).expect("boundary is admitted");
    assert_eq!(fit.n as usize, MAX_OBSERVATIONS);
    assert_eq!(fit.residuals.len(), MAX_OBSERVATIONS);
    assert_eq!(fit.sse, 0.);
    req.x.push(1.);
    req.y.push(1.);
    let CoreError::InvalidInput(issues) =
        super::fit(&req).expect_err("excess rows must not be silently dropped");
    assert!(issues.iter().any(|i| i.code == "nonlinear.row_budget"));
}

#[test]
fn a_noise_free_monod_curve_is_recovered_exactly() {
    let x = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
    let y: Vec<f64> = x.iter().map(|s| 3.0 * s / (2.5 + s)).collect();
    let r = fit(&request(SaturationModel::Monod, &x, &y)).expect("ajuste");
    assert!(r.converged);
    assert!((r.parameters[0].estimate - 3.0).abs() < 1e-6);
    assert!((r.parameters[1].estimate - 2.5).abs() < 1e-6);
    assert!(r.sse < 1e-12);
    assert_eq!(r.curve.len(), CURVE_POINTS);
}

#[test]
fn haldane_and_hill_recover_known_parameters() {
    let x = [0.2, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0];
    let yh: Vec<f64> = x
        .iter()
        .map(|s| 5.0 * s / (3.0 + s + s * s / 40.0))
        .collect();
    let h = fit(&request(SaturationModel::Haldane, &x, &yh)).expect("haldane");
    assert!((h.parameters[0].estimate - 5.0).abs() < 1e-4);
    assert!((h.parameters[1].estimate - 3.0).abs() < 1e-4);
    assert!((h.parameters[2].estimate - 40.0).abs() < 1e-2);
    let yn: Vec<f64> = x
        .iter()
        .map(|s| 4.0 * s.powf(2.0) / (6.0_f64.powf(2.0) + s.powf(2.0)))
        .collect();
    let n = fit(&request(SaturationModel::Hill, &x, &yn)).expect("hill");
    assert!((n.parameters[0].estimate - 4.0).abs() < 1e-5);
    assert!((n.parameters[1].estimate - 6.0).abs() < 1e-5);
    assert!((n.parameters[2].estimate - 2.0).abs() < 1e-5);
}

#[test]
fn a_narrow_substrate_range_is_flagged_as_poorly_identifiable() {
    // S muito menor que Ks: a curva é quase uma reta e a e b ficam fortemente correlacionados.
    let x = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    let y = [0.049, 0.101, 0.148, 0.205, 0.247, 0.302];
    let r = fit(&request(SaturationModel::Monod, &x, &y)).expect("ajuste");
    assert!(
        r.issues
            .iter()
            .any(|i| i.code == "nonlinear.highly_correlated"
                || i.code == "nonlinear.ill_conditioned"
                || i.code == "nonlinear.imprecise_parameter")
    );
}

#[test]
fn invalid_requests_are_refused() {
    assert!(fit(&request(SaturationModel::Monod, &[1.0, 2.0], &[1.0, 2.0])).is_err());
    assert!(
        fit(&request(
            SaturationModel::Monod,
            &[1.0, -2.0, 3.0],
            &[1.0, 2.0, 3.0]
        ))
        .is_err()
    );
    assert!(
        fit(&request(
            SaturationModel::Hill,
            &[0.0, 1.0, 2.0, 3.0],
            &[1.0; 4]
        ))
        .is_err()
    );
    let mut bad = request(
        SaturationModel::Monod,
        &[1.0, 2.0, 3.0, 4.0],
        &[1.0, 2.0, 2.5, 2.8],
    );
    bad.initial = Some(vec![1.0]);
    assert!(fit(&bad).is_err());
}

#[test]
fn exact_fit_has_serializable_explicitly_unavailable_inference() {
    let x = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0];
    let y: Vec<f64> = x.iter().map(|s| 10.0 * s / (2.0 + s)).collect();
    let mut req = request(SaturationModel::Monod, &x, &y);
    req.initial = Some(vec![10.0, 2.0]);
    req.profile = Some(true);
    let result = fit(&req).expect("fit");
    assert_eq!(result.sse, 0.0);
    assert!(result.correlation.is_empty());
    assert!(
        result
            .parameters
            .iter()
            .all(|p| p.std_error.value().is_none()
                && p.t_value.value().is_none()
                && p.p_value.value().is_none()
                && p.ci_lower.value().is_none()
                && p.ci_upper.value().is_none())
    );
    assert!(
        result
            .curve
            .iter()
            .all(|p| p.lower.value().is_none() && p.upper.value().is_none())
    );
    let bytes = serde_json::to_vec(&result).expect("encode");
    let restored: NonlinearResult = serde_json::from_slice(&bytes).expect("decode actual contract");
    assert_eq!(restored, result);
}

#[test]
fn deficient_and_boundary_fits_keep_a_deserializable_result_and_diagnostics() {
    let mut deficient = request(
        SaturationModel::Monod,
        &[1.0; 6],
        &[1.0, 1.1, 0.9, 1.0, 1.1, 0.9],
    );
    deficient.profile = Some(true);
    let x = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0];
    let y: Vec<f64> = x.iter().map(|s| 10.0 * s / (2.0 + s)).collect();
    let mut bounded = request(SaturationModel::Monod, &x, &y);
    bounded.initial = Some(vec![4.0, 2.0]);
    bounded.upper = Some(vec![Some(5.0), None]);
    bounded.profile = Some(true);
    for req in [deficient, bounded] {
        let result = fit(&req).expect("adversarial fit");
        assert!(!result.issues.is_empty());
        assert!(result.correlation.iter().flatten().all(|v| v.is_finite()));
        if !result.converged {
            assert!(
                result
                    .parameters
                    .iter()
                    .all(|p| p.std_error.value().is_none() && p.p_value.value().is_none())
            );
        }
        if req.upper.is_some() {
            assert!(result.parameters[0].at_bound);
            assert!(
                result
                    .issues
                    .iter()
                    .any(|i| i.code == "nonlinear.parameter_at_bound")
            );
        }
        let restored: NonlinearResult =
            serde_json::from_slice(&serde_json::to_vec(&result).expect("encode"))
                .expect("decode typed result");
        assert_eq!(restored, result);
    }
}
