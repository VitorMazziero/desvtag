//! Structural profile checks without recomputing a nonlinear fit.
use desvtag_core::models::nonlinear::{NonlinearRequest, NonlinearResult, ProfileEndpointStatus};
pub(crate) fn valid(request: &NonlinearRequest, result: &NonlinearResult) -> bool {
    match &result.profiles {
        None => request.profile != Some(true),
        Some(profiles) => {
            request.profile == Some(true)
                && result.provenance.method_version >= 2
                && (!profiles.iter().any(|profile| {
                    matches!(profile.lower_status, ProfileEndpointStatus::ResourceLimit)
                        || matches!(profile.upper_status, ProfileEndpointStatus::ResourceLimit)
                }) || result
                    .issues
                    .iter()
                    .any(|issue| issue.code == "nonlinear.profile_budget"))
                && profiles.len() == result.parameters.len()
                && profiles
                    .iter()
                    .zip(&result.parameters)
                    .all(|(profile, parameter)| {
                        profile.parameter == parameter.name
                            && profile.cutoff > 0.0
                            && !profile.points.is_empty()
                            && profile
                                .points
                                .iter()
                                .all(|p| p.value > 0.0 && p.likelihood_ratio >= 0.0)
                            && profile.points.windows(2).all(|p| p[0].value < p[1].value)
                            && [
                                (profile.lower_status, profile.lower),
                                (profile.upper_status, profile.upper),
                            ]
                            .iter()
                            .all(|(status, value)| {
                                (matches!(status, ProfileEndpointStatus::Crossing)
                                    == value.value().is_some())
                                    && value.value().is_none_or(|x| {
                                        profile.unimodal_in_examined_range
                                            && x > 0.0
                                            && profile.points.first().is_some_and(|p| x >= p.value)
                                            && profile.points.last().is_some_and(|p| x <= p.value)
                                    })
                            })
                    })
        }
    }
}
