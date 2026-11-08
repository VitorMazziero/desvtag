# P01–P03 — Documento do projeto, contêiner e migrações

**Estado:** implementado; formato validado contra arquivos escritos por Python (Rust, WebAssembly e IPC nativo); migração real inexistente (esquema 1) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pacote | `app/crates/optima-project` |
| Arquivo de entrada | `src/lib.rs` |
| Etapa de criação | ET01 (documento mínimo), ET03 (completo) |
| Depende de | C01 (`StableId`, `FactorKind`), C05 (`DescriptiveResult`) |
| Consumido por | E01 (operações `projectEncode`, `projectDecode`, `importXlsx`) |
| Especificação | [Formato do projeto](../arquitetura/formato-enzitag.md) · [DT-0008](../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md) |

## 1. Responsabilidade

Definir o **documento** (experimentos, revisões imutáveis, análises vinculadas), **codificá-lo e lê-lo** como contêiner ZIP com integridade e limites, e **migrar** versões de esquema. Nunca abre arquivos do sistema: recebe e devolve bytes. Não calcula estatística.

## 2. Arquivos

| ID | Arquivo | Responsabilidade |
|---|---|---|
| P01 | `document.rs` | `ProjectDocument`, `Experiment` (campos opcionais `design`, `crd`, `rcbd` (DBC, v0.2), `figure_styles`, `origin`, `confirmation`), `EntryPath`, validação de coerência (`validate`), `with_hashes` |
| P01 | `figure_style.rs` | `FigureStyle`: título, rótulos dos eixos, exibição das letras e escala de fonte por figura e, desde a v0.2, letras manuais, anotações livres, cor, fundo, família da fonte, resolução do PNG, grade e legenda (só apresentação; validado no `validate`; [DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)) |
| P01 | `experiment.rs` | `ExperimentData` (texto das células), `FactorSpec`, `ResponseSpec`, `RowRecord`, `content_hash` |
| P01 | `revision.rs` | `Revision`, `RevisionReason` |
| P01 | `analysis.rs` | `AnalysisRecord`, `AnalysisOptions`, `AnalysisResult` |
| P02 | `archive.rs` | `encode` (bytes reprodutíveis: carimbo, sistema de origem e permissões do ZIP fixos), `decode`, `decode_with_limits`, `Limits` |
| P02 | `manifest.rs` | Manifesto e constantes do contêiner |
| P02 | `integrity.rs` | `sha256_hex`, `matches_manifest` |
| P03 | `migrations/mod.rs` | `migrate_to_current` (recusa de versão futura e inválida; sem passos reais ainda) |
| apoio U05 | `xlsx.rs` | `read_xlsx`: valores armazenados de XLSX como texto |

`attachment.rs` e `annotation.rs`, previstos no mapa, não foram criados: não há anexos nem anotações na v0.1 (as observações do experimento ficam em `notes`).

## 3. API pública

`archive::encode(&ProjectDocument) -> Result<Vec<u8>, Vec<Issue>>` (recalcula os resumos das revisões e valida); `archive::decode(&[u8]) -> Result<Decoded, Vec<Issue>>` (`document`, `migrated_from`, `warnings`); `xlsx::read_xlsx(&[u8], Option<&str>) -> Result<SheetData, Vec<Issue>>`. Erros são `Issue` codificados (`project.*`, `import.*`).

## 4. Garantias testadas

- Ida e volta preserva o documento, inclusive Unicode; saída determinística.
- Arquivo escrito por Python lido **igual ao esperado**; os resumos SHA-256 de Python e Rust coincidem.
- Recusa, sem alterar a entrada: não ZIP, truncado, adulterado, esquema futuro, contêiner futuro, nome de entrada perigoso, entrada grande demais (inclusive altamente compressível), entradas demais, formato estranho.
- Documento inconsistente não é gravado.

## 5. Manutenção

- Mudança incompatível do documento: incrementar `SCHEMA_VERSION`, escrever `vN_to_vM` em `migrations/`, **manter** um arquivo da versão antiga em `validation/cases/project_file/` e atualizar a [especificação](../arquitetura/formato-enzitag.md).
- Novo diagnóstico: código em `archive.rs`/`document.rs`, mensagens PT/EN em `diagnostics.json`.
- Testes: `cargo test -p optima-project`; `npm test` (paridade WASM); `native-smoke.mjs`/`native-cdp.mjs` (IPC).

## Extensão ET22 da v0.4

Os campos opcionais `mixtureResult`, `mixedModelResult`, `nonlinearResult` e `powerResult` guardam configuração em edição e lista de registros com entradas, revisão, assinatura e proveniência. Leitores antigos continuam com a lista `analyses` existente; nenhuma variante desconhecida foi inserida nela. A validação usa as revisões históricas. Resultados guardados são consultáveis sem recálculo, com seções comuns, relatórios HTML/PDF/Word, tabelas CSV/XLSX e comentários vinculados ao registro selecionado. [Decisão e verificação](../decisoes-tecnicas/dt-0030-resultados-persistidos-das-familias.md).

### Extensão ET23 (em conferência)

Tempo/ocasião tem papel próprio, texto bruto e visibilidade opcionais, entra na revisão/hash quando presente e pode ser importado/exportado. Unidade e tempo podem vir da coluna dedicada ou de fator; o mapeamento conserva identidades/rótulos sem colisões. A configuração v2 registra estrutura, tempo, interações, codificação, referências e ajustes; resultados guardam covariância/inferência, EMM e perfis sem recálculo na abertura. Figuras/tabelas e nomes dos comentários usam a origem histórica. [Ficha C14 e proprietários](c14-medidas-repetidas-avancadas.md), [evidências e limites](../../validation/reports/et23/README.md).
