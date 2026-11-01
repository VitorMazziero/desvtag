//! Contratos de execução e despacho (E01).
//!
//! A interface envia um [`EngineRequest`] serializado em JSON e recebe um
//! [`EngineResponse`]. O mesmo texto JSON trafega pelo Worker WebAssembly e
//! pelos comandos Tauri; esta biblioteca é a única fonte da semântica.
//!
//! Os tipos TypeScript são gerados a partir deste pacote (`ts-rs`).

pub mod capabilities;
pub mod dispatch;
pub mod request;
pub mod response;

pub use dispatch::{handle_json, handle_request};
pub use request::{EngineRequest, Operation, PROTOCOL_VERSION};
pub use response::{EngineError, EngineInfo, EngineResponse, ErrorCode, OperationResult, Outcome};
