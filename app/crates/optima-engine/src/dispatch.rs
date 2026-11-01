//! Despacho: valida a solicitação e chama a operação.

use std::collections::BTreeMap;

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use optima_core::errors::CoreError;
use optima_core::validation::{Issue, Severity};
use serde_json::Value;

use crate::capabilities::engine_info;
use crate::request::{EngineRequest, Operation, PROTOCOL_VERSION};
use crate::response::{
    EngineError, EngineResponse, ErrorCode, OperationResult, Outcome, ProjectDecodeResult,
    ProjectEncodeResult,
};

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
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::DesignRecommend(req) => Outcome::Ok {
            result: OperationResult::DesignRecommend(
                optima_core::designs::recommend::DesignOptions {
                    candidates: optima_core::designs::recommend::candidates(
                        req.factors as usize,
                        req.max_runs,
                    ),
                },
            ),
        },
        Operation::DesignCount(req) => match optima_core::designs::count_runs(req) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::DesignCount(result),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::DesignGenerate(req) => match optima_core::designs::generate(req) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::DesignGenerate(Box::new(result)),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::DesignCrdGenerate(req) => {
            match optima_core::designs::completely_randomized::generate(req) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::DesignCrdGenerate(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::DesignAnalyze(req) => {
            match optima_core::designs::analysis::analyze(req.as_ref()) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::DesignAnalyze(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::SurfaceAnalyze(req) => match optima_core::surface::analyze(req.as_ref()) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::SurfaceAnalyze(Box::new(result)),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::SurfaceGrid(req) => match optima_core::surface::compute_grid(req.as_ref()) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::SurfaceGrid(Box::new(result)),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::ExportXlsx(book) => match optima_project::xlsx_writer::write_xlsx(book) {
            Ok(bytes) => Outcome::Ok {
                result: OperationResult::ExportXlsx(ProjectEncodeResult {
                    size: bytes.len() as u64,
                    sha256: optima_project::integrity::sha256_hex(&bytes),
                    bytes_base64: STANDARD.encode(&bytes),
                }),
            },
            Err(issues) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::OptimizationRun(req) => {
            match optima_core::optimization::optimize(req.as_ref()) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::OptimizationRun(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::OptimizationEvaluate(req) => {
            match optima_core::optimization::evaluate_points(req.as_ref()) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::OptimizationEvaluate(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::OptimizationGrid(req) => {
            match optima_core::optimization::desirability_grid(req.as_ref()) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::OptimizationGrid(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::ComparisonOneWay(req) => match optima_core::comparisons::compare_one_way(req) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::ComparisonOneWay(Box::new(result)),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::ComparisonProcedure(req) => {
            match optima_core::comparisons::procedures::compare(req) {
                Ok(result) => Outcome::Ok {
                    result: OperationResult::ComparisonProcedure(Box::new(result)),
                },
                Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
            }
        }
        Operation::DistributionEvaluate(req) => match optima_core::distributions::evaluate(req) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::DistributionEvaluate(result),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::ModelFitLinear(req) => match optima_core::models::fit_model(req.as_ref()) {
            Ok(result) => Outcome::Ok {
                result: OperationResult::ModelFitLinear(Box::new(result)),
            },
            Err(CoreError::InvalidInput(issues)) => failure(ErrorCode::InvalidInput, issues),
        },
        Operation::ProjectEncode(req) => match optima_project::archive::encode(&req.document) {
            Ok(bytes) => Outcome::Ok {
                result: OperationResult::ProjectEncode(ProjectEncodeResult {
                    size: bytes.len() as u64,
                    sha256: optima_project::integrity::sha256_hex(&bytes),
                    bytes_base64: STANDARD.encode(&bytes),
                }),
            },
            Err(issues) => failure(ErrorCode::InvalidProject, issues),
        },
        Operation::ProjectDecode(req) => {
            match decode_base64(&req.bytes_base64, "project.invalid_base64") {
                Err(issues) => failure(ErrorCode::InvalidProject, issues),
                Ok(bytes) => match optima_project::archive::decode(&bytes) {
                    Ok(decoded) => Outcome::Ok {
                        result: OperationResult::ProjectDecode(ProjectDecodeResult {
                            document: decoded.document,
                            migrated_from: decoded.migrated_from,
                            warnings: decoded.warnings,
                        }),
                    },
                    Err(issues) => failure(ErrorCode::InvalidProject, issues),
                },
            }
        }
        Operation::ImportXlsx(req) => {
            match decode_base64(&req.bytes_base64, "import.invalid_base64") {
                Err(issues) => failure(ErrorCode::InvalidImport, issues),
                Ok(bytes) => match optima_project::xlsx::read_xlsx(&bytes, req.sheet.as_deref()) {
                    Ok(sheet) => Outcome::Ok {
                        result: OperationResult::ImportXlsx(sheet),
                    },
                    Err(issues) => failure(ErrorCode::InvalidImport, issues),
                },
            }
        }
    };
    EngineResponse {
        protocol_version: PROTOCOL_VERSION,
        task_id: Some(request.task_id.clone()),
        outcome,
    }
}

fn failure(code: ErrorCode, issues: Vec<Issue>) -> Outcome {
    Outcome::Error {
        error: EngineError {
            code,
            params: BTreeMap::new(),
            issues,
        },
    }
}

fn decode_base64(text: &str, code: &str) -> Result<Vec<u8>, Vec<Issue>> {
    STANDARD
        .decode(text)
        .map_err(|_| vec![Issue::new(code, Severity::Error)])
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
