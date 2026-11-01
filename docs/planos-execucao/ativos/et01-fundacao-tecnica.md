# ET01 — Fundação técnica e contratos iniciais

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F00 |
| Marco | Prepara M1 |
| Depende de | Documentação aprovada |
| Módulos | C01, C02, C19, E01, E03, E04, U12, U17, U18 (estruturas iniciais) |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Transformar as áreas reservadas em `app/` em código real que compila nas duas plataformas, com versões fixadas, contratos tipados entre Rust e TypeScript e verificação automatizada. Ao final, a interface obtém do motor uma resposta tipada (versão do motor, versão do protocolo e capacidades) pelo Worker WASM no navegador e por comando Tauri no Windows.

Esta etapa **não entrega método científico**.

## 2. Escopo

**Inclui**

- Ferramentas locais, versões fixadas e registro das dependências com licença e compatibilidade WASM.
- Workspace Cargo com `optima-core`, `optima-project`, `optima-engine`, `optima-wasm` e o pacote Tauri.
- Frontend React/TypeScript em `app/web` com a estrutura de pastas do [mapa de módulos](../../arquitetura/mapa-modulos.md).
- Contrato mínimo versionado: solicitação, resposta, erro codificado e capacidades; geração dos tipos TypeScript a partir do Rust.
- Adaptadores WASM (Worker) e Tauri (comando fora da thread da interface) atrás de um único `EngineClient`.
- Esqueleto de idiomas (`pt-BR`, `en`) e de temas (tokens + três temas, Soft Light padrão).
- CI no GitHub Actions; modelo de pull request; verificação de links da documentação.
- Guia de ambiente de desenvolvimento com comandos efetivamente executados.

**Não inclui**

- Estatística descritiva, tabelas de dados e fluxo guiado (ET02).
- Formato `.enzitag`, abrir/salvar (ET03).
- Instalador publicado, atualizador e GitHub Pages (ET10).

## 3. Entradas e referências

- [Roteiro do produto — F00](../roteiro-produto.md#f00--preparação-e-contratos-iniciais) e [regras de arquitetura](../roteiro-produto.md#2-arquitetura-e-fronteiras).
- [Mapa de módulos e contratos](../../arquitetura/mapa-modulos.md) e [estrutura do repositório](../../arquitetura/estrutura-repositorio.md).
- [Temas](../../temas/README.md) e [adaptação do Soft Light](../../temas/adaptacao-soft-light.md).
- [Convenções](../../convencoes/README.md).
- Pendência resolvida nesta etapa: PD-01 (versões e dependências), na parte da base técnica.

## 4. Decisões técnicas a registrar

Cada linha gera uma DT em [`docs/decisoes-tecnicas/`](../../decisoes-tecnicas/README.md) antes do código que depende dela. Candidatos são pontos de partida da avaliação, não escolhas feitas.

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Toolchain | Versões de Rust, edição, Node e gerenciador de pacotes JS | Rust estável fixado em `rust-toolchain.toml`, edição 2024; Node LTS; npm ou pnpm | Reprodutibilidade em Windows e CI, suporte do Tauri 2 |
| Ferramentas web | Bundler, testes, E2E, lint/formatação | Vite; Vitest; Playwright; ESLint + Prettier ou Biome | Suporte a Worker e WASM, velocidade, manutenção |
| Build WASM | Geração do pacote WASM e carregamento no Worker | wasm-bindgen com wasm-pack ou chamada direta ao `wasm-bindgen` CLI | Situação de manutenção atual, integração com Vite, tamanho |
| Contrato e serialização | Formato de transporte e geração de tipos TS | JSON via serde; `serde-wasm-bindgen`; ts-rs, specta, tsify ou typeshare | Enums com dados, campos opcionais, mesma serialização nos dois transportes |
| Workspace JS | Onde ficam `package.json` e a CLI do Tauri | Apenas `app/web/package.json`, ou workspace em `app/` | Simplicidade, scripts únicos para web e desktop |
| Fontes | Distribuição das fontes dos temas | Arquivos locais empacotados (Host Grotesk, Instrument Sans, Geist, EB Garamond) | Funcionamento offline no Windows, licenças |

## 5. Tarefas

### 5.1 Ambiente e versões

- [ ] **T01** *(parcial: inventário em Linux feito, ver seção 11; Windows 11 pendente)* — Inventariar no Windows 11 de desenvolvimento: Git, rustup, alvo `wasm32-unknown-unknown`, Node, pré-requisitos do Tauri 2 (ferramentas de compilação C++ da Microsoft e WebView2). Registrar versões encontradas.
- [x] **T02** — Registrar DTs de toolchain e ferramentas web; criar `rust-toolchain.toml` na raiz, versão de Node (`.nvmrc` ou `engines`) e lockfiles.
- [x] **T03** — Verificar a situação de manutenção das ferramentas WASM e do Tauri 2 na data da execução; registrar na DT de build WASM.
- [x] **T04** — Criar [`docs/arquitetura/dependencias.md`](../../arquitetura/dependencias.md): dependência, versão, papel, licença, compatibilidade WASM e módulo consumidor.

### 5.2 Pacotes Rust

- [x] **T05** — Criar `app/Cargo.toml` (workspace) com metadados comuns (licença MIT, edição, versão `0.1.0`), perfis e lints de workspace; `unsafe` proibido no core.
- [x] **T06** — Criar `optima-core` com `lib.rs` pequeno, `domain/` inicial (identificadores e tipos básicos de C01), `validation/issues.rs` (C02: código, severidade, parâmetros) e `registry/`, `errors.rs`, `provenance.rs` iniciais (C19).
- [x] **T07** — Criar `optima-project` com versão de esquema e documento mínimo vazio (sem formato de arquivo ainda).
- [x] **T08** — Criar `optima-engine` (E01): `request.rs`, `response.rs`, `dispatch.rs`, `capabilities.rs`; operação `engine.info` retorna versão do motor, versão do protocolo e lista de capacidades (vazia de métodos científicos).
- [x] **T09** — Criar `optima-wasm` (E03): `lib.rs`, `conversion.rs`, `errors.rs`; uma função exportada recebe a solicitação e devolve a resposta do engine, sem lógica própria.
- [x] **T10** — Testes Rust: serialização ida e volta dos contratos, erro de versão de protocolo incompatível e resposta de `engine.info`.

### 5.3 Contrato TypeScript

- [x] **T11** — Gerar `app/web/src/services/engine/contracts.generated.ts` a partir do Rust; script de geração; verificação na CI que falha se o arquivo gerado estiver desatualizado.
- [x] **T12** — Criar `EngineClient.ts` (interface única), `wasmClient.ts` + `workers/engine.worker.ts` e `tauriClient.ts`; detecção do ambiente; cada solicitação leva ID de tarefa.

### 5.4 Interface e plataformas

- [x] **T13** — Criar `app/web` com `src/main.tsx`, `src/app/App.tsx` pequeno e as pastas `features/`, `services/`, `state/`, `workers/`, `i18n/`, `themes/` conforme o mapa (somente arquivos com conteúdo real).
- [x] **T14** — Tela provisória mostra a resposta de `engine.info` e o ambiente (navegador ou Windows); seletores de idioma e tema funcionais.
- [x] **T15** — Esqueleto de idiomas (U17): biblioteca escolhida em DT ([DT-0006](../../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md)), `i18n/locales/{pt-BR,en}/common.json`, detecção do idioma do sistema no primeiro acesso, preferência persistida, teste que acusa chave ausente em um dos idiomas.
- [x] **T16** — Esqueleto de temas (U18): `themes/tokens.css` com variáveis semânticas, `soft-light.css`, `modern-dark.css`, `professional.css`; Soft Light padrão; preferência por dispositivo; fontes locais; respeito a `prefers-reduced-motion`.
- [x] **T17** — Criar `app/desktop/src-tauri` (E04): configuração Tauri 2 com permissões mínimas, `src/lib.rs`, `src/main.rs`, `src/commands.rs` com comando que chama `optima-engine` fora da thread da interface.

### 5.5 Verificação automatizada e documentação

- [x] **T18** *(execução verde dos jobs Linux: run 41315900780; o job Windows é discutido na seção 11)* — GitHub Actions: formatação, Clippy com avisos como erro, testes Rust, build WASM, verificação de tipos, lint, testes e build web, tipos gerados atualizados e links da documentação. Build Windows do Tauri apenas em `main`, etiquetas e disparo manual.
- [x] **T19** — Criar `.github/pull_request_template.md` com referência à etapa, tarefas, critérios atendidos e documentação atualizada.
- [x] **T20** — Criar [`docs/guias/ambiente-desenvolvimento.md`](../../guias/ambiente-desenvolvimento.md) e atualizar "Como executar" no README somente com comandos executados com sucesso.
- [x] **T21** — Fichas em [`docs/modulos/`](../../modulos/README.md) para E01, E03, E04 e U12 (estrutura inicial); atualizar o [mapa](../../arquitetura/mapa-modulos.md) se algum nome mudar.
- [ ] **T22** *(pendente: requer Windows 11; ver seção 11)* — Clone limpo no Windows 11: executar o guia do zero e registrar o resultado no registro de progresso.

## 6. Entregas

- Workspace Rust e frontend reais, compilando.
- Contrato `engine.info` transportado por WASM/Worker e por Tauri.
- Tipos TypeScript gerados e verificados.
- CI verde no pull request da etapa.
- DTs da etapa, `dependencias.md`, guia de ambiente e fichas iniciais.

## 7. Critérios de conclusão

1. Em um clone limpo no Windows 11 de 64 bits, os comandos do guia compilam e testam os pacotes Rust, geram o WASM, constroem o frontend e abrem o aplicativo Tauri.
2. No navegador (Chrome, Edge e Firefox atuais) e no Windows, a tela provisória exibe a mesma resposta de `engine.info`, em PT e EN, nos três temas.
3. Alterar um contrato Rust sem regenerar os tipos faz a CI falhar.
4. Solicitação com versão de protocolo incompatível retorna erro codificado, não exceção genérica.
5. Cada dependência adotada consta em `dependencias.md` com papel e licença compatível com MIT.
6. Nenhum cálculo científico implementado; README não promete funcionalidade inexistente.

## 8. Verificação

- Testes Rust dos contratos (T10) e testes web do `EngineClient` com transporte simulado.
- Teste E2E mínimo no navegador abrindo a tela provisória.
- Execução manual do aplicativo Windows registrada com data e versão do sistema.
- Links da documentação verificados na CI.

## 9. Documentação a criar ou atualizar

- `docs/decisoes-tecnicas/dt-NNNN-*.md` da seção 4 e [índice das DTs](../../decisoes-tecnicas/README.md).
- `docs/arquitetura/dependencias.md` (novo) e [estrutura do repositório](../../arquitetura/estrutura-repositorio.md), marcando o que passou a existir.
- `docs/guias/ambiente-desenvolvimento.md` (novo) e README (seção de execução).
- Fichas `docs/modulos/e01-*.md`, `e03-*.md`, `e04-*.md`, `u12-*.md`.
- `app/**/README.md` das áreas que deixarem de ser apenas reservadas.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Pré-requisitos do Tauri no Windows | Seguir a documentação oficial vigente e registrar passos reais no guia |
| Mudança de manutenção das ferramentas WASM | T03 antes de adotar; versões fixadas |
| Geração de tipos com limitações em enums | Testar enums com dados e campos opcionais antes da DT |
| Cota de minutos da CI em repositório privado | Windows fora do fluxo de cada push |

## 11. Registro de progresso

### Estado atual (retomada)

| Item | Valor |
|---|---|
| Branch | `claude/epic-keller-3ad7jc` (PR [#1](https://github.com/VitorMazziero/enzitag-optima/pull/1) para `main`, rascunho) |
| Etapa e tarefa | ET01 em andamento; pendentes **T01** (inventário Windows 11) e **T22** (clone limpo no Windows 11) e a execução do aplicativo no Windows (critérios 1 e 2). Evidência parcial na CI: build NSIS no Windows concluído; verificação nativa com WebView2 em diagnóstico |
| Código entregue | Workspace Rust (`optima-core`, `-project`, `-engine`, `-wasm`), interface React/TypeScript, pacote Tauri, scripts, CI |
| Próxima ação | Resolver `DevToolsActivePort` do msedgedriver no job `desktop-windows` (diagnóstico em andamento) e/ou obter a execução em um Windows 11 real. A ET02 avança em paralelo (exceção registrada no [índice](../README.md)) |
| Windows (CI) | na [execução 41334658975](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41334658975) (disparo manual, commit `492db19`) o job `desktop-windows` passou em `windows-latest` — Microsoft Windows Server 2025 Datacenter, build 26100, 64 bits: build NSIS e verificação nativa por WebView2/CDP com `native-checks.mjs` (`engine.info`, descritiva, `.enzitag` e adulteração, XLSX, regressão NIST, quantil t, comparação de tratamentos, planejamento e análise). **Não é Windows 11 de usuário**, sem diálogos nativos e sem clone limpo pelo guia: a evidência literal em Windows 11 segue pendente e a etapa continua aberta. |

### Evidências (2026-11-01)

Ambiente: Linux (Ubuntu 24.04, kernel 6.18), Rust 1.97.0, Node 22.23.4, npm 10.9.9, Python 3.13.18; Chromium 1248 e Firefox 157.0 do Playwright 1.64.1; WebKitGTK 2.52.6.

| Verificação | Comando | Resultado |
|---|---|---|
| Formatação Rust | `cargo fmt --all --check` (em `app/` e em `app/desktop/src-tauri/`) | sem diferenças |
| Lint Rust | `cargo clippy --workspace --all-targets -- -D warnings` (e no pacote Tauri) | sem avisos |
| Testes Rust | `cargo test --workspace` | 36 testes passam (core 19, engine 6 de protocolo + 8 de exportação de tipos, project 2…) |
| WASM | `npm run build:wasm` | `optima_wasm_bg.wasm` de 149 569 bytes; versão do CLI igual à do lock |
| Contratos TS | `npm run check:contracts` | atualizado; com um comentário de documentação alterado no Rust, o comando falha com código 1 (critério 3) |
| Lint, tipos | `npm run lint`, `npm run typecheck` | sem erros |
| Testes web | `npm test` | 47 testes passam (cliente, i18n, componente, contraste dos três temas) |
| E2E (WASM real em Worker) | `E2E_BROWSERS=chromium,firefox npm run test:e2e` | 14 de 14 passam |
| Inspeção visual | capturas dos três temas em `app/web/test-results/` (não versionadas) | fontes, cores e layout conforme as referências |
| Nativo (Tauri) | `xvfb-run -a node tests/native-smoke.mjs src-tauri/target/debug/optima-desktop` | `engine.info` do motor nativo obtido pela interface: versão 0.1.0, protocolo 1 |
| Links e versões | `node scripts/check-docs-links.mjs`, `node scripts/check-versions.mjs` | 384 links ok; versão única 0.1.0 |

### Registro por tarefa

| Tarefa | Registro |
|---|---|
| ET01-T01 | Linux: Git, `rustup` 1.28.2, Rust 1.97.0, Node 22.23.4, npm 10.9.9, pnpm 10.28.0, Python 3.13.18; alvo WASM instalado; WebKitGTK instalado via `apt`. **Windows 11 não inventariado** (ambiente da sessão é Linux) |
| ET01-T02, T03 | DT-0003 a DT-0006. As DTs foram redigidas depois do código correspondente, ainda dentro desta etapa e antes de qualquer outro código depender delas; a ordem do plano ("DT antes do código") não foi seguida e fica registrada aqui. Manutenção das ferramentas conferida em crates.io (wasm-bindgen 0.2.130, wasm-pack 0.15.1, Tauri 2.12.5) |
| ET01-T04 | `docs/arquitetura/dependencias.md` |
| ET01-T05 a T10 | Commit `feat(et01): add Rust workspace…`. `optima-wasm` só tem `lib.rs` (sem `conversion.rs`/`errors.rs`), justificado em [E03](../../modulos/e03-adaptador-wasm.md) |
| ET01-T11 a T16 | Commit `feat(et01): add React/TypeScript frontend…`. A biblioteca de i18n é `i18next` |
| ET01-T17 | Pacote Tauri em workspace próprio ([DT-0004](../../decisoes-tecnicas/dt-0004-pacote-tauri-workspace-proprio.md)); compilado e executado em Linux, **não** em Windows |
| ET01-T18 | `.github/workflows/ci.yml` com jobs docs, rust, web, desktop-linux e desktop-windows (este só em `main`, etiquetas e disparo manual). Execução [41315900780](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41315900780) (disparo manual, commit `07ed926`, runner `ubuntu-24.04`): **docs, rust, web (E2E em Chromium e Firefox) e Tauri/Linux (clippy, build e verificação nativa sob Xvfb) verdes**. Desktop-windows (`windows-latest`, WebView2 155.0.4283.62): `npm ci`, instalação do `wasm-bindgen-cli` e **`tauri build` com instalador NSIS concluídos**; `tauri-driver` + `msedgedriver` instalados; a verificação nativa **falhou** com `session not created: DevToolsActivePort file doesn't exist` (o WebView2 não abriu sob o msedgedriver). Uma execução com diagnóstico foi disparada (commit `76ce194`) |
| ET01-T19 a T21 | Modelo de PR, guia de ambiente e quatro fichas de módulo |
| ET01-T22 | **Pendente**: nenhum Windows 11 disponível nesta sessão; a CI usa `windows-latest`, que não é Windows 11 de desenvolvimento nem substitui o clone limpo previsto |

## 12. Desvios e descobertas

- **DTs após o código** (ver T02/T03 acima).
- **Playwright 1.64.1 exigiu um Chromium diferente do pré-instalado** (build 1248); foi instalado pelo próprio `playwright install`.
- **Rótulo de ambiente**: o texto "Windows (Tauri…)" apareceria também no Tauri em Linux; passou a "Aplicativo desktop (Tauri, motor nativo)".
- **O verificador de links encontrou uma âncora quebrada** na ET03 (cabeçalho com código inline) que o verificador provisório anterior não detectava; o script versionado trata o caso.
- **Primeira CI falhou em dois jobs** por configuração (runner `ubuntu-latest` passou a 26.04, onde `webkit2gtk-driver` foi renomeado; `beforeBuildCommand` do Tauri usava `../../web` a partir de `app/desktop`). Corrigido com `ubuntu-24.04` fixo e `../web`; o `tauri build` local passou a funcionar de ponta a ponta.
- **`wasm-pack` ativo**: não foi adotado por escolha de simplicidade, não por abandono (DT-0003).
