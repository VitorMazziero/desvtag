# U03 — Fatores e respostas

**Estado:** implementado (estrutura experimental — blocos, tempos e réplicas — na ET03 e seguintes) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/experiment` |
| Arquivos | `FactorEditor.tsx`, `ResponseEditor.tsx`, `index.ts` |
| Etapa | ET02 |

O usuário cadastra fatores (nome, quantitativo ou categórico, unidade, níveis opcionais) e respostas (nome, unidade), sem limite imposto pelos exemplos. Nomes e unidades são preservados como digitados e nunca traduzidos. Remover um fator ou resposta remove a coluna correspondente das linhas e ajusta a seleção de análise (`state/project.ts`, testado). Textos: `variables.*`.
