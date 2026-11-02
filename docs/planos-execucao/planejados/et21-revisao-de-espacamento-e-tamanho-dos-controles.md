# ET21 — Revisão de espaçamento, preenchimento e tamanho dos controles da interface (e logo só no cabeçalho)

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F12 (verificação de interface), F01 (interface básica) |
| Marco | Prepara a v0.3 |
| Depende de | v0.2.0 (seis temas e barra lateral de seções); pode correr junto da ET13 |
| Módulos | U18 (temas e tokens), U01–U11 (telas), `app/app.css`, `themes/tokens.css` |
| Ativado em | — |
| Concluído em | — |

Origem: pedido do usuário em 2026-11-02, ao verificar a v0.2.0 instalada: «Os botões da interface também estão próximos; faça uma checagem na interface na v0.3 quanto a distância, padding e tamanho». Na mesma verificação o usuário pediu: «Não são necessários 2 logos, apenas o superior». **Só planejamento por ora**: nenhuma alteração de interface foi feita.

## 1. Objetivo

Auditar **todas as telas** quanto à distância entre controles, ao preenchimento interno e ao tamanho de botões, campos e alvos de clique, e corrigir o que estiver apertado, de forma **consistente nos seis temas**, em PT e EN, em 800 px e em 375 px, sem regressão de acessibilidade.

## 2. Situação atual (v0.2.0)

Medida no código em 2026-11-02 (`app/web/src/app/app.css`):

| Item | Valor atual | Observação |
|---|---|---|
| `.button` | altura mínima 40 px; preenchimento horizontal `--space-4` | tamanho normal |
| `.button.small` | altura mínima 32 px; preenchimento horizontal `--space-2` | pequeno demais para toque e apertado em linhas com vários botões |
| `.row` | `gap: var(--space-2)`, `align-items: end` | espaço entre botões da mesma linha provavelmente curto (o valor de `--space-2` deve ser conferido em `tokens.css`) |
| `.results-nav button` | `gap: 0.25rem` entre itens da barra lateral | candidato a revisão |
| Espaços fixos em `rem` e `px` misturados com tokens | vários | inconsistência |

Esses números são ponto de partida; a auditoria mede o que o usuário **vê** (capturas e medidas em cada tela), não só o CSS.

## 3. Escopo

**Inclui**

- Inventário de todas as telas e de todos os grupos de botões (tela inicial, fluxo guiado, grade de dados, importação, planejamento, análise, resultados em seções, otimização, confirmação, exportação, preferências, histórico, atualização).
- Regras explícitas, em tokens: distância mínima entre botões vizinhos, altura mínima dos controles (normal e pequeno), preenchimento interno e área de clique mínima.
- Correções em `app.css` e nos tokens; sem regras por tema espalhadas nos componentes (DT-0021).
- Teste automatizado que **mede** a distância e o tamanho dos controles nas telas principais e falha quando passam do limite.
- Capturas antes e depois, nos seis temas, PT e EN.
- **Logo só no cabeçalho:** retirar o logotipo da tela inicial («O que você quer fazer?»), que hoje repete o do cabeçalho; o logo do cabeçalho e o crédito nos relatórios continuam.

**Não inclui**

- Redesenho visual dos temas (cores e tipografia continuam como na v0.2).
- Mudança de fluxo ou de textos, salvo quebra de linha causada por controles apertados.

## 4. Requisitos detalhados

1. **Distância.** Entre controles interativos vizinhos (botões, caixas de seleção, campos), no mínimo **8 px** na mesma linha e **8 px** entre linhas; entre grupos de ações distintas, no mínimo 16 px. Valores finais confirmados na DT.
2. **Tamanho do alvo.** Altura mínima de **40 px** em botões normais e **32 px** no pequeno (WCAG 2.2, critério 2.5.8, mínimo de 24 px; o projeto adota mais que isso); em telas estreitas (≤ 640 px), 44 px para os botões principais. Largura mínima para botões só com ícone.
3. **Preenchimento.** Horizontal proporcional ao texto (mínimo `--space-3` no pequeno, `--space-4` no normal); sem texto colado na borda em nenhum idioma (EN e PT têm comprimentos diferentes).
4. **Consistência.** Um único conjunto de espaçamentos (tokens), usado em todas as telas; remoção de valores soltos em `rem` e `px` onde houver token equivalente.
5. **Temas e movimento.** O resultado vale nos seis temas, inclusive Clay e Industrial (bordas e sombras maiores não podem encostar nos vizinhos), em `forced-colors` e com `prefers-reduced-motion`.
6. **Responsivo.** 1200, 800 e 375 px; botões que não cabem quebram de linha em vez de encolher ou transbordar; sem rolagem horizontal.
7. **Teclado e foco.** O anel de foco não pode ficar cortado nem sobrepor o vizinho.

## 5. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Escala de espaçamento | Que valores têm os tokens `--space-*` e quais são os mínimos entre controles? | Manter a escala atual e corrigir os usos; ampliar `--space-2` | Impacto visual mínimo nas telas já boas, clareza, 375 px |
| Tamanhos | Altura 40/32 px como hoje, ou 44/36 px? | Manter; subir o pequeno para 36 px; 44 px só em celular | Toque, densidade da grade de dados e das tabelas, WCAG 2.2 |
| Como testar | Como medir distância e tamanho de forma estável? | Playwright com `boundingBox` e lista de grupos de controle; regra no axe | Estabilidade entre navegadores, manutenção |

## 6. Tarefas

- [ ] **T01** — Inventário: percorrer todas as telas nos seis temas e em 1200/800/375 px, listar os grupos de botões e medir distância, altura e preenchimento (planilha ou tabela em `docs/`), com capturas «antes».
- [ ] **T02** — DT com as regras de §4 e os valores finais dos tokens.
- [ ] **T03** — Correção em `app.css` e `tokens.css` (`.row`, `.button`, `.button.small`, barra lateral, grupos de ações de tabelas e figuras, painel de atualização), sem regras por tema.
- [ ] **T04** — Revisão tela a tela dos componentes que escapam das classes comuns (estilos locais, botões dentro de tabelas e da grade, `FigureCustomizer`, painéis de exportação).
- [ ] **T05** — Teste automatizado de distância e tamanho nas telas principais (quatro navegadores) e atualização dos testes de contraste e axe, se mudarem valores.
- [ ] **T06** — Capturas «depois» (seis temas, PT/EN, 800 e 375 px) arquivadas e inspeção visual registrada; conferência no WebView2.
- [ ] **T07** — Documentação: DT, ficha U18, guia de interface (se houver) e CHANGELOG.
- [ ] **T08** — **Logo único.** Remover o `GroupLogo` grande da tela inicial (`features/home/StartActions.tsx`), mantendo o do cabeçalho e o crédito nos relatórios; liberar o espaço (a pergunta «O que você quer fazer?» sobe); ajustar `themes-flow.spec.ts` (que confere o logo na tela inicial nos seis temas) para conferir só o cabeçalho e o relatório; atualizar a [DT-0021](../../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md) (decisão 5, que prevê cabeçalho e tela inicial) e o [plano da ET12](../concluidos/et12-temas-adicionais-e-identidade-do-grupo.md) com nota datada; conferir a captura nos seis temas e a ausência de requisições externas.

## 7. Entregas

Regras de espaçamento e tamanho em tokens, interface corrigida nos seis temas, teste automatizado de medidas e capturas antes e depois.

## 8. Critérios de conclusão

1. Nenhum par de controles vizinhos fica a menos da distância mínima, em nenhuma tela, tema, idioma ou largura verificada. *Evidência:* teste automatizado e capturas.
2. Nenhum botão fica abaixo da altura mínima; botões principais em telas estreitas atendem 44 px. *Evidência:* teste automatizado.
3. Axe sem violações; foco visível e não cortado; `forced-colors` e movimento reduzido preservados. *Evidência:* E2E.
4. Sem rolagem horizontal em 375 px. *Evidência:* E2E.
5. O logotipo aparece **uma única vez** na interface (cabeçalho); a tela inicial não o repete. *Evidência:* E2E nos seis temas e captura.
6. O usuário revisa as capturas antes e depois.

## 9. Verificação

E2E nos quatro navegadores; inspeção visual das capturas; conferência no WebView2 do Windows 10; teste de desempenho da grade de 1 000 linhas repetido (a densidade da grade não pode piorar o tempo).

## 10. Documentação a criar ou atualizar

DT nova; ficha U18; capturas em `docs/imagens/`; CHANGELOG; relatório de validação da v0.3.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Aumentar espaços empurrar conteúdo para fora em 375 px | Quebra de linha e teste em 375 px |
| Grade e tabelas perderem densidade | Regras só para controles interativos; medir a grade |
| Regressão visual em algum dos seis temas | Capturas antes e depois em todos; teste de medidas por tema |

## 12. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado a pedido do usuário («somente ao plano por enquanto»). Etapa não iniciada. |

## 13. Desvios e descobertas

Nenhum até o momento.
