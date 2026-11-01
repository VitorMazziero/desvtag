# U02 — Fluxo guiado

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/workflow` |
| Arquivo de entrada | `index.ts` (`Workflow`) |
| Etapa | ET02 |
| Depende de | U01, U03, U04, U07, U08 |

## Responsabilidade

Cinco etapas — Objetivo → Fatores e respostas → Planejamento/dados → Análise → Resultados — com regras de acesso e orientação do que falta.

## Regras (`guards.ts`)

Uma etapa só abre quando **todas as anteriores estão satisfeitas**; etapas satisfeitas podem ser revisitadas. Satisfação: objetivo escolhido; ao menos uma resposta nomeada e todos os fatores nomeados; ao menos uma observação com valor e **nenhuma célula com erro**; resultado **atual** (a assinatura de dados e opções coincide com a do cálculo). Alterar dados ou opções invalida a análise e **bloqueia os resultados antigos**, que não são mostrados como atuais.

## Arquivos

`steps.ts` (ids das etapas), `guards.ts` (regras puras, testadas), `Workflow.tsx` (navegação por botões com `aria-current`, avançar/voltar, recomeçar com confirmação, mensagem do que bloqueia o avanço).

## Manutenção

Nova etapa ou regra: `steps.ts`, `guards.ts` e `guards.test.ts`; chaves `workflow.*`. Testes: `npm test` e E2E.
