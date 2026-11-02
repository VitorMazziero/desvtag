# ET11 — Seleção e comparação de modelos e navegação por seções dos resultados

| Campo | Valor |
|---|---|
| Estado | **Concluído** (2026-11-02; ver a seção 13 para o que ficou adiado) |
| Versão-alvo | v0.2.0 |
| Fases do roteiro | F03, F06 e F07 (refinamento dos modelos) e F12 (organização da interface) |
| Marco | Prepara a v0.2 |
| Depende de | ET01–ET10 (v0.1.0) |
| Módulos | C06–C08 (modelos), C12 (superfície), C17 (otimização), U07–U10 (resultados e otimização), U11 (estado), P01 (projeto) |
| Ativado em | 2026-11-01 |
| Concluído em | 2026-11-02 |

Origem: pedido do usuário em 2026-11-01, a partir do exemplo `examples/kLa` (composto central de face centrada com RPM e aeração, resposta kLa) e do comportamento do Protimiza que o usuário aprecia. As capturas do Protimiza ficam em `referencias/` (local, não versionadas); este plano descreve **o que o EnziTAG Optima deve oferecer**, não copia a interface do serviço.

## 1. Objetivo

Duas mudanças para a v0.2, além da migração do Node.js já decidida ([DT-0015](../../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)):

1. **Seleção e comparação de modelos.** Depois de ver o ajuste, o usuário liga e desliga termos do modelo (por exemplo, retirar o efeito quadrático de um fator) diretamente na tabela de coeficientes; o aplicativo recalcula, **compara o modelo atual com o completo e com o recomendado** e **recomenda** quais termos remover, explicando o motivo.
2. **Resultados organizados em seções com barra lateral.** A página de resultados deixa de ser uma coluna única e longa: cada assunto (resumo, modelo, diagnóstico, gráficos, otimização por desejabilidade, confirmação, exportação) é uma seção acessada por uma barra lateral, e a **exportação fica ao final**. O usuário vê pouca informação de cada vez.

## 2. Situação atual (v0.1.0) e o que muda

| Aspecto | Hoje | Na v0.2 |
|---|---|---|
| Escolha dos termos | Lista de caixas **antes** de calcular (etapa de análise: modelo completo × personalizado), sem retorno visual do ajuste | Caixas **na própria tabela de resultados**, ao lado de coeficiente, erro-padrão, t e valor-p; recalcula ao alternar |
| Orientação | Aviso genérico de hierarquia e termos não estimáveis | Recomendação de remoção passo a passo, respeitando hierarquia, com o efeito de cada passo nas métricas |
| Comparação de modelos | Inexistente (um modelo por vez) | Tabela lado a lado: completo, atual e recomendado |
| Várias respostas | Um modelo por experimento (`analysis.designTerms`); a otimização aceita termos por resposta | Um modelo **por resposta** (Y₁, Y₂, Y₃…), salvo no projeto e usado pela otimização |
| Página de resultados | Interpretação, tabelas, gráficos, equação, região, superfície 3D e contorno, **exportar** e, **depois**, a otimização completa (objetivos, candidatos, desejabilidade, compromissos, confirmação): rolagem longa | Seções por barra lateral; **Exportar** como última seção |

## 3. Escopo

**Inclui**

- Tabela de termos interativa (superfície de resposta e modelos lineares do aplicativo) com recálculo, descarte de respostas obsoletas e persistência no projeto.
- Métricas de comparação calculadas **no núcleo Rust** e recomendação de remoção por eliminação regressiva com hierarquia.
- Modelo por resposta, ligado à otimização e à proposta de confirmação.
- Layout de resultados por seções com barra lateral para comparação de tratamentos, planejamentos de dois níveis, superfície e otimização; relatório HTML continua completo e em sequência.
- Exemplo `kLa` como caso de aceitação (ver T13).

**Não inclui**

- Seleção automática irreversível de modelo (a decisão é sempre do usuário; ver §4).
- Modelos não lineares, mistos e regularizados (F09).
- Mudar o relatório HTML para o formato por seções: ele permanece um documento único e linear.

## 4. Requisitos detalhados

### 4.1 Seleção e comparação de modelos

1. **Tabela de termos.** Nome do termo, caixa de seleção, coeficiente, erro-padrão, t calculado e valor-p, com o intercepto sempre presente e **não removível**. Termos não significativos ao nível α escolhido ficam destacados (cor e texto, nunca só cor).
2. **Recálculo ao alternar.** Cada alteração envia ao motor o conjunto de termos; a tabela, a ANOVA, a falta de ajuste, o R² e os gráficos mostram o **modelo atual**. Respostas atrasadas são descartadas (mecanismo do cliente do motor, DT-0013) e há indicação de “calculando”.
3. **Hierarquia.** Remover x₁ enquanto x₁² ou x₁·x₂ permanecem exige confirmação com aviso (o núcleo já informa `hierarchy_gaps`); a **recomendação** nunca propõe uma remoção que quebre a hierarquia sem avisar.
4. **Recomendação.** Botão *Sugerir remoções* executa a **eliminação regressiva**: em cada passo remove o termo de maior valor-p acima de α que respeite a hierarquia, recalcula e repete até não haver candidato. A tela mostra a **sequência** (modelo, termo removido, motivo, efeito nas métricas), permite parar em qualquer passo, *Aplicar* o modelo recomendado e *Desfazer*. A mensagem ao usuário segue o princípio do Protimiza de remover **em ordem decrescente de valor-p**, explicado em uma frase.
5. **Comparação.** Tabela com colunas *completo*, *atual* e *recomendado*, e linhas: número de parâmetros, graus de liberdade do resíduo, **R²**, **R² ajustado**, **R² predito (PRESS)**, quadrado médio do resíduo (ou RMSE), **valor-p do modelo (F)**, **valor-p da falta de ajuste** (quando há erro puro) e **AICc** (BIC como critério adicional). Qual critério é “o melhor” é uma decisão técnica a registrar (T02); a tela explica o que cada métrica mede e **não declara um vencedor único**.
6. **Salvaguardas.** Aviso quando o modelo reduzido tem falta de ajuste significativa, quando restam poucos graus de liberdade no resíduo, quando o R² predito é muito menor que o R² ajustado (sinal de sobreajuste) e que os valores-p **após a seleção por dados são otimistas** (a confirmação com ensaios novos continua recomendada).
7. **Várias respostas.** Seletor de resposta no topo (Y₁, Y₂, …) com um modelo independente por resposta; indicador de quais respostas já têm modelo ajustado. A otimização por desejabilidade usa o modelo escolhido de cada resposta e marca o resultado como **desatualizado** se o modelo mudar depois.
8. **Persistência e rastreio.** Os termos escolhidos por resposta são gravados no projeto (campo opcional do experimento; esquema 1 mantido, como em [DT-0016](../../decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)); o resultado guardado fica ligado à revisão e à assinatura dos termos, e reabrir **não recalcula**.
9. **Exportação.** Os arquivos exportados informam os termos do modelo, o critério usado e a sequência de remoções aplicada (proveniência).

### 4.2 Organização por seções e barra lateral

1. **Barra lateral** (ou menu recolhível em telas estreitas) com as seções da análise atual; o item ativo é identificado por texto e `aria-current`, não só por cor. Uma seção é exibida por vez; as demais não são renderizadas, o que também reduz o trabalho da página.
2. **Seções por tipo de análise** (proposta, a refinar na DT de T10):

| Análise | Seções |
|---|---|
| Superfície de resposta (ex.: kLa) | Resumo · Modelo (tabela de termos, equação, comparação) · Diagnóstico (ANOVA, falta de ajuste, observado × previsto, resíduos) · Gráficos (contorno, superfície 3D) · **Otimização por desejabilidade** · Confirmação · **Exportar** |
| Planejamento de dois níveis | Resumo · Efeitos (tabela, Pareto) · Diagnóstico · Gráficos · Exportar |
| Comparação de tratamentos | Resumo · Tabelas (ANOVA, grupos, pares) · Gráficos · Diagnóstico · Exportar |
| Descritiva | Resumo · Tabelas · Exportar |

3. **Exportar por último.** Tabelas, figuras, relatório HTML e as preferências de exportação ficam juntos na última seção; as seções anteriores mantêm apenas os botões contextuais já existentes (CSV/XLSX de cada tabela e SVG/PNG de cada figura), sem seção “Exportar” no meio do caminho.
4. **Otimização como seção própria**, com sub-passos (objetivos → busca → candidatos → desejabilidade → compromissos); a confirmação em seção seguinte. Hoje ela vem depois da exportação, na mesma página.
5. **Estado.** A seção ativa é lembrada ao navegar e ao recarregar (estado de interface, não do projeto) e o aviso de *resultado desatualizado* aparece em todas as seções.
6. **Qualidade:** teclado (Tab, setas na barra), foco visível, leitor de tela, PT/EN, todos os temas disponíveis (a lista `THEMES`, não três nomes fixos), axe sem violações, layout em 800 px e em largura de celular; a navegação não pode esconder o aviso de dados alterados.
7. **Relatório HTML** continua autocontido e **completo** (todas as seções em sequência), independente da seção ativa na tela.

## 5. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Critérios de comparação e recomendação (T02) | Qual métrica guia a recomendação e como tratar empates e hierarquia? | Valor-p (eliminação regressiva clássica), AICc, BIC, PRESS/R² predito, combinação com regras de segurança | Previsão fora da amostra, simplicidade, clareza ao iniciante, poucos graus de liberdade (desenhos de 14 a 30 ensaios) |
| Onde calcular (T03) | Nova operação ou ampliação de `surface.analyze`? | `model.compare` separada; campos novos no resultado existente | Uma operação por pergunta, cancelamento, tamanho da resposta |
| Armazenamento dos termos (T05) | Como guardar um modelo por resposta? | Campo opcional no experimento (mapa resposta → termos); reaproveitar `AnalysisOptions` | Esquema aditivo, reabertura sem recálculo, compatibilidade com v0.1 |
| Padrão de navegação (T10) | Barra lateral fixa, abas verticais ou rolagem com âncoras? | Painéis por seção com barra lateral; âncoras com rolagem | Acessibilidade, desempenho, retorno do usuário à seção, impressão |

## 6. Tarefas

- [x] **T01** — Migrar o Node.js do 22 para o 26 e repetir as verificações da v0.1 ([DT-0015](../../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)), **antes** de qualquer funcionalidade. Executada em 2026-11-01 (commit `ee976c4`, Node 26.13.0); vitest, Chromium, Firefox, Chrome, Edge, Rust, Tauri e instalador repetidos na [verificação final](../../../validation/reports/v0.2.0/README.md).
- [x] **T02** — DT dos critérios de comparação e da recomendação (§4.1, itens 4 a 6), com a especificação do método em `docs/metodos/`. [DT-0018](../../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md) e [especificação](../../metodos/selecao-de-modelos.md): recomendação por eliminação regressiva com hierarquia; métricas AICc, BIC, PRESS e `R²` predito exibidas, sem métrica única.
- [x] **T03** — Núcleo (`models`, `surface`): matriz chapéu → PRESS e R² predito; AIC, AICc e BIC; eliminação regressiva com hierarquia; resultado tipado (sequência, motivos, estados indefinidos), sem `NaN`. `optima-core::surface::selection` (PRESS, `R²` predito, AIC, AICc, BIC, eliminação regressiva com hierarquia; estados indefinidos explícitos).
- [x] **T04** — Operação do motor, contratos TypeScript gerados e paridade WebAssembly × nativo × Tauri; casos de validação independentes (Python/NumPy/statsmodels) incluindo o exemplo kLa e um caso com 3 respostas e 4 fatores como o mostrado nas capturas do Protimiza (27 ensaios, 14 termos). Operação `surfaceSelectModel`, contratos gerados e paridade WebAssembly × nativo × Tauri; 3 casos independentes (statsmodels) com 2, 3 e 4 fatores e o [exemplo 06 — kLa sintético](../../../examples/06-kla-sintetico/README.md) como caso de aceitação (dados sintéticos; os reais seguem sem distribuição, PD-16).
- [x] **T05** — Estado e projeto: termos por resposta (campo opcional), assinatura de resultado, revisão e reabertura sem recálculo; teste de projeto da v0.1 abrindo sem migração. `analysis.responseModels` guarda o modelo de **cada resposta** (campo opcional `response_models` no projeto, `schemaVersion` 1); `designTerms` é o da resposta analisada; reabrir não recalcula; projeto sem o campo abre sem migração (testes de estado e E2E).
- [x] **T06** — Interface: tabela de termos interativa nos resultados (`ModelTable`), seletor de resposta, recálculo com descarte de respostas obsoletas, avisos de hierarquia. `ModelPanel` com termos ligáveis, recálculo imediato, confirmação ao quebrar a hierarquia e **seletor de resposta**. Os termos ficam no painel da seção «Modelo» (não dentro da tabela de coeficientes): equivalente funcional.
- [x] **T07** — Interface: painel de comparação e recomendação (sequência de remoções, aplicar, desfazer), explicações curtas PT/EN e salvaguardas. Comparação completo × atual × recomendado, sequência sugerida com «usar este modelo», «aplicar a recomendação», «voltar ao modelo completo» e avisos (falta de ajuste, poucos graus de liberdade, sobreajuste); PT/EN.
- [x] **T08** — Integração com a otimização e a confirmação: usar o modelo escolhido por resposta e marcar como desatualizado quando mudar. A otimização usa o modelo escolhido de **cada resposta** (`effectiveSetup`: os termos entram no pedido e na assinatura, de modo que mudar o modelo marca a otimização como desatualizada); teste de unidade.
- [~] **T09** — Avaliar a mesma seleção para os efeitos de planejamentos de dois níveis (decisão registrada na DT de T02; pode ficar para a v0.2.x). Adiada para a v0.2.x (decisão registrada na DT-0018).
- [x] **T10** — DT do padrão de navegação e do mapa de seções (§4.2). [DT-0018](../../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md), seção 4.
- [x] **T11** — Componente de layout de resultados com barra lateral; mover **Exportar** para o final; otimização e confirmação como seções próprias. `SectionedResults`: resumo, tabelas, efeitos, modelo, diagnósticos, figuras, otimização, confirmação e **exportação por último**; opção «mostrar todas as seções».
- [x] **T12** — Garantir o relatório HTML completo e em sequência; E2E por seção (teclado, foco, seção lembrada, estreito e largo) e axe nos todos os temas disponíveis (a lista `THEMES`, não três nomes fixos). Relatório HTML completo e em sequência (sem o componente); E2E `sections-flow` (inclui a comparação de um fator e a seção lembrada) e axe nos seis temas.
- [x] **T13** — Exemplo `kLa`: renomear o arquivo (sem espaços nem parênteses), documentar no README do exemplo e usá-lo como caso de aceitação. Exemplo sintético equivalente [`examples/06-kla-sintetico`](../../../examples/06-kla-sintetico/README.md) (composto central de face centrada, RPM e aeração, kLa e potência), gerado pelo aplicativo (`scripts/make-example-kla.mjs`) e conferido contra regressão independente. **Decisão do usuário (2026-11-02):** sem confirmação de distribuição dos dados reais (PD-16), usar o exemplo sintético; os dados reais continuam só na máquina do usuário.
- [x] **T14** — Documentação: fichas U07–U10, mapa de módulos, matriz de cobertura, guia de resultados e CHANGELOG. DT-0018/0019/0020, sete especificações de métodos, mapa de módulos, matriz, fichas C09, P01, U07–U09–U16 e U18, guia de exportação, limites operacionais, README e CHANGELOG. O guia de resultados não foi criado; o conteúdo está nas especificações e no guia de exportação.

**Escopo ampliado em 2026-11-01** (pedido da «Fase 2 — v0.2», [decisões aprovadas §16](../../produto/decisoes-aprovadas.md#16-escopo-e-plataforma-da-v02-2026-11-01)); todas as tarefas abaixo foram executadas:

- [x] **T15** — Desempenho do valor-p de Tukey: tabela de Chebyshev de `W(w; k)` ([DT-0019](../../decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)). Medido no Windows 10 do desenvolvimento (`release`): 40 grupos × 30 repetições de ≈ 5 s para ≈ 61 ms e 100 grupos × 30 de ≈ 30 s para ≈ 126 ms ([limites operacionais](../../arquitetura/limites-operacionais.md)).
- [x] **T16** — Procedimentos de comparação: Games–Howell (ANOVA de Welch), Dunnett exato, Bonferroni, Holm e Kruskal–Wallis/Dunn; seletor de método, tabelas, letras e gráfico ([especificações](../../metodos/procedimentos-comparacao-multipla.md)).
- [x] **T17** — ANOVA multifatorial com blocos (tipos I, II e III), médias marginais, comparações e contrastes ([especificação](../../metodos/anova-multifatorial.md)).
- [x] **T18** — DBC aleatorizado: núcleo, operação, painel de planejamento, matriz em CSV/XLSX e análise preparada com o bloco ([especificação](../../metodos/delineamento-em-blocos.md)).
- [x] **T19** — Figuras: letras manuais (identificadas como manuais na legenda), anotações livres e personalização completa (cor, fundo, fonte, grade, legenda, resolução do PNG), salvas no projeto ([DT-0020](../../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)).
- [x] **T20** — PDF de figuras (vetorial) e de relatórios (A4, mesmo conteúdo do relatório HTML), com fonte embutida, gerado localmente; verificado também no aplicativo nativo.
- [x] **T21** — Windows 10 como plataforma verificada da v0.2 (decisões aprovadas §16; relatório de validação da v0.2).
- [x] **T22** — Versão 0.2.0 nos manifestos e na interface; auditoria de licenças (pdfmake e dependências; Roboto OFL-1.1).

## 7. Entregas

Seleção e comparação de modelos com recomendação, salva no projeto; resultados em seções com barra lateral e exportação ao final; procedimentos de comparação adicionais, ANOVA multifatorial com blocos, médias marginais e contrastes, DBC; figuras totalmente personalizáveis; PDF de figuras e relatórios; documentação e validação correspondentes. **Adiado:** a seleção de modelos para os efeitos de planejamentos de dois níveis (T09).

## 8. Critérios de conclusão

1. [x] Alternar um termo no painel do modelo recalcula o modelo e atualiza coeficientes, ANOVA, falta de ajuste, R² e gráficos; respostas atrasadas não substituem o resultado atual. *Evidência:* teste do cliente e E2E.
2. [x] As métricas de comparação (R² ajustado, R² predito, AICc, BIC, valor-p do modelo e da falta de ajuste) coincidem com a referência independente nas tolerâncias registradas, no Windows nativo, no WebAssembly e nos exemplos (kLa e o caso de 4 fatores). *Evidência:* casos em `validation/cases/` e testes de paridade. **Situação:** conferido nos 3 casos independentes (2, 3 e 4 fatores) no Rust e no WebAssembly; o exemplo kLa não foi usado (PD-16).
3. [x] A recomendação mostra a sequência de remoções, respeita a hierarquia e nunca remove o intercepto; o usuário pode aplicar, parar em um passo e desfazer. *Evidência:* testes do núcleo e E2E.
4. [x] Cada resposta tem seu modelo, gravado no projeto; reabrir não recalcula; a otimização usa o modelo escolhido e marca desatualização. *Evidência:* testes de estado (`responseModels.test.ts`), E2E `sections-flow` (exemplo 06) e verificação nativa.
5. [x] A página de resultados usa seções com barra lateral; **Exportar é a última seção**; a otimização e a confirmação são seções próprias. *Evidência:* E2E e captura de tela em PT/EN e nos todos os temas disponíveis (a lista `THEMES`, não três nomes fixos).
6. [x] Teclado, foco, leitor de tela e axe sem violações nos todos os temas disponíveis (a lista `THEMES`, não três nomes fixos); uso em 800 px; relatório HTML completo. *Evidência:* E2E e inspeção registrada.
7. [x] Projetos da v0.1 abrem sem migração e sem perda; Node 26 verificado (T01). *Evidência:* teste de abertura dos exemplos (E2E e verificação nativa) e [relatório de validação da v0.2](../../../validation/reports/v0.2.0/README.md). A CI do GitHub **ainda não rodou** com o Node 26 (nada foi enviado).

## 9. Verificação

Rust (fmt, Clippy, testes e casos independentes); vitest e E2E em Chromium, Firefox, Chrome e Edge; verificação nativa no Windows; inspeção visual das seções e do relatório; conferência numérica das métricas com Python.

## 10. Documentação a criar ou atualizar

DT dos critérios de seleção e DT da navegação; especificação do método de seleção e comparação de modelos; fichas U07–U10 e P01; [mapa de módulos](../../arquitetura/mapa-modulos.md); [matriz de cobertura](../../produto/matriz-cobertura.md); guias de resultados e exportação; README do exemplo kLa; CHANGELOG.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| A recomendação induzir sobreajuste ou conclusões otimistas | Salvaguardas e avisos (§4.1, item 6); decisão final do usuário; confirmação com ensaios novos |
| Desenhos pequenos (14 a 30 ensaios) deixarem poucos graus de liberdade | Mostrar os graus de liberdade, bloquear a sugestão quando o resíduo ficar sem graus e explicar |
| Recalcular a cada clique tornar a interface lenta | Cálculo no motor (milissegundos nesse porte), descarte de respostas obsoletas e indicador de progresso |
| Navegação por seções esconder avisos importantes | Aviso de resultado desatualizado em todas as seções; teste E2E dedicado |
| Mudar o projeto quebrar arquivos da v0.1 | Campos opcionais, esquema 1 mantido, teste de abertura dos exemplos |
| Dados reais do kLa sem autorização para distribuição | PD-16: nada é versionado antes da confirmação do usuário |

## 12. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-01 | Plano criado a pedido do usuário (seleção e comparação de modelos; seções com barra lateral). Etapa não iniciada. |
| 2026-11-01 | Coordenação com a [ET12](et12-temas-adicionais-e-identidade-do-grupo.md) (três temas novos, v0.2): os testes e as capturas desta etapa percorrem a lista de temas em vez de três nomes fixos, e o layout com barra lateral (T11) é verificado nos seis temas quando a ET12 chegar (ET12-T14). Nenhuma tarefa da ET11 mudou. |

| 2026-11-01 | **Ativada** (`git mv` para `ativos/`) por pedido do usuário («Implemente Fase 2 por completo — v0.2 (ET11)»), com escopo ampliado (T15–T22). T01 (Node 26) executada primeiro (`ee976c4`). Núcleo: Tukey tabulado, procedimentos, ANOVA multifatorial, seleção de modelos e DBC (commits `2ba8e07`…`7871df1`). Interface e estado: seções, painel do modelo, procedimentos e ANOVA multifatorial, painel do DBC, figuras completas e PDF. Documentação: DT-0018/0019/0020, sete especificações de métodos, mapa de módulos, matriz, guia de exportação, limites operacionais e CHANGELOG. Verificação final no [relatório da v0.2](../../../validation/reports/v0.2.0/README.md). |

## 13. Desvios e descobertas

1. **Modelo por resposta, seção ativa lembrada e exemplo kLa** ficaram inicialmente de fora (2026-11-01) e foram **implementados em 2026-11-02**, por pedido do usuário. O exemplo kLa é **sintético** (decisão do usuário: PD-16 sem confirmação de distribuição dos dados reais).
2. **Termos no painel «Modelo», não dentro da tabela de coeficientes** (T06): equivalente funcional.
3. **Escopo ampliado** (T15–T22) por pedido do usuário; a [ET12](et12-temas-adicionais-e-identidade-do-grupo.md) (temas e logo) foi implementada junto, por decisão do usuário.
4. **Descoberta na verificação do PDF:** a lista de extensões do comando nativo `export_file` não incluía `pdf` (a exportação falharia no aplicativo Windows); corrigido e testado. O conversor de SVG também não desenha padrões, `paint-order` nem o símbolo «→» na Roboto (adaptados no [DT-0020](../../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)).
5. **Descoberta de licença:** a Roboto embutida no pdfmake é **OFL-1.1** (conforme a licença gravada na própria fonte), não Apache-2.0; os avisos de terceiros e os documentos foram corrigidos.
6. **Medição de desempenho:** a comparação v0.1 × v0.2 foi refeita **na mesma máquina** (a medição original da v0.1 foi em outro equipamento); o ganho é maior (30 s → 126 ms com 100 grupos) do que a estimativa inicial.
7. **Telas sem seções:** a comparação de um fator e os planejamentos de dois níveis não tinham seções na primeira entrega; passaram a ter (resumo, tabelas, diagnósticos, figuras, exportação), com o painel de exportação (relatórios HTML e PDF) na última seção.
8. **Chave do atualizador:** a cópia local não estava onde a documentação dizia; o usuário a moveu para `D:\Arquivos_de_Programas\Rust\tauri` e o instalador da v0.2 foi assinado com ela.
9. **Teste nativo do DBC:** a semente 9223372036854775813 do caso 5 excede o inteiro seguro do JavaScript e só é verificada no Rust; a verificação nativa e a do WebAssembly usam os casos com semente representável.
