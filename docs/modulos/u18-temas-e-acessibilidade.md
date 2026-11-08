# U18 — Temas e acessibilidade

**Estado:** implementado; seis temas (v0.2, ET12) · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/themes`, `app/web/src/features/settings`, `app/web/src/state/preferences.ts` |
| Decisões | [DT-0006](../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md), [DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md) (Industrial, Organic, Clay, fontes e logo) |
| Logo | `app/web/src/features/branding/GroupLogo.tsx`, `app/web/src/assets/enzitag-logo.png` |

Tokens semânticos em `themes/tokens.css` (espaços, foco, tipografia base) e um arquivo por tema com as cores e fontes. Componentes (`app/app.css`) usam apenas tokens. Soft Light é o padrão e preserva a identidade EnziTAG (azul `#005A99` como ação; verde `#008300` para estados positivos; o laranja segue reservado a elementos gráficos por contraste).

## Verificações

- Contraste WCAG ≥ 4,5:1 dos pares de texto em cada tema (`themes.test.ts`).
- axe-core (WCAG 2.0/2.1 A e AA) sem violações em objetivo, fatores e respostas, dados com erro, análise e resultados, nos **seis temas**, com controle negativo que prova que o verificador detecta problemas (`tests/e2e/accessibility.spec.ts`).
- Teclado: link "Ir para o conteúdo", rádios, botões, células e seletores acessíveis; foco visível por `:focus-visible`; `prefers-reduced-motion` remove transições.
- Inspeção visual das telas nos seis temas; `themes-flow.spec.ts`: movimento reduzido, `forced-colors`, 375 px com axe, grade com 1 000 linhas e logotipo sem rede.

Pendente: verificação manual com leitor de tela. A execução nativa da ET29 usa o WebView2 real no Windows 10; evidência e limites no [relatório da ET29](../../validation/reports/et29/README.md).

## ET29: percurso, espaçamento e modais

Uma navegação por etapa; blocos em linha acima do conteúdo, sem ocupar uma segunda coluna ao lado da grade. A lista de etapas pode ser recolhida. Título, introdução e blocos têm separações explícitas; cartões mantêm rótulos/controles agrupados, com ações secundárias pequenas. O seletor de experimento e suas ações têm altura de 40 px. O controle de ações da linha usa «⋯» com nome acessível completo.

Em até 800 px, etapa e experimento usam seletores compactos e Arquivo concentra as ações. Em até 600 px, os modais ocupam a janela; o fundo não rola e os campos respeitam sua largura. Tabelas mantêm rolagem própria, indicação nas bordas e primeira coluna fixa. Avisos de resultado desatualizado têm borda e texto, sem reduzir a opacidade do resultado: esmaecer prejudicava o contraste no Industrial.

`et29-audit.spec.ts` verifica controles, células, quatro larguras e axe dos avisos nos seis temas. `et29-review.spec.ts` registra a avaliação visual por tarefa e mede, nos seis temas a 1064×892, os quatro pontos apresentados pelo usuário no navegador: botão de recolher, alinhamento do experimento, separação introdução/blocos e largura/ações da grade.

## ET27 — Papéis visuais e figuras

Tokens de título/subtítulo, largura de leitura (70ch), rótulo e campo, com compensação óptica em cada tema. Modern Dark separa chão/painel/campo; Soft Light reforça limites; Professional e Organic compensam fontes serifadas; Industrial restringe monoespaçada a identificadores; Clay reduz volume em dados e manutenção. As séries, referências, incerteza e grade têm papéis semânticos, além de traços/símbolos.

`ChartFigure` reúne exportação, personalização, comentários e prévia neutra. A área científica mantém texto legível com rolagem própria em telas pequenas; cada região tem nome acessível da figura. A composição suporta escalas 0,85/1/1,2; layout e formulários também são medidos com texto a 200%. Números tabulares usam valor completo em nome acessível/title; indefinições distinguem seus motivos.

O PDF preserva família DejaVu Serif/Mono licenciada e hachura vetorial. A malha 3D é desenhada com menos linhas que a malha de cálculo; ternário e saturação usam as ações comuns. [DT-0028](../decisoes-tecnicas/dt-0028-papeis-visuais-e-figuras-cientificas.md), [avaliação e limites](../../validation/reports/et27/README.md). Safari/WebKit recebe dica de Option+Tab no menu Sobre; isso não equivale à verificação do Safari real.
