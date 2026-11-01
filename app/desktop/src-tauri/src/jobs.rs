//! Execução de tarefas de cálculo fora da thread da interface.

/// Executa `work` em uma thread de trabalho bloqueante.
///
/// Cancelamento e progresso entram com as operações longas (ET08).
pub async fn run_blocking<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| format!("tarefa de cálculo interrompida: {error}"))
}
