# ET29 — Reorganização da interface e da navegação

| Campo | Valor |
|---|---|
| Estado | **Ativo** (primeira etapa da v0.4) |
| Versão-alvo | v0.4.0 |
| Fases do roteiro | F12 (interface, acessibilidade), F10 (relatórios) |
| Marco | Prepara a v0.4 |
| Depende de | v0.3.0 publicada (feito) |
| Módulos | U01 (`app/`, cabeçalho e menus), U02/U03 (`features/workflow`, percurso guiado), U08/U16 (`features/results`, `features/export`, relatório), U14 (`features/project`, `features/drive`, área de salvamento), U18 (`styles`, tokens), U17 (i18n PT/EN) |
| Ativado em | 2026-11-02 |
| Concluído em | — |

## 1. Objetivo

Corrigir os dois defeitos da v0.3.0 e reorganizar a interface pedida pelo usuário depois de usar a versão publicada: menus em vez de blocos soltos, um **percurso guiado por blocos** com Voltar e Seguir e opções dependentes reveladas conforme a escolha, melhor uso do espaço no computador, tela inicial sem ambiguidade, área de salvamento compacta e relatório que começa pelo que interessa. Evidências «antes» em [`docs/imagens/evidencias-v0.3.0/`](../../imagens/evidencias-v0.3.0/README.md); escopo em [plano da v0.4](../plano-v0.4.md#et29--reorganização-da-interface-e-da-navegação-primeira-da-v04).

## 2. Escopo

**Inclui**

- Defeitos da v0.3.0: relatório (PDF, Word, HTML) sem resultados quando a barra de seções está ativa; item ativo ilegível no modo escuro.
- Menus no cabeçalho: **Arquivo** (novo, abrir, salvar; computador ou Drive), **Extras** (calculadora de potência, curvas de saturação), **Sobre e atualizações** (histórico de versões, motor científico, canal e *Verificar atualizações*).
- Percurso guiado por blocos em todas as etapas (objetivo, fatores e respostas, planejamento e dados, análise, resultados), com barra lateral do percurso no computador e seletor no topo em telas estreitas; «Mostrar tudo» como alternativa.
- Tela inicial com uma ação de começar em cada uma das três opções e «Abrir projeto» separado.
- Espaçamento vertical maior entre blocos e seções; títulos de bloco destacados.
- Valores-p sem sublinhado tracejado.
- Nomes das variáveis nas equações e figuras (`ŷ` → nome da resposta) com alternância notação × nomes.
- Proveniência no fim do relatório, de forma sucinta.

**Não inclui**

- Mudança de cálculo, de formato do projeto ou de método (nenhum resultado numérico muda).
- Guardar resultados das famílias novas no projeto (ET22).
- Revisão fina tela a tela dos componentes fora das classes comuns (ET27).

## 3. Entradas e referências

- Pedido do usuário em 2026-11-02 ([decisões aprovadas §18](../../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02), itens 6 a 8).
- [DT-0018](../../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md) (resultados em seções), [DT-0023](../../decisoes-tecnicas/dt-0023-espacamento-dos-controles-logo-unico-e-rolagem-entre-etapas.md) (espaçamento, rolagem entre etapas), [DT-0025](../../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md) (Drive), [DT-0026](../../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md) (Word, comentários, canais).
- Exemplo [14](../../../examples/14-meios/README.md) (projeto real do defeito do relatório).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Navegação por blocos | Como dividir cada etapa em blocos e guardar o bloco atual? | Lista declarativa de blocos por etapa com condição de exibição; estado do bloco na interface (não no projeto) | Opções dependentes só depois da escolha; Voltar/Seguir previsíveis; teclado e leitores de tela; «Mostrar tudo» |
| Menus do cabeçalho | Menu suspenso, barra de abas ou painel lateral? | Botões de menu com `aria-haspopup` e painel; folha lateral no celular | Acessibilidade (axe, teclado), 375 px, seis temas |
| Relatório fora da tela | Onde montar o relatório para que nada da interface o altere? | Raiz própria fora do `SectionedResults`; ou filtro `[data-report-root]` | Robustez a mudanças futuras da interface |

## 5. Tarefas

- [x] **T01** — **Defeito (corrigido):** relatório completo com a barra de seções ativa (ignorar `[data-report-root]` ao aplicar as seções, ou montar o relatório fora dela); E2E que gera HTML, PDF e Word **sem** «Mostrar todas as seções» e com o exemplo 14, conferindo resumo, modelo, ANOVA, figuras e otimização.
- [x] **T02** — **Defeito (corrigido):** item ativo da barra de seções com `--color-on-action`; axe da barra com item ativo nos seis temas.
- [ ] **T03** — DTs da §4.
- [x] **T04** (menus; o nome do projeto no cabeçalho vem com a T05) — Cabeçalho com os menus **Arquivo**, **Extras** e **Sobre e atualizações**; nome do projeto editável no cabeçalho.
- [ ] **T05** — Área de salvamento: Novo/Abrir/Salvar como botões divididos (computador ou Drive), indicador único de estado com painel de detalhes, Drive como indicador discreto, explicações em «Saiba mais», avisos temporários.
- [x] **T06** — **Extras:** calculadora de potência e curvas de saturação saem da tela inicial e da análise do DoE e passam a abrir pelo menu, com os dados do projeto quando fizer sentido (saturação usa um fator e uma resposta do experimento).
- [ ] **T07** — Tela inicial: ação de começar em cada opção; «Abrir projeto» e «Projetos recentes» separados; sem «Avançar» solto.
- [ ] **T08** — Percurso guiado por blocos com barra lateral do percurso (etapa e bloco), Voltar e Seguir por bloco, opções dependentes reveladas conforme a escolha, «Mostrar tudo»; rolagem e foco no título do bloco ao trocar (como na DT-0023).
- [ ] **T09** — Layout largo no computador (barra do percurso + conteúdo; uso das margens), seletor no topo em telas estreitas; tokens de espaçamento vertical entre blocos e seções.
- [x] **T10** — Valores-p sem tracejado; nomes das variáveis nas equações e figuras com alternância notação × nomes (preferência do dispositivo).
- [x] **T11** — Relatório: proveniência no fim, sucinta (completa nos metadados); HTML, PDF e Word.
- [ ] **T12** — Verificação: E2E dos menus, da tela inicial, do percurso (Voltar/Seguir, dependências, «Mostrar tudo»), da área de salvamento (local e Drive simulado) e do relatório; medição em 1920, 1200, 800 e 375 px nos seis temas; axe; verificação nativa no Windows 10; capturas «depois» ao lado das «antes».
- [ ] **T13** — Documentação: DTs, guias (resultados, exportação, Drive, planilha de coleta) com as novas telas, ficha U18, CHANGELOG, matriz de cobertura.

## 6. Entregas

Relatórios completos com a barra de seções ativa; modo escuro legível; cabeçalho com menus; área de salvamento compacta; percurso guiado por blocos; tela inicial clara; layout largo; equações com nomes das variáveis; relatório que começa pelos resultados.

## 7. Critérios de conclusão

1. Relatórios HTML, PDF e Word do exemplo 14 trazem resumo, modelo, ANOVA, figuras e otimização **com a barra de seções ativa**.
2. Nenhuma opção dependente aparece antes da escolha de que depende; Voltar e Seguir funcionam por teclado; «Mostrar tudo» mostra a etapa inteira.
3. Potência e curvas de saturação abrem pelo menu «Extras»; histórico, motor e atualizações, pelo menu «Sobre e atualizações».
4. A área de salvamento cabe numa linha no computador; estado único e detalhes sob demanda.
5. axe sem violações nos seis temas; 375 px sem rolagem horizontal; E2E em cinco navegadores e verificação nativa no Windows 10 verdes.
6. Capturas «depois» arquivadas ao lado das «antes».

## 8. Verificação

vitest; E2E em Chromium, Firefox, WebKit, Chrome e Edge; axe; medição automática de layout; verificação nativa no Windows 10 (WebView2 por CDP, incluindo o relatório em Word e PDF); inspeção visual registrada.

## 9. Documentação a criar ou atualizar

DTs; guias de resultados, exportação, Drive e planilha de coleta; ficha U18; [mapa de módulos](../../arquitetura/mapa-modulos.md); CHANGELOG; matriz de cobertura; README das evidências com as capturas «depois».

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Percurso guiado esconder opções que usuários experientes querem ver | «Mostrar tudo» por etapa, lembrado no dispositivo |
| Mudança grande quebrar os E2E existentes (rótulos e ordem) | Migrar os E2E por etapa, mantendo os mesmos `data-testid`; rodar a suíte inteira a cada tarefa |
| Menus pouco acessíveis | Padrão de botão de menu com teclado e axe desde a T04 |
| Relatório voltar a depender da interface | T01 com teste que gera o relatório nas condições reais (barra ativa) |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado a partir dos pedidos do usuário e dos defeitos da v0.3.0. Etapa não iniciada. |
| 2026-11-02 | **Ativada** pelo usuário («Sim, começar ET29») na ramificação `feat/v0.4`. |
| 2026-11-02 | **T01 e T02 entregues.** Causa do relatório vazio: a barra de seções ativa escondia, por `hidden`, os blocos `data-section` do relatório montado fora da tela dentro da seção «Exportar»; agora `SectionedResults` ignora os blocos dentro de `[data-report-root]`. Teste `report-sections.spec.ts` (HTML, PDF e Word com a barra ativa iguais aos de «mostrar todas»; exemplo 14; axe da barra nos 6 temas): **falha sem a correção** (verificado) e passa com ela em Chromium, Firefox e WebKit. O item ativo usa `--color-on-action`. |

| 2026-11-02 | **T10 e T11 entregues**: equações com os nomes das variáveis (opção para ŷ e x₁, x₂ com legenda), valores-p sem tracejado, proveniência sucinta no fim do HTML, PDF e Word (completa nos metadados). **T04 (menus) e T06 entregues**: menus «Extras» (potência e curvas de saturação em janelas modais) e «Sobre e atualizações» (histórico, motor e atualizações); `Menu` e `Modal` novos em `features/menus`. Testes E2E adaptados com `tests/e2e/menus.ts`. |

## 12. Desvios e descobertas

Nenhum até o momento.
