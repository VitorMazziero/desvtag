# project_file — arquivos `.enzitag` escritos por Python independente

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O leitor do formato `.enzitag` (Rust nativo, WebAssembly e IPC do Tauri) lê corretamente arquivos produzidos por **outra implementação** do formato, preserva texto Unicode e recusa, com códigos de erro, esquema futuro, adulteração, resumo de revisão incorreto e arquivos que não são ZIP?

## Dados

Gerados por `validation/tools/make_project_case.py` (sintéticos): `001-valid.enzitag` (dois experimentos, duas revisões, uma análise guardada, acentos e `ß`/`日本`), `002-future-schema.enzitag` (esquema 99), `003-tampered.enzitag` (documento alterado com o manifesto do original), `004-not-a-zip.enzitag`, `005-revision-hash-mismatch.enzitag`. `cases.json` lista o resultado esperado de cada um; `001-valid.expected.json` é o documento esperado.

## Referência independente

Python `zipfile` e `hashlib` escrevem o contêiner, o manifesto e todos os resumos SHA-256 (inclusive o de cada revisão, sobre a serialização JSON compacta na ordem dos campos). Nenhum código Rust é usado para gerar os arquivos.

## Resultados esperados e tolerâncias

Documento decodificado **igual** ao esperado (comparação estrutural exata; números idênticos) ou o código de erro indicado em `cases.json`. Sem tolerância numérica.

## Diferenças admitidas

Nenhuma.

## Execução

`app/crates/optima-project/tests/project_file_validation.rs` (nativo), `app/web/src/services/engine/project.parity.test.ts` (WebAssembly), `app/desktop/tests/native-smoke.mjs` (IPC do Tauri) e o E2E `app/web/tests/e2e/project.spec.ts` (abrir pelo navegador).
