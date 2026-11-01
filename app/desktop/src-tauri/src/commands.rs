//! Comandos expostos à interface.

use crate::jobs;

/// Executa uma solicitação do protocolo (JSON) e devolve a resposta (JSON).
///
/// O cálculo roda em uma thread de trabalho, fora da thread da interface.
#[tauri::command]
pub async fn engine_request(request_json: String) -> Result<String, String> {
    jobs::run_blocking(move || optima_engine::handle_json(&request_json)).await
}
