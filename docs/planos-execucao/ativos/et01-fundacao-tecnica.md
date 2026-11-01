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

- [ ] **T01** — Inventariar no Windows 11 de desenvolvimento: Git, rustup, alvo `wasm32-unknown-unknown`, Node, pré-requisitos do Tauri 2 (ferramentas de compilação C++ da Microsoft e WebView2). Registrar versões encontradas.
- [ ] **T02** — Registrar DTs de toolchain e ferramentas web; criar `rust-toolchain.toml` na raiz, versão de Node (`.nvmrc` ou `engines`) e lockfiles.
- [ ] **T03** — Verificar a situação de manutenção das ferramentas WASM e do Tauri 2 na data da execução; registrar na DT de build WASM.
- [ ] **T04** — Criar `docs/arquitetura/dependencias.md`: dependência, versão, papel, licença, compatibilidade WASM e módulo consumidor.

### 5.2 Pacotes Rust

- [ ] **T05** — Criar `app/Cargo.toml` (workspace) com metadados comuns (licença MIT, edição, versão `0.1.0`), perfis e lints de workspace; `unsafe` proibido no core.
- [ ] **T06** — Criar `optima-core` com `lib.rs` pequeno, `domain/` inicial (identificadores e tipos básicos de C01), `validation/issues.rs` (C02: código, severidade, parâmetros) e `registry/`, `errors.rs`, `provenance.rs` iniciais (C19).
- [ ] **T07** — Criar `optima-project` com versão de esquema e documento mínimo vazio (sem formato de arquivo ainda).
- [ ] **T08** — Criar `optima-engine` (E01): `request.rs`, `response.rs`, `dispatch.rs`, `capabilities.rs`; operação `engine.info` retorna versão do motor, versão do protocolo e lista de capacidades (vazia de métodos científicos).
- [ ] **T09** — Criar `optima-wasm` (E03): `lib.rs`, `conversion.rs`, `errors.rs`; uma função exportada recebe a solicitação e devolve a resposta do engine, sem lógica própria.
- [ ] **T10** — Testes Rust: serialização ida e volta dos contratos, erro de versão de protocolo incompatível e resposta de `engine.info`.

### 5.3 Contrato TypeScript

- [ ] **T11** — Gerar `app/web/src/services/engine/contracts.generated.ts` a partir do Rust; script de geração; verificação na CI que falha se o arquivo gerado estiver desatualizado.
- [ ] **T12** — Criar `EngineClient.ts` (interface única), `wasmClient.ts` + `workers/engine.worker.ts` e `tauriClient.ts`; detecção do ambiente; cada solicitação leva ID de tarefa.

### 5.4 Interface e plataformas

- [ ] **T13** — Criar `app/web` com `src/main.tsx`, `src/app/App.tsx` pequeno e as pastas `features/`, `services/`, `state/`, `workers/`, `i18n/`, `themes/` conforme o mapa (somente arquivos com conteúdo real).
- [ ] **T14** — Tela provisória mostra a resposta de `engine.info` e o ambiente (navegador ou Windows); seletores de idioma e tema funcionais.
- [ ] **T15** — Esqueleto de idiomas (U17): biblioteca escolhida em DT, `i18n/locales/{pt-BR,en}/common.json`, detecção do idioma do sistema no primeiro acesso, preferência persistida, teste que acusa chave ausente em um dos idiomas.
- [ ] **T16** — Esqueleto de temas (U18): `themes/tokens.css` com variáveis semânticas, `soft-light.css`, `modern-dark.css`, `professional.css`; Soft Light padrão; preferência por dispositivo; fontes locais; respeito a `prefers-reduced-motion`.
- [ ] **T17** — Criar `app/desktop/src-tauri` (E04): configuração Tauri 2 com permissões mínimas, `src/lib.rs`, `src/main.rs`, `src/commands.rs` com comando que chama `optima-engine` fora da thread da interface.

### 5.5 Verificação automatizada e documentação

- [ ] **T18** — GitHub Actions: formatação, Clippy com avisos como erro, testes Rust, build WASM, verificação de tipos, lint, testes e build web, tipos gerados atualizados e links da documentação. Build Windows do Tauri apenas em `main`, etiquetas e disparo manual.
- [ ] **T19** — Criar `.github/pull_request_template.md` com referência à etapa, tarefas, critérios atendidos e documentação atualizada.
- [ ] **T20** — Criar `docs/guias/ambiente-desenvolvimento.md` e atualizar "Como executar" no README somente com comandos executados com sucesso.
- [ ] **T21** — Fichas em `docs/modulos/` para E01, E03, E04 e U12 (estrutura inicial); atualizar o [mapa](../../arquitetura/mapa-modulos.md) se algum nome mudar.
- [ ] **T22** — Clone limpo no Windows 11: executar o guia do zero e registrar o resultado no registro de progresso.

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

| Data | Registro |
|---|---|
| 2026-11-01 | Plano criado e ativado. Nenhuma tarefa iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
