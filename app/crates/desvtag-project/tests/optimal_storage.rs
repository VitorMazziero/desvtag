//! Applied designs and block-aware analyses survive opening without executing their methods.
#![allow(clippy::expect_used, clippy::indexing_slicing)]
use desvtag_core::designs::optimal::{OptimalSpec, generate};
use desvtag_core::domain::{FactorKind, StableId};
use desvtag_project::archive::{decode, encode};
use desvtag_project::optimal::{
    OptimalArtifactSelection, OptimalDesignRecord, OptimalVarianceView,
};
use desvtag_project::*;
use serde_json::Value;
const NOW: &str = "2026-11-04T12:00:00Z";
fn id(value: &str) -> StableId {
    StableId::new(value).expect("id")
}
fn cases() -> Value {
    serde_json::from_str(include_str!(
        "../../../../validation/cases/optimal_design/blocked.json"
    ))
    .expect("fixture")
}

fn document(spec: OptimalSpec) -> ProjectDocument {
    let result = generate(&spec).expect("design");
    let mut doc = ProjectDocument::empty(id("p1"), "Applied designs", NOW);
    let mut exp = Experiment::new(id("e1"), "Historical design", id("v1"), NOW);
    exp.entry_path = Some(EntryPath::Plan);
    let mut factors = spec
        .factors
        .iter()
        .map(|factor| FactorSpec {
            id: factor.id.clone(),
            name: factor.name.clone(),
            kind: FactorKind::Numeric,
            unit: String::new(),
            levels_text: String::new(),
        })
        .collect::<Vec<_>>();
    if let Some(categories) = &spec.categories {
        factors.extend(categories.factors.iter().map(|factor| FactorSpec {
            id: factor.id.clone(),
            name: factor.name.clone(),
            kind: FactorKind::Categorical,
            unit: String::new(),
            levels_text: factor.levels.join(";"),
        }));
    }
    if let Some(blocks) = &spec.blocks {
        factors.push(FactorSpec {
            id: id("block"),
            name: "Etapa".into(),
            kind: FactorKind::Categorical,
            unit: String::new(),
            levels_text: blocks.labels.join(";"),
        });
    }
    let rows = result
        .runs
        .iter()
        .map(|run| {
            let mut values = run.real.iter().map(ToString::to_string).collect::<Vec<_>>();
            values.extend(run.categories.iter().flatten().cloned());
            if let Some(blocks) = &spec.blocks {
                values.push(blocks.labels[run.block.expect("block") as usize].clone());
            }
            RowRecord {
                id: id(&format!("o{}", run.run)),
                unit_id: String::new(),
                factors: values,
                responses: vec![if run.fixed {
                    format!("{}", run.run + 10)
                } else {
                    String::new()
                }],
                time_text: None,
            }
        })
        .collect::<Vec<_>>();
    exp.revisions[0].data = ExperimentData {
        factors: factors.clone(),
        responses: vec![ResponseSpec {
            id: id("y"),
            name: "Activity".into(),
            unit: String::new(),
        }],
        rows: rows[..spec.fixed_runs.len()].to_vec(),
    };
    let mut applied = exp.revisions[0].clone();
    applied.id = id("v2");
    applied.parent = Some(id("v1"));
    applied.reason = RevisionReason::Design;
    applied.data.rows = rows.clone();
    exp.revisions.push(applied);
    exp.optimal_designs.push(OptimalDesignRecord {
        id: id("a1"),
        created_at: NOW.into(),
        augment: true,
        source_revision_id: id("v1"),
        revision_id: id("v2"),
        signature: "captured-inputs".into(),
        row_ids: rows.iter().map(|row| row.id.clone()).collect(),
        block_factor_id: spec.blocks.as_ref().map(|_| id("block")),
        result,
    });
    doc.experiments.push(exp);
    doc.with_hashes()
}

#[test]
fn every_feasible_reference_round_trips_and_legacy_absence_stays_absent() {
    for case in cases()["cases"].as_array().expect("cases") {
        if case["fullRank"] == 0 {
            continue;
        }
        let spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        let doc = document(spec);
        assert!(
            doc.validate().is_empty(),
            "{} {:?}",
            case["name"],
            doc.validate()
        );
        let reopened = decode(&encode(&doc).expect("encode"))
            .expect("open")
            .document;
        assert_eq!(doc, reopened);
        if let Ok(directory) = std::env::var("OPTIMA_BLOCK_FIXTURES") {
            std::fs::create_dir_all(&directory).expect("directory");
            std::fs::write(
                std::path::Path::new(&directory)
                    .join(format!("{}.enzitag", case["name"].as_str().expect("name"))),
                encode(&doc).expect("fixture"),
            )
            .expect("write");
        }
    }
    let mut spec: OptimalSpec =
        serde_json::from_value(cases()["cases"][0]["spec"].clone()).expect("spec");
    spec.blocks = None;
    let doc = document(spec);
    assert_eq!(
        decode(&encode(&doc).expect("unblocked"))
            .expect("open")
            .document,
        doc
    );
    let mut legacy = doc;
    legacy.experiments[0].optimal_designs.clear();
    let json = serde_json::to_value(&legacy).expect("json");
    assert!(json["experiments"][0].get("optimalDesigns").is_none());
    assert_eq!(
        decode(&encode(&legacy).expect("legacy"))
            .expect("open")
            .document,
        legacy
    );
}

#[test]
fn corrupted_design_values_counts_or_original_rows_are_rejected_without_panicking() {
    let original =
        document(serde_json::from_value(cases()["cases"][0]["spec"].clone()).expect("spec"));
    for mutation in 0..10 {
        let mut doc = original.clone();
        let exp = &mut doc.experiments[0];
        let record = &mut exp.optimal_designs[0];
        match mutation {
            0 => record.row_ids.clear(),
            1 => record.result.runs[0].real.clear(),
            2 => record.result.runs[0].block = Some(9),
            3 => record
                .result
                .spec
                .blocks
                .as_mut()
                .expect("blocks")
                .fixed_blocks
                .clear(),
            4 => {
                record
                    .result
                    .search
                    .as_mut()
                    .expect("search")
                    .starts_succeeded = u32::MAX
            }
            5 => record.result.metrics.i_average = Some(f64::NAN),
            6 => exp.revisions[1].data.rows[0].responses[0] = "changed".into(),
            7 => record.result.runs[1].coded.clear(),
            8 => record.block_factor_id = Some(id("unknown")),
            _ => record.source_revision_id = id("unknown"),
        }
        let doc = doc.with_hashes();
        let issues = std::panic::catch_unwind(|| doc.validate()).expect("validation never panics");
        assert!(
            issues
                .iter()
                .any(|issue| issue.code == "project.invalid_optimal_design"),
            "mutation {mutation}: {issues:?}"
        );
        assert!(encode(&doc).is_err());
    }
}

#[test]
fn stored_block_reference_must_agree_with_the_calculation_and_revision() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/response_surface/blocked.json"
    ))
    .expect("fixture");
    let request: desvtag_core::surface::SurfaceRequest =
        serde_json::from_value(fixture["cases"][0]["request"].clone()).expect("request");
    let result = desvtag_core::surface::analyze(&request).expect("fit");
    let mut doc = ProjectDocument::empty(id("p1"), "Block analysis", NOW);
    let mut exp = Experiment::new(id("e1"), "Blocks", id("v1"), NOW);
    exp.revisions[0].data = ExperimentData {
        factors: request
            .dataset
            .factors
            .iter()
            .map(|f| FactorSpec {
                id: f.id.clone(),
                name: f.name.clone(),
                kind: f.kind,
                unit: f.unit.clone().unwrap_or_default(),
                levels_text: f.levels.join(";"),
            })
            .collect(),
        responses: request
            .dataset
            .responses
            .iter()
            .map(|r| ResponseSpec {
                id: r.id.clone(),
                name: r.name.clone(),
                unit: r.unit.clone().unwrap_or_default(),
            })
            .collect(),
        rows: request
            .dataset
            .observations
            .iter()
            .map(|o| RowRecord {
                id: o.id.clone(),
                unit_id: String::new(),
                time_text: None,
                factors: o
                    .factors
                    .iter()
                    .map(|f| match f {
                        Some(desvtag_core::domain::FactorValue::Number(v)) => v.to_string(),
                        Some(desvtag_core::domain::FactorValue::Text(v)) => v.clone(),
                        None => String::new(),
                    })
                    .collect(),
                responses: o
                    .responses
                    .iter()
                    .map(|v| v.map_or_else(String::new, |v| v.to_string()))
                    .collect(),
            })
            .collect(),
    };
    let mut options = exp.analysis_selection.clone();
    options.surface_block = request.block.clone();
    options.response_id = Some(request.response_id);
    options.alpha = Some(request.alpha);
    options.surface = Some(true);
    exp.analyses.push(AnalysisRecord {
        id: id("a1"),
        created_at: NOW.into(),
        revision_id: id("v1"),
        signature: "block-fit".into(),
        method_id: result.provenance.method_id.clone(),
        method_version: result.provenance.method_version,
        engine_version: result.provenance.engine_version.clone(),
        options,
        result: AnalysisResult::ResponseSurface(Box::new(result)),
    });
    doc.experiments.push(exp);
    let doc = doc.with_hashes();
    assert_eq!(
        decode(&encode(&doc).expect("encode block analysis"))
            .expect("open")
            .document,
        doc
    );
    let mut corrupted = doc;
    corrupted.experiments[0].analyses[0]
        .options
        .surface_block
        .as_mut()
        .expect("block")
        .reference = "Ampliação".into();
    assert!(
        corrupted
            .validate()
            .iter()
            .any(|issue| issue.code == "project.invalid_block_context")
    );
}

#[test]
fn small_scale_matrix_values_are_checked_in_coded_units_and_prototypes_stay_readable() {
    let mut spec: OptimalSpec =
        serde_json::from_value(cases()["cases"][0]["spec"].clone()).expect("spec");
    spec.factors[0].low = -1e-12;
    spec.factors[0].high = 1e-12;
    spec.fixed_runs[0][0] = 0.25e-12;
    let mut doc = document(spec);
    doc.experiments[0].optimal_designs[0].signature = "optimal:v1:exact-values".into();
    assert!(doc.validate().is_empty());
    assert_eq!(
        decode(&encode(&doc).expect("small scale"))
            .expect("open")
            .document,
        doc
    );
    doc.experiments[0].revisions[1].data.rows[1].factors[0] = "0".into();
    let mut doc = doc.with_hashes();
    assert!(
        doc.validate()
            .iter()
            .any(|issue| issue.code == "project.invalid_optimal_design")
    );
    doc.experiments[0].optimal_designs[0].signature = "pre-v1-prototype".into();
    assert_eq!(
        decode(&encode(&doc).expect("read original prototype values"))
            .expect("open")
            .document,
        doc
    );
    if let Ok(directory) = std::env::var("OPTIMA_BLOCK_FIXTURES") {
        std::fs::create_dir_all(&directory).expect("directory");
        std::fs::write(
            std::path::Path::new(&directory).join("legacy-small-scale.enzitag"),
            encode(&doc).expect("fixture"),
        )
        .expect("write");
    }
}

fn with_variance(mut doc: ProjectDocument) -> ProjectDocument {
    use desvtag_core::designs::optimal::variance::{OptimalVarianceRequest, prediction_variance};
    use desvtag_project::optimal::OptimalVarianceRecord;
    let design = &doc.experiments[0].optimal_designs[0];
    let request = OptimalVarianceRequest {
        run_categories: None,
        spec: design.result.spec.clone(),
        runs_real: design
            .result
            .runs
            .iter()
            .map(|run| run.real.clone())
            .collect(),
        run_blocks: design.result.spec.blocks.as_ref().map(|_| {
            design
                .result
                .runs
                .iter()
                .map(|run| run.block.expect("block"))
                .collect()
        }),
    };
    let record = OptimalVarianceRecord {
        id: id("a2"),
        created_at: NOW.into(),
        design_id: design.id.clone(),
        revision_id: design.revision_id.clone(),
        view: None,
        result: prediction_variance(&request).expect("variance"),
    };
    doc.experiments[0].optimal_variances.push(record);
    doc.with_hashes()
}

#[test]
fn variance_supplements_round_trip_without_changing_the_original_design() {
    for case in cases()["cases"].as_array().expect("cases") {
        if case["fullRank"] == 0 {
            continue;
        }
        let spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        let original = document(spec);
        let saved = with_variance(original.clone());
        assert_eq!(
            saved.experiments[0].optimal_designs,
            original.experiments[0].optimal_designs
        );
        assert_eq!(
            decode(&encode(&saved).expect("encode profile"))
                .expect("open profile")
                .document,
            saved
        );
        if let Ok(directory) = std::env::var("OPTIMA_VARIANCE_FIXTURES") {
            std::fs::create_dir_all(&directory).expect("directory");
            std::fs::write(
                std::path::Path::new(&directory)
                    .join(format!("{}.enzitag", case["name"].as_str().expect("name"))),
                encode(&saved).expect("archive"),
            )
            .expect("fixture");
        }
    }
}

#[test]
fn profile_view_and_archive_selection_round_trip_as_display_metadata() {
    let references = cases();
    let case = references["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .find(|case| case["name"] == "two-new-blocks-quadratic-i")
        .expect("blocked design");
    let original = with_variance(document(
        serde_json::from_value(case["spec"].clone()).expect("spec"),
    ));
    let mut saved = original.clone();
    let experiment = &mut saved.experiments[0];
    let profile = &mut experiment.optimal_variances[0];
    profile.view = Some(OptimalVarianceView {
        scaled: false,
        distribution_block: Some(2),
        map_block: 1,
        axes: [1, 0],
        fixed: Default::default(),
        category_slice: vec![],
    });
    experiment.optimal_artifact_selection = Some(OptimalArtifactSelection {
        design_id: Some(profile.design_id.clone()),
        variance_by_design: [(profile.design_id.clone(), profile.id.clone())].into(),
    });
    let reopened = decode(&encode(&saved).expect("encode profile view"))
        .expect("open profile view")
        .document;
    assert_eq!(reopened, saved);
    assert_eq!(
        reopened.experiments[0].optimal_variances[0].result,
        original.experiments[0].optimal_variances[0].result,
    );
    assert_eq!(
        reopened.experiments[0].analysis_selection,
        original.experiments[0].analysis_selection,
    );
}

#[test]
fn altered_variance_values_sources_and_distributions_are_refused_without_panicking() {
    let spec: OptimalSpec =
        serde_json::from_value(cases()["cases"][0]["spec"].clone()).expect("spec");
    let original = with_variance(document(spec));
    for kind in 0..14 {
        let mut changed = original.clone();
        let record = &mut changed.experiments[0].optimal_variances[0];
        match kind {
            0 => record.id = id("a1"),
            1 => record.design_id = id("absent"),
            2 => record.revision_id = id("absent"),
            3 => record.result.points[0].values[0].relative *= 2.0,
            4 => record.result.points[0].values[0].scaled = f64::NAN,
            5 => record.result.parameters = 0,
            6 => record.result.runs = 0,
            7 => record.result.request.spec.levels = 0,
            8 => record.result.curves[0].quantiles[0].point = u32::MAX,
            9 => record.result.curves[0].quantiles[0].fraction = 0.0,
            10 => record.result.points[0].real[0] = f64::INFINITY,
            11 => record.result.points[0].coded.clear(),
            12 => record.result.curves.clear(),
            _ => record.result.request.run_blocks = Some(vec![u32::MAX]),
        }
        assert!(
            changed
                .validate()
                .iter()
                .any(|issue| issue.code == "project.invalid_optimal_variance"),
            "mutation {kind}"
        );
    }
    let mut bad_source = original;
    bad_source.experiments[0].revisions[1].data.rows[0].factors[0] = "0".into();
    assert!(
        bad_source
            .validate()
            .iter()
            .any(|issue| issue.code == "project.invalid_optimal_variance")
    );
}

#[test]
fn mixed_optimal_designs_and_profiles_round_trip_without_search_or_fitting() {
    use desvtag_core::designs::optimal::variance::{OptimalVarianceRequest, prediction_variance};
    let data: Value = serde_json::from_str(include_str!(
        "../../../../validation/cases/optimal/categories.json"
    ))
    .expect("category references");
    for case in data["cases"].as_array().expect("cases").iter().take(12) {
        let spec: OptimalSpec = serde_json::from_value(case["spec"].clone()).expect("spec");
        let mut doc = document(spec);
        let exp = &mut doc.experiments[0];
        let design = &exp.optimal_designs[0];
        let profile = prediction_variance(&OptimalVarianceRequest {
            spec: design.result.spec.clone(),
            runs_real: design.result.runs.iter().map(|r| r.real.clone()).collect(),
            run_categories: Some(
                design
                    .result
                    .runs
                    .iter()
                    .map(|r| r.categories.clone().expect("categories"))
                    .collect(),
            ),
            run_blocks: design.result.spec.blocks.as_ref().map(|_| {
                design
                    .result
                    .runs
                    .iter()
                    .map(|r| r.block.expect("block"))
                    .collect()
            }),
        })
        .expect("profile");
        exp.optimal_variances
            .push(desvtag_project::optimal::OptimalVarianceRecord {
                id: id("a2"),
                created_at: NOW.into(),
                design_id: design.id.clone(),
                revision_id: design.revision_id.clone(),
                view: None,
                result: profile,
            });
        exp.analysis_selection.optimal_design_id = Some(design.id.clone());
        let doc = doc.with_hashes();
        assert!(
            doc.validate().iter().all(|i| !i.is_blocking()),
            "{}: {:?}",
            case["name"],
            doc.validate()
        );
        let encoded = encode(&doc).expect("encode mixed design");
        let restored = decode(&encoded).expect("decode mixed design").document;
        assert_eq!(restored, doc);
        let mut corrupted = doc.clone();
        corrupted.experiments[0].optimal_designs[0].result.runs[0].categories =
            Some(vec!["not a declared level".into()]);
        assert!(corrupted.validate().iter().any(|i| i.is_blocking()));
        let mut corrupted = doc.clone();
        corrupted.experiments[0].optimal_variances[0]
            .result
            .request
            .run_categories = None;
        assert!(corrupted.validate().iter().any(|i| i.is_blocking()));
        let mut corrupted = doc.clone();
        corrupted.experiments[0].optimal_variances[0].result.points[0].categories = None;
        assert!(corrupted.validate().iter().any(|i| i.is_blocking()));
    }
}
