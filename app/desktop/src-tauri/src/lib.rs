//! Aplicativo Windows (E04): transporte nativo entre a interface e o motor.
//!
//! Sem lógica científica: os comandos chamam `optima-engine`, o mesmo código
//! usado pelo WebAssembly no navegador.

mod commands;
mod files;
mod jobs;

/// Inicia o aplicativo.
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(files::FileState::default())
        .invoke_handler(tauri::generate_handler![
            commands::engine_request,
            commands::export_file,
            commands::project_open,
            commands::project_open_recent,
            commands::project_recent,
            commands::project_save,
            commands::project_save_copy,
            commands::project_detach,
        ])
        .run(tauri::generate_context!());
    if let Err(error) = result {
        eprintln!("erro ao executar o aplicativo EnziTAG Optima: {error}");
        std::process::exit(1);
    }
}
