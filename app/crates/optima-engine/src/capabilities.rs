//! Montagem do resultado de `engine.info`.

use optima_core::CORE_VERSION;
use optima_core::registry::Capabilities;
use optima_project::SCHEMA_VERSION;

use crate::request::PROTOCOL_VERSION;
use crate::response::EngineInfo;

/// Informações atuais do motor.
#[must_use]
pub fn engine_info() -> EngineInfo {
    EngineInfo {
        engine_version: CORE_VERSION.to_string(),
        protocol_version: PROTOCOL_VERSION,
        project_schema_version: SCHEMA_VERSION,
        capabilities: Capabilities::current(),
    }
}
