# ET27 — Acabamento da interface e da exportação

| Campo | Valor |
|---|---|
| Estado | Concluído em 2026-11-03; sem publicação |
| Versão-alvo | v0.4.0 |
| Dependência | ET29 |
| Origem | Plano da v0.4; auditoria UX/DS/TM/FG; comentários no navegador durante a ET29 |

## Objetivo e limites

Concluir o acabamento por componentes, seis temas e famílias de figura, mantendo os cálculos no Rust e aproveitando a composição/navegação da ET29. Não transferir para esta etapa a persistência das famílias (ET22) ou métodos avançados (ET23–ET25). Os ajustes de espaços/alinhamento e da largura da grade pedidos durante a ET29 já são a base.

## Tarefas

- [x] **T01 — Inventário e decisão.** Registrar DT antes das escolhas dependentes; mapear DS01–DS14, TM01–TM06 e FG01–FG15 para componente, comportamento e teste. Preservar as fichas já encerradas na ET29.
- [x] **T02 — Base tipográfica, espaços e estados.** Papéis de título/subtítulo/rótulo/resultado/ajuda, compensação óptica por tema; leitura em cerca de 70 caracteres; ajudas em camadas; avisos junto da decisão. Ações principal, alternativa, manutenção e remoção com formas/nomes consistentes.
- [x] **T03 — Números e tabelas.** Precisão por papel, valor completo disponível, resíduos quase nulos identificados, estados ausente/não estimável/não aplicável distintos e motivos de indefinição; números e intervalos alinhados, sem quebra indevida.
- [x] **T04 — Seis temas.** Ajustar individualmente planos/campos/contrastes e profundidade, reservando volume para controles e ação principal. Paleta científica semântica para série, referência, incerteza e grade; redundância por traço/símbolo.
- [x] **T05 — Ações e exportação por figura.** Um menu Figura com formatos, personalização e comentários; prévia neutra da exportação; fonte e hachura preservadas em PDF. Conferir tamanho final e acessibilidade.
- [x] **T06 — Famílias científicas.** Níveis/unidades em efeitos; eixos iguais e identidade no observado×predito; n/pontos em médias/boxplot; resíduos com referência zero e identificação; escala de cor em contorno; malha visual rala/ticks/rotulagem 3D; ternário maior com graduações/escala/localização e ações comuns; saturação nas cores do tema com unidades e faixa identificada. Usar somente dados já calculados pelo motor.
- [x] **T07 — Otimização e confirmação.** Metas em decisões e frase do critério; empates e quantidade encontrada/exibida claros; mapa 0–1 com candidatos numerados; eliminar tabelas redundantes; origem navegável e observado−previsto com unidade.
- [x] **T08 — Comentários e teclado.** Editar comentário existente com preservação dos metadados; aviso contextual Option+Tab no Safari/WebKit quando necessário.
- [x] **T09 — Avaliação no navegador a cada tarefa.** Seis temas, PT/EN, 375/800/1200/1920 px, fonte 0,85/1/1,2 e texto ampliado 200%; medir geometria e verificar axe; screenshots por família e tema. Verificar WebView2 no Windows 10, incluindo inglês e PDF.
- [x] **T10 — Fechamento.** Testes pertinentes, referências das evidências, guias/U18/mapa/cobertura/CHANGELOG; mover plano para concluídos somente com evidência.

## Critérios

Nenhum texto ou marca cortado; componentes legíveis nos seis temas e tamanhos previstos; tabelas com uso adequado de espaço; conteúdo da exportação reconhecível e consistente com a prévia; comentários editáveis; nenhuma alteração não verificada de método científico. A avaliação por tarefa registra defeitos encontrados e correções, não apenas capturas finais.

## Referências

[Plano da v0.4](../plano-v0.4.md), [auditoria](../auditoria-ux-v0.4-2026-11-02.md), [relatório da ET29](../../../validation/reports/et29/README.md), [U18](../../modulos/u18-temas-e-acessibilidade.md).

## Mapa de execução das fichas

| Fichas | Componentes responsáveis | Verificação pretendida |
|---|---|---|
| DS01–DS03, DS07–DS08, DS13 | tokens, seis folhas de tema, formulários, resumo/ajuda, relatório | PT/EN, nomes longos, leitura, 200% e geometria |
| DS04–DS05, DS11, DS14 | botões, navegação de resultados, Figure, avisos | prioridade, tamanho/foco, axe e quebra de linhas |
| DS06, DS10, DS12 | base da ET29, confirmação e Extras | regressão da largura, identidade, rolagem e teclado |
| DS09 | formatadores, células estatísticas, tabelas | precisão por papel, valor completo, estados indefinidos e intervalos |
| TM01 | Soft Light: limites de campos e separações, ações secundárias | formulário e figuras claros sem aumentar a moldura |
| TM02 | Modern Dark: três superfícies, peso regular, séries e referência | contraste em cada superfície e legibilidade da saturação |
| TM03 | Professional: compensação dos títulos serifados, tabelas e regras | hierarquia sem engrossar corpo e números |
| TM04 | Industrial: reduzir relevo em dados/navegação, rótulo regular | manter identidade do controle sem tornar tudo uma tecla |
| TM05 | Organic: ritmo e títulos serifados, textura fora dos dados | figura limpa, leitura e altura dos controles |
| TM06 | Clay: reduzir sombras nos dados e manutenção | ação principal reconhecível, campos e foco sem colisão |
| FG01, FG03, FG08 | Pareto, interação, Q–Q: composição entregue ET29 | regressão de recorte, nota e legenda nas três escalas |
| FG02 | effects/main | nível real, unidade e eixo identificáveis |
| FG04, FG07 | scatter | observado×predito com domínio comum; resíduo zero e observação |
| FG05–FG06 | means, boxplot | n, pontos e identificação de intervalo/letras |
| FG09–FG10 | contour, surface3d | escala de resposta, ticks, trama e rótulos |
| FG11 | desirability/OptimizationPanel/ConfirmationCheck | escala fixa 0–1, candidatos e diferença com unidade |
| FG12–FG13 | MixtureAnalysis, SaturationFit | gramática comum, ternário graduado, intervalo e unidade |
| FG14–FG15 | ChartFigure, FigureCustomizer, exportação PDF/PNG/SVG | menu único, prévia neutra, texto/legenda/hachura no arquivo |

A [DT-0028](../../decisoes-tecnicas/dt-0028-papeis-visuais-e-figuras-cientificas.md) antecede o código dependente. Este mapa define responsabilidade; não declara os ajustes já implementados ou verificados.

## Progresso e evidência

T01–T10 concluídas. Matriz nos cinco navegadores com reconferência dirigida das falhas, PT/EN/seis temas, geometria/axe, relatórios renderizados e Windows 10/WebView2 verificados; limites explicitados no relatório. Detalhes, defeitos encontrados, limites e registros no [relatório da ET27](../../../validation/reports/et27/README.md).
