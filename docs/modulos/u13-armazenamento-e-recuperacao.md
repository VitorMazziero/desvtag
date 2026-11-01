# U13 — Armazenamento e recuperação

**Estado:** implementado (Drive previsto para a v0.3) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/services/storage` |
| Arquivo de entrada | `index.ts` |
| Etapa | ET03 |
| Decisões | [DT-0008](../decisoes-tecnicas/dt-0008-formato-enzitag-versoes-recuperacao.md) |

## Responsabilidade

Mover **bytes** de projeto entre o aplicativo e o armazenamento (`StorageProvider`) e guardar a **recuperação** da sessão. A serialização `.enzitag` pertence ao Rust (P02).

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `StorageProvider.ts` | Contrato: abrir, salvar, salvar cópia, recentes, abrir recente, desligar arquivo; `overwritesFile` |
| `browserFile.ts` | Navegador: seleção de arquivo e download (não substitui o arquivo anterior; a interface avisa) |
| `desktopFile.ts` | Windows: comandos Tauri `project_*`; o caminho fica no Rust |
| `recovery.ts` | Recuperação em IndexedDB com versão de formato; falha de armazenamento é tratada |
| `autosave.ts` | `useAutosave`: grava após 2 s de pausa, limpa ao salvar; estados `idle/pending/saved/error` |
| `context.tsx`, `bytes.ts`, `index.ts` | Injeção do provedor, conversão base64, escolha do provedor por ambiente |

## Windows (`app/desktop/src-tauri/src/{files,commands}.rs`)

Gravação segura (temporário → `sync` → releitura → cópia `.bak` → renomeação), diálogos nativos, lista de recentes e leitura com limite de tamanho; 7 testes (substituição com cópia anterior, verificação reprovada, pasta inexistente, renomeação final impossível, lista de recentes, limite de leitura).

## Limites conhecidos

- No navegador, "Salvar" baixa o arquivo; não há gravação direta.
- A recuperação é local ao navegador e se perde se o usuário limpar os dados do site.
- Os diálogos nativos do Windows não são automatizáveis nos testes: a lógica de gravação é testada diretamente e os diálogos dependem de verificação manual em Windows 11.
