# ET03 — Projeto local, importação e recuperação

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F02 |
| Marco | **M1 — Base utilizável** |
| Depende de | ET02 |
| Módulos | P01–P03, C01–C02, E01, E04 (`files`), U01 (recentes), U03–U05, U11, U13 |
| Ativado em | — |
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

- [ ] **T01** — DTs de contêiner, identificadores e retenção; especificação em `docs/arquitetura/formato-enzitag.md` com exemplo comentado.
- [ ] **T02** — P01 `document`, `experiment`, `analysis`, `revision`, `annotation`, `attachment`; edição gera revisão; análise referencia revisão e configuração.
- [ ] **T03** — P02 `archive`, `manifest`, `schema`, `integrity`: limites de tamanho descompactado e de quantidade de entradas, caminhos internos validados, verificação de integridade.
- [ ] **T04** — P03 `migrations/{mod,v001}.rs`: migração sobre cópia; arquivo de versão futura aberto sem regravação destrutiva.
- [ ] **T05** — Operações do engine para criar, abrir (bytes), salvar (bytes) e aplicar edição.
- [ ] **T06** — E04 `files.rs`: diálogos, gravação segura com temporário, verificação e cópia anterior; projetos recentes no Windows.
- [ ] **T07** — U13 `StorageProvider`, `localFile`, `desktopFile`, `browserRecovery`, `autosave`, `revisionStore`.
- [ ] **T08** — Recuperação após 2 s de pausa e checkpoints por operação, sem cópia completa por tecla; fluxo de restauração ao abrir o aplicativo.
- [ ] **T09** — `SaveStatus.tsx` com os três estados e mensagens de falha; recuperação local nunca apresentada como backup externo.
- [ ] **T10** — U05: colagem do Excel, CSV e XLSX com prévia, mapeamento de papéis, decimal, separador, codificação, unidades e ausentes; normalização para `Dataset` validado em C02.
- [ ] **T11** — Importação de matriz externa por mapeamento de colunas.
- [ ] **T12** — U11: árvore com vários experimentos, histórico de revisões e indicação de análise baseada em dados anteriores.
- [ ] **T13** — Tela inicial: projetos recentes e Abrir projeto habilitado.
- [ ] **T14** — Arquivo de referência do formato em `examples/` e casos de teste de leitura em `app/crates/optima-project/tests/`.
- [ ] **T15** — Testes: reabertura cruzada Windows ↔ navegador; interrupção de escrita simulada; arquivo corrompido; versão futura; migração; importação com acentos, vírgula decimal, ausentes e réplicas × repetições de medição.
- [ ] **T16** — Fichas P01–P03, U05, U11, U13; matriz de cobertura; README com abrir/salvar.

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

| Data | Registro |
|---|---|
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
