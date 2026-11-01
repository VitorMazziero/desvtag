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
            assert_eq!(ids, vec!["descriptive_summary"]);
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
