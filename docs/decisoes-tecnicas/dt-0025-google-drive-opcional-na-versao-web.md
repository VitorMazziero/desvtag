# DT-0025 — Google Drive opcional na versão web (ET19)

| Campo | Valor |
|---|---|
| Estado | Aceita (parcial: versão web; Windows adiado) |
| Data | 2026-11-02 |
| Origem | [ET19](../planos-execucao/ativos/et19-google-drive-e-compartilhamento.md); decisões aprovadas (Drive opcional, pasta visível, escopo `drive.file`); PD-09 e PD-10 |
| Pendências relacionadas | PD-09 (credenciais públicas e fluxo nativo), PD-10 (conflitos) |
| Substitui / substituída por | — |

## Contexto

O usuário criou o projeto do Google Cloud `enzitag-optima` (número `618382101076`), publicou o aplicativo («Em produção», escopo `drive.file`) e registrou a [política de privacidade](../privacidade.md). Os identificadores são públicos e ficam em `app/web/src/services/drive/config.ts`: cliente web `618382101076-3vjbr6s9kapl89l1gd88p3gm7afadm8p.apps.googleusercontent.com`, chave de API do Picker (restrita por referenciador a `vitormazziero.github.io` e `127.0.0.1:4173` e à API do Picker) e cliente desktop `618382101076-rlh612fn12o9c03cjp09eb0eo5igqldu.apps.googleusercontent.com`. O **segredo do cliente desktop** está só no segredo do GitHub `GOOGLE_DESKTOP_CLIENT_SECRET` e **nunca** no repositório.

## Decisões

### 1. Escopo e pasta

Somente `https://www.googleapis.com/auth/drive.file`: o aplicativo enxerga os arquivos que ele criou e os que o usuário escolhe no **Google Picker**. Os projetos ficam na pasta visível **«EnziTAG Optima»** (criada na primeira gravação) do Drive do usuário. Os bytes são os do `.enzitag` local.

### 2. Autorização na versão web: Google Identity Services, fluxo de token

`google.accounts.oauth2.initTokenClient` com o cliente web, sem segredo e **sem token de atualização**. O token de acesso (≈ 1 h) fica **só na memória da página**; ao vencer, um novo pedido (que o navegador pode exibir como janela do Google, sempre a partir de um clique do usuário) renova a autorização. **Os scripts do Google (`accounts.google.com/gsi/client` e `apis.google.com/js/api.js`) só são carregados quando o usuário clica em «Conectar»** ou «Abrir do Drive»: antes disso, nenhuma requisição externa é feita. «Desconectar» revoga o token (`oauth2.revoke`).

### 3. Conflitos e perda de dados (PD-10)

A API do Drive não oferece bloqueio nem transação, então **nada além do que se verifica é prometido**. Antes de atualizar um arquivo, o aplicativo lê a **versão** (campo `version`, monotônico) e compara com a da última leitura ou gravação feita por ele. Se **mudou**, o arquivo remoto **não é sobrescrito**: o conteúdo local vai para uma **cópia** na mesma pasta («Projeto (cópia local AAAA-MM-DD HHhMM).enzitag») e a tela informa. Arquivo apagado ou na lixeira: cria-se um novo, sem perder o trabalho local. Depois de gravar, confere-se que o **tamanho** devolvido pelo Drive é o enviado. Não há fila persistente: uma falha de rede ou autorização **não marca o projeto como salvo**, mantém o trabalho no aplicativo (e na recuperação automática local) e permite tentar de novo.

### 4. Erros

Os erros viram códigos tipados (`auth`, `permission`, `quota`, `rateLimit`, `notFound`, `network`, `unknown`) com mensagens em português e inglês. **O Drive nunca impede o uso local**: salvar e abrir arquivos no computador seguem independentes.

### 5. Windows (Tauri): adiado

O Google exige, para aplicativo instalado, o fluxo **navegador do sistema + redirecionamento em loopback + PKCE** (RFC 8252) com troca do código no servidor de tokens, e guarda do token de atualização no cofre de credenciais do Windows. Isso exige código novo e dependências no lado Rust e **uma conta real para verificar**; a CSP do aplicativo Windows também bloqueia os scripts do Google (de propósito). **Nesta versão o painel do Drive não aparece no Windows**, que mostra uma nota. O cliente desktop e o segredo já existem para a ET19 futura (lembrar: o segredo entra na compilação por variável de ambiente do CI, nunca no repositório).

### 6. Abrir compartilhado

Com `drive.file`, abrir um arquivo de outra pessoa exige que ela o compartilhe e que o usuário o escolha no Picker; o aplicativo abre pelo Picker qualquer arquivo escolhido e, **se não houver permissão de edição, a gravação falha com `permission`** (a tela explica) e o usuário salva como cópia no próprio Drive. Não há edição simultânea.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Escopo `drive` completo | Dá acesso a todo o Drive; contraria a decisão aprovada e a política de privacidade |
| Fluxo de código com servidor próprio | Contraria «sem servidor do EnziTAG»; o fluxo de token do GIS basta na web |
| Guardar o token em `localStorage` | Persistiria uma credencial no navegador; o custo é um clique a cada hora |
| Sobrescrever e confiar na última gravação | Perderia alterações de outra pessoa sem aviso |

## Evidências

`drive.test.ts` e `webAuth.test.ts` (Drive e GIS simulados: pasta única, criação e atualização, conflito sem sobrescrever, arquivo apagado ou na lixeira, 401, 403 de cota, permissão e limite, 429, rede, token com renovação e revogação, escopo exato); `drive-flow.spec.ts` (E2E em Chromium e Firefox com o Google simulado: nenhuma requisição antes de conectar, criar, atualizar, conflito, abrir pelo Picker, desconectar, falhas sem afetar o trabalho local). **Não verificado:** a autorização real com a conta do usuário (consentimento, expiração, revogação, permissão de arquivo compartilhado, duas cópias reais concorrentes) e o aplicativo Windows.
