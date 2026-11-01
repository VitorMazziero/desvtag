//! Comportamento público do protocolo (E01).
#![allow(clippy::expect_used, clippy::panic)]

use optima_engine::{
    EngineRequest, EngineResponse, ErrorCode, Operation, OperationResult, Outcome,
    PROTOCOL_VERSION, handle_json,
};
use serde_json::{Value, json};

fn call(request: &Value) -> EngineResponse {
    let text = handle_json(&request.to_string());
    serde_json::from_str(&text).expect("a resposta é JSON do protocolo")
}

#[test]
fn engine_info_returns_versions_and_registered_methods() {
    let response = call(&json!({
        "protocolVersion": PROTOCOL_VERSION,
        "taskId": "t-1",
        "operation": { "type": "engineInfo" }
    }));
    assert_eq!(response.task_id.as_deref(), Some("t-1"));
    match response.outcome {
        Outcome::Ok {
            result: OperationResult::EngineInfo(info),
        } => {
            assert_eq!(info.engine_version, env!("CARGO_PKG_VERSION"));
            assert_eq!(info.protocol_version, PROTOCOL_VERSION);
            assert_eq!(info.project_schema_version, optima_project::SCHEMA_VERSION);
            let ids: Vec<_> = info
                .capabilities
                .methods
                .iter()
                .map(|m| m.id.as_str())
                .collect();
            assert_eq!(
                ids,
                vec![
                    "descriptive_summary",
                    "one_way_comparison",
                    "two_level_design",
                    "two_level_design_analysis",
                    "response_surface_design",
                    "response_surface",
                    "desirability_optimization",
                    "linear_model"
                ]
            );
        }
        other => panic!("resultado inesperado: {other:?}"),
    }
}

#[test]
fn incompatible_protocol_version_is_a_coded_error() {
    for version in [0_u32, 2, 99] {
        let response = call(&json!({
            "protocolVersion": version,
            "taskId": "t-2",
            "operation": { "type": "engineInfo" }
        }));
        assert_eq!(response.task_id.as_deref(), Some("t-2"));
        match response.outcome {
            Outcome::Error { error } => {
                assert_eq!(error.code, ErrorCode::UnsupportedProtocolVersion);
                assert_eq!(
                    error.params.get("expected"),
                    Some(&PROTOCOL_VERSION.to_string())
                );
                assert_eq!(error.params.get("received"), Some(&version.to_string()));
            }
            other => panic!("deveria ser erro: {other:?}"),
        }
    }
}

#[test]
fn future_operation_shape_with_wrong_version_is_still_a_version_error() {
    let response = call(&json!({
        "protocolVersion": 7,
        "taskId": "t-3",
        "operation": { "type": "someFutureOperation", "x": 1 }
    }));
    assert!(matches!(
        response.outcome,
        Outcome::Error { error } if error.code == ErrorCode::UnsupportedProtocolVersion
    ));
}

#[test]
fn malformed_input_is_invalid_request() {
    let text = handle_json("{ not json");
    let response: EngineResponse = serde_json::from_str(&text).expect("JSON do protocolo");
    assert_eq!(response.task_id, None);
    assert!(
        matches!(response.outcome, Outcome::Error { error } if error.code == ErrorCode::InvalidRequest)
    );
}

#[test]
fn unknown_operation_with_current_version_keeps_task_id() {
    let response = call(&json!({
        "protocolVersion": PROTOCOL_VERSION,
        "taskId": "t-4",
        "operation": { "type": "doesNotExist" }
    }));
    assert_eq!(response.task_id.as_deref(), Some("t-4"));
    assert!(
        matches!(response.outcome, Outcome::Error { error } if error.code == ErrorCode::InvalidRequest)
    );
}

#[test]
fn request_round_trips_in_camel_case() {
    let request = EngineRequest {
        protocol_version: PROTOCOL_VERSION,
        task_id: "abc".into(),
        operation: Operation::EngineInfo,
    };
    let value = serde_json::to_value(&request).expect("serializa");
    assert_eq!(value["protocolVersion"], PROTOCOL_VERSION);
    assert_eq!(value["taskId"], "abc");
    assert_eq!(value["operation"]["type"], "engineInfo");
    let back: EngineRequest = serde_json::from_value(value).expect("lê");
    assert_eq!(back, request);
}

fn descriptive_request(task: &str, response_id: &str, group_by: &Value, rows: &Value) -> Value {
    json!({
        "protocolVersion": PROTOCOL_VERSION,
        "taskId": task,
        "operation": {
            "type": "descriptiveSummarize",
            "dataset": {
                "factors": [{ "id": "f1", "name": "Condição", "kind": "categorical", "unit": null, "levels": ["A", "B"] }],
                "responses": [{ "id": "r1", "name": "Atividade", "unit": "U/mL" }],
                "observations": rows
            },
            "responseId": response_id,
            "groupBy": group_by
        }
    })
}

#[test]
fn descriptive_summary_works_end_to_end_through_the_protocol() {
    let rows = json!([
        { "id": "o1", "unitId": null, "factors": ["A"], "responses": [1.0] },
        { "id": "o2", "unitId": null, "factors": ["A"], "responses": [3.0] },
        { "id": "o3", "unitId": null, "factors": ["B"], "responses": [10.0] },
        { "id": "o4", "unitId": null, "factors": [null], "responses": [null] }
    ]);
    let response = call(&descriptive_request("d-1", "r1", &json!(["f1"]), &rows));
    let Outcome::Ok {
        result: OperationResult::DescriptiveSummarize(result),
    } = response.outcome
    else {
        panic!("esperava resultado");
    };
    assert_eq!(
        (
            result.overall.n_total,
            result.overall.n_missing,
            result.overall.n_valid
        ),
        (4, 1, 3)
    );
    assert_eq!(result.excluded_missing_factor, 1);
    assert_eq!(result.groups.len(), 2);
    assert_eq!(result.groups[0].labels[0].label, "A");
    assert_eq!(result.groups[0].summary.mean.value(), Some(2.0));
    assert_eq!(result.groups[1].summary.variance.value(), None); // n = 1: indefinida
    let keys: Vec<_> = result.facts.iter().map(|f| f.key.as_str()).collect();
    assert!(keys.contains(&"descriptive.group_too_small"));
    assert!(keys.contains(&"descriptive.independence_not_assessed"));
    assert_eq!(result.provenance.method_id, "descriptive_summary");
}

#[test]
fn descriptive_summary_reports_blocking_issues_as_invalid_input() {
    let rows = json!([{ "id": "o1", "unitId": null, "factors": ["Z"], "responses": [1.0] }]);
    let response = call(&descriptive_request(
        "d-2",
        "nope",
        &json!(["f1", "f1"]),
        &rows,
    ));
    let Outcome::Error { error } = response.outcome else {
        panic!("esperava erro")
    };
    assert_eq!(error.code, ErrorCode::InvalidInput);
    let codes: Vec<_> = error.issues.iter().map(|i| i.code.as_str()).collect();
    assert!(codes.contains(&"dataset.undeclared_level"));
    assert!(codes.contains(&"request.unknown_response"));
    assert!(codes.contains(&"request.duplicate_group_factor"));
}

#[test]
fn nan_or_infinity_cannot_reach_the_engine_as_numbers() {
    // JSON não tem NaN/Infinity: o texto é rejeitado como solicitação inválida.
    let text = r#"{"protocolVersion":1,"taskId":"x","operation":{"type":"descriptiveSummarize","dataset":{"factors":[],"responses":[{"id":"r1","name":"y","unit":null}],"observations":[{"id":"o1","unitId":null,"factors":[],"responses":[NaN]}]},"responseId":"r1","groupBy":[]}}"#;
    let response: EngineResponse =
        serde_json::from_str(&handle_json(text)).expect("JSON do protocolo");
    assert!(
        matches!(response.outcome, Outcome::Error { error } if error.code == ErrorCode::InvalidRequest)
    );
}

fn sample_document() -> Value {
    json!({
        "schemaVersion": 1, "projectId": "p1", "name": "Projeto — açúcar",
        "createdAt": "2026-11-01T12:00:00Z", "modifiedAt": "2026-11-01T12:00:00Z", "appVersion": "0.1.0",
        "experiments": [{
            "id": "e1", "name": "Experimento 1", "entryPath": "analyze", "showUnitColumn": false,
            "analysisSelection": { "responseId": null, "groupBy": [] },
            "revisions": [{
                "id": "v1", "parent": null, "createdAt": "2026-11-01T12:00:00Z", "reason": "created",
                "data": { "factors": [], "responses": [], "rows": [] },
                "contentHash": "85195020d52211eadbe7771b9cc8d8afe00bf870e82737106e519599bc66af6b"
            }],
            "analyses": [], "notes": ""
        }]
    })
}

fn op(task: &str, operation: Value) -> Value {
    json!({ "protocolVersion": PROTOCOL_VERSION, "taskId": task, "operation": operation })
}

#[test]
fn project_encode_then_decode_returns_the_same_document() {
    let doc = sample_document();
    let encoded = call(&op(
        "enc",
        json!({ "type": "projectEncode", "document": doc }),
    ));
    let Outcome::Ok {
        result: OperationResult::ProjectEncode(file),
    } = encoded.outcome
    else {
        panic!("esperava bytes");
    };
    assert_eq!(file.sha256.len(), 64);
    assert!(file.size > 0);
    let decoded = call(&op(
        "dec",
        json!({ "type": "projectDecode", "bytesBase64": file.bytes_base64 }),
    ));
    let Outcome::Ok {
        result: OperationResult::ProjectDecode(back),
    } = decoded.outcome
    else {
        panic!("esperava documento");
    };
    assert_eq!(serde_json::to_value(&back.document).expect("json"), doc);
    assert_eq!(back.migrated_from, None);
}

#[test]
fn project_decode_reports_invalid_files_as_invalid_project() {
    for (payload, expected) in [
        ("bm90IGEgemlw", "project.not_a_zip"),
        ("%%%", "project.invalid_base64"),
    ] {
        let r = call(&op(
            "dec",
            json!({ "type": "projectDecode", "bytesBase64": payload }),
        ));
        let Outcome::Error { error } = r.outcome else {
            panic!("esperava erro")
        };
        assert_eq!(error.code, ErrorCode::InvalidProject);
        assert_eq!(error.issues[0].code, expected);
    }
}

#[test]
fn project_encode_refuses_an_inconsistent_document() {
    let mut doc = sample_document();
    doc["experiments"][0]["revisions"] = json!([]);
    let r = call(&op(
        "enc",
        json!({ "type": "projectEncode", "document": doc }),
    ));
    let Outcome::Error { error } = r.outcome else {
        panic!("esperava erro")
    };
    assert_eq!(error.code, ErrorCode::InvalidProject);
    assert_eq!(error.issues[0].code, "project.experiment_without_revision");
}

#[test]
fn import_xlsx_returns_a_text_grid() {
    use base64::Engine as _;
    let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(
        "../../../validation/cases/import_xlsx/001-acentos-virgula-ausentes-formula/input.xlsx",
    );
    let bytes = std::fs::read(path).expect("input.xlsx");
    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    let r = call(&op(
        "imp",
        json!({ "type": "importXlsx", "bytesBase64": b64, "sheet": null }),
    ));
    let Outcome::Ok {
        result: OperationResult::ImportXlsx(sheet),
    } = r.outcome
    else {
        panic!("esperava planilha")
    };
    assert_eq!(sheet.selected, "Dados");
    assert_eq!(sheet.rows[1][..3], ["Água", "10,5", "U1"]);

    let bad = call(&op(
        "imp2",
        json!({ "type": "importXlsx", "bytesBase64": "aGVsbG8=", "sheet": null }),
    ));
    let Outcome::Error { error } = bad.outcome else {
        panic!("esperava erro")
    };
    assert_eq!(error.code, ErrorCode::InvalidImport);
}

#[test]
fn project_encode_accepts_revisions_without_hashes_and_fills_them() {
    let mut doc = sample_document();
    doc["experiments"][0]["revisions"][0]["contentHash"] = json!("");
    let enc = call(&op(
        "enc",
        json!({ "type": "projectEncode", "document": doc }),
    ));
    let Outcome::Ok {
        result: OperationResult::ProjectEncode(file),
    } = enc.outcome
    else {
        panic!("esperava bytes")
    };
    let dec = call(&op(
        "dec",
        json!({ "type": "projectDecode", "bytesBase64": file.bytes_base64 }),
    ));
    let Outcome::Ok {
        result: OperationResult::ProjectDecode(back),
    } = dec.outcome
    else {
        panic!("esperava documento")
    };
    assert_eq!(
        back.document.experiments[0].revisions[0].content_hash.len(),
        64
    );
}

fn fit_request(spec_terms: serde_json::Value, response: &str) -> serde_json::Value {
    let observations: Vec<_> = [(1.0, 1.0), (2.0, 3.0), (3.0, 2.0), (4.0, 5.0), (5.0, 4.0)]
        .iter()
        .enumerate()
        .map(|(i, (x, y))| json!({ "id": format!("o{}", i + 1), "unitId": null, "factors": [x], "responses": [y] }))
        .collect();
    json!({
        "protocolVersion": PROTOCOL_VERSION,
        "taskId": "fit-1",
        "operation": {
            "type": "modelFitLinear",
            "dataset": {
                "factors": [{ "id": "x", "name": "x", "kind": "numeric", "unit": null, "levels": [] }],
                "responses": [{ "id": "y", "name": "y", "unit": null }],
                "observations": observations,
            },
            "spec": {
                "responseId": response,
                "intercept": true,
                "terms": spec_terms,
                "coding": "treatment",
                "confidenceLevel": 0.95,
            },
        }
    })
}

#[test]
fn model_fit_linear_returns_the_fit_over_json() {
    let response = call(&fit_request(
        json!([{ "type": "main", "factorId": "x" }]),
        "y",
    ));
    match response.outcome {
        Outcome::Ok {
            result: OperationResult::ModelFitLinear(fit),
        } => {
            assert_eq!(fit.rank, 2);
            assert_eq!(fit.df_residual, 3);
            let slope = fit.coefficients[1].estimate.value().expect("inclinação");
            assert!((slope - 0.8).abs() < 1e-12);
            assert!(
                fit.anova
                    .f
                    .value()
                    .is_some_and(|f| (f - 16.0 / 3.0).abs() < 1e-10)
            );
            assert_eq!(fit.provenance.method_id, "linear_model");
        }
        other => panic!("resultado inesperado: {other:?}"),
    }
}

#[test]
fn model_fit_linear_reports_invalid_models_as_coded_issues() {
    let response = call(&fit_request(
        json!([{ "type": "main", "factorId": "x" }]),
        "w",
    ));
    match response.outcome {
        Outcome::Error { error } => {
            assert_eq!(error.code, ErrorCode::InvalidInput);
            assert!(
                error
                    .issues
                    .iter()
                    .any(|i| i.code == "request.unknown_response")
            );
        }
        other => panic!("deveria ser erro: {other:?}"),
    }
}
