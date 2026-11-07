//! Adaptador WebAssembly (E03).
//!
//! Apenas transporta texto JSON entre o Worker do navegador e o
//! `desvtag-engine`. Não contém fórmulas nem regras próprias: a semântica
//! (inclusive erros) é a mesma do aplicativo Windows.

use wasm_bindgen::prelude::wasm_bindgen;

/// Executa uma solicitação do protocolo (JSON) e devolve a resposta (JSON).
#[wasm_bindgen(js_name = handleRequest)]
#[must_use]
pub fn handle_request(request_json: &str) -> String {
    desvtag_engine::handle_json(request_json)
}
