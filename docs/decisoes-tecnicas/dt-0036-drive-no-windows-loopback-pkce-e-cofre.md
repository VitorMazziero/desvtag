# DT-0036 — Google Drive no Windows: loopback, PKCE, cofre e fila persistente (ET26)

| Campo | Valor |
|---|---|
| Estado | Aceita em parte (T02 implementada e testada com simulação; conexão real pendente) |
| Data | 2026-11-05 |
| Origem | [ET26](../planos-execucao/ativos/et26-google-drive-completo-e-verificado.md) T01; complementa a seção 5 da [DT-0025](dt-0025-google-drive-opcional-na-versao-web.md) |
| Pendências relacionadas | PD-09, PD-10 |
| Substitui / substituída por | — |

## Contexto

A versão web já autoriza pelo Google Identity Services e guarda o token só na memória. No Windows a CSP bloqueia scripts do Google e o Google exige, para aplicativo instalado, navegador do sistema, redirecionamento em loopback e PKCE (RFC 8252/7636). O cliente desktop (`618382101076-rlh612fn12o9c03cjp09eb0eo5igqldu.apps.googleusercontent.com`) tem segredo, que **não** entra no repositório: fica em segredo do GitHub e é injetado na compilação da candidata. Restrições aprovadas: Drive opcional, escopo `drive.file`, nenhuma requisição externa antes de o usuário pedir para conectar, nunca exigir login local.

## Decisão

1. **Fluxo:** o processo Rust abre um receptor em `127.0.0.1` com porta efêmera, monta a URL de autorização com `code_challenge` S256 e `state` aleatórios, abre o navegador do sistema, aceita **uma** requisição de retorno, valida `state` e responde uma página simples. Tempo limite de 5 minutos e cancelamento pelo usuário; o receptor é fechado em qualquer saída.
2. **Troca e renovação:** `POST https://oauth2.googleapis.com/token` com `code_verifier` (troca) ou `refresh_token` (renovação). O token de acesso fica na memória do processo; **só o token de atualização é persistido**.
3. **Cofre:** Gerenciador de Credenciais do Windows (crate `keyring`, backend nativo), entrada única por aplicativo. Nenhum token em arquivo, `localStorage`, IndexedDB ou diagnóstico. Desconectar revoga no Google (`/revoke`) e apaga a entrada, mesmo que a revogação falhe por falta de rede (com aviso).
4. **Fronteira:** a interface nunca recebe o token de atualização. Comandos Tauri mínimos: `drive_connect`, `drive_access_token` (devolve token de acesso válido, renovando se preciso), `drive_disconnect`, `drive_status`. As chamadas à API do Drive continuam no `client.ts` compartilhado, com a CSP do Windows ampliada **somente** para `https://www.googleapis.com` em `connect-src`.
5. **HTTP no Rust:** crate `ureq` com `rustls` (síncrono, sem runtime assíncrono novo). A lógica fica em funções puras testáveis (PKCE, URLs, análise do retorno, corpo da troca) e em interfaces de transporte e de cofre substituíveis por simulações nos testes.
6. **Fila persistente:** gravações pendentes ficam em IndexedDB (web e WebView2) com os bytes `.enzitag`, o nome, a ligação e a versão base. A retomada exige ação do usuário na web (o token expira) e é automática ao conectar no Windows. **A fila nunca sobrescreve**: reaproveita a regra de versão e cópia em conflito da DT-0025. Limite de itens e de bytes, com aviso.
7. **Abrir compartilhado no Windows:** com `drive.file` só o Picker concede acesso a arquivo de terceiros. O Picker será carregado **sob demanda** (somente após clicar em «Abrir do Drive»), com `script-src` ampliado apenas para os hosts do Google durante essa ação. Se a verificação real mostrar que o WebView2 não o suporta, a alternativa registrada é abrir o Picker no navegador do sistema e devolver o identificador pelo mesmo receptor em loopback.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Fluxo de dispositivo (device code) | O Google não o permite para o escopo `drive.file` |
| Servidor intermediário próprio | Contraria «sem servidor do EnziTAG» |
| Token de atualização em arquivo criptografado | O cofre do sistema já atende e evita gestão de chave |
| `reqwest` assíncrono | Traz runtime e árvore de dependências maiores sem benefício para poucas requisições |
| Escopo `drive` completo | Contraria a decisão aprovada e a política de privacidade |

## Critérios e evidências

A confirmar na T02: licenças das dependências compatíveis com MIT/Apache, tamanho do executável, nenhuma requisição externa antes de conectar, testes com Google simulado (receptor, PKCE, `state` inválido, tempo esgotado, token revogado, cofre indisponível) e verificação real do usuário.

## Consequências

O Windows passa a ter paridade funcional com a web. O segredo do cliente desktop precisa estar disponível na compilação da candidata; sem ele o botão de conexão explica a indisponibilidade em vez de falhar. Contas reais continuam necessárias para o aceite completo.
