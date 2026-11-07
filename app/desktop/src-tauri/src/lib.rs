//! Aplicativo Windows (E04): transporte nativo entre a interface e o motor.
//!
//! Sem lógica científica: os comandos chamam `desvtag-engine`, o mesmo código
//! usado pelo WebAssembly no navegador.

mod commands;
mod drive_auth;
mod drive_commands;
mod files;
mod jobs;
mod updates;

/// Inicia o aplicativo.
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(files::FileState::default())
        .manage(drive_commands::DriveState::default())
        .invoke_handler(tauri::generate_handler![
            commands::engine_request,
            commands::export_file,
            commands::project_open,
            commands::project_open_recent,
            commands::project_recent,
            commands::project_save,
            commands::project_save_copy,
            commands::project_detach,
            drive_commands::drive_status,
            drive_commands::drive_connect,
            drive_commands::drive_pick,
            drive_commands::drive_cancel,
            drive_commands::drive_access_token,
            drive_commands::drive_disconnect,
            updates::update_check,
            updates::update_install,
        ])
        .run(tauri::generate_context!());
    if let Err(error) = result {
        eprintln!("erro ao executar o aplicativo DesvTAG: {error}");
        std::process::exit(1);
    }
}
