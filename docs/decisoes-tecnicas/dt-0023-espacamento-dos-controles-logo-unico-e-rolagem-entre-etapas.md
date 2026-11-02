# DT-0023 — Espaçamento dos controles, logotipo único e rolagem entre etapas (ET21)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-02 |
| Origem | Verificação da v0.2.0 instalada pelo usuário (2026-11-02); [ET21](../planos-execucao/concluidos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md) |
| Pendências relacionadas | PD-17 (revisada: o logotipo sai da tela inicial) |
| Substitui / substituída por | Revisa a decisão 5 da [DT-0021](dt-0021-temas-adicionais-fontes-e-logo.md) (logotipo no cabeçalho **e** na tela inicial) |

## Decisões

### 1. Tokens de espaçamento e altura dos controles

`tokens.css` ganha quatro tokens, usados por todos os grupos de botões em `app.css` (sem regra por tema):

| Token | Valor | Uso |
|---|---|---|
| `--gap-controls` | 16 px | distância horizontal mínima entre botões vizinhos (`.row`, `.tabs`, `.steps`, `.step-actions`, histórico, legenda de figura, barra de seções em tela estreita) |
| `--gap-controls-row` | 8 px | distância entre linhas de botões e entre os itens da barra lateral de seções |
| `--control-height` | 40 px | altura mínima de botões, abas e etapas |
| `--control-height-small` | 36 px (era 32 px) | altura mínima do botão pequeno; preenchimento horizontal 16 px (era 8 px) |

Medida na v0.2.0: botões vizinhos a 8 px; barra lateral de seções a 4 px. O teste `layout-flow.spec.ts` mede os botões das telas principais (inicial, variáveis, resultados e dados do exemplo 01) nos **seis temas** e em **1200 e 375 px** e exige ≥ 12 px na mesma linha, ≥ 8 px entre linhas e altura ≥ 36 px; ele apontou os pares «Voltar → Avançar» (8 px) e a barra de seções (4 px), corrigidos.

### 2. Um único logotipo

O logotipo do grupo aparece **só no cabeçalho** (e como crédito nos relatórios, desligável). O da tela inicial foi retirado a pedido do usuário; o tamanho `large` do componente foi removido. O E2E exige exatamente uma imagem `.group-logo` na tela inicial e confere o logotipo (largura natural, texto alternativo, sem rede) nos seis temas.

### 3. Rolagem ao trocar de etapa

Ao avançar, voltar ou escolher outra etapa na barra, o fluxo rola até o topo (`scrollIntoView`, `block: start`) com `behavior: smooth`; com `prefers-reduced-motion: reduce`, `auto` (sem animação). O foco vai ao título da etapa (`h2`, `tabindex=-1`, `preventScroll`) para que leitores de tela e o teclado comecem pelo conteúdo novo. **Não rola na primeira exibição** (restaurar a etapa ao abrir ou recarregar). Código em `features/workflow/scrollToStep.ts`.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Aumentar `--space-2` globalmente | Afetaria também texto, tabelas e grade (perda de densidade) |
| Rolar ao topo absoluto da página | O cabeçalho do aplicativo e o projeto ocupam o topo; o início do fluxo é o ponto útil |
| Rolar sem mover o foco | Leitor de tela continuaria no botão da etapa anterior |

## Evidências

`layout-flow.spec.ts` (medidas nos seis temas e duas larguras, rolagem suave e imediata, foco no título, um único logotipo), `scrollToStep.test.ts`, `themes-flow.spec.ts` (logotipo).
