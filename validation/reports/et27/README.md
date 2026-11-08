# ET27 — Acabamento e avaliação por tarefa

Estado: concluída (T01–T10), com os limites de verificação abaixo. Data: 2026-11-03. Ramificação `feat/v0.4`, interface e motor `0.4.0-dev`. Sem publicação ou instalador de distribuição.

## Alterações e avaliação

| Tarefa | Alteração | Avaliação e defeitos corrigidos |
|---|---|---|
| T02 | Papéis de título/rótulo/ajuda, compensação óptica, largura de leitura, espaçamento de formulários, ações secundárias discretas e ajuda em camadas | Formulários nos seis temas, PT/EN, quatro larguras; a avaliação encontrou abas de resultados ainda em coluna e controles maiores que o contêiner no texto ampliado; composição corrigida. |
| T03 | Células estatísticas com valor completo acessível, estatísticas com quatro significativos, estimativas com precisão própria, regra de valor-p; ≈0 para resíduos menores que 10⁻¹², com valor completo; estados n.e./s/d/s.gl./n/a distintos | Tabelas PT/EN, alinhamento à direita, números tabulares e intervalos sem quebra. Médias não estimáveis deixaram de aparecer como zero nas figuras. Nenhum arredondamento volta ao motor ou ao arquivo. |
| T04 | Ajuste individual dos seis temas; papéis científicos série/referência/incerteza/grade; planos escuros graduados, menor relevo em dados, limites de campos e títulos serifados | Axe identificou contraste insuficiente em links do Clay: passaram a usar o papel de texto de destaque. Pareto capturado em cada tema. |
| T05 | Um menu Figura, prévia neutra, rolagem própria e fontes DejaVu licenciadas incorporadas em SVG/PNG/PDF; hachura vetorial no PDF | Downloads reais, identificação da fonte dentro do PDF e inspeção dos PDFs renderizados. Detectada substituição silenciosa pela fonte padrão no PDF: cache da família é preparado antes do SVG. Hachura deixou de virar preenchimento sólido. |
| T06 | Observado×predito com domínios e área iguais; n e observações nas médias/boxplot; unidades e identificação; escala de cor; superfície com malha visual rala e ticks; ternário graduado/localizado; saturação na gramática comum | Exemplos reais e ajustes executados no WASM. Inspeção identificou rótulo 3D cruzando a superfície e frestas brancas entre polígonos: eixo deslocado e rasterização de arestas corrigida. Ternário e saturação exportam pelo menu comum. |
| T07 | Metas por decisão e resumo do critério; contagem/empates; uma tabela com seleção; mapa 0–1 com candidatos; origem histórica consultável e diferença observado−previsto no Rust | Sete percursos Chromium, depois T07–T08 nos três motores (9/9). Campo obrigatório vazio bloqueia cálculo com foco; confirmação salva/reabre. Rótulos das curvas sobrepostos no platô foram espaçados pela geometria. |
| T08 | Edição do comentário com campo opcional editedAt e preservação do histórico; cancelar/Escape/foco; aviso contextual de Option+Tab em WebKit/Safari | Testes de arquivo anterior, ida e volta, autoria/revisão/resolução/respostas, texto vazio e limite. UI salva/reabre editado nos três motores; dica exclusiva do navegador e Escape conferidos. |

## Verificações registradas

- Retomada T02–T06: **72/72** em Chromium, Firefox e WebKit.
- Otimização e confirmação: **7/7** Chromium; T07–T08: **9/9** nos três motores.
- Unidade da interface: **430 testes em 50 arquivos** aprovados.
- Unidade e integração Rust: **554 aprovados, 3 ignorados, 33 suítes**; `clippy --workspace --all-targets -- -D warnings` aprovado. Os ignorados são verificações manuais/performance já identificadas no código, não falhas encobertas.
- Composição: nove famílias nas escalas 0,85/1/1,2. Os testes verificam XML, títulos, notas, recorte e dimensões; a matriz do navegador verifica os limites efetivamente renderizados.
- [Evidências](../../../docs/imagens/evidencias-v0.4-et27/README.md), [DT-0028](../../../docs/decisoes-tecnicas/dt-0028-papeis-visuais-e-figuras-cientificas.md), [DT-0029](../../../docs/decisoes-tecnicas/dt-0029-conferencia-de-confirmacao-no-motor.md).

## T09 — matriz e regressão final

A regressão executou **1.230 casos nos cinco navegadores** (Chromium, Firefox, WebKit, Chrome e Edge): 1.207 passaram e 23 falharam na primeira execução. Não se declara uma execução única integralmente verde. As falhas incluíram expectativas antigas de precisão, seletor de título SVG que passou a encontrar tooltips, ambiguidades do botão Abrir em menus recolhidos e tempos de criação de contexto/importação/grade sob carga. Os valores científicos completos continuam conferidos; expectativas de apresentação usam a precisão por papel. Um worker Chromium ficou sem progresso após o caso 1.229 e foi encerrado isoladamente; o runner retomou e aprovou o último caso.

A reconferência dirigida aos arquivos afetados e à matriz adicional executou **420 casos: 419 aprovados**, com uma ambiguidade remanescente no seletor Abrir do WebKit a 1.200 px. Corrigido o seletor para a ação visível, a repetição isolada passou (**1/1**). A matriz de figuras da regressão cobre seis temas × PT/EN × dez figuras; a adicional cobre ternário e saturação nos mesmos temas/idiomas. As duas verificam texto SVG efetivamente renderizado, fonte 0,85/1/1,2, axe e página sem extravasamento em 375/800/1.200/1.920 px com fonte até 200%. Capturas representativas do Chromium estão em `docs/imagens/evidencias-v0.4-et27/matrix`, com hashes. Os demais motores estão nos logs.

Foram corrigidos nomes acessíveis repetidos nas regiões das figuras, largura mínima intrínseca impedindo o encolhimento a 200% e um identificador de método sem tradução. O teste automatizado não equivale a ensaio com leitor de tela.

## Windows 10 / WebView2

Build release com perfil isolado de automação concluído em 10m10s. O aplicativo real conferiu os casos científicos, a nova operação de confirmação, os 11 projetos, figura PDF e relatório PDF/Word; inglês, seis temas, prévia neutra e Serif incorporada foram verificados em `native-check-et27-final.log`. O PDF selecionado é o da figura (uma página, DejaVu Serif regular/negrito), renderizado e inspecionado; o teste exclui o relatório da seleção para não confundir as fontes disponíveis com a fonte efetivamente usada na figura.

A troca de idioma revelou uma mensagem de exportação que mantinha o português: a mensagem passou a guardar o tipo/nome, sendo traduzida no idioma atual. A recompilação posterior (5m30s, registrada como `native-build-et27-latest.log`) e a execução `native-check-et27-latest.log` aprovaram a conferência nativa novamente, incluindo inglês, seis temas, prévia neutra e PDF com Serif. Esse build já inclui a base inicial da ET22, cuja validação própria permanece separada. O comando de atualização respondeu com indisponibilidade; não houve instalação nem verificação de um release publicado. Leitor de tela, Safari real e Word não são certificados por essa execução.
