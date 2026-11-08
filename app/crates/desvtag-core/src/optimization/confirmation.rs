//! Compare a stored prediction with a later observation; no model is refitted.
use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::descriptive::{Stat, UndefinedReason};
use crate::domain::StableId;
use crate::errors::CoreError;
use crate::validation::{Issue, Severity};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Stored prediction and later observation for one response of one run.
pub struct ConfirmationObservation {
    /// Stable identifier of the confirmation run.
    pub row_id: StableId,
    /// Stable identifier of the measured response.
    pub response_id: StableId,
    /// Prediction recorded when the proposal was generated.
    pub predicted: f64,
    /// Available lower prediction limit.
    pub lower: Option<f64>,
    /// Available upper prediction limit.
    pub upper: Option<f64>,
    /// Later measurement; absent when no valid value was entered.
    pub observed: Option<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Position of an observation relative to the stored prediction interval.
pub enum ConfirmationStatus {
    /// No observation is available.
    Missing,
    /// Observation is below an available lower limit.
    Below,
    /// Observation is above an available upper limit.
    Above,
    /// Observation lies inside both available limits, including the limits.
    Within,
    /// Not outside a known limit, but a complete interval is unavailable.
    NoInterval,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Scientific comparison without refitting the originating model.
pub struct ConfirmationComparison {
    /// Stable identifier of the confirmation run.
    pub row_id: StableId,
    /// Stable identifier of the measured response.
    pub response_id: StableId,
    /// Observed minus predicted, with absence and overflow explicit.
    pub difference: Stat,
    /// Situation relative to the prediction interval.
    pub status: ConfirmationStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Batch request for confirmation comparisons.
pub struct ConfirmationCompareRequest {
    /// Unique run/response pairs, with finite numeric inputs.
    pub observations: Vec<ConfirmationObservation>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
/// Batch response in the input order.
pub struct ConfirmationComparisons {
    /// One comparison per input run/response pair.
    pub comparisons: Vec<ConfirmationComparison>,
}

/// Bounds are inclusive. Undefined differences are never replaced by zero.
///
/// # Errors
/// Non-finite inputs, reversed limits, duplicate identifiers or oversized requests.
pub fn compare_confirmation(
    request: &ConfirmationCompareRequest,
) -> Result<ConfirmationComparisons, CoreError> {
    let mut keys = BTreeSet::new();
    if request.observations.len() > 100_000
        || request.observations.iter().any(|o| {
            !o.predicted.is_finite()
                || [o.lower, o.upper, o.observed]
                    .iter()
                    .flatten()
                    .any(|v| !v.is_finite())
                || matches!((o.lower, o.upper), (Some(lo), Some(hi)) if lo > hi)
                || !keys.insert((&o.row_id, &o.response_id))
        })
    {
        return Err(CoreError::InvalidInput(vec![Issue::new(
            "optimization.invalid_confirmation",
            Severity::Error,
        )]));
    }
    let comparisons = request
        .observations
        .iter()
        .map(|o| {
            let (difference, status) = match o.observed {
                None => (
                    Stat::undefined(UndefinedReason::NoValidObservations),
                    ConfirmationStatus::Missing,
                ),
                Some(y) => (
                    Stat::finite(y - o.predicted),
                    if o.lower.is_some_and(|lo| y < lo) {
                        ConfirmationStatus::Below
                    } else if o.upper.is_some_and(|hi| y > hi) {
                        ConfirmationStatus::Above
                    } else if o.lower.is_none() || o.upper.is_none() {
                        ConfirmationStatus::NoInterval
                    } else {
                        ConfirmationStatus::Within
                    },
                ),
            };
            ConfirmationComparison {
                row_id: o.row_id.clone(),
                response_id: o.response_id.clone(),
                difference,
                status,
            }
        })
        .collect();
    Ok(ConfirmationComparisons { comparisons })
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    fn row(observed: Option<f64>) -> ConfirmationObservation {
        ConfirmationObservation {
            row_id: StableId::new("o1").unwrap(),
            response_id: StableId::new("r1").unwrap(),
            predicted: 10.0,
            lower: Some(8.0),
            upper: Some(12.0),
            observed,
        }
    }
    fn compare(o: ConfirmationObservation) -> ConfirmationComparison {
        compare_confirmation(&ConfirmationCompareRequest {
            observations: vec![o],
        })
        .unwrap()
        .comparisons
        .remove(0)
    }
    #[test]
    fn includes_both_limits_and_preserves_the_signed_difference() {
        for (y, status, delta) in [
            (7.0, ConfirmationStatus::Below, -3.0),
            (8.0, ConfirmationStatus::Within, -2.0),
            (12.0, ConfirmationStatus::Within, 2.0),
            (13.0, ConfirmationStatus::Above, 3.0),
        ] {
            let result = compare(row(Some(y)));
            assert_eq!(result.status, status);
            assert_eq!(result.difference.value(), Some(delta));
        }
    }
    #[test]
    fn missing_observation_does_not_become_a_zero_difference() {
        let result = compare(row(None));
        assert_eq!(result.status, ConfirmationStatus::Missing);
        assert_eq!(
            result.difference,
            Stat::undefined(UndefinedReason::NoValidObservations)
        );
    }
    #[test]
    fn absent_interval_is_distinct_from_a_point_inside_an_interval() {
        let mut o = row(Some(11.0));
        o.lower = None;
        o.upper = None;
        let result = compare(o);
        assert_eq!(result.status, ConfirmationStatus::NoInterval);
        assert_eq!(result.difference.value(), Some(1.0));
    }
    #[test]
    fn rejects_invalid_bounds_values_and_duplicate_keys() {
        let mut o = row(Some(f64::INFINITY));
        assert!(
            compare_confirmation(&ConfirmationCompareRequest {
                observations: vec![o.clone()]
            })
            .is_err()
        );
        o.observed = Some(10.0);
        o.lower = Some(13.0);
        assert!(
            compare_confirmation(&ConfirmationCompareRequest {
                observations: vec![o]
            })
            .is_err()
        );
        assert!(
            compare_confirmation(&ConfirmationCompareRequest {
                observations: vec![row(None), row(None)]
            })
            .is_err()
        );
    }
    #[test]
    fn subtraction_overflow_is_explicit() {
        let mut o = row(Some(f64::MAX));
        o.predicted = -f64::MAX;
        o.lower = None;
        o.upper = None;
        assert_eq!(
            compare(o).difference,
            Stat::undefined(UndefinedReason::NonFiniteResult)
        );
    }
}
