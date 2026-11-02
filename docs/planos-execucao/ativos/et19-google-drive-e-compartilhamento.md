# ET19 — Google Drive e compartilhamento inicial

| Campo | Valor |
|---|---|
| Estado | **Ativo** (versão web entregue com Google simulado; autorização real e Windows pendentes) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F11 |
| Marco | Prepara M5 |
| Depende de | ET14; **credenciais OAuth do usuário (PD-09)**. Pode correr em paralelo às ET15–ET18 ([plano da v0.3 §3](../plano-v0.3.md#3-etapas-e-ordem)) |
| Módulos | U14 (`services/drive/*`, `features/drive/*`), U15 (`features/sharing/{OpenShared}`), U13 (armazenamento), E04 (`auth.rs` no Tauri), P02 (bytes `.enzitag`) |
| Ativado em | 2026-11-02 |
| Concluído em | — |

## 1. Objetivo

Permitir, **de forma opcional**, abrir e salvar projetos `.enzitag` no Google Drive do usuário (web e Windows), numa pasta visível «EnziTAG Optima», com escopo `drive.file`, e abrir projetos compartilhados em leitura ou como cópia, **sem perder alterações** em conflitos e sem impedir o salvamento local.

## 2. Escopo

**Inclui**

- Projeto OAuth com clientes web (GitHub Pages) e desktop (fluxo de aplicativo instalado com navegador do sistema e PKCE), escopo `drive.file` e seleção explícita de arquivos (Google Picker na web).
- Abrir, salvar, salvar como, pasta visível; os mesmos bytes `.enzitag` do arquivo local.
- Fila de sincronização, retomada após erro, revisão remota divergente detectada (versão do arquivo no Drive), cópia preservada em conflito e escolha do usuário.
- Abrir compartilhado em leitura e criar cópia; edição apenas com permissão, sem edição simultânea implícita.
- Estados separados: recuperação local, arquivo e nuvem; salvamento local continua com autorização revogada, quota excedida ou rede ausente.

**Não inclui**

- Edição simultânea (especificação na ET20).
- Comentários (ET20).
- Outros provedores de nuvem.

## 3. Entradas e referências

- [Roteiro F11](../roteiro-produto.md#f11--google-drive-e-compartilhamento-inicial); [decisões aprovadas](../../produto/decisoes-aprovadas.md) (Drive opcional, pasta visível, `drive.file`, nunca exigir login local).
- Documentação oficial da API do Google Drive v3, Google Identity Services e OAuth 2.0 para aplicativos instalados (RFC 8252, PKCE RFC 7636).
- Pendências: **PD-09** (credenciais públicas, origens e fluxo nativo), **PD-10** (conflitos e gravações concorrentes).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Fluxo no desktop | Como autorizar no Tauri? | Navegador do sistema + redirecionamento em loopback + PKCE; esquema de URL próprio | Segurança (RFC 8252), simplicidade, sem segredo no binário |
| Guarda do token | Onde guardar o token no Windows e na web? | Cofre do Windows (Credential Manager); memória na web com nova autorização ao expirar | Segurança, experiência, revogação |
| Conflitos (PD-10) | Como evitar perder alterações concorrentes? | Pré-condição por versão/`etag` antes de gravar; revisões imutáveis com referência corrente | Comportamento real da API, verificado antes da escolha |

## 5. Tarefas

- [x] **T01** — **Usuário (feito em 2026-11-02):** projeto `enzitag-optima` (618382101076), tela de consentimento externa «Em produção» com `drive.file`, clientes web e desktop, chave do Picker restrita e política de privacidade ([PR #7](https://github.com/VitorMazziero/enzitag-optima/pull/7)); segredo desktop no segredo do GitHub. Identificadores públicos em `services/drive/config.ts`.
- [x] **T02** — [DT-0025](../../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md). *O comportamento real da API para conflitos não foi testado com conta real;* a decisão usa o campo `version` do Drive.
- [~] **T03** — Autorização **web** (GIS e Picker, token em memória, revogação) entregue e testada com Google simulado. **Windows (loopback + PKCE + cofre de credenciais) não entregue.**
- [x] **T04** — `services/drive/client.ts`: pasta visível, listar, metadados, baixar e criar/atualizar por multipart, com os mesmos bytes `.enzitag`.
- [~] **T05** — Detecção de divergência por versão e cópia em conflito entregues (`sync.ts`). **Sem fila persistente nem retomada automática**: a falha mantém o trabalho e permite repetir.
- [~] **T06** — Abrir pelo Picker entregue; **sem teste de arquivo compartilhado de verdade** (a gravação sem permissão devolve `permission`).
- [x] **T07** — `DrivePanel` na barra do projeto (versão web): conectar, abrir, salvar, desconectar, mensagens PT/EN; no Windows, nota informando que ainda não há Drive.
- [ ] **T08** — **Pendente (depende do usuário):** verificação com contas reais (primeira conexão, expiração, revogação, leitura, escrita, falta de permissão, duas cópias concorrentes). Testes automáticos com Google simulado entregues (unidade e E2E).

## 6. Entregas

Drive opcional em web e Windows, pasta visível, abrir compartilhado e criar cópia, conflitos sem perda.

## 7. Critérios de conclusão

1. Fluxos reais autorizados em web e Windows 10 verificados nos casos do roteiro (T08).
2. Nenhuma alteração perdida em gravações concorrentes; a cópia em conflito é preservada e visível.
3. Sem segredos no repositório nem no binário; salvamento local funciona com o Drive indisponível.
4. Configuração pendente não bloqueia as demais etapas.

## 8. Verificação

Testes com API simulada (vitest), E2E com o Drive simulado nos quatro navegadores e verificação manual registrada com contas reais (web e Windows 10).

## 9. Documentação a criar ou atualizar

DTs, guia «Usar o Google Drive», política de privacidade (dados acessados, escopo), fichas U13–U15 e E04, mapa de módulos, matriz de cobertura (F11), decisões pendentes (PD-09, PD-10), CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Verificação do aplicativo pelo Google para o escopo | `drive.file` é escopo não restrito; manter a tela de consentimento simples; registrar o estado da verificação |
| Credenciais ainda não criadas | Etapa em paralelo; módulos locais não esperam |
| API sem bloqueio transacional | Pré-condição por versão e cópia em conflito; não prometer bloqueio |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Aguarda credenciais OAuth do usuário (PD-09). Etapa não iniciada. |
| 2026-11-02 | **Ativada.** Credenciais criadas pelo usuário. Entregue: cliente da API, sincronização com conflito sem sobrescrever, autorização web (GIS e Picker) e painel, testados com Google simulado (15 testes de unidade; E2E em Chromium e Firefox). **Pendentes:** verificação com conta real, Windows (loopback + PKCE), fila persistente, arquivo compartilhado real. |

## 12. Desvios e descobertas

Nenhum até o momento.
