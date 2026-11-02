# DT-0021 — Temas Industrial, Organic e Clay, fontes novas e logo do grupo (ET12)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Pedido do usuário em 2026-11-01 (três temas adicionais e logo do grupo); plano da [ET12](../planos-execucao/concluidos/et12-temas-adicionais-e-identidade-do-grupo.md); inclusão na v0.2 confirmada pelo usuário |
| Pendências relacionadas | PD-17 (resolvida) |
| Substitui / substituída por | Estende a [DT-0006](dt-0006-idiomas-temas-fontes.md) (idiomas, temas e fontes) |

## Contexto

A v0.1 tinha três temas (Soft Light, Modern Dark e Professional), cada um um arquivo CSS com tokens semânticos, e nenhuma imagem de identidade. Os prompts de referência de três temas novos foram preservados em `docs/temas/prompts/` e descrevem **páginas de apresentação**; o aplicativo é uma ferramenta de dados, com grade e tabelas densas, que precisa de acessibilidade verificável.

## Decisões

### 1. Mesmos tokens semânticos; profundidade por poucos tokens novos

Cada tema novo é um arquivo (`industrial.css`, `organic.css`, `clay.css`) que define **os mesmos tokens** dos temas anteriores. Foram acrescentados em `tokens.css`, com padrões que preservam o visual da v0.1: `--radius-button`, `--shadow-control`, `--shadow-control-pressed`, `--shadow-inset` e `--font-label`; os temas novos os redefinem, com seletor `:root[data-theme="…"]` (especificidade maior que a dos padrões). `app.css` usa os tokens nos botões, nas caixas de seleção e nos campos de texto; **nenhuma regra por tema** foi espalhada pelos componentes. A grade de dados e as tabelas **não recebem sombras por célula**: a profundidade fica nos contêineres, o que preserva o desempenho (1 000 linhas colam e desenham em ≈ 0,4–0,6 s nos três temas, medido no E2E).

### 2. Cores de destaque só como fundo ou forma

Medido em 2026-11-01: o laranja do Industrial (`#f15b22`, 2,2:1), o acento de arte do Organic (`#ad7d62`, 2,9:1) e o rosa do Clay como texto **não servem para texto nem para foco**. Decisões: o Industrial usa a tinta `#20272b` como ação e `#181e22` como foco (≥ 10:1); o laranja existe apenas como `--color-indicator` decorativo. O Organic usa musgo `#35422d` como ação e argila `#694737` como texto de destaque (6,6:1 sobre o chão). O Clay usa o **rosa como fundo** do botão principal com tinta sobre ele (6,6:1) e anel de foco de 3 px em tinta. Os tokens que os prompts não definem (`ok`, `rule`, `ground-muted`, sombras) foram **derivados e testados**: todos os pares de texto dos seis temas têm contraste ≥ 4,5:1, e o foco também sobre o painel (`themes.test.ts`).

### 3. Decoração, movimento e alto contraste

A granulação do Organic é uma imagem de fundo decorativa do `body` (sem elementos no DOM e sem eventos de ponteiro). Nenhum indicador sugere estado real do sistema. Com `prefers-reduced-motion` as transições são removidas e a profundidade permanece. Com `forced-colors` (alto contraste do Windows) `app.css` zera as sombras e usa bordas reais nos painéis e controles (verificado por emulação do navegador).

### 4. Fontes

Pacotes locais `@fontsource` (OFL-1.1), versões exatas: **IBM Plex Mono** 5.3.0 (400 e 500; rótulos do Industrial), **Source Serif 4** 5.3.1 (400 e 600; títulos do Organic) e **Instrument Sans 700** (do pacote já instalado; títulos do Clay). Subconjunto latino; funcionam offline. Avisos em `THIRD_PARTY_NOTICES.txt` (sete fontes OFL).

### 5. Logo do grupo

Arquivo `docs/imagens/logo.png` (marca EnziTAG, 558 × 155 px), copiado **sem alteração** para `app/web/src/assets/enzitag-logo.png` e empacotado pela build (offline; o E2E confere que nenhuma requisição externa é feita). `GroupLogo` aparece no **cabeçalho** (108 × 30) e, **até a v0.2.0**, também na **tela inicial** (216 × 60; retirado em 2026-11-02, [DT-0023](dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md)), com dimensões reservadas e texto alternativo localizado («Logotipo EnziTAG» / «EnziTAG logo»; o nome oficial do grupo não é inventado). Como o arquivo tem cores próprias e não pode ser recolorido, ele fica sobre uma **base clara neutra** em todos os temas. No **relatório HTML** e no **PDF do relatório** entra como crédito (PNG embutido), com a preferência «Incluir o logotipo do grupo nos relatórios» (ligada por padrão, guardada no dispositivo). **Não entra nas figuras exportadas** (vão para artigos). O ícone do aplicativo e do instalador continua o mesmo. O logo é marca do grupo e **não é coberto pela licença MIT** (nota em `docs/imagens/README.md`).

### 6. Gráficos e exportação

Na tela, as figuras usam os tokens do tema; **os arquivos exportados não mudam** (cores literais, fundo branco): o E2E exporta a mesma figura em quatro temas e compara o conteúdo (ignorando a data da exportação).

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Copiar o layout dos prompts (seções de abertura, bancadas, depoimentos) | São ilustrações de página; o conteúdo do aplicativo prevalece (ET12, seção 3) |
| Regras por tema nos componentes | Duplicação e risco de divergência; tokens bastam |
| Sombras em cada célula da grade | Desempenho e legibilidade em tabelas longas |
| Recolorir o logo por tema | O arquivo é a marca do grupo; uma base neutra resolve a legibilidade |
| Logo nas figuras exportadas | Figuras vão para artigos; decisão do usuário: só relatórios |

## Critérios e evidências

`themes.test.ts` (pares de texto e foco dos seis temas; lista de temas igual à do E2E); `themes-flow.spec.ts` (seletor, persistência, valor desconhecido, logo sem rede nos seis temas, exportação igual, grade com 1 000 linhas, movimento reduzido, `forced-colors` e 375 px com axe); `accessibility.spec.ts` (axe nos percursos com os seis temas); capturas inspecionadas dos três temas novos; [relatório de validação da v0.2](../../validation/reports/v0.2.0/README.md).
