# ET11 — Seleção e comparação de modelos e navegação por seções dos resultados

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.2.0 |
| Fases do roteiro | F03, F06 e F07 (refinamento dos modelos) e F12 (organização da interface) |
| Marco | Prepara a v0.2 |
| Depende de | ET01–ET10 (v0.1.0) |
| Módulos | C06–C08 (modelos), C12 (superfície), C17 (otimização), U07–U10 (resultados e otimização), U11 (estado), P01 (projeto) |
| Ativado em | — |
| Concluído em | — |

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
6. **Qualidade:** teclado (Tab, setas na barra), foco visível, leitor de tela, PT/EN, três temas, axe sem violações, layout em 800 px e em largura de celular; a navegação não pode esconder o aviso de dados alterados.
7. **Relatório HTML** continua autocontido e **completo** (todas as seções em sequência), independente da seção ativa na tela.

## 5. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Critérios de comparação e recomendação (T02) | Qual métrica guia a recomendação e como tratar empates e hierarquia? | Valor-p (eliminação regressiva clássica), AICc, BIC, PRESS/R² predito, combinação com regras de segurança | Previsão fora da amostra, simplicidade, clareza ao iniciante, poucos graus de liberdade (desenhos de 14 a 30 ensaios) |
| Onde calcular (T03) | Nova operação ou ampliação de `surface.analyze`? | `model.compare` separada; campos novos no resultado existente | Uma operação por pergunta, cancelamento, tamanho da resposta |
| Armazenamento dos termos (T05) | Como guardar um modelo por resposta? | Campo opcional no experimento (mapa resposta → termos); reaproveitar `AnalysisOptions` | Esquema aditivo, reabertura sem recálculo, compatibilidade com v0.1 |
| Padrão de navegação (T10) | Barra lateral fixa, abas verticais ou rolagem com âncoras? | Painéis por seção com barra lateral; âncoras com rolagem | Acessibilidade, desempenho, retorno do usuário à seção, impressão |

## 6. Tarefas

- [ ] **T01** — Migrar o Node.js do 22 para o 26 e repetir as verificações da v0.1 ([DT-0015](../../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)), **antes** de qualquer funcionalidade.
- [ ] **T02** — DT dos critérios de comparação e da recomendação (§4.1, itens 4 a 6), com a especificação do método em `docs/metodos/`.
- [ ] **T03** — Núcleo (`models`, `surface`): matriz chapéu → PRESS e R² predito; AIC, AICc e BIC; eliminação regressiva com hierarquia; resultado tipado (sequência, motivos, estados indefinidos), sem `NaN`.
- [ ] **T04** — Operação do motor, contratos TypeScript gerados e paridade WebAssembly × nativo × Tauri; casos de validação independentes (Python/NumPy/statsmodels) incluindo o exemplo kLa e um caso com 3 respostas e 4 fatores como o mostrado nas capturas do Protimiza (27 ensaios, 14 termos).
- [ ] **T05** — Estado e projeto: termos por resposta (campo opcional), assinatura de resultado, revisão e reabertura sem recálculo; teste de projeto da v0.1 abrindo sem migração.
- [ ] **T06** — Interface: tabela de termos interativa nos resultados (`ModelTable`), seletor de resposta, recálculo com descarte de respostas obsoletas, avisos de hierarquia.
- [ ] **T07** — Interface: painel de comparação e recomendação (sequência de remoções, aplicar, desfazer), explicações curtas PT/EN e salvaguardas.
- [ ] **T08** — Integração com a otimização e a confirmação: usar o modelo escolhido por resposta e marcar como desatualizado quando mudar.
- [ ] **T09** — Avaliar a mesma seleção para os efeitos de planejamentos de dois níveis (decisão registrada na DT de T02; pode ficar para a v0.2.x).
- [ ] **T10** — DT do padrão de navegação e do mapa de seções (§4.2).
- [ ] **T11** — Componente de layout de resultados com barra lateral; mover **Exportar** para o final; otimização e confirmação como seções próprias.
- [ ] **T12** — Garantir o relatório HTML completo e em sequência; E2E por seção (teclado, foco, seção lembrada, estreito e largo) e axe nos três temas.
- [ ] **T13** — Exemplo `kLa`: renomear o arquivo (sem espaços nem parênteses), documentar no README do exemplo e usá-lo como caso de aceitação. **Antes de versionar, o usuário confirma que os dados podem ser distribuídos** (PD-16); o repositório é público.
- [ ] **T14** — Documentação: fichas U07–U10, mapa de módulos, matriz de cobertura, guia de resultados e CHANGELOG.

## 7. Entregas

Tabela de termos interativa com comparação e recomendação de modelos, por resposta e salva no projeto; resultados em seções com barra lateral e exportação ao final; exemplo kLa documentado; documentação e validação correspondentes.

## 8. Critérios de conclusão

1. [ ] Alternar um termo na tabela recalcula o modelo e atualiza coeficientes, ANOVA, falta de ajuste, R² e gráficos; respostas atrasadas não substituem o resultado atual. *Evidência:* teste do cliente e E2E.
2. [ ] As métricas de comparação (R² ajustado, R² predito, AICc, BIC, valor-p do modelo e da falta de ajuste) coincidem com a referência independente nas tolerâncias registradas, no Windows nativo, no WebAssembly e nos exemplos (kLa e o caso de 4 fatores). *Evidência:* casos em `validation/cases/` e testes de paridade.
3. [ ] A recomendação mostra a sequência de remoções, respeita a hierarquia e nunca remove o intercepto; o usuário pode aplicar, parar em um passo e desfazer. *Evidência:* testes do núcleo e E2E.
4. [ ] Cada resposta tem seu modelo, gravado no projeto; reabrir não recalcula; a otimização usa o modelo escolhido e marca desatualização. *Evidência:* teste de projeto e E2E do percurso 2.
5. [ ] A página de resultados usa seções com barra lateral; **Exportar é a última seção**; a otimização e a confirmação são seções próprias. *Evidência:* E2E e captura de tela em PT/EN e nos três temas.
6. [ ] Teclado, foco, leitor de tela e axe sem violações nos três temas; uso em 800 px; relatório HTML completo. *Evidência:* E2E e inspeção registrada.
7. [ ] Projetos da v0.1 abrem sem migração e sem perda; Node 26 verificado (T01). *Evidência:* teste de abertura dos exemplos e CI.

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

## 13. Desvios e descobertas

Nenhum até o momento.
