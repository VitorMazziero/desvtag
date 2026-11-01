# U11 — Estado do projeto, experimentos, revisões e histórico

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/state`, `app/web/src/features/project` |
| Arquivos | `state/{project,workspace,ProjectContext,preferences}`, `features/project/{ProjectBar,SaveStatus,RecoveryBanner,HistoryView,useProjectActions,projectFile}` |
| Etapa | ET02 (estado do experimento), ET03 (projeto, revisões, salvar/abrir) |

## Modelo

`Workspace` = projeto aberto: vários `ProjectState` (experimentos), experimento atual, `changeSeq`/`savedSeq` (alterações não salvas), `fileName`, `lastSavedAt` e `epoch` (remonta o fluxo quando o projeto é substituído). `ProjectState` = estado de trabalho de um experimento (texto das células, seleção de análise, resultado) + `revisions` e `analyses` do documento. Os tipos de dados vêm do documento gerado a partir do Rust.

## Regras

- Revisões nascem **nas operações** (importar, analisar, salvar, restaurar); edições pendentes viram revisão `edit` no limite da operação. Dados idênticos à última revisão não geram revisão.
- A análise guarda a revisão que a gerou e uma assinatura de dados e opções; o resultado só vale como atual se a assinatura coincidir.
- `markSaved` recebe a sequência vigente **no início** do salvamento: edições feitas durante a gravação continuam pendentes.
- Selecionar experimento não é alteração; renomear projeto é.
- Falhas de abrir e salvar mostram mensagens localizadas e **não alteram** o projeto aberto.

## Telas

`ProjectBar` (nome, Novo, Abrir, Salvar; no Windows também Salvar como e Salvar uma cópia), `SaveStatus` (três estados distintos), `RecoveryBanner` (restaurar ou descartar), `ExperimentBar` (abas, novo, renomear), `HistoryView` (versões, restaurar, análises guardadas).

## Testes

`workspace.test.ts` (revisões, importação, restauração, controle de alterações, experimentos, ida e volta com o documento, ids sem colisão), `project.parity.test.ts` (ida e volta pelo motor WASM) e E2E `project.spec.ts`.
