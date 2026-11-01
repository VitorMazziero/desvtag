# U18 — Temas e acessibilidade

**Estado:** implementado para os componentes da ET02 · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/themes`, `app/web/src/features/settings`, `app/web/src/state/preferences.ts` |
| Decisão | [DT-0006](../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md) |

Tokens semânticos em `themes/tokens.css` (espaços, foco, tipografia base) e um arquivo por tema com as cores e fontes. Componentes (`app/app.css`) usam apenas tokens. Soft Light é o padrão e preserva a identidade EnziTAG (azul `#005A99` como ação; verde `#008300` para estados positivos; o laranja segue reservado a elementos gráficos por contraste).

## Verificações

- Contraste WCAG ≥ 4,5:1 dos pares de texto em cada tema (`themes.test.ts`).
- axe-core (WCAG 2.0/2.1 A e AA) sem violações em objetivo, fatores e respostas, dados com erro, análise e resultados, nos três temas, com controle negativo que prova que o verificador detecta problemas (`tests/e2e/accessibility.spec.ts`).
- Teclado: link "Ir para o conteúdo", rádios, botões, células e seletores acessíveis; foco visível por `:focus-visible`; `prefers-reduced-motion` remove transições.
- Inspeção visual das telas nos três temas.

Pendente: verificação manual com leitor de tela e verificação visual no Windows (WebView2).
