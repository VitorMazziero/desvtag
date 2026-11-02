// Identificadores públicos da integração com o Google Drive (opcional). Nenhum segredo fica aqui:
// o cliente web usa o fluxo de token do Google Identity Services (sem segredo) e o segredo do cliente
// do Windows fica só em segredo do GitHub (ver DT-0025). A chave de API do Picker é pública e está
// restrita, no Google Cloud, aos referenciadores do aplicativo.

export const GOOGLE_PROJECT_NUMBER = "618382101076";
export const GOOGLE_WEB_CLIENT_ID =
  "618382101076-3vjbr6s9kapl89l1gd88p3gm7afadm8p.apps.googleusercontent.com";
export const GOOGLE_PICKER_API_KEY = "AIzaSyCYzdQE88l-aaGbbbgbbrQEIFOw2i1AfbE";
/** Escopo mínimo: só arquivos que o aplicativo cria ou que o usuário escolhe abrir. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
/** Pasta visível no Drive do usuário. */
export const DRIVE_FOLDER_NAME = "EnziTAG Optima";
export const DRIVE_FILE_MIME = "application/octet-stream";
