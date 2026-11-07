//! Save/reopen the four families without recomputing or substituting historical metadata.
#![allow(clippy::expect_used, clippy::indexing_slicing)]

use desvtag_core::comparisons::paired::{self, PairedRequest};
use desvtag_core::domain::{
    Dataset, Factor, FactorKind, FactorValue, Observation, Response, StableId,
};
use desvtag_core::models::mixed::{self, MixedModelRequest};
use desvtag_core::models::mixture::{self, MixtureAnalysisRequest, MixtureModel};
use desvtag_core::models::nonlinear::{self, NonlinearRequest, SaturationModel};
use desvtag_core::models::terms::{CategoricalCoding, ModelSpec, TermSpec};
use desvtag_core::power::{self, PowerDesign, PowerGoal, PowerRequest};
use desvtag_project::archive::{decode, encode};
use desvtag_project::*;

const NOW: &str = "2026-11-03T10:00:00Z";

fn id(s: &str) -> StableId {
    StableId::new(s).expect("valid test id")
}

fn factor(name: &str, kind: FactorKind) -> FactorSpec {
    FactorSpec {
        id: id(name),
        name: name.into(),
        kind,
        unit: "g/L".into(),
        levels_text: String::new(),
    }
}

fn document(factors: Vec<FactorSpec>, rows: Vec<RowRecord>) -> ProjectDocument {
    let mut doc = ProjectDocument::empty(id("p1"), "Saved families", NOW);
    let mut exp = Experiment::new(id("e1"), "Historical experiment", id("v1"), NOW);
    exp.revisions[0].data = ExperimentData {
        factors,
        responses: vec![ResponseSpec {
            id: id("y"),
            name: "Activity".into(),
            unit: "U/mL".into(),
        }],
        rows,
    };
    doc.experiments.push(exp);
    doc.with_hashes()
}

fn assert_round_trip(doc: &ProjectDocument) {
    assert!(doc.validate().is_empty(), "{:?}", doc.validate());
    let bytes = encode(doc).expect("encode stored families");
    let reopened = decode(&bytes).expect("decode stored families").document;
    assert_eq!(reopened, doc.clone().with_hashes());
    assert_eq!(reopened.schema_version, 1);
    // Explicit fixture-generation mode; normal tests never write into the repository.
    if let Ok(directory) = std::env::var("OPTIMA_FAMILY_FIXTURES") {
        let directory = std::path::PathBuf::from(directory);
        std::fs::create_dir_all(&directory).expect("fixture directory");
        let thread = std::thread::current();
        let name = thread.name().expect("named integration test");
        std::fs::write(directory.join(format!("{name}.enzitag")), &bytes).expect("archive fixture");
        std::fs::write(
            directory.join(format!("{name}.json")),
            serde_json::to_vec_pretty(&reopened).expect("fixture json"),
        )
        .expect("document fixture");
    }
}

fn power_state(record_id: &str) -> SavedPower {
    let request = PowerRequest {
        design: PowerDesign::TwoSampleT { difference: 1.0 },
        sigma: 1.5,
        alpha: 0.05,
        two_sided: true,
        goal: PowerGoal::SampleSizeFor { power: 0.8 },
        simulation: None,
    };
    let result = power::analyze(&request).expect("reference power calculation");
    SavedPower {
        // An invalid edit is deliberately retained beside a valid old calculation.
        selection: PowerSelection {
            kind: PowerKind::TwoSampleT,
            goal: PowerGoalKind::SampleSizeFor,
            means: "10; 12".into(),
            difference: "1".into(),
            sigma: "1,5".into(),
            alpha: "2".into(),
            target: "0,8".into(),
            n: "10".into(),
            half_width: "".into(),
            two_sided: true,
            advanced: None,
            simulation: None,
        },
        records: vec![PowerRecord {
            id: id(record_id),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "power:v1:original-assumptions".into(),
            input: request,
            result,
        }],
    }
}

fn nonlinear_document() -> ProjectDocument {
    let x = vec![0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 12.0, 16.0];
    let y: Vec<f64> = x
        .iter()
        .enumerate()
        .map(|(i, x)| 3.0 * x / (2.0 + x) + if i % 2 == 0 { 0.01 } else { -0.01 })
        .collect();
    let rows = x
        .iter()
        .zip(&y)
        .enumerate()
        .map(|(i, (x, y))| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: vec![x.to_string()],
            responses: vec![y.to_string()],
        })
        .collect();
    let mut doc = document(vec![factor("substrate", FactorKind::Numeric)], rows);
    let request = NonlinearRequest {
        x,
        y,
        model: SaturationModel::Monod,
        initial: None,
        lower: None,
        upper: None,
        alpha: 0.05,
        profile: None,
    };
    let mut result = nonlinear::fit(&request).expect("reference nonlinear calculation");
    // A newer engine must preserve a stored result from an earlier engine.
    result.provenance.engine_version = "0.3.0".into();
    doc.experiments[0].nonlinear_result = Some(SavedNonlinear {
        selection: NonlinearSelection {
            factor_id: Some(id("substrate")),
            response_id: Some(id("y")),
            model: SaturationModel::Hill,
            initial: None,
            lower: None,
            upper: None,
            profile: None,
        },
        records: vec![NonlinearRecord {
            id: id("nonlinear-1"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "nonlinear:v1:monod".into(),
            input: NonlinearInputSnapshot {
                factor_id: id("substrate"),
                response_id: id("y"),
                request,
            },
            result,
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Nonlinear);
    doc
}

#[test]
fn older_documents_omit_every_new_field() {
    let doc = document(vec![], vec![]);
    let json = serde_json::to_value(&doc).expect("json");
    for field in [
        "mixtureResult",
        "mixedModelResult",
        "nonlinearResult",
        "powerResult",
        "activeFamily",
    ] {
        assert!(json["experiments"][0].get(field).is_none());
    }
    assert_round_trip(&doc);
}

#[test]
fn power_preserves_edited_assumptions_separately_from_the_successful_request() {
    let mut doc = document(vec![], vec![]);
    doc.experiments[0].power_result = Some(power_state("power-1"));
    doc.experiments[0].active_family = Some(AnalysisFamily::Power);
    assert_round_trip(&doc);
    let saved = doc.experiments[0]
        .power_result
        .as_ref()
        .expect("saved power");
    assert_eq!(saved.selection.alpha, "2");
    assert_eq!(saved.records[0].input.alpha, 0.05);
    assert_eq!(saved.records[0].result.n, 37);
}

#[test]
fn nonlinear_keeps_its_fitted_model_and_previous_engine_even_after_selection_changes() {
    let doc = nonlinear_document();
    assert_round_trip(&doc);
    let saved = doc.experiments[0]
        .nonlinear_result
        .as_ref()
        .expect("saved nonlinear");
    assert_eq!(saved.selection.model, SaturationModel::Hill);
    assert_eq!(saved.records[0].result.model, SaturationModel::Monod);
    assert_eq!(saved.records[0].result.provenance.engine_version, "0.3.0");
}

#[test]
fn historical_variable_references_survive_deletion_from_the_latest_revision() {
    let mut doc = nonlinear_document();
    let previous = doc.experiments[0].revisions[0].clone();
    doc.experiments[0].revisions.push(Revision {
        id: id("v2"),
        parent: Some(previous.id),
        created_at: NOW.into(),
        reason: RevisionReason::Edit,
        data: ExperimentData::default(),
        content_hash: String::new(),
    });
    doc.experiments[0].comments.push(Comment {
        id: id("c1"),
        target: CommentTarget {
            kind: CommentTargetKind::Analysis,
            key: String::new(),
            analysis_id: Some(id("nonlinear-1")),
        },
        revision_id: id("v1"),
        author: "Ana".into(),
        text: "Historical curve".into(),
        created_at: NOW.into(),
        edited_at: None,
        resolved_at: None,
        replies: vec![],
    });
    assert_round_trip(&doc.with_hashes());
}

#[test]
fn mixture_keeps_the_request_and_all_immutable_records() {
    let proportions = vec![
        vec![1.0, 0.0, 0.0],
        vec![0.0, 1.0, 0.0],
        vec![0.0, 0.0, 1.0],
        vec![0.5, 0.5, 0.0],
        vec![0.5, 0.0, 0.5],
        vec![0.0, 0.5, 0.5],
    ];
    let response = vec![10.0, 20.0, 30.0, 15.1, 19.9, 25.05];
    let rows = proportions
        .iter()
        .zip(&response)
        .enumerate()
        .map(|(i, (p, y))| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: p.iter().map(ToString::to_string).collect(),
            responses: vec![y.to_string()],
        })
        .collect();
    let mut doc = document(
        ["a", "b", "c"]
            .map(|s| factor(s, FactorKind::Numeric))
            .to_vec(),
        rows,
    );
    let request = MixtureAnalysisRequest {
        optimization: None,
        cox_reference: None,
        upper_bounds: None,
        component_names: vec!["a".into(), "b".into(), "c".into()],
        lower_bounds: vec![0.0; 3],
        proportions,
        response,
        model: MixtureModel::Linear,
        alpha: 0.05,
    };
    let result = mixture::analyze(&request).expect("reference mixture calculation");
    let record = MixtureRecord {
        id: id("mixture-1"),
        created_at: NOW.into(),
        revision_id: id("v1"),
        signature: "mixture:v1:first".into(),
        input: MixtureInputSnapshot {
            response_id: id("y"),
            component_ids: vec![id("a"), id("b"), id("c")],
            request,
        },
        result,
    };
    let mut second = record.clone();
    second.id = id("mixture-2");
    second.signature = "mixture:v1:second".into();
    doc.experiments[0].mixture_result = Some(SavedMixture {
        selection: MixtureSelection {
            optimization: None,
            cox_reference: None,
            response_id: Some(id("y")),
        },
        records: vec![record, second],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Mixture);
    assert_round_trip(&doc);
}

#[test]
fn repeated_storage_distinguishes_paired_and_mixed_results() {
    let request = PairedRequest {
        first: vec![1.0, 2.0, 3.0, 4.0],
        second: vec![2.1, 3.2, 4.1, 5.4],
        alpha: 0.05,
    };
    let rows: Vec<_> = request
        .first
        .iter()
        .zip(&request.second)
        .enumerate()
        .flat_map(|(i, (a, b))| {
            [("A", a), ("B", b)]
                .into_iter()
                .enumerate()
                .map(move |(j, (level, y))| RowRecord {
                    id: id(&format!("o{i}-{j}")),
                    unit_id: format!("u{i}"),
                    time_text: None,
                    factors: vec![level.into()],
                    responses: vec![y.to_string()],
                })
        })
        .collect();
    let mut condition = factor("condition", FactorKind::Categorical);
    condition.levels_text = "A;B".into();
    let mut doc = document(vec![condition], rows.clone());
    let paired = paired::compare(&request).expect("reference paired calculation");
    let dataset = Dataset {
        factors: vec![Factor {
            id: id("condition"),
            name: "condition".into(),
            kind: FactorKind::Categorical,
            unit: None,
            levels: vec!["A".into(), "B".into()],
        }],
        responses: vec![Response {
            id: id("y"),
            name: "Activity".into(),
            unit: Some("U/mL".into()),
        }],
        observations: rows
            .iter()
            .map(|r| Observation {
                id: r.id.clone(),
                unit_id: Some(id(&r.unit_id)),
                factors: vec![Some(FactorValue::Text(r.factors[0].clone()))],
                responses: vec![Some(r.responses[0].parse().expect("number"))],
            })
            .collect(),
    };
    let mixed_request = MixedModelRequest {
        advanced: None,
        dataset,
        spec: ModelSpec {
            response_id: id("y"),
            intercept: true,
            terms: vec![TermSpec::Main {
                factor_id: id("condition"),
            }],
            coding: CategoricalCoding::Treatment,
            confidence_level: 0.95,
        },
    };
    let mixed_result = mixed::fit(&mixed_request).expect("reference mixed calculation");
    let first = RepeatedRecord {
        id: id("repeated-1"),
        created_at: NOW.into(),
        revision_id: id("v1"),
        signature: "repeated:v1:paired".into(),
        input: RepeatedInputSnapshot::Paired {
            unit_labels: None,
            response_id: id("y"),
            factor_id: id("condition"),
            unit_source: None,
            pairing: PairingSnapshot {
                units: (0..4).map(|i| format!("u{i}")).collect(),
                ..PairingSnapshot::default()
            },
            request,
        },
        result: RepeatedOutput::Paired(Box::new(paired)),
    };
    let second = RepeatedRecord {
        id: id("repeated-2"),
        created_at: NOW.into(),
        revision_id: id("v1"),
        signature: "repeated:v1:mixed".into(),
        input: RepeatedInputSnapshot::Mixed {
            unit_labels: None,
            unit_source: None,
            request: mixed_request,
        },
        result: RepeatedOutput::Mixed(Box::new(mixed_result)),
    };
    doc.experiments[0].mixed_model_result = Some(SavedRepeated {
        selection: RepeatedSelection {
            advanced: None,
            method: RepeatedMethod::Mixed,
            response_id: Some(id("y")),
            unit_source: None,
            pair_factor: Some(id("condition")),
            fixed: None,
        },
        records: vec![first, second],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Repeated);
    assert_round_trip(&doc);
}

#[test]
fn bounded_mixture_results_round_trip_and_reject_points_outside_saved_bounds() {
    let proportions = vec![
        vec![0.6, 0.4, 0.0],
        vec![0.6, 0.0, 0.4],
        vec![0.4, 0.6, 0.0],
        vec![0.0, 0.6, 0.4],
        vec![0.4, 0.0, 0.6],
        vec![0.0, 0.4, 0.6],
    ];
    let response: Vec<f64> = proportions
        .iter()
        .enumerate()
        .map(|(i, p)| 10.0 * p[0] + 20.0 * p[1] + 30.0 * p[2] + i as f64 * 0.01)
        .collect();
    let rows = proportions
        .iter()
        .zip(&response)
        .enumerate()
        .map(|(i, (p, y))| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: p.iter().map(ToString::to_string).collect(),
            responses: vec![y.to_string()],
        })
        .collect();
    let mut doc = document(
        ["a", "b", "c"]
            .map(|s| factor(s, FactorKind::Numeric))
            .to_vec(),
        rows,
    );
    let request = MixtureAnalysisRequest {
        optimization: None,
        cox_reference: None,
        component_names: vec!["a".into(), "b".into(), "c".into()],
        lower_bounds: vec![0.0; 3],
        upper_bounds: Some(vec![0.6; 3]),
        proportions,
        response,
        model: MixtureModel::Linear,
        alpha: 0.05,
    };
    let result = mixture::analyze(&request).expect("bounded fit");
    doc.experiments[0].mixture_result = Some(SavedMixture {
        selection: MixtureSelection {
            optimization: None,
            cox_reference: None,
            response_id: Some(id("y")),
        },
        records: vec![MixtureRecord {
            id: id("bounded-1"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "mixture:v2:bounded".into(),
            input: MixtureInputSnapshot {
                response_id: id("y"),
                component_ids: vec![id("a"), id("b"), id("c")],
                request,
            },
            result,
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Mixture);
    assert_round_trip(&doc);
    let original = doc.clone();
    doc.experiments[0]
        .mixture_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .grid[0]
        .proportions = vec![0.8, 0.1, 0.1];
    assert!(
        doc.validate()
            .iter()
            .any(|issue| issue.code == "project.invalid_family_result")
    );
    let mut missing = original;
    missing.experiments[0]
        .mixture_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .region = None;
    assert!(
        missing
            .validate()
            .iter()
            .any(|issue| issue.code == "project.invalid_family_result")
    );
}

#[test]
fn missing_revisions_variables_duplicates_and_nonfinite_values_are_refused() {
    let doc = nonlinear_document();
    let invalid = |doc: &ProjectDocument, code: &str| {
        assert!(
            doc.validate().iter().any(|i| i.code == code),
            "{:?}",
            doc.validate()
        )
    };
    let mut changed = doc.clone();
    changed.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .revision_id = id("absent");
    invalid(&changed, "project.analysis_unknown_revision");
    let mut changed = doc.clone();
    changed.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .input
        .factor_id = id("absent");
    invalid(&changed, "project.invalid_family_result");
    let mut changed = doc.clone();
    changed.experiments[0].power_result = Some(power_state("nonlinear-1"));
    invalid(&changed, "project.duplicate_analysis_id");
    let mut changed = doc.clone();
    changed.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .input
        .request
        .lower = Some(vec![Some(f64::NAN), None]);
    invalid(&changed, "project.invalid_family_result");
    let mut changed = doc;
    changed.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .curve[0]
        .y = f64::INFINITY;
    invalid(&changed, "project.invalid_family_result");
}

#[test]
fn selecting_a_family_without_a_result_is_not_a_valid_saved_state() {
    let mut doc = document(vec![], vec![]);
    doc.experiments[0].active_family = Some(AnalysisFamily::Nonlinear);
    assert!(
        doc.validate()
            .iter()
            .any(|i| i.code == "project.invalid_family_result")
    );
}

fn advanced_document() -> ProjectDocument {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../validation/cases/repeated_covariance/factorial.json"
    )))
    .expect("fixture");
    let request: MixedModelRequest =
        serde_json::from_value(fixture["cases"][1]["request"].clone()).expect("request");
    let rows = request
        .dataset
        .observations
        .iter()
        .enumerate()
        .map(|(i, o)| RowRecord {
            id: o.id.clone(),
            unit_id: o.unit_id.as_ref().expect("unit").to_string(),
            factors: o
                .factors
                .iter()
                .map(|v| match v {
                    Some(FactorValue::Number(v)) => v.to_string(),
                    Some(FactorValue::Text(v)) => v.clone(),
                    None => String::new(),
                })
                .collect(),
            responses: o
                .responses
                .iter()
                .map(|v| v.map_or_else(String::new, |v| v.to_string()))
                .collect(),
            time_text: request
                .advanced
                .as_ref()
                .expect("advanced")
                .times
                .as_ref()
                .expect("times")[i]
                .map(|v| v.to_string()),
        })
        .collect();
    let factors = request
        .dataset
        .factors
        .iter()
        .map(|f| FactorSpec {
            id: f.id.clone(),
            name: f.name.clone(),
            kind: f.kind,
            unit: f.unit.clone().unwrap_or_default(),
            levels_text: f.levels.join("; "),
        })
        .collect();
    let mut doc = document(factors, rows);
    let configuration = request.advanced.as_ref().expect("advanced");
    let selection = RepeatedSelection {
        method: RepeatedMethod::Mixed,
        response_id: Some(id("y")),
        unit_source: None,
        pair_factor: None,
        fixed: Some(vec![id("g"), id("occasion"), id("x")]),
        advanced: Some(MixedAdvancedSelection {
            covariance: configuration.covariance,
            time_source: None,
            time_enabled: true,
            occasion_order: String::new(),
            time_effect: configuration.time_effect,
            coding: request.spec.coding,
            interactions: vec![vec![id("g"), id("occasion")]],
            marginal_factors: configuration.marginal_factors.clone(),
            marginal_time: false,
            adjustment: configuration.adjustment,
            references: vec![MixedReferenceSelection {
                factor_id: id("x"),
                value: "2.25".into(),
            }],
        }),
    };
    let result = mixed::fit(&request).expect("advanced fit");
    doc.experiments[0].mixed_model_result = Some(SavedRepeated {
        selection,
        records: vec![RepeatedRecord {
            id: id("advanced-1"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "repeated:v3:advanced".into(),
            input: RepeatedInputSnapshot::Mixed {
                unit_source: None,
                unit_labels: None,
                request,
            },
            result: RepeatedOutput::Mixed(Box::new(result)),
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Repeated);
    doc
}
#[test]
fn advanced_covariance_inference_profiles_and_options_round_trip_without_refit() {
    assert_round_trip(&advanced_document());
}
#[test]
fn stored_advanced_results_reject_inconsistent_dimensions_and_structure() {
    let original = advanced_document();
    for variant in 0..5 {
        let mut doc = original.clone();
        let saved = doc.experiments[0]
            .mixed_model_result
            .as_mut()
            .expect("saved");
        let RepeatedOutput::Mixed(result) = &mut saved.records[0].result else {
            unreachable!()
        };
        let advanced = result.advanced.as_mut().expect("advanced");
        match variant {
            0 => {
                advanced.fixed_covariance.pop();
            }
            1 => {
                advanced.profiles[0].unit = "unknown-unit".into();
            }
            2 => {
                advanced.term_tests.pop();
            }
            3 => {
                advanced.time_effect = desvtag_core::models::mixed::MixedTimeEffect::Numeric;
            }
            _ => {
                result.advanced = None;
            }
        }
        assert!(
            doc.validate()
                .iter()
                .any(|i| i.code == "project.invalid_family_result"),
            "variant {variant}"
        );
    }
}

#[test]
fn nonlinear_likelihood_profiles_and_raw_options_round_trip_without_refit() {
    let mut doc = nonlinear_document();
    let saved = doc.experiments[0].nonlinear_result.as_mut().expect("saved");
    saved.selection.profile = Some(true);
    saved.selection.lower = Some(vec!["0,001".into(), "".into()]);
    let record = &mut saved.records[0];
    record.input.request.profile = Some(true);
    record.result = nonlinear::fit(&record.input.request).expect("profile fit");
    assert_round_trip(&doc);
    let profile = &mut doc.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .profiles
        .as_mut()
        .expect("profiles")[0];
    profile.parameter = "wrong".into();
    assert!(
        doc.validate()
            .iter()
            .any(|i| i.code == "project.invalid_family_result")
    );
}

#[test]
fn stored_resource_limited_profiles_require_the_warning_and_preserve_explicit_limits() {
    use desvtag_core::{
        descriptive::Stat,
        validation::{Issue, Severity},
    };
    let mut doc = nonlinear_document();
    let record = &mut doc.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0];
    record.input.request.profile = Some(true);
    record.result = nonlinear::fit(&record.input.request).expect("profile");
    let profile = &mut record.result.profiles.as_mut().expect("profiles")[0];
    profile.lower = serde_json::from_value::<Stat>(
        serde_json::json!({"status":"undefined","reason":"notEstimable"}),
    )
    .expect("undefined contract");
    profile.upper = profile.lower;
    profile.lower_status = nonlinear::ProfileEndpointStatus::ResourceLimit;
    profile.upper_status = profile.lower_status;
    profile.unimodal_in_examined_range = false;
    record
        .result
        .issues
        .push(Issue::new("nonlinear.profile_budget", Severity::Warning));
    assert_round_trip(&doc);
    doc.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .issues
        .retain(|i| i.code != "nonlinear.profile_budget");
    assert!(
        doc.validate()
            .iter()
            .any(|i| i.code == "project.invalid_family_result")
    );
}

#[test]
fn older_five_thousand_row_nonlinear_result_reopens_without_applying_new_fit_limits() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/nonlinear_profile/pre_budget_5000.json"
    ))
    .expect("pre-budget WASM result");
    let request: NonlinearRequest =
        serde_json::from_value(fixture["request"].clone()).expect("request");
    let result: nonlinear::NonlinearResult =
        serde_json::from_value(fixture["result"].clone()).expect("result");
    assert_eq!(result.n, 5000);
    let mut doc = nonlinear_document();
    doc.experiments[0].revisions[0].data.rows = request
        .x
        .iter()
        .zip(&request.y)
        .enumerate()
        .map(|(i, (x, y))| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: vec![x.to_string()],
            responses: vec![y.to_string()],
        })
        .collect();
    let record = &mut doc.experiments[0]
        .nonlinear_result
        .as_mut()
        .expect("saved")
        .records[0];
    record.input.request = request;
    record.result = result;
    doc = doc.with_hashes();
    assert_round_trip(&doc);
}

#[test]
fn older_thirteen_occasion_un_reopens_without_recalculating_or_truncating() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/repeated_covariance/pre_budget_q13.json"
    ))
    .expect("pre-budget WASM result");
    let request: MixedModelRequest =
        serde_json::from_value(fixture["request"].clone()).expect("request");
    let result: mixed::MixedModelResult =
        serde_json::from_value(fixture["result"].clone()).expect("result");
    assert_eq!(
        result.advanced.as_ref().expect("advanced").occasions.len(),
        13
    );
    let times = request
        .advanced
        .as_ref()
        .expect("advanced")
        .times
        .as_ref()
        .expect("times");
    let rows = request
        .dataset
        .observations
        .iter()
        .zip(times)
        .map(|(o, t)| RowRecord {
            id: o.id.clone(),
            unit_id: o.unit_id.as_ref().expect("unit").to_string(),
            time_text: t.map(|v| v.to_string()),
            factors: vec![],
            responses: vec![o.responses[0].expect("response").to_string()],
        })
        .collect();
    let mut doc = document(vec![], rows);
    doc.experiments[0].mixed_model_result = Some(SavedRepeated {
        selection: RepeatedSelection {
            method: RepeatedMethod::Mixed,
            response_id: Some(id("y")),
            unit_source: None,
            pair_factor: None,
            fixed: Some(vec![]),
            advanced: None,
        },
        records: vec![RepeatedRecord {
            id: id("old-un"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "repeated:v3:old-un".into(),
            input: RepeatedInputSnapshot::Mixed {
                unit_source: None,
                unit_labels: None,
                request,
            },
            result: RepeatedOutput::Mixed(Box::new(result)),
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Repeated);
    assert_round_trip(&doc);
}

fn advanced_power_document(index: usize) -> ProjectDocument {
    let cases: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/power_advanced/power.json"
    ))
    .expect("cases");
    let mut request: PowerRequest =
        serde_json::from_value(cases["cases"][index]["request"].clone()).expect("request");
    request.simulation = Some(power::PowerSimulation {
        seed: 42,
        replications: 10000,
    });
    let result = power::analyze(&request).expect("power and simulation");
    let kind = match request.design {
        PowerDesign::Regression { .. } => PowerKind::Regression,
        PowerDesign::Contrast { .. } => PowerKind::Contrast,
        _ => PowerKind::TwoLevel,
    };
    let mut saved = power_state("advanced-power-1");
    saved.selection.kind = kind;
    saved.selection.simulation = Some(PowerSimulationSelection {
        seed: "42".into(),
        replications: "invalid edit".into(),
    });
    saved.selection.advanced = Some(PowerAdvancedSelection {
        predictors: "uncompleted draft".into(),
        coefficients: "".into(),
        weights: "".into(),
        allocation: "".into(),
        factor_count: "".into(),
        terms: "".into(),
        effects: "".into(),
        target_term: "".into(),
    });
    saved.records[0].input = request;
    saved.records[0].result = result;
    saved.records[0].signature = "power:v2:advanced".into();
    let mut doc = document(vec![], vec![]);
    doc.experiments[0].power_result = Some(saved);
    doc.experiments[0].active_family = Some(AnalysisFamily::Power);
    doc
}
#[test]
fn regression_power_and_simulation_round_trip_without_recalculation() {
    assert_round_trip(&advanced_power_document(0));
}
#[test]
fn planned_contrast_power_and_simulation_round_trip_without_recalculation() {
    assert_round_trip(&advanced_power_document(2));
}
#[test]
fn factorial_effect_power_and_simulation_round_trip_without_recalculation() {
    assert_round_trip(&advanced_power_document(5));
}
#[test]
fn saved_power_rejects_mismatched_simulation_totals_and_matrix_shapes() {
    let original = advanced_power_document(0);
    for variant in 0..5 {
        let mut doc = original.clone();
        let record = &mut doc.experiments[0]
            .power_result
            .as_mut()
            .expect("saved")
            .records[0];
        match variant {
            0 => record.result.total += 1,
            1 => record.result.simulation.as_mut().expect("simulation").seed += 1,
            2 => record.result.simulation = None,
            3 => record.result.curve[0].power = 2.0,
            _ => {
                let PowerDesign::Regression { predictors, .. } = &mut record.input.design else {
                    unreachable!()
                };
                predictors[0].pop();
            }
        }
        assert!(
            doc.validate()
                .iter()
                .any(|i| i.code == "project.invalid_family_result"),
            "variant {variant}"
        );
    }
}

#[test]
fn saved_factorial_power_rejects_duplicate_terms_and_repeated_factors() {
    for repeated_factor in [false, true] {
        let mut doc = advanced_power_document(5);
        let record = &mut doc.experiments[0]
            .power_result
            .as_mut()
            .expect("saved")
            .records[0];
        let PowerDesign::TwoLevel { terms, .. } = &mut record.input.design else {
            unreachable!()
        };
        if repeated_factor {
            terms[0] = vec![0, 0];
        } else {
            terms[1] = terms[0].clone();
        }
        assert!(
            doc.validate()
                .iter()
                .any(|i| i.code == "project.invalid_family_result")
        );
    }
}

#[test]
fn stored_power_rejects_inconsistent_counts_intervals_errors_and_degrees_of_freedom() {
    for case in [0, 2, 5] {
        let original = advanced_power_document(case);
        assert_round_trip(&original);
        for mutation in 0..7 {
            let mut doc = original.clone();
            let record = &mut doc.experiments[0]
                .power_result
                .as_mut()
                .expect("power")
                .records[0];
            let sim = record.result.simulation.as_mut().expect("simulation");
            match mutation {
                0 => sim.rejections = 0,
                1 => sim.estimate = (sim.ci_lower + sim.ci_upper) / 2.0,
                2 => sim.standard_error *= 1.1,
                3 => sim.ci_lower *= 0.9,
                4 => record.result.df1 += 1.0,
                5 => record.result.df2 += 100.0,
                _ => sim.ci_upper = sim.estimate,
            }
            assert!(
                doc.validate()
                    .iter()
                    .any(|i| i.code == "project.invalid_family_result"),
                "case {case} mutation {mutation}"
            );
            assert!(encode(&doc).is_err());
        }
    }
}

#[test]
fn partial_precision_is_recoverable_but_needs_explicit_unavailable_diagnostics() {
    let mut doc = advanced_power_document(2);
    let record = &mut doc.experiments[0]
        .power_result
        .as_mut()
        .expect("power")
        .records[0];
    record.input.design = PowerDesign::Contrast {
        means: vec![0.0, 1e308],
        weights: vec![-1.0, 1.0],
        allocation: vec![1, 1],
    };
    record.input.sigma = 1e-308;
    record.input.goal = power::PowerGoal::PrecisionFor { half_width: 1e-307 };
    record.result = power::analyze(&record.input).expect("valid precision");
    assert_round_trip(&doc);
    for variant in 0..7 {
        let mut changed = doc.clone();
        let record = &mut changed.experiments[0]
            .power_result
            .as_mut()
            .expect("power")
            .records[0];
        match variant {
            0 => record
                .result
                .issues
                .retain(|i| i.code != "power.analytical_unavailable"),
            1 => record
                .result
                .issues
                .retain(|i| i.code != "power.simulation_unavailable"),
            2 => record.input.goal = power::PowerGoal::PowerAt { n: 2 },
            3 => record.result.provenance.method_version = 1,
            4 => record.result.half_width = desvtag_core::descriptive::Stat::Defined { value: 1.0 },
            5 => record.result.power = desvtag_core::descriptive::Stat::Defined { value: 1.0 },
            _ => record
                .result
                .issues
                .iter_mut()
                .filter(|i| i.code == "power.simulation_unavailable")
                .for_each(|i| i.code = "power.simulation_total_budget".into()),
        }
        assert!(encode(&changed).is_err(), "mutation {variant}");
    }
}

fn cox_document(case_index: usize) -> ProjectDocument {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/mixture_model/cox.json"
    ))
    .expect("fixture");
    let request: MixtureAnalysisRequest =
        serde_json::from_value(fixture["cases"][case_index]["request"].clone()).expect("request");
    let rows = request
        .proportions
        .iter()
        .zip(&request.response)
        .enumerate()
        .map(|(i, (p, y))| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: p.iter().map(ToString::to_string).collect(),
            responses: vec![y.to_string()],
        })
        .collect();
    let factors = request
        .component_names
        .iter()
        .map(|name| factor(name, FactorKind::Numeric))
        .collect();
    let result = mixture::analyze(&request).expect("fit");
    let mut doc = document(factors, rows);
    doc.experiments[0].mixture_result = Some(SavedMixture {
        selection: MixtureSelection {
            response_id: Some(id("y")),
            cox_reference: Some(vec!["invalid editable draft".into()]),
            optimization: None,
        },
        records: vec![MixtureRecord {
            id: id("cox-1"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "mixture:v3:cox".into(),
            input: MixtureInputSnapshot {
                response_id: id("y"),
                component_ids: request
                    .component_names
                    .iter()
                    .map(|name| id(name))
                    .collect(),
                request,
            },
            result,
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Mixture);
    doc
}

#[test]
fn saved_cox_traces_preserve_domains_reference_and_undefined_states_without_refit() {
    for index in 0..8 {
        let doc = cox_document(index);
        assert_round_trip(&doc);
        if let Ok(directory) = std::env::var("OPTIMA_COX_FIXTURES") {
            std::fs::create_dir_all(&directory).expect("directory");
            std::fs::write(
                std::path::Path::new(&directory).join(format!("cox-{index}.enzitag")),
                encode(&doc).expect("encode"),
            )
            .expect("fixture");
        }
    }
    let original = cox_document(1);
    for variant in 0..7 {
        let mut doc = original.clone();
        let record = &mut doc.experiments[0]
            .mixture_result
            .as_mut()
            .expect("saved")
            .records[0];
        let trace = record.result.cox_trace.as_mut().expect("trace");
        match variant {
            0 => trace.reference[0] += 0.1,
            1 => trace.series[0].component = 99,
            2 => trace.series[0].points[0].proportions = vec![0.99, 0.005, 0.005],
            3 => trace.series[0].points[0].pseudo[0] += 0.1,
            4 => trace.series[0].points[0].delta += 0.1,
            5 => trace.series[0].interval = None,
            _ => record.result.cox_trace = None,
        }
        assert!(encode(&doc).is_err(), "mutation {variant}");
    }
}

fn simplex_document(index: usize) -> ProjectDocument {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/mixture_model/optimization.json"
    ))
    .expect("fixture");
    let request: MixtureAnalysisRequest =
        serde_json::from_value(fixture["cases"][index]["request"].clone()).expect("request");
    let spec = request.optimization.as_ref().expect("spec");
    let rows = request
        .proportions
        .iter()
        .enumerate()
        .map(|(i, p)| RowRecord {
            id: id(&format!("o{i}")),
            unit_id: String::new(),
            time_text: None,
            factors: p.iter().map(ToString::to_string).collect(),
            responses: spec
                .data
                .iter()
                .map(|data| data.response[i].to_string())
                .collect(),
        })
        .collect();
    let factors = request
        .component_names
        .iter()
        .map(|name| factor(name, FactorKind::Numeric))
        .collect();
    let mut doc = document(factors, rows);
    doc.experiments[0].revisions[0].data.responses = spec
        .data
        .iter()
        .map(|data| ResponseSpec {
            id: data.response_id.clone(),
            name: data.name.clone(),
            unit: String::new(),
        })
        .collect();
    let result = mixture::analyze(&request).expect("fit and optimization");
    doc.experiments[0].mixture_result = Some(SavedMixture {
        selection: MixtureSelection {
            response_id: Some(id("y1")),
            cox_reference: None,
            optimization: None,
        },
        records: vec![MixtureRecord {
            id: id("simplex-1"),
            created_at: NOW.into(),
            revision_id: id("v1"),
            signature: "mixture:v4:fixture".into(),
            input: MixtureInputSnapshot {
                response_id: id("y1"),
                component_ids: request
                    .component_names
                    .iter()
                    .map(|name| id(name))
                    .collect(),
                request,
            },
            result,
        }],
    });
    doc.experiments[0].active_family = Some(AnalysisFamily::Mixture);
    doc.with_hashes()
}

#[test]
fn simplex_results_round_trip_without_search_and_reject_inconsistent_candidates() {
    for index in (0..11).chain(13..16) {
        let doc = simplex_document(index);
        assert_round_trip(&doc);
        if let Ok(directory) = std::env::var("OPTIMA_SIMPLEX_FIXTURES") {
            std::fs::create_dir_all(&directory).expect("directory");
            std::fs::write(
                std::path::Path::new(&directory).join(format!("simplex-{index}.enzitag")),
                encode(&doc).expect("encode"),
            )
            .expect("fixture");
        }
    }
    let mut legacy = simplex_document(2);
    legacy.experiments[0]
        .mixture_result
        .as_mut()
        .expect("saved")
        .records[0]
        .result
        .optimum
        .as_mut()
        .expect("optimum")
        .algorithm = "pair-transfer-pattern/1".into();
    assert_round_trip(&legacy);
    let original = simplex_document(2);
    for mutation in 0..9 {
        let mut doc = original.clone();
        let record = &mut doc.experiments[0]
            .mixture_result
            .as_mut()
            .expect("saved")
            .records[0];
        let optimum = record.result.optimum.as_mut().expect("optimum");
        match mutation {
            0 => optimum.candidates[0].proportions[0] += 0.1,
            1 => optimum.candidates[0].desirability += 0.1,
            2 => {
                optimum.candidates[0].predictions[0].prediction.fitted =
                    desvtag_core::descriptive::Stat::Defined { value: 0.9 }
            }
            3 => optimum.evaluations += 1,
            4 => optimum.candidates[0].pseudo[0] += 0.1,
            5 => optimum.requested_starts += 1,
            6 => record.result.provenance.method_version = 3,
            7 => record.result.optimum = None,
            _ => {
                record
                    .input
                    .request
                    .optimization
                    .as_mut()
                    .expect("spec")
                    .data[0]
                    .response_id = id("unknown")
            }
        }
        assert!(encode(&doc).is_err(), "mutation {mutation}");
    }
}
