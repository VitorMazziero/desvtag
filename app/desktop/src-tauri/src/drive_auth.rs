//! Autorização do Google Drive no Windows (ET26, DT-0036): navegador do sistema, redirecionamento
//! em loopback e PKCE (RFC 7636/8252). Aqui fica só a lógica, sem rede nem cofre reais: o transporte
//! HTTP, o cofre e a abertura do navegador entram por parâmetros e são simulados nos testes.

use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use serde::Deserialize;
use sha2::{Digest, Sha256};

pub const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
pub const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
pub const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
pub const DRIVE_SCOPE: &str = "https://www.googleapis.com/auth/drive.file";
/// Tempo máximo à espera do retorno do navegador.
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(300);
/// Folga antes do vencimento para renovar o token de acesso.
const EXPIRY_MARGIN: Duration = Duration::from_secs(60);

/// Falhas da autorização, com o código que a interface traduz (`DriveErrorCode`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthError {
    /// Sem autorização, negada, revogada ou `state` inválido: reconectar.
    Auth,
    /// Sem rede ou resposta inválida do Google.
    Network,
    /// O usuário cancelou.
    Cancelled,
    /// O navegador não respondeu a tempo.
    Timeout,
    /// Sem segredo do cliente nesta compilação ou cofre indisponível.
    Unavailable,
}

impl AuthError {
    /// Código estável enviado à interface.
    pub fn code(&self) -> &'static str {
        match self {
            Self::Auth => "auth",
            Self::Network => "network",
            Self::Cancelled => "cancelled",
            Self::Timeout => "timeout",
            Self::Unavailable => "unavailable",
        }
    }
}

/// Resposta HTTP já lida.
pub struct HttpReply {
    pub status: u16,
    pub body: String,
}

/// Envio de formulários ao servidor de tokens do Google.
pub trait Transport {
    /// # Errors
    /// [`AuthError::Network`] quando não há resposta HTTP.
    fn post_form(&self, url: &str, form: &[(&str, &str)]) -> Result<HttpReply, AuthError>;
}

/// Guarda do token de atualização (cofre de credenciais do sistema).
pub trait Vault {
    /// # Errors
    /// [`AuthError::Unavailable`] quando o cofre não responde.
    fn load(&self) -> Result<Option<String>, AuthError>;
    /// # Errors
    /// [`AuthError::Unavailable`] quando o cofre não responde.
    fn store(&self, refresh_token: &str) -> Result<(), AuthError>;
    /// # Errors
    /// [`AuthError::Unavailable`] quando o cofre não responde.
    fn clear(&self) -> Result<(), AuthError>;
}

/// Identificadores do cliente desktop. O segredo vem da compilação (segredo do GitHub).
#[derive(Clone)]
pub struct Client {
    pub id: String,
    pub secret: String,
}

/// Par de PKCE.
pub struct Pkce {
    pub verifier: String,
    pub challenge: String,
}

/// `code_challenge` S256 de um verificador.
pub fn challenge_of(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

/// Verificador de 43 caracteres (32 bytes aleatórios) e seu desafio.
///
/// # Errors
/// [`AuthError::Unavailable`] se o sistema não fornece números aleatórios.
pub fn new_pkce() -> Result<Pkce, AuthError> {
    let verifier = random_token()?;
    Ok(Pkce {
        challenge: challenge_of(&verifier),
        verifier,
    })
}

/// 32 bytes aleatórios em base64 sem preenchimento.
///
/// # Errors
/// [`AuthError::Unavailable`] se o sistema não fornece números aleatórios.
pub fn random_token() -> Result<String, AuthError> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|_| AuthError::Unavailable)?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

/// Codificação de formulário (RFC 3986, só caracteres não reservados ficam).
pub fn encode(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            out.push(char::from(byte));
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while let Some(&byte) = bytes.get(i) {
        match byte {
            b'%' => {
                let hex = text.get(i + 1..i + 3)?;
                out.push(u8::from_str_radix(hex, 16).ok()?);
                i += 3;
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            _ => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8(out).ok()
}

/// URL de autorização para o navegador do sistema.
pub fn authorization_url(client_id: &str, redirect: &str, challenge: &str, state: &str) -> String {
    let query = [
        ("client_id", client_id),
        ("redirect_uri", redirect),
        ("response_type", "code"),
        ("scope", DRIVE_SCOPE),
        ("code_challenge", challenge),
        ("code_challenge_method", "S256"),
        ("state", state),
        ("access_type", "offline"),
        ("prompt", "consent"),
    ]
    .iter()
    .map(|(k, v)| format!("{k}={}", encode(v)))
    .collect::<Vec<_>>()
    .join("&");
    format!("{AUTH_URL}?{query}")
}

/// Lê a linha de requisição do retorno e devolve o código, após validar `state`.
///
/// `Ok(None)` indica uma requisição alheia (por exemplo `/favicon.ico`), que deve ser ignorada.
///
/// # Errors
/// [`AuthError::Auth`] para negação, `state` divergente ou código ausente.
pub fn parse_redirect(
    request_line: &str,
    expected_state: &str,
) -> Result<Option<String>, AuthError> {
    let mut parts = request_line.split_whitespace();
    let (Some("GET"), Some(target)) = (parts.next(), parts.next()) else {
        return Ok(None);
    };
    let Some((path, query)) = target.split_once('?') else {
        return Ok(None);
    };
    if path != "/" {
        return Ok(None);
    }
    let (mut code, mut state, mut error) = (None, None, None);
    for pair in query.split('&') {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        match key {
            "code" => code = decode(value),
            "state" => state = decode(value),
            "error" => error = Some(value),
            _ => {}
        }
    }
    if state.as_deref() != Some(expected_state) {
        return Err(AuthError::Auth);
    }
    if let Some(error) = error {
        return Err(match error {
            "cancelled" => AuthError::Cancelled,
            "picker_unavailable" => AuthError::Unavailable,
            _ => AuthError::Auth,
        });
    }
    code.map(Some).ok_or(AuthError::Auth)
}

#[derive(Deserialize)]
struct TokenBody {
    access_token: Option<String>,
    expires_in: Option<u64>,
    refresh_token: Option<String>,
    error: Option<String>,
}

fn token_body(reply: &HttpReply) -> Result<TokenBody, AuthError> {
    let parsed: Result<TokenBody, _> = serde_json::from_str(&reply.body);
    match parsed {
        Ok(body) if reply.status == 200 && body.error.is_none() => Ok(body),
        // `invalid_grant`, `invalid_client` e demais 4xx: a autorização não vale mais.
        Ok(_) if (400..500).contains(&reply.status) => Err(AuthError::Auth),
        _ => Err(AuthError::Network),
    }
}

/// Token de acesso e quando vence.
#[derive(Clone)]
struct Access {
    token: String,
    expires: Instant,
}

/// Sessão do processo: guarda o token de acesso em memória; o de atualização fica no cofre.
#[derive(Default)]
pub struct Session {
    access: Mutex<Option<Access>>,
    cancel: AtomicBool,
}

impl Session {
    /// Pede para encerrar uma conexão em andamento.
    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::SeqCst);
    }

    fn remember(&self, token: &str, seconds: u64, now: Instant) {
        if let Ok(mut slot) = self.access.lock() {
            *slot = Some(Access {
                token: token.to_owned(),
                expires: now + Duration::from_secs(seconds),
            });
        }
    }

    fn forget(&self) {
        if let Ok(mut slot) = self.access.lock() {
            *slot = None;
        }
    }

    fn valid(&self, now: Instant) -> Option<String> {
        let slot = self.access.lock().ok()?;
        slot.as_ref()
            .filter(|a| a.expires > now + EXPIRY_MARGIN)
            .map(|a| a.token.clone())
    }

    /// Há token de atualização no cofre.
    ///
    /// # Errors
    /// [`AuthError::Unavailable`] se o cofre não responde.
    pub fn connected(&self, vault: &dyn Vault) -> Result<bool, AuthError> {
        Ok(vault.load()?.is_some())
    }

    /// Token de acesso válido, renovando com o token de atualização quando preciso.
    ///
    /// # Errors
    /// [`AuthError::Auth`] sem conexão ou com autorização revogada (o cofre é limpo);
    /// [`AuthError::Network`] sem rede (a conexão é mantida).
    pub fn access_token(
        &self,
        client: &Client,
        transport: &dyn Transport,
        vault: &dyn Vault,
        now: Instant,
    ) -> Result<String, AuthError> {
        if let Some(token) = self.valid(now) {
            return Ok(token);
        }
        let refresh = vault.load()?.ok_or(AuthError::Auth)?;
        let reply = transport.post_form(
            TOKEN_URL,
            &[
                ("client_id", &client.id),
                ("client_secret", &client.secret),
                ("grant_type", "refresh_token"),
                ("refresh_token", &refresh),
            ],
        );
        let body = match reply.and_then(|r| token_body(&r)) {
            Ok(body) => body,
            Err(AuthError::Auth) => {
                self.forget();
                vault.clear()?;
                return Err(AuthError::Auth);
            }
            Err(error) => return Err(error),
        };
        let token = body.access_token.ok_or(AuthError::Network)?;
        self.remember(&token, body.expires_in.unwrap_or(3600), now);
        Ok(token)
    }

    /// Conecta pelo navegador do sistema.
    ///
    /// `open` recebe a URL de autorização. Retorna depois de gravar o token de atualização.
    ///
    /// # Errors
    /// Ver [`AuthError`]; em qualquer falha nada é gravado no cofre.
    pub fn connect(
        &self,
        client: &Client,
        transport: &dyn Transport,
        vault: &dyn Vault,
        open: &dyn Fn(&str) -> Result<(), AuthError>,
        timeout: Duration,
    ) -> Result<(), AuthError> {
        if client.secret.is_empty() {
            return Err(AuthError::Unavailable);
        }
        self.cancel.store(false, Ordering::SeqCst);
        let (listener, redirect) = open_loopback()?;
        let pkce = new_pkce()?;
        let state = random_token()?;
        open(&authorization_url(
            &client.id,
            &redirect,
            &pkce.challenge,
            &state,
        ))?;
        let code = self.wait_for_code(&listener, &state, timeout)?;
        let reply = transport.post_form(
            TOKEN_URL,
            &[
                ("client_id", &client.id),
                ("client_secret", &client.secret),
                ("code", &code),
                ("code_verifier", &pkce.verifier),
                ("grant_type", "authorization_code"),
                ("redirect_uri", &redirect),
            ],
        )?;
        let body = token_body(&reply)?;
        let refresh = body.refresh_token.ok_or(AuthError::Auth)?;
        let access = body.access_token.ok_or(AuthError::Network)?;
        vault.store(&refresh)?;
        self.remember(&access, body.expires_in.unwrap_or(3600), Instant::now());
        Ok(())
    }

    fn wait_for_code(
        &self,
        listener: &TcpListener,
        state: &str,
        timeout: Duration,
    ) -> Result<String, AuthError> {
        let deadline = Instant::now() + timeout;
        loop {
            if self.cancel.load(Ordering::SeqCst) {
                return Err(AuthError::Cancelled);
            }
            if Instant::now() >= deadline {
                return Err(AuthError::Timeout);
            }
            match listener.accept() {
                Ok((stream, _)) => {
                    if let Some(outcome) = answer(stream, state) {
                        return outcome;
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(50));
                }
                Err(_) => return Err(AuthError::Network),
            }
        }
    }

    /// Recebe o identificador selecionado pelo navegador em uma sessão de uso único.
    pub fn select_file(
        &self,
        open: impl FnOnce(&str, &str) -> Result<(), AuthError>,
        timeout: Duration,
    ) -> Result<String, AuthError> {
        self.cancel.store(false, Ordering::SeqCst);
        let (listener, redirect) = open_loopback()?;
        let state = random_token()?;
        open(&redirect, &state)?;
        let id = self.wait_for_code(&listener, &state, timeout)?;
        if id.is_empty()
            || id.len() > 256
            || !id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
        {
            return Err(AuthError::Auth);
        }
        Ok(id)
    }

    /// Revoga no Google (melhor esforço), apaga o cofre e esquece o token de acesso.
    ///
    /// Devolve `true` se o Google confirmou a revogação.
    ///
    /// # Errors
    /// [`AuthError::Unavailable`] se o cofre não pôde ser apagado.
    pub fn disconnect(
        &self,
        transport: &dyn Transport,
        vault: &dyn Vault,
    ) -> Result<bool, AuthError> {
        let stored = vault.load()?;
        self.forget();
        let revoked = stored.as_deref().is_some_and(|token| {
            transport
                .post_form(REVOKE_URL, &[("token", token)])
                .is_ok_and(|reply| reply.status == 200)
        });
        vault.clear()?;
        Ok(revoked)
    }
}

fn open_loopback() -> Result<(TcpListener, String), AuthError> {
    let listener =
        TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).map_err(|_| AuthError::Unavailable)?;
    listener
        .set_nonblocking(true)
        .map_err(|_| AuthError::Unavailable)?;
    let port = listener
        .local_addr()
        .map_err(|_| AuthError::Unavailable)?
        .port();
    Ok((listener, format!("http://127.0.0.1:{port}")))
}

/// Atende uma requisição ao receptor. `None` quando era alheia à autorização.
fn answer(mut stream: TcpStream, state: &str) -> Option<Result<String, AuthError>> {
    // O receptor é não bloqueante; a conexão aceita volta a ser bloqueante com prazo curto.
    stream.set_nonblocking(false).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok()?;
    let mut buffer = [0u8; 4096];
    let read = stream.read(&mut buffer).ok()?;
    let head = String::from_utf8_lossy(buffer.get(..read)?).into_owned();
    let line = head.lines().next().unwrap_or("");
    let outcome = parse_redirect(line, state);
    let (status, text) = match &outcome {
        Ok(Some(_)) => (
            "200 OK",
            "Conexão concluída. Pode fechar esta aba e voltar ao DesvTAG.",
        ),
        Ok(None) => ("404 Not Found", "Não encontrado."),
        Err(_) => (
            "400 Bad Request",
            "A conexão não foi autorizada. Volte ao DesvTAG e tente de novo.",
        ),
    };
    let body =
        format!("<!doctype html><meta charset=\"utf-8\"><title>DesvTAG</title><p>{text}</p>");
    let reply = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(reply.as_bytes());
    outcome.transpose()
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    struct FakeVault(RefCell<Option<String>>);
    impl Vault for FakeVault {
        fn load(&self) -> Result<Option<String>, AuthError> {
            Ok(self.0.borrow().clone())
        }
        fn store(&self, token: &str) -> Result<(), AuthError> {
            *self.0.borrow_mut() = Some(token.to_owned());
            Ok(())
        }
        fn clear(&self) -> Result<(), AuthError> {
            *self.0.borrow_mut() = None;
            Ok(())
        }
    }

    type Seen = (String, Vec<(String, String)>);

    struct FakeGoogle {
        replies: RefCell<Vec<Result<HttpReply, AuthError>>>,
        seen: RefCell<Vec<Seen>>,
    }
    impl FakeGoogle {
        fn new(replies: Vec<Result<HttpReply, AuthError>>) -> Self {
            Self {
                replies: RefCell::new(replies),
                seen: RefCell::default(),
            }
        }
    }
    impl Transport for FakeGoogle {
        fn post_form(&self, url: &str, form: &[(&str, &str)]) -> Result<HttpReply, AuthError> {
            self.seen.borrow_mut().push((
                url.to_owned(),
                form.iter()
                    .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
                    .collect(),
            ));
            self.replies.borrow_mut().remove(0)
        }
    }

    fn ok(body: &str) -> Result<HttpReply, AuthError> {
        Ok(HttpReply {
            status: 200,
            body: body.to_owned(),
        })
    }
    fn failed(status: u16, body: &str) -> Result<HttpReply, AuthError> {
        Ok(HttpReply {
            status,
            body: body.to_owned(),
        })
    }
    fn client() -> Client {
        Client {
            id: "id".into(),
            secret: "segredo".into(),
        }
    }
    fn field<'a>(form: &'a [(String, String)], key: &str) -> &'a str {
        form.iter().find(|(k, _)| k == key).map_or("", |(_, v)| v)
    }

    #[test]
    fn pkce_follows_the_rfc_7636_example() {
        // Apêndice B da RFC 7636.
        assert_eq!(
            challenge_of("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
        let pkce = new_pkce().expect("pkce");
        assert_eq!(pkce.verifier.len(), 43);
        assert_eq!(challenge_of(&pkce.verifier), pkce.challenge);
        assert_ne!(random_token().expect("a"), random_token().expect("b"));
    }

    #[test]
    fn authorization_url_has_the_exact_scope_pkce_and_encoded_values() {
        let url = authorization_url("id", "http://127.0.0.1:5000", "chal", "st&ate");
        assert!(url.starts_with("https://accounts.google.com/o/oauth2/v2/auth?"));
        assert!(url.contains("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&"));
        assert!(url.contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A5000&"));
        assert!(url.contains("code_challenge_method=S256"));
        assert!(url.contains("state=st%26ate"));
        assert!(!url.contains("client_secret"));
    }

    #[test]
    fn redirect_parsing_checks_state_and_ignores_foreign_requests() {
        let good = "GET /?state=abc&code=4%2F0AX HTTP/1.1";
        assert_eq!(parse_redirect(good, "abc"), Ok(Some("4/0AX".into())));
        assert_eq!(parse_redirect(good, "other"), Err(AuthError::Auth));
        assert_eq!(
            parse_redirect("GET /?error=access_denied&state=abc HTTP/1.1", "abc"),
            Err(AuthError::Auth)
        );
        assert_eq!(
            parse_redirect("GET /?state=abc HTTP/1.1", "abc"),
            Err(AuthError::Auth)
        );
        assert_eq!(parse_redirect("GET /favicon.ico HTTP/1.1", "abc"), Ok(None));
        assert_eq!(
            parse_redirect("POST /?code=1&state=abc HTTP/1.1", "abc"),
            Ok(None)
        );
        assert_eq!(parse_redirect("", "abc"), Ok(None));
    }

    /// Navegador simulado: segue a URL, devolve o retorno ao receptor e lê a resposta.
    fn browser(state_override: Option<&'static str>) -> impl Fn(&str) -> Result<(), AuthError> {
        move |url: &str| {
            let query = url.split_once('?').map(|(_, q)| q).unwrap_or("");
            let pick = |name: &str| {
                query
                    .split('&')
                    .find_map(|p| p.strip_prefix(&format!("{name}=")))
                    .and_then(decode)
                    .unwrap_or_default()
            };
            let redirect = pick("redirect_uri");
            let state = state_override.map_or_else(|| pick("state"), str::to_owned);
            let port: u16 = redirect
                .rsplit(':')
                .next()
                .and_then(|p| p.parse().ok())
                .unwrap_or(0);
            std::thread::spawn(move || {
                let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("conexão");
                // Requisição alheia primeiro: não pode encerrar a espera.
                let _ = write!(stream, "GET /favicon.ico HTTP/1.1\r\n\r\n");
                let mut sink = String::new();
                let _ = stream.read_to_string(&mut sink);
                let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("conexão");
                let _ = write!(
                    stream,
                    "GET /?code=CODE&state={} HTTP/1.1\r\n\r\n",
                    encode(&state)
                );
                let mut page = String::new();
                let _ = stream.read_to_string(&mut page);
            });
            Ok(())
        }
    }

    #[test]
    fn selection_returns_only_a_file_id_from_the_matching_loopback_session() {
        let session = Session::default();
        let open = |redirect: &str, state: &str| {
            browser(None)(&format!(
                "https://example.test/?redirect_uri={}&state={}",
                encode(redirect),
                encode(state)
            ))
        };
        assert_eq!(
            session.select_file(open, Duration::from_secs(2)),
            Ok("CODE".to_owned())
        );

        let wrong_state = |redirect: &str, state: &str| {
            browser(Some("foreign-state"))(&format!(
                "https://example.test/?redirect_uri={}&state={}",
                encode(redirect),
                encode(state)
            ))
        };
        assert_eq!(
            session.select_file(wrong_state, Duration::from_secs(2)),
            Err(AuthError::Auth)
        );
    }

    #[test]
    fn unavailable_vault_prevents_refresh_without_contacting_google() {
        struct UnavailableVault;
        impl Vault for UnavailableVault {
            fn load(&self) -> Result<Option<String>, AuthError> {
                Err(AuthError::Unavailable)
            }
            fn store(&self, _: &str) -> Result<(), AuthError> {
                Err(AuthError::Unavailable)
            }
            fn clear(&self) -> Result<(), AuthError> {
                Err(AuthError::Unavailable)
            }
        }
        let session = Session::default();
        let http = FakeGoogle::new(vec![]);
        assert_eq!(
            session.connected(&UnavailableVault),
            Err(AuthError::Unavailable)
        );
        assert_eq!(
            session.access_token(&client(), &http, &UnavailableVault, Instant::now()),
            Err(AuthError::Unavailable),
        );
    }

    #[test]
    fn connect_exchanges_the_code_with_the_verifier_and_stores_only_the_refresh_token() {
        let vault = FakeVault(RefCell::default());
        let google = FakeGoogle::new(vec![ok(
            r#"{"access_token":"A1","expires_in":3600,"refresh_token":"R1"}"#,
        )]);
        let session = Session::default();
        session
            .connect(
                &client(),
                &google,
                &vault,
                &browser(None),
                Duration::from_secs(10),
            )
            .expect("conectado");
        assert_eq!(vault.load().expect("cofre"), Some("R1".into()));
        let seen = google.seen.borrow();
        let (url, form) = seen.first().expect("troca");
        assert_eq!(url, TOKEN_URL);
        assert_eq!(field(form, "grant_type"), "authorization_code");
        assert_eq!(field(form, "code"), "CODE");
        assert_eq!(field(form, "code_verifier").len(), 43);
        assert!(field(form, "redirect_uri").starts_with("http://127.0.0.1:"));
        // O token de acesso fica só na memória e é reaproveitado sem nova requisição.
        let token = session
            .access_token(&client(), &google, &vault, Instant::now())
            .expect("token");
        assert_eq!(token, "A1");
        assert_eq!(google.seen.borrow().len(), 1);
    }

    #[test]
    fn a_wrong_state_never_reaches_the_token_server_or_the_vault() {
        let vault = FakeVault(RefCell::default());
        let google = FakeGoogle::new(vec![]);
        let result = Session::default().connect(
            &client(),
            &google,
            &vault,
            &browser(Some("forjado")),
            Duration::from_secs(10),
        );
        assert_eq!(result, Err(AuthError::Auth));
        assert!(google.seen.borrow().is_empty());
        assert_eq!(vault.load().expect("cofre"), None);
    }

    #[test]
    fn timeout_cancel_missing_secret_and_missing_refresh_token_leave_no_trace() {
        let vault = FakeVault(RefCell::default());
        let google = FakeGoogle::new(vec![ok(r#"{"access_token":"A","expires_in":10}"#)]);
        let silent = |_: &str| Ok(());
        let session = Session::default();
        assert_eq!(
            session.connect(
                &client(),
                &google,
                &vault,
                &silent,
                Duration::from_millis(150)
            ),
            Err(AuthError::Timeout)
        );
        let no_secret = Client {
            id: "id".into(),
            secret: String::new(),
        };
        assert_eq!(
            session.connect(&no_secret, &google, &vault, &silent, Duration::from_secs(1)),
            Err(AuthError::Unavailable)
        );
        // Sem token de atualização na resposta não há conexão utilizável.
        assert_eq!(
            session.connect(
                &client(),
                &google,
                &vault,
                &browser(None),
                Duration::from_secs(10)
            ),
            Err(AuthError::Auth)
        );
        assert_eq!(vault.load().expect("cofre"), None);
        let session = std::sync::Arc::new(Session::default());
        let waiter = session.clone();
        let handle = std::thread::spawn(move || {
            waiter.connect(
                &client(),
                &FakeGoogle::new(vec![]),
                &FakeVault(RefCell::default()),
                &|_| Ok(()),
                Duration::from_secs(30),
            )
        });
        std::thread::sleep(Duration::from_millis(200));
        session.cancel();
        assert_eq!(handle.join().expect("fim"), Err(AuthError::Cancelled));
    }

    #[test]
    fn expired_access_tokens_are_renewed_and_revoked_grants_clear_the_vault() {
        let vault = FakeVault(RefCell::new(Some("R1".into())));
        let google = FakeGoogle::new(vec![
            ok(r#"{"access_token":"A2","expires_in":3600}"#),
            failed(400, r#"{"error":"invalid_grant"}"#),
        ]);
        let session = Session::default();
        let now = Instant::now();
        assert_eq!(
            session
                .access_token(&client(), &google, &vault, now)
                .expect("renovado"),
            "A2"
        );
        assert_eq!(field(&google.seen.borrow()[0].1, "refresh_token"), "R1");
        // Perto do vencimento renova de novo; o Google recusa: a conexão é desfeita.
        let late = now + Duration::from_secs(3600 - 30);
        assert_eq!(
            session.access_token(&client(), &google, &vault, late),
            Err(AuthError::Auth)
        );
        assert_eq!(vault.load().expect("cofre"), None);
        assert_eq!(
            session.access_token(&client(), &google, &vault, late),
            Err(AuthError::Auth)
        );
    }

    #[test]
    fn network_failures_keep_the_connection_and_server_errors_are_not_auth_failures() {
        let vault = FakeVault(RefCell::new(Some("R1".into())));
        let google = FakeGoogle::new(vec![
            Err(AuthError::Network),
            failed(503, "indisponível"),
            ok("não é json"),
        ]);
        let session = Session::default();
        for _ in 0..3 {
            assert_eq!(
                session.access_token(&client(), &google, &vault, Instant::now()),
                Err(AuthError::Network)
            );
        }
        assert_eq!(vault.load().expect("cofre"), Some("R1".into()));
    }

    #[test]
    fn disconnect_clears_the_vault_even_when_the_revocation_fails() {
        let vault = FakeVault(RefCell::new(Some("R1".into())));
        let google = FakeGoogle::new(vec![ok("{}")]);
        let session = Session::default();
        assert_eq!(session.disconnect(&google, &vault), Ok(true));
        assert_eq!(field(&google.seen.borrow()[0].1, "token"), "R1");
        assert_eq!(vault.load().expect("cofre"), None);
        let vault = FakeVault(RefCell::new(Some("R2".into())));
        let google = FakeGoogle::new(vec![Err(AuthError::Network)]);
        assert_eq!(session.disconnect(&google, &vault), Ok(false));
        assert_eq!(vault.load().expect("cofre"), None);
        assert!(!session.connected(&vault).expect("cofre"));
    }
}
