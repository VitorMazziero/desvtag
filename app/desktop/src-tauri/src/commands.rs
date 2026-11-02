//! Comandos expostos à interface.

use std::path::{Path, PathBuf};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::files::{FileState, RecentEntry, push_recent, read_project, write_atomic};
use crate::jobs;

/// Executa uma solicitação do protocolo (JSON) e devolve a resposta (JSON).
///
/// O cálculo roda em uma thread de trabalho, fora da thread da interface.
#[tauri::command]
pub async fn engine_request(request_json: String) -> Result<String, String> {
    jobs::run_blocking(move || optima_engine::handle_json(&request_json)).await
}

/// Arquivo aberto: nome e conteúdo (o caminho fica no Rust).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedFile {
    name: String,
    bytes_base64: String,
}

/// Arquivo salvo.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedFile {
    name: String,
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn recent_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("recent.json"))
}

fn load_recent(app: &AppHandle) -> Vec<RecentEntry> {
    recent_file(app)
        .ok()
        .and_then(|p| std::fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

fn remember(app: &AppHandle, path: &Path) {
    // Falha ao gravar a lista de recentes não impede abrir ou salvar.
    let entry = RecentEntry {
        path: path.to_string_lossy().into_owned(),
        name: file_name(path),
    };
    let list = push_recent(load_recent(app), entry);
    if let (Ok(file), Ok(json)) = (recent_file(app), serde_json::to_vec_pretty(&list)) {
        let _ = write_atomic(&file, &json);
    }
}

fn open_path(app: &AppHandle, state: &FileState, path: PathBuf) -> Result<OpenedFile, String> {
    let bytes = read_project(&path).map_err(|e| e.to_string())?;
    *state.current.lock().map_err(|e| e.to_string())? = Some(path.clone());
    remember(app, &path);
    Ok(OpenedFile {
        name: file_name(&path),
        bytes_base64: STANDARD.encode(bytes),
    })
}

/// Abre o diálogo "Abrir projeto" e lê o arquivo escolhido. `None`: cancelado.
#[tauri::command]
pub async fn project_open(
    app: AppHandle,
    state: State<'_, FileState>,
) -> Result<Option<OpenedFile>, String> {
    let dialog_app = app.clone();
    let picked = jobs::run_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .add_filter("EnziTAG", &["enzitag"])
            .blocking_pick_file()
    })
    .await?;
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    open_path(&app, &state, path).map(Some)
}

/// Abre um projeto recente pela posição na lista (a interface não envia caminhos).
#[tauri::command]
pub async fn project_open_recent(
    app: AppHandle,
    state: State<'_, FileState>,
    index: usize,
) -> Result<OpenedFile, String> {
    let entry = load_recent(&app)
        .into_iter()
        .nth(index)
        .ok_or_else(|| "projeto recente inexistente".to_string())?;
    open_path(&app, &state, PathBuf::from(entry.path))
}

/// Lista de projetos recentes (nome e caminho para exibição).
#[tauri::command]
pub fn project_recent(app: AppHandle) -> Vec<RecentEntry> {
    load_recent(&app)
}

/// Salva o projeto. Sem caminho atual, ou com `save_as`, abre o diálogo "Salvar como".
/// `None`: cancelado. A gravação é segura e preserva a cópia anterior.
#[tauri::command]
pub async fn project_save(
    app: AppHandle,
    state: State<'_, FileState>,
    bytes_base64: String,
    save_as: bool,
    suggested_name: String,
) -> Result<Option<SavedFile>, String> {
    let bytes = STANDARD.decode(bytes_base64).map_err(|e| e.to_string())?;
    let current = state.current.lock().map_err(|e| e.to_string())?.clone();
    let path = match current {
        Some(path) if !save_as => path,
        _ => match pick_save_path(&app, suggested_name).await? {
            Some(path) => path,
            None => return Ok(None),
        },
    };
    let target = path.clone();
    jobs::run_blocking(move || write_atomic(&target, &bytes))
        .await?
        .map_err(|e| e.to_string())?;
    *state.current.lock().map_err(|e| e.to_string())? = Some(path.clone());
    remember(&app, &path);
    Ok(Some(SavedFile {
        name: file_name(&path),
    }))
}

/// "Salvar uma cópia": grava em outro arquivo sem ligar o projeto a ele.
#[tauri::command]
pub async fn project_save_copy(
    app: AppHandle,
    bytes_base64: String,
    suggested_name: String,
) -> Result<Option<SavedFile>, String> {
    let bytes = STANDARD.decode(bytes_base64).map_err(|e| e.to_string())?;
    let Some(path) = pick_save_path(&app, suggested_name).await? else {
        return Ok(None);
    };
    let target = path.clone();
    jobs::run_blocking(move || write_atomic(&target, &bytes))
        .await?
        .map_err(|e| e.to_string())?;
    Ok(Some(SavedFile {
        name: file_name(&path),
    }))
}

/// Novo projeto: desliga o caminho atual.
#[tauri::command]
pub fn project_detach(state: State<'_, FileState>) -> Result<(), String> {
    *state.current.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

async fn pick_save_path(
    app: &AppHandle,
    suggested_name: String,
) -> Result<Option<PathBuf>, String> {
    pick_save_path_with(app, suggested_name, "EnziTAG", "enzitag").await
}

async fn pick_save_path_with(
    app: &AppHandle,
    suggested_name: String,
    filter_name: &'static str,
    extension: &'static str,
) -> Result<Option<PathBuf>, String> {
    let dialog_app = app.clone();
    let picked = jobs::run_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .add_filter(filter_name, &[extension])
            .set_file_name(suggested_name)
            .blocking_save_file()
    })
    .await?;
    let Some(picked) = picked else {
        return Ok(None);
    };
    let mut path = picked.into_path().map_err(|e| e.to_string())?;
    if path.extension().is_none() {
        path.set_extension(extension);
    }
    Ok(Some(path))
}

/// Extensões de exportação permitidas e o nome do filtro do diálogo.
pub const EXPORT_FORMATS: [(&str, &str); 6] = [
    ("csv", "CSV"),
    ("xlsx", "XLSX"),
    ("svg", "SVG"),
    ("png", "PNG"),
    ("html", "HTML"),
    ("pdf", "PDF"),
];
/// Tamanho máximo de um arquivo exportado.
pub const MAX_EXPORT_BYTES: usize = 64 * 1024 * 1024;

/// Formato de exportação do nome sugerido, ou erro se a extensão não é permitida.
///
/// # Errors
/// Extensão ausente ou fora de [`EXPORT_FORMATS`].
pub fn export_format(suggested_name: &str) -> Result<(&'static str, &'static str), String> {
    let extension = Path::new(suggested_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "export.unsupported_format".to_string())?;
    EXPORT_FORMATS
        .iter()
        .find(|(ext, _)| *ext == extension)
        .copied()
        .ok_or_else(|| "export.unsupported_format".to_string())
}

/// Exporta uma figura, tabela ou relatório: diálogo nativo de "Salvar como" e gravação segura.
/// O caminho escolhido não é devolvido à interface.
#[tauri::command]
pub async fn export_file(
    app: AppHandle,
    bytes_base64: String,
    suggested_name: String,
) -> Result<Option<SavedFile>, String> {
    let (extension, filter_name) = export_format(&suggested_name)?;
    let bytes = STANDARD.decode(bytes_base64).map_err(|e| e.to_string())?;
    if bytes.len() > MAX_EXPORT_BYTES {
        return Err("export.too_large".to_string());
    }
    #[cfg(feature = "automation")]
    if let Some(dir) = std::env::var_os("ENZITAG_EXPORT_DIR") {
        // Verificação automatizada: sem diálogo; só o nome do arquivo sugerido é usado.
        let name = Path::new(&suggested_name)
            .file_name()
            .map(std::path::PathBuf::from)
            .ok_or_else(|| "export.unsupported_format".to_string())?;
        let path = Path::new(&dir).join(name);
        let target = path.clone();
        jobs::run_blocking(move || write_atomic(&target, &bytes))
            .await?
            .map_err(|e| e.to_string())?;
        return Ok(Some(SavedFile {
            name: file_name(&path),
        }));
    }
    let Some(path) = pick_save_path_with(&app, suggested_name, filter_name, extension).await?
    else {
        return Ok(None);
    };
    let target = path.clone();
    jobs::run_blocking(move || write_atomic(&target, &bytes))
        .await?
        .map_err(|e| e.to_string())?;
    Ok(Some(SavedFile {
        name: file_name(&path),
    }))
}

#[cfg(test)]
mod export_tests {
    use super::export_format;

    #[test]
    fn only_listed_extensions_are_exportable() {
        assert_eq!(export_format("grafico.SVG"), Ok(("svg", "SVG")));
        assert_eq!(export_format("tabela.csv"), Ok(("csv", "CSV")));
        assert_eq!(export_format("figura.png"), Ok(("png", "PNG")));
        assert_eq!(export_format("tabela.xlsx"), Ok(("xlsx", "XLSX")));
        assert_eq!(export_format("relatorio.pdf"), Ok(("pdf", "PDF")));
        assert!(export_format("programa.exe").is_err());
        assert!(export_format("semextensao").is_err());
        assert!(export_format("projeto.enzitag").is_err());
    }
}
