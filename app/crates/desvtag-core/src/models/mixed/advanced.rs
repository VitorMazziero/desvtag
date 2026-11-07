//! Orquestração científica v2: preparação, REML, inferência, EMM e perfis.
use super::{
    advanced_types::*,
    covariance::Structure,
    estimates::{estimate, p_value, unavailable},
    estimation,
    inference::{Information, joint},
    marginal,
    prepare::{error, prepare},
    profiles,
    types::*,
};
use crate::{
    descriptive::{Stat, UndefinedReason},
    distributions::f,
    errors::CoreError,
    models::resource_budget::WorkBudget,
    provenance::Provenance,
    validation::{Issue, Severity},
};
pub(super) fn fit(
    request: &MixedModelRequest,
    spec: &AdvancedMixedSpec,
) -> Result<MixedModelResult, CoreError> {
    fit_with_budget(
        request,
        spec,
        WorkBudget::new(super::MAX_ALGEBRA_WORK, "budget.mixed_units"),
    )
}

pub(super) fn fit_with_budget(
    request: &MixedModelRequest,
    spec: &AdvancedMixedSpec,
    budget: WorkBudget,
) -> Result<MixedModelResult, CoreError> {
    let prepared = prepare(request, spec, budget)?;
    let fit = estimation::fit(&prepared.data, prepared.structure);
    if prepared.data.budget.exhausted() {
        return Err(CoreError::InvalidInput(vec![
            Issue::new("mixed.work_budget", Severity::Error)
                .with_param("maxWork", &prepared.data.budget.limit()),
        ]));
    }
    let fit = fit.ok_or_else(|| error("mixed.reml_not_converged"))?;
    let information = Information::at(&prepared.data, prepared.structure, &fit);
    let p = fit.solution.beta.len();
    let mut issues = Vec::new();
    if information.is_none() {
        issues.push(Issue::new(
            if prepared.data.budget.exhausted() {
                "mixed.inference_budget"
            } else {
                "mixed.inference_unavailable"
            },
            Severity::Warning,
        ));
    }
    if fit.boundary {
        issues.push(Issue::new("mixed.boundary_variance", Severity::Warning));
    }
    let sizes: Vec<_> = prepared.data.groups.iter().map(Vec::len).collect();
    if sizes.iter().min() != sizes.iter().max() {
        issues.push(Issue::new("mixed.unbalanced", Severity::Info));
    }
    let mut coefficients = Vec::new();
    for j in 0..p {
        let mut contrast = vec![0.; p];
        contrast[j] = 1.;
        let inference = estimate(
            &contrast,
            &fit,
            information.as_ref(),
            prepared.spec.confidence_level,
        );
        coefficients.push(MixedCoefficient {
            label: prepared.design.labels[j].clone(),
            estimate: inference.estimate,
            std_error: inference.std_error,
            df: inference.df,
            t_value: inference
                .std_error
                .value()
                .filter(|s| *s > 0.)
                .map_or_else(unavailable, |s| Stat::finite(inference.estimate / s)),
            p_value: p_value(&inference),
            ci_lower: inference.ci_lower,
            ci_upper: inference.ci_upper,
        });
    }
    let mut term_tests = Vec::new();
    for (term, columns) in prepared
        .spec
        .terms
        .iter()
        .zip(&prepared.design.term_columns)
    {
        let test = joint(columns, &fit, information.as_ref());
        let not_estimable = || Stat::undefined(UndefinedReason::NotEstimable);
        let f_value = test
            .as_ref()
            .map_or_else(not_estimable, |test| Stat::finite(test.f));
        let denominator_df = test.as_ref().map_or_else(not_estimable, |test| {
            test.denominator_df.map_or_else(unavailable, Stat::finite)
        });
        let test_p = test.as_ref().map_or_else(not_estimable, |test| {
            test.denominator_df.map_or_else(unavailable, |df| {
                Stat::finite(f::sf(test.f, test.numerator_df as f64, df))
            })
        });
        term_tests.push(MixedTermTest {
            term: term.clone(),
            columns: columns
                .iter()
                .map(|&j| prepared.design.labels[j].clone())
                .collect(),
            numerator_df: u32::try_from(columns.len()).unwrap_or(u32::MAX),
            f_value,
            denominator_df,
            p_value: test_p,
        });
    }
    let mut marginal_spec = spec.clone();
    if spec.marginal_time {
        let id = prepared
            .time_factor
            .clone()
            .filter(|_| spec.time_effect == MixedTimeEffect::Categorical)
            .ok_or_else(|| error("mixed.invalid_reference_grid"))?;
        marginal_spec.marginal_factors.push(id);
    }
    let marginal = marginal::calculate(&prepared, &marginal_spec, &fit, information.as_ref())?;
    let un = prepared.structure == Structure::Unstructured;
    let theta = &fit.optimum.theta;
    let scale = prepared.data.scale;
    let unit = if un {
        None
    } else {
        Some(if fit.boundary {
            0.
        } else {
            theta[0].exp() * scale
        })
    };
    let residual = if un {
        None
    } else {
        Some(theta[usize::from(!fit.boundary)].exp() * scale)
    };
    let mut parameters = Vec::new();
    if let Some(value) = unit {
        parameters.push(MixedCovarianceParameter {
            name: "unitVariance".to_owned(),
            value,
        });
    }
    if let Some(value) = residual {
        parameters.push(MixedCovarianceParameter {
            name: "residualVariance".to_owned(),
            value,
        });
    }
    if prepared.structure == Structure::Ar1 {
        parameters.push(MixedCovarianceParameter {
            name: "rho".to_owned(),
            value: theta[if fit.boundary { 1 } else { 2 }].tanh(),
        });
    }
    let mut covariance_matrix = Vec::new();
    if un {
        let q = prepared.data.occasions.len();
        let mut l = vec![0.; q * q];
        let mut k = 0;
        for i in 0..q {
            for j in 0..=i {
                l[i * q + j] = if i == j { theta[k].exp() } else { theta[k] };
                k += 1;
            }
        }
        covariance_matrix = vec![0.; q * q];
        for i in 0..q {
            for j in 0..q {
                covariance_matrix[i * q + j] = scale
                    * (0..=i.min(j))
                        .map(|k| l[i * q + k] * l[j * q + k])
                        .sum::<f64>();
            }
        }
    }
    let (profiles, mean_profiles, effects) =
        profiles::calculate(&prepared, &fit, information.as_ref(), unit);
    let random_effects = if un {
        Vec::new()
    } else {
        prepared
            .units
            .iter()
            .enumerate()
            .map(|(g, u)| RandomEffect {
                unit: u.clone(),
                observations: u32::try_from(prepared.data.groups[g].len()).unwrap_or(u32::MAX),
                blup: effects[g],
            })
            .collect()
    };
    let not_applicable = || Stat::undefined(UndefinedReason::NotApplicable);
    Ok(MixedModelResult {
        n_observations: u32::try_from(prepared.data.y.len()).unwrap_or(u32::MAX),
        n_groups: u32::try_from(prepared.units.len()).unwrap_or(u32::MAX),
        coefficients,
        variance_unit: unit.map_or_else(not_applicable, Stat::finite),
        variance_residual: residual.map_or_else(not_applicable, Stat::finite),
        icc: unit
            .zip(residual)
            .map_or_else(not_applicable, |(u, e)| Stat::finite(u / (u + e))),
        boundary: fit.boundary,
        reml_profile: -fit.solution.nll,
        random_effects,
        excluded: prepared.design.excluded,
        issues,
        provenance: Provenance::current(super::METHOD_ID, super::METHOD_VERSION),
        advanced: Some(AdvancedMixedResult {
            covariance: spec.covariance,
            time_effect: spec.time_effect,
            coding: request.spec.coding,
            time_factor_id: prepared.time_factor,
            parameters,
            occasions: prepared.data.occasions,
            time_labels: spec.time_labels.clone(),
            covariance_matrix,
            fixed_covariance: fit.solution.covariance,
            reml_log_likelihood: -fit.solution.nll,
            iterations: u32::try_from(fit.optimum.iterations).unwrap_or(u32::MAX),
            gradient_norm: fit.optimum.gradient_norm,
            inference_available: information.is_some(),
            term_tests,
            reference_grid: marginal.grid,
            marginal_means: marginal.means,
            comparisons: marginal.comparisons,
            adjustment: spec.adjustment,
            profiles,
            mean_profiles,
        }),
    })
}
