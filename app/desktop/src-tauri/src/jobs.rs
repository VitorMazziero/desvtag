//! Execução limitada do motor; arquivos e cálculo têm vagas independentes.
use std::sync::atomic::{AtomicBool, Ordering};

static SCIENTIFIC: AtomicBool = AtomicBool::new(false);
static SERVICE: AtomicBool = AtomicBool::new(false);

struct Permit(&'static AtomicBool);
impl Drop for Permit {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}
fn acquire(slot: &'static AtomicBool) -> Result<Permit, String> {
    slot.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .map(|_| Permit(slot))
        .map_err(|_| "engine execution busy".to_string())
}
fn service_request(json: &str) -> bool {
    let parsed = serde_json::from_str::<serde_json::Value>(json).ok();
    let kind = parsed
        .as_ref()
        .and_then(|r| r.get("operation"))
        .and_then(|o| o.get("type"))
        .and_then(|t| t.as_str())
        .unwrap_or("");
    kind == "engineInfo"
        || kind.starts_with("project")
        || kind.starts_with("import")
        || kind == "exportXlsx"
}

/// At most one real native CPU job per class, including jobs cancelled by their caller.
pub async fn run_engine(request_json: String) -> Result<String, String> {
    let permit = acquire(if service_request(&request_json) {
        &SERVICE
    } else {
        &SCIENTIFIC
    })?;
    run_blocking(move || {
        let _permit = permit;
        desvtag_engine::handle_json(&request_json)
    })
    .await
}

/// Executa `work` em uma thread de trabalho bloqueante.
///
/// A escrita e os diálogos de arquivo não ocupam as vagas do motor.
pub async fn run_blocking<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| format!("tarefa de cálculo interrompida: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_permit_is_exclusive_and_released_on_return_or_panic() {
        static SLOT: AtomicBool = AtomicBool::new(false);
        let permit = acquire(&SLOT).expect("first job");
        assert!(acquire(&SLOT).is_err());
        drop(permit);
        let _ = std::panic::catch_unwind(|| {
            let _permit = acquire(&SLOT).expect("after completion");
            panic!("simulated engine panic");
        });
        assert!(acquire(&SLOT).is_ok());
    }
    #[test]
    fn file_operations_and_engine_metadata_use_the_independent_slot() {
        for kind in [
            "engineInfo",
            "projectEncode",
            "projectDecode",
            "importXlsx",
            "exportXlsx",
        ] {
            assert!(service_request(&format!(
                r#"{{"operation":{{"type":"{kind}"}}}}"#
            )));
        }
        assert!(!service_request(r#"{"operation":{"type":"powerAnalyze"}}"#));
        assert!(!service_request("malformed"));
    }
}
