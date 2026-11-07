//! Montagem do resultado de `engine.info`.

use desvtag_core::CORE_VERSION;
use desvtag_core::registry::Capabilities;
use desvtag_project::SCHEMA_VERSION;

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
