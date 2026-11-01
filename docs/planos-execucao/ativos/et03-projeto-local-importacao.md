# ET03 — Projeto local, importação e recuperação

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F02 |
| Marco | **M1 — Base utilizável** |
| Depende de | ET02 (código concluído; evidência Windows 11 pendente, ver [exceção](../README.md)) |
| Módulos | P01–P03, C01–C02, E01, E04 (`files`), U01 (recentes), U03–U05, U11, U13 |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Persistir o trabalho com segurança: projeto `.enzitag` com vários experimentos, revisões dos dados e análises vinculadas; abrir, salvar e reabrir entre Windows e navegador; importar dados de digitação, colagem, CSV, XLSX e matrizes externas; recuperar a sessão sem perda silenciosa.

## 2. Escopo

**Inclui**

- Documento do projeto (P01): projeto, experimentos, revisões dos dados, análises imutáveis vinculadas à revisão, observações e anexos; identificadores estáveis.
- Codificação e decodificação `.enzitag` em Rust (P02), reutilizada nas duas plataformas; versão de esquema, verificação de integridade e limites de leitura.
- Migrações explícitas (P03) com a versão inicial e testes de arquivo antigo e de versão futura.
- Windows: abrir, salvar, salvar como e salvar cópia com gravação em temporário, verificação e substituição, preservando a cópia anterior; projetos recentes.
- Navegador: abrir por seleção de arquivo, salvar por download (e gravação direta onde o navegador permitir, como melhoria progressiva), recuperação local.
- Recuperação após dois segundos de pausa na edição e checkpoints em importações, alterações dos dados, análises e salvamentos manuais.
- Estados de salvamento distintos: alterações não salvas, recuperação local atualizada, salvo em arquivo; falha mantém a sessão editável.
- Importação (U05) com prévia: separador, decimal, codificação, ausentes, unidades e papéis das colunas (identificação da observação, unidade experimental, fator, resposta, bloco, tempo, réplica, repetição de medição, ignorar).
- Importação de matriz externa por mapeamento de colunas, sem deduzir planejamento pelo nome do arquivo.
- Árvore do projeto e histórico de revisões (U11).

**Não inclui**

- Google Drive e sincronização (v0.3, F11).
- Execução de fórmulas de planilhas: usar valores armazenados e política explícita para células sem valor.

## 3. Entradas e referências

- [Roteiro — F02](../roteiro-produto.md#f02--projetos-locais-revisão-importação-e-recuperação) e [seção 3.3 sobre o arquivo `.enzitag`](../roteiro-produto.md#33-arquivo-enzitag).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §6, §7 e §8.
- Contratos `Dataset`, `ProjectDocument` e `StorageProvider` no [mapa de módulos](../../arquitetura/mapa-modulos.md#contratos-entre-módulos).
- Pendências: PD-02 (contêiner, esquema, migrações) e PD-03 (retenção do histórico).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Contêiner `.enzitag` | Estrutura do arquivo | ZIP com `manifest.json` e documento JSON versionado (proposta do roteiro); JSON único; SQLite | Leitura no navegador, tamanho, migrações, inspeção manual, formato aberto |
| Identificadores | Formato dos IDs estáveis | UUID v4, UUID v7, ULID | Unicidade sem servidor, ordenação, legibilidade |
| Retenção | Quantidade e compactação de revisões e recuperações | Limite por quantidade/idade, deduplicação de dados iguais | Sem perda silenciosa, tamanho do arquivo |
| Recuperação no navegador | Armazenamento local | IndexedDB; Origin Private File System | Suporte em Chrome, Edge e Firefox; cota; robustez |
| Leitura XLSX | Biblioteca ou implementação | Leitor em Rust compilado para WASM; biblioteca JS de planilhas | Licença, tamanho, valores armazenados, datas |
| Codificação de CSV | Codificações aceitas | UTF-8 com e sem BOM; Windows-1252 com detecção e confirmação | Arquivos reais do laboratório, acentos |

## 5. Tarefas

- [x] **T01** — DTs de contêiner, identificadores e retenção ([DT-0008](../../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md)); especificação em [`formato-enzitag.md`](../../arquitetura/formato-enzitag.md).
- [x] **T02** — P01 `document`, `experiment`, `analysis`, `revision`, `annotation`, `attachment`; edição gera revisão; análise referencia revisão e configuração.
- [x] **T03** — P02 `archive`, `manifest`, `schema`, `integrity`: limites de tamanho descompactado e de quantidade de entradas, caminhos internos validados, verificação de integridade.
- [x] **T04** — P03 `migrations/{mod,v001}.rs`: migração sobre cópia; arquivo de versão futura aberto sem regravação destrutiva.
- [x] **T05** — Operações do engine para criar, abrir (bytes), salvar (bytes) e aplicar edição.
- [x] **T06** — E04 `files.rs`: diálogos, gravação segura com temporário, verificação e cópia anterior; projetos recentes no Windows.
- [x] **T07** — U13 `StorageProvider`, `localFile`, `desktopFile`, `browserRecovery`, `autosave`, `revisionStore`.
- [x] **T08** — Recuperação após 2 s de pausa e checkpoints por operação, sem cópia completa por tecla; fluxo de restauração ao abrir o aplicativo.
- [x] **T09** — `SaveStatus.tsx` com os três estados e mensagens de falha; recuperação local nunca apresentada como backup externo.
- [x] **T10** — U05: colagem do Excel, CSV e XLSX com prévia, mapeamento de papéis, decimal, separador, codificação, unidades e ausentes; normalização para `Dataset` validado em C02.
- [x] **T11** — Importação de matriz externa por mapeamento de colunas.
- [x] **T12** — U11: árvore com vários experimentos, histórico de revisões e indicação de análise baseada em dados anteriores.
- [x] **T13** — Tela inicial: projetos recentes e Abrir projeto habilitado.
- [x] **T14** — Arquivo de referência do formato em `examples/` e casos de teste de leitura em `app/crates/optima-project/tests/`.
- [ ] **T15** *(tudo verificado em Linux e navegador; reabertura Windows ↔ navegador e diálogos no Windows pendentes, ver seção 11)* — Testes: reabertura cruzada Windows ↔ navegador; interrupção de escrita simulada; arquivo corrompido; versão futura; migração; importação com acentos, vírgula decimal, ausentes e réplicas × repetições de medição.
- [x] **T16** — Fichas P01–P03, U05, U11, U13; matriz de cobertura; README com abrir/salvar.

## 6. Entregas

Projeto local completo e recuperável nas duas plataformas, formato `.enzitag` documentado e importação de dados com prévia.

## 7. Critérios de conclusão

1. Projeto criado no Windows reabre no navegador e vice-versa sem perda de dados, revisões ou configurações.
2. Interrupção de escrita, arquivo inválido, sessão recuperada e migração possuem casos verificáveis e passam.
3. Importações verificam acentos, vírgula decimal, ausentes e distinção entre réplicas experimentais e repetições de medição.
4. Nenhuma falha de armazenamento apaga o projeto aberto ou impede continuar editando.
5. Arquivo não contém credenciais nem caminhos absolutos do computador.

**Marco M1** atingido com ET01–ET03 concluídas.

## 8. Verificação

Testes Rust de P01–P03; testes web de U05/U13; E2E de importar → salvar → reabrir em cada plataforma; teste cruzado registrado; casos de falha simulada.

## 9. Documentação a criar ou atualizar

`docs/arquitetura/formato-enzitag.md` (novo); DTs da seção 4; fichas; [matriz de cobertura](../../produto/matriz-cobertura.md); README e guia de uso de arquivos.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Diferenças de API de arquivos entre navegadores | Download e seleção de arquivo como base; gravação direta só como melhoria |
| Cota de armazenamento do navegador | Tratar falha de cota como estado visível, sem perder a sessão |
| Arquivo grande por histórico | DT de retenção com medição em projetos sintéticos grandes |

## 11. Registro de progresso

### Estado atual (retomada)

| Item | Valor |
|---|---|
| Branch | `claude/epic-keller-3ad7jc` (PR [#1](https://github.com/VitorMazziero/enzitag-optima/pull/1) para `main`, rascunho) |
| Etapa e tarefa | ET03: T01–T14 e T16 concluídas; **T15 aberta** só pela reabertura Windows ↔ navegador e pelos diálogos nativos no Windows |
| Código entregue | Rust: documento, revisões, análises, `.enzitag`, migrações, XLSX, operações do motor. Tauri: arquivos com gravação segura, diálogos, recentes. Web: espaço de trabalho com experimentos, recuperação, salvar/abrir, histórico, assistente de importação |
| Pendente para concluir | (1) execução no **Windows** (mesma pendência de ET01/ET02): resultado do job `desktop-windows` com WebView2 por CDP e verificação manual em Windows 11 dos diálogos "Abrir" e "Salvar"; (2) reabertura **cruzada**: um projeto salvo no Windows aberto no navegador e vice-versa (os dois usam o mesmo código Rust e o mesmo arquivo Python de referência é lido nos dois, mas o arquivo gravado pelo aplicativo Windows ainda não foi aberto no navegador) |
| Próxima ação | Confirmar o resultado do Windows na CI; seguir para a ET04 sem declarar M1 |
| Windows (CI) | na [execução 41334658975](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41334658975) (disparo manual, commit `492db19`) o job `desktop-windows` passou em `windows-latest` — Microsoft Windows Server 2025 Datacenter, build 26100, 64 bits: build NSIS e verificação nativa por WebView2/CDP com `native-checks.mjs` (`engine.info`, descritiva, `.enzitag` e adulteração, XLSX, regressão NIST, quantil t, comparação de tratamentos, planejamento e análise). **Não é Windows 11 de usuário**, sem diálogos nativos e sem clone limpo pelo guia: a evidência literal em Windows 11 segue pendente e a etapa continua aberta. |

### Evidências (2026-11-01)

Ambiente: Linux (Ubuntu 24.04), Rust 1.97.0, Node 22.23.4, Python 3.13.18 (openpyxl 3.1.5), Chromium 1248 e Firefox 157.0, WebKitGTK 2.52.6.

| Verificação | Comando | Resultado |
|---|---|---|
| Rust: formato, lint, testes | `cargo fmt --check`; `cargo clippy --workspace --all-targets -- -D warnings`; `cargo test --workspace` | 119 testes passam (project: 38 unitários + 3 de formato Python + 3 de XLSX) |
| Tauri (Linux) | `cargo clippy -- -D warnings`; `cargo test` em `app/desktop/src-tauri` | sem avisos; 7 testes de gravação segura |
| Formato contra Python | `cargo test -p optima-project --test project_file_validation` | arquivo escrito por `zipfile`/`hashlib` lido **igual ao esperado**; 4 arquivos inválidos recusados com o código esperado e sem alterar a entrada; SHA-256 de Python e Rust coincidem |
| XLSX contra openpyxl | `cargo test -p optima-project --test import_xlsx_validation` | grade de texto e contagem de avisos idênticas ao esperado |
| Testes web | `npm test` | 130 testes (workspace, revisões, CSV, mapeamento, assistente, recuperação com IndexedDB, paridade WASM de projeto e XLSX) |
| WASM | `project.parity.test.ts` | mesmo arquivo Python e mesmo XLSX lidos pelo WebAssembly; ida e volta de um espaço de trabalho com acentos |
| E2E | `E2E_BROWSERS=chromium,firefox npm run test:e2e` | 48 de 48: recuperação após 2 s (restaurar/descartar), salvar (download `.enzitag` ZIP), abrir, três estados distintos, arquivo inválido e esquema futuro sem alterar o projeto, abrir o arquivo Python (dois experimentos, resultado guardado atual), importar CSV UTF-8 e Windows-1252, XLSX com troca de planilha, ids repetidos bloqueiam |
| Acessibilidade | axe | sem violações, inclusive no assistente de importação e no aviso de recuperação |
| IPC nativo (Linux) | `xvfb-run -a node tests/native-smoke.mjs …` | versões, descritiva, `.enzitag` do Python lido, adulterado recusado, XLSX lido |

### Registro por tarefa

| Tarefa | Registro |
|---|---|
| ET03-T01 | [DT-0008](../../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md) e [formato `.enzitag`](../../arquitetura/formato-enzitag.md). Redigidos **depois** do código do núcleo e **antes** da interface que os usa |
| ET03-T02..T04 | `optima-project`: documento, revisões, análises, contêiner ZIP, integridade, limites, migrações (sem passo real: esquema 1) |
| ET03-T05 | Operações `projectEncode`, `projectDecode`, `importXlsx`; erros `invalidProject` e `invalidImport` |
| ET03-T06 | `files.rs`/`commands.rs` do Tauri: gravação segura e diálogos nativos |
| ET03-T07..T09 | `services/storage`, recuperação (2 s), `SaveStatus` com três estados |
| ET03-T10, T11 | CSV (TypeScript), XLSX (Rust), assistente com papéis; matriz externa pelo mesmo assistente |
| ET03-T12, T13 | Experimentos, histórico e restauração; projetos recentes (Windows) e Abrir |
| ET03-T14 | Arquivos de referência gerados por Python em `validation/cases/project_file/` (o formato de arquivo de exemplo; cópia em `examples/` não criada: o caso de validação cumpre o papel) |
| ET03-T15 | Ver pendências acima |
| ET03-T16 | Fichas P01–P03, U05, U11, U13, E01 e E04; matriz, mapa, dependências e README atualizados |

## 12. Desvios e descobertas

- **Migração**: o plano pedia teste de migração. Como não existe esquema anterior publicado, não há migração real para testar; ficam testados o mecanismo e a recusa de versões futuras e inválidas. A primeira mudança incompatível acrescenta a migração e o arquivo de teste (registrado no formato e na ficha P03).
- **Hash de revisão**: o primeiro desenho fazia a interface calcular o resumo das revisões; passou a ser do Rust (`encode` recalcula), evitando reimplementar a serialização canônica em TypeScript.
- **Bug do fluxo ao restaurar/abrir** (E2E): o `Workflow` não remontava quando o projeto era substituído por outro com o mesmo id e ficava na etapa antiga; `epoch` resolve.
- **Referência com erro**: o primeiro arquivo de referência Python tinha variância guardada 30,25 (o correto é 27,25); corrigido antes do uso e a assinatura da análise agora coincide com a calculada pela interface.
- **Diálogos nativos**: não automatizáveis; a lógica de gravação é testada diretamente e a abertura/salvamento pelo diálogo precisa de verificação manual em Windows 11.
- **`msedgedriver` não anexou ao WebView2** na CI (`DevToolsActivePort`), embora o executável permaneça em execução; a verificação no Windows passou a usar WebView2 por CDP.
- **Histórico**: cada revisão guarda cópia completa da tabela (sem compactação); impacto a medir na ET10.
- **Unidade experimental**: a coluna só aparece em "Opções avançadas" e o assistente explica que linhas com a mesma unidade são medidas repetidas.
