# ET19 — Google Drive e compartilhamento inicial

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F11 |
| Marco | Prepara M5 |
| Depende de | ET14; **credenciais OAuth do usuário (PD-09)**. Pode correr em paralelo às ET15–ET18 ([plano da v0.3 §3](../plano-v0.3.md#3-etapas-e-ordem)) |
| Módulos | U14 (`services/drive/*`, `features/drive/*`), U15 (`features/sharing/{OpenShared}`), U13 (armazenamento), E04 (`auth.rs` no Tauri), P02 (bytes `.enzitag`) |
| Ativado em | — |
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

- [ ] **T01** — **Usuário:** criar projeto no Google Cloud, tela de consentimento, clientes web e desktop e origens; informar só os identificadores públicos (sem segredos no repositório). Registrar PD-09.
- [ ] **T02** — DTs (§4), com teste do comportamento real da API para conflitos antes de escolher.
- [ ] **T03** — Autorização web e desktop; desconexão e revogação.
- [ ] **T04** — Cliente do Drive: pasta visível, abrir, salvar, salvar como, metadados; mesmos bytes `.enzitag`.
- [ ] **T05** — Fila de sincronização, retomada, detecção de divergência e diálogo de conflito com cópia preservada.
- [ ] **T06** — Abrir compartilhado (leitura) e criar cópia; respeito à permissão.
- [ ] **T07** — Interface: estado de conexão, indicadores de recuperação/arquivo/nuvem, mensagens PT/EN, temas e axe.
- [ ] **T08** — Verificação com contas reais (web e Windows 10): primeira conexão, expiração, desconexão, leitura, escrita, falta de permissão, duas cópias concorrentes e preservação de dados; documentação.

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

## 12. Desvios e descobertas

Nenhum até o momento.
