//! Comandos do Google Drive no Windows (ET26, DT-0036): ligam a lógica de `drive_auth` ao HTTP real,
//! ao Gerenciador de Credenciais do Windows e ao navegador do sistema. Só o token de acesso chega à
//! interface; o token de atualização nunca sai do cofre.

use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::State;

use crate::drive_auth::{
    AuthError, CONNECT_TIMEOUT, Client, HttpReply, Session, Transport, Vault, encode,
};

/// Identificador do cliente desktop (público; ver `services/drive/config.ts`).
const DESKTOP_CLIENT_ID: &str =
    "618382101076-rlh612fn12o9c03cjp09eb0eo5igqldu.apps.googleusercontent.com";
/// O segredo vem do segredo do GitHub na compilação da candidata; sem ele a conexão informa
/// «indisponível» em vez de falhar no Google.
const DESKTOP_CLIENT_SECRET: Option<&str> = option_env!("GOOGLE_DESKTOP_CLIENT_SECRET");
const VAULT_SERVICE: &str = "EnziTAG Optima";
const VAULT_ACCOUNT: &str = "google-drive-refresh-token";

fn client() -> Client {
    Client {
        id: DESKTOP_CLIENT_ID.to_owned(),
        secret: DESKTOP_CLIENT_SECRET.unwrap_or_default().to_owned(),
    }
}

/// HTTP síncrono (ureq) com tempo limite; respostas 4xx/5xx voltam como resposta, não como erro.
struct Http;

impl Transport for Http {
    fn post_form(&self, url: &str, form: &[(&str, &str)]) -> Result<HttpReply, AuthError> {
        let agent = ureq::AgentBuilder::new()
            .timeout(Duration::from_secs(30))
            .build();
        match agent.post(url).send_form(form) {
            Ok(response) => read(response),
            Err(ureq::Error::Status(_, response)) => read(response),
            Err(ureq::Error::Transport(_)) => Err(AuthError::Network),
        }
    }
}

fn read(response: ureq::Response) -> Result<HttpReply, AuthError> {
    let status = response.status();
    let body = response.into_string().map_err(|_| AuthError::Network)?;
    Ok(HttpReply { status, body })
}

/// Entrada única no Gerenciador de Credenciais do Windows.
struct SystemVault;

impl SystemVault {
    fn entry() -> Result<keyring::Entry, AuthError> {
        keyring::Entry::new(VAULT_SERVICE, VAULT_ACCOUNT).map_err(|_| AuthError::Unavailable)
    }
}

impl Vault for SystemVault {
    fn load(&self) -> Result<Option<String>, AuthError> {
        match Self::entry()?.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(AuthError::Unavailable),
        }
    }
    fn store(&self, refresh_token: &str) -> Result<(), AuthError> {
        Self::entry()?
            .set_password(refresh_token)
            .map_err(|_| AuthError::Unavailable)
    }
    fn clear(&self) -> Result<(), AuthError> {
        match Self::entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(AuthError::Unavailable),
        }
    }
}

/// Estado compartilhado dos comandos.
#[derive(Default)]
pub struct DriveState(
    Arc<Session>,
    #[cfg(feature = "automation")] std::sync::atomic::AtomicBool,
);

#[cfg(feature = "automation")]
fn mock_drive() -> bool {
    std::env::var("ENZITAG_TEST_DRIVE").as_deref() == Ok("1")
}

/// Situação enviada à interface.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveStatus {
    connected: bool,
    /// A compilação inclui o segredo do cliente desktop.
    available: bool,
}

fn code(error: &AuthError) -> String {
    error.code().to_owned()
}

#[tauri::command]
pub fn drive_status(state: State<'_, DriveState>) -> Result<DriveStatus, String> {
    #[cfg(feature = "automation")]
    if mock_drive() {
        return Ok(DriveStatus {
            connected: state.1.load(std::sync::atomic::Ordering::Relaxed),
            available: true,
        });
    }
    Ok(DriveStatus {
        connected: state.0.connected(&SystemVault).map_err(|e| code(&e))?,
        available: !client().secret.is_empty(),
    })
}

/// Abre o navegador do sistema e espera o retorno. Não bloqueia a interface.
#[tauri::command]
pub async fn drive_connect(state: State<'_, DriveState>) -> Result<(), String> {
    #[cfg(feature = "automation")]
    if mock_drive() {
        state.1.store(true, std::sync::atomic::Ordering::Relaxed);
        return Ok(());
    }
    let session = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        session.connect(
            &client(),
            &Http,
            &SystemVault,
            &|url| opener::open_browser(url).map_err(|_| AuthError::Unavailable),
            CONNECT_TIMEOUT,
        )
    })
    .await
    .map_err(|_| "unavailable".to_owned())?
    .map_err(|e| code(&e))
}

#[tauri::command]
pub async fn drive_pick(state: State<'_, DriveState>) -> Result<String, String> {
    let session = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        #[cfg(feature = "automation")]
        let mock_handoff = mock_drive().then(|| std::env::var_os("ENZITAG_TEST_PICKER_HANDOFF")).flatten();
        #[cfg(feature = "automation")]
        let token = if mock_handoff.is_some() {
            "optima-test-token".to_owned()
        } else {
            session.access_token(&client(), &Http, &SystemVault, Instant::now())?
        };
        #[cfg(not(feature = "automation"))]
        let token = session.access_token(&client(), &Http, &SystemVault, Instant::now())?;
        session.select_file(
            |redirect, nonce| {
                let url = format!(
                    "https://vitormazziero.github.io/desvtag/drive-picker.html#redirect={}&state={}&token={}",
                    encode(redirect),
                    encode(nonce),
                    encode(&token)
                );
                #[cfg(feature = "automation")]
                if let Some(path) = mock_handoff {
                    return std::fs::write(path, url).map_err(|_| AuthError::Unavailable);
                }
                opener::open_browser(url).map_err(|_| AuthError::Unavailable)
            },
            CONNECT_TIMEOUT,
        )
    })
    .await
    .map_err(|_| "unavailable".to_owned())?
    .map_err(|e| code(&e))
}

#[tauri::command]
pub fn drive_cancel(state: State<'_, DriveState>) {
    state.0.cancel();
}

/// Token de acesso válido, renovado quando necessário.
#[tauri::command]
pub async fn drive_access_token(state: State<'_, DriveState>) -> Result<String, String> {
    #[cfg(feature = "automation")]
    if mock_drive() {
        return state
            .1
            .load(std::sync::atomic::Ordering::Relaxed)
            .then(|| "optima-test-token".to_owned())
            .ok_or_else(|| "auth".to_owned());
    }
    let session = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        session.access_token(&client(), &Http, &SystemVault, Instant::now())
    })
    .await
    .map_err(|_| "unavailable".to_owned())?
    .map_err(|e| code(&e))
}

/// Desconecta; devolve se o Google confirmou a revogação (o cofre é apagado de qualquer modo).
#[tauri::command]
pub async fn drive_disconnect(state: State<'_, DriveState>) -> Result<bool, String> {
    #[cfg(feature = "automation")]
    if mock_drive() {
        state.1.store(false, std::sync::atomic::Ordering::Relaxed);
        return Ok(true);
    }
    let session = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || session.disconnect(&Http, &SystemVault))
        .await
        .map_err(|_| "unavailable".to_owned())?
        .map_err(|e| code(&e))
}
