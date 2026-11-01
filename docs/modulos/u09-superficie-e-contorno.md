# U09 — Superfície 3D, contorno e resultados da superfície (com U06 objetivo de superfície e U07 termos)

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/{features/results,services/charts,features/design,features/analysis}` |
| Arquivos de entrada | `features/results/SurfaceResults.tsx`, `SurfaceView.tsx`; `services/charts/{contour,surface3d,surfaceGeometry}.ts` |
| Etapa de criação | ET07 |
| Depende de | U12 (cliente do motor), U11 (estado e revisões), U06 (`DesignPanel`), U07 (`AnalysisSetup`, `buildRequest`), `services/{charts,export}` |
| Módulos do núcleo | [C12](c12-superficie-de-resposta.md) |

## 1. Responsabilidade

Permitir escolher o objetivo *Superfície de resposta* no planejamento (composto central, Box–Behnken, `α` informado, inscrito, parte fatorial fracionária), escolher os termos do modelo sem eliminação automática, e apresentar coeficientes, ANOVA, `R²`, falta de ajuste (ou a explicação da ausência), equação nas duas escalas, região experimental, superfície 3D e contorno com extrapolação hachurada, e as exportações com proveniência. **Nenhum cálculo estatístico**: a malha e as curvas vêm do motor.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `features/design/DesignPanel.tsx` | Objetivo (triagem × superfície), tipo de composto central, `α`, inscrito, geradores, pontos centrais |
| `features/analysis/AnalysisSetup.tsx`, `buildRequest.ts` | Caminho de dados existentes (*Ajustar superfície*), termos, `surfaceFactors`, `buildSurfaceRequest` |
| `features/results/SurfaceResults.tsx` | Resultados: interpretação, tabelas, equação, região, exportação |
| `features/results/SurfaceView.tsx` | Eixos, valores fixados, resolução, rotação, chamada `surfaceGrid` |
| `features/results/surfaceEquation.ts` | Texto da equação (apresentação) |
| `services/charts/surface3d.ts`, `contour.ts` | Desenho em SVG (tela e exportação) |

## 3. Comportamento

A malha é pedida ao motor com atraso de 200 ms após cada mudança, descartando respostas atrasadas. Eixos iguais são recusados; os demais fatores ficam fixados em valores editáveis (padrão: centro) e **aparecem na legenda das figuras**. Células que tocam algum ponto extrapolado são hachuradas (critério conservador); os pontos do planejamento aparecem no contorno. Rotação e elevação por controles deslizantes. Figuras em SVG e PNG com metadados; malha e coeficientes em CSV com proveniência.

## 4. Erros e limitações

Mensagens `design.*` e `surface.*` localizadas. 3D estático (sem arrastar com o mouse), malhas de 21 a 61 passos na interface. Sem ponto estacionário ou ótimo.

## 5. Manutenção

Novo gráfico: função em `services/charts/` sobre os campos de `SurfaceGrid`, com `id` único e textos escapados; novo texto em `results.json` nos dois idiomas. Testes: `npm test`, `npm run test:e2e` (`surface-flow.spec.ts`, exemplo 03), axe nos três temas.

## 6. Testes

Teste do renderizador de gráficos já existente, E2E com exemplo 03 (coeficientes, equação, falta de ajuste, hachura), fluxo completo (planejar → preencher → ajustar → trocar eixos → exportar → salvar e reabrir) e caminho de matriz personalizada; axe sem violações nos três temas.
