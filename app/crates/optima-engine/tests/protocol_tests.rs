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
fn engine_info_returns_versions_and_empty_capabilities() {
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
            assert!(info.capabilities.methods.is_empty());
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
