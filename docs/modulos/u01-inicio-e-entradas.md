# U01 — Início e entradas

**Estado:** implementado · **Atualizado em:** 2026-11-09

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/app`, `app/web/src/features/home` |
| Arquivo de entrada | `app/App.tsx`; `features/home/index.ts` |
| Etapa | ET02 |
| Depende de | U12 (`useEngine`), U11 (estado), U17 |

## Responsabilidade

Apresentar as três entradas (**Planejar experimento**, **Analisar dados existentes**, **Comparar tratamentos**) (os projetos recentes ficam no menu Arquivo e os exemplos em Extras → Exemplos). A disponibilidade de cada caminho vem do **registro de métodos do motor** (`availability.ts`): enquanto o método exigido não existir, o aviso "Parcial" é mostrado e some sozinho quando uma etapa futura registrar o método.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app/App.tsx` | Cabeçalho, seletores, fluxo e rodapé do motor |
| `features/home/StartActions.tsx` | Três cartões de escolha (grupo de rádios) |
| `features/home/availability.ts` | Métodos exigidos por caminho (`plackett_burman_design`, `descriptive_summary`, `tukey_hsd`) |
| `features/examples/{catalog,ids,ExamplesDialog}` | Catálogo dos exemplos empacotados (`examples/`, sem o 05) e janela aberta por Extras → Exemplos |
| `features/project/RecentFiles.tsx` | Projetos recentes (Windows) na seção do menu Arquivo; vazia no navegador |

`AppShell.tsx` e `Router.tsx`, previstos no mapa, não foram criados (ver [DT-0007](../decisoes-tecnicas/dt-0007-decisoes-et02-interface.md)).

## Manutenção

Novo caminho ou método exigido: ajustar `REQUIRED_METHODS` e as chaves `home.*` nos dois idiomas. Novo exemplo: adicionar o prefixo em `features/examples/ids.ts` e as chaves `examples.items.<nn>.*` nos dois idiomas. Testes: `availability.test.ts`, `examples/catalog.test.ts` e E2E `descriptive-flow.spec.ts` e `examples-dialog.spec.ts`.
