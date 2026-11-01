//! Despacho: valida a solicitação e chama a operação.

use std::collections::BTreeMap;

use optima_core::errors::CoreError;
use serde_json::Value;

use crate::capabilities::engine_info;
use crate::request::{EngineRequest, Operation, PROTOCOL_VERSION};
use crate::response::{EngineError, EngineResponse, ErrorCode, OperationResult, Outcome};

fn error_response(
    task_id: Option<String>,
    code: ErrorCode,
    params: BTreeMap<String, String>,
) -> EngineResponse {
    EngineResponse {
        protocol_version: PROTOCOL_VERSION,
        task_id,
        outcome: Outcome::Error {
            error: EngineError {
                code,
                params,
                issues: Vec::new(),
            },
        },
    }
}

/// Executa uma solicitação já tipada.
#[must_use]
pub fn handle_request(request: &EngineRequest) -> EngineResponse {
    if request.protocol_version != PROTOCOL_VERSION {
        return unsupported_version(
            Some(request.task_id.clone()),
            &request.protocol_version.to_string(),
        );
    }
    let outcome = match &request.operation {
        Operation::EngineInfo => Outcome::Ok {
            result: OperationResult::EngineInfo(engine_info()),
        },
        Operation::DescriptiveSummarize(req) => match optima_core::descriptive::summarize(req) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::DescriptiveSummarize(result),
            },
            Err(CoreError::InvalidInput(issues)) => Outcome::Error {
                error: EngineError {
                    code: ErrorCode::InvalidInput,
                    params: BTreeMap::new(),
                    issues,
                },
            },
        },
    };
    EngineResponse {
        protocol_version: PROTOCOL_VERSION,
        task_id: Some(request.task_id.clone()),
        outcome,
    }
}

fn unsupported_version(task_id: Option<String>, received: &str) -> EngineResponse {
    let params = BTreeMap::from([
        ("expected".to_string(), PROTOCOL_VERSION.to_string()),
        ("received".to_string(), received.to_string()),
    ]);
    error_response(task_id, ErrorCode::UnsupportedProtocolVersion, params)
}

/// Executa uma solicitação em JSON e devolve a resposta em JSON.
///
/// A versão do protocolo é verificada antes de interpretar a operação, de modo
/// que um cliente antigo ou novo recebe `unsupportedProtocolVersion` e não um
/// erro genérico de formato.
#[must_use]
pub fn handle_json(request_json: &str) -> String {
    let response = match serde_json::from_str::<Value>(request_json) {
        Err(_) => error_response(None, ErrorCode::InvalidRequest, BTreeMap::new()),
        Ok(value) => {
            let task_id = value
                .get("taskId")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let version = value.get("protocolVersion").and_then(Value::as_u64);
            match version {
                Some(v) if v != u64::from(PROTOCOL_VERSION) => {
                    unsupported_version(task_id, &v.to_string())
                }
                _ => match serde_json::from_value::<EngineRequest>(value) {
                    Ok(request) => handle_request(&request),
                    Err(_) => error_response(task_id, ErrorCode::InvalidRequest, BTreeMap::new()),
                },
            }
        }
    };
    serde_json::to_string(&response).unwrap_or_else(|_| {
        // Serialização dos tipos do protocolo não falha; resposta mínima por segurança.
        format!("{{\"protocolVersion\":{PROTOCOL_VERSION},\"taskId\":null,\"outcome\":{{\"status\":\"error\",\"error\":{{\"code\":\"invalidRequest\",\"params\":{{}}}}}}}}")
    })
}
