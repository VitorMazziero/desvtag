# DT-0020 — Personalização gráfica completa e exportação em PDF (v0.2)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Pedido do usuário em 2026-11-01 (Fase 2 da v0.2): letras manuais e anotações livres; PDF de figuras e relatórios; personalização gráfica completa |
| Pendências relacionadas | — |
| Substitui / substituída por | Estende a [DT-0016](dt-0016-dic-aleatorizado-e-estilo-por-figura.md) (estilo por figura) e a [DT-0014](dt-0014-exportacao-e-relatorio.md) (exportação). **Não** substitui o relatório HTML |

## Contexto

A v0.1 personalizava título, rótulos dos eixos, exibição das letras e fonte (escala), e exportava SVG, PNG, CSV/XLSX e relatório HTML. Faltavam letras escritas à mão, anotações livres, cor, fundo, família da fonte, resolução do PNG, grade e legenda, e um formato de documento para impressão e envio (PDF).

## Decisões

### 1. `FigureStyle` cresce de forma aditiva, validada no Rust

Campos opcionais novos: `manualLetters` (até 100 letras de até 8 caracteres), `annotations` (até 20 textos com posição relativa 0–1), `primaryColor` (`#RRGGBB`), `background` (`white` ou `transparent`), `fontFamily` (`sans`, `serif`, `mono`), `exportScale` (1, 2 ou 3), `showGrid` e `showLegend`. A validação do documento (`project.invalid_figure_style`) recusa valores fora desses limites. `schemaVersion` permanece 1: a versão anterior do aplicativo ignora os campos novos.

### 2. Aplicação pura sobre o SVG, com marcadores `data-figure`

Como na DT-0016, `applyFigureStyle` troca, oculta ou acrescenta elementos já desenhados; tela, SVG, PNG, PDF e relatório HTML passam pelo mesmo caminho. Marcadores novos: `grid` (linhas de grade), `legend` (linhas de legenda), `background` (retângulo de fundo da exportação) e `letters` **sempre presente por grupo**, mesmo vazio, para que letras manuais tenham lugar também em figuras sem letras calculadas.

- **Letras manuais** substituem as calculadas **só na figura**, por posição; a legenda é trocada por «Letras digitadas manualmente (não calculadas pelo aplicativo)» (ou acrescentada, se a figura não tinha legenda de letras). A tabela de resultados não muda e continua mostrando as letras calculadas.
- **Anotações** são textos com contorno claro na posição relativa pedida (percentual do desenho), sem alterar escalas nem dados.
- **Cor principal** substitui a cor de ação do tema nas séries; ela tem **precedência sobre a paleta para daltonismo**, e o contraste da cor escolhida é responsabilidade de quem escolhe.
- **Fundo transparente** vale para as exportações (a tela já usa o fundo do tema); **resolução** só altera o PNG; **família da fonte** vale em tela, SVG e PNG.

### 3. PDF com pdfmake, fonte Roboto embutida e figuras vetoriais

Biblioteca: **pdfmake 0.3.13** (MIT) com a fonte **Roboto** (SIL OFL 1.1; versão 3.014, conforme a licença gravada no próprio arquivo da fonte) do pacote `vfs_fonts`, carregados **sob demanda** (importação dinâmica) só quando o usuário pede um PDF; nada é baixado da rede (`setUrlAccessPolicy` recusa qualquer URL). Escolha: gera PDF no navegador e no WebView do Windows, com SVG vetorial (texto selecionável) e tabelas, sem servidor.

- **PDF da figura:** uma página do tamanho da figura, sem margens; o SVG de exportação (já personalizado) entra como desenho vetorial.
- **PDF do relatório:** A4, o **mesmo DOM limpo do relatório HTML** convertido em títulos, parágrafos, listas, tabelas e figuras vetoriais, com cabeçalho de proveniência e «Página X de Y». O relatório HTML continua sendo o formato completo e autocontido.
- **Limitações assumidas e documentadas:** (a) o PDF usa só Roboto, então a família de fonte escolhida (`serif`, `mono`) **não** vale no PDF; (b) o padrão hachurado da região de extrapolação é desenhado como **sombreado translúcido** na mesma cor (o conversor de SVG não desenha padrões); (c) o contorno claro dos textos sobre a superfície 3D é emulado por uma cópia do texto por baixo; (d) o símbolo «→» (ausente na Roboto) é trocado por «–»; (e) **o conversor de SVG não abre fontes pelo nome fora do Node** (as fontes do pdfmake ficam num sistema de arquivos virtual) e usa a **fonte corrente do documento**: por isso todo o texto das figuras sai em Roboto **normal** (os títulos em negrito perdem o peso) e um ponto branco invisível antes do desenho fixa essa fonte; sem ele a conversão falha em PDFs só de figura (achado na verificação nativa e coberto por teste E2E). Cada uma foi **verificada por inspeção visual** de PDFs gerados (PyMuPDF) e coberta por teste de unidade da conversão.
- **Licenças:** `THIRD_PARTY_NOTICES` inclui pdfmake, pdfkit, fontkit e dependências (MIT/BlueOak-1.0.0/0BSD) e a Roboto (OFL-1.1), com o texto da licença da fonte.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| `window.print()` | Depende do diálogo do navegador, não gera arquivo no Tauri e não permite verificar o resultado |
| jsPDF + svg2pdf | Mesma necessidade de embutir fontes e escrever a conversão das tabelas; pdfmake traz layout de tabelas |
| PNG dentro de PDF | Perde texto selecionável e qualidade de impressão |
| Escrever um gerador de PDF próprio | Risco desproporcional (fontes, Unicode, quebras de página) frente a uma biblioteca madura e auditável |
| Servidor para gerar PDF | Contraria a regra de uso local e sem envio de dados |

## Critérios e evidências

Testes de unidade do estilo (`figureStyle.test.ts`) e da conversão para PDF (`pdfContent.test.ts`); E2E `methods-flow` (letras manuais, anotação, cor, fundo, fonte e grade no SVG exportado) e `export-flow` (PDF do relatório e da figura válidos, com Roboto e `%%EOF`); inspeção visual dos PDFs gerados (relatório de seis páginas e figura de contorno, texto extraível e acentos corretos).


## Complemento de tabelas — auditoria AU-U05/U06 (2026-11-03)

Antes do código dependente: manter texto de tabela de PDF/Word em pelo menos 9 pt e dividir tabelas com mais de seis colunas em faixas de colunas. A primeira coluna se repete como referência, e todas as linhas e demais colunas são preservadas em ordem. Não reduzir fonte até tornar 33 colunas ilegíveis nem cortar silenciosamente. A tabela HTML/CSV/XLSX continua completa; HTML tem rolagem local. Um helper de apresentação compartilhado produz as faixas para PDF/Word, sem alterar dados/modelos. Cabeçalhos repetidos ficam com a primeira linha no PDF; linhas científicas não são partidas. Larguras explícitas respeitam a área útil A4. Confirmar no PDF renderizado e no XML Word, com 3/8/33 colunas e números longos, PT/EN; medir exportações extensas e tratar explicitamente o custo no bloco 05. Uma célula excepcionalmente maior que a página exige investigação no fechamento; não considerá-la coberta por casos pequenos.


Conferência adicional: uma referência repetida (por exemplo, várias comparações do mesmo grupo em modelos mistos) não identifica sozinha a linha. Nesses casos as faixas incluem também `#`, ordinal da linha na tabela original, repetido em todas as faixas. Mantêm até seis colunas incluindo essas duas referências. Não é ID de observação, novo dado nem estatística calculada. A primeira coluna única dos casos de potência permanece suficiente, sem ordinal redundante. Testar referências duplicadas antes de fechar a apresentação global.

Inspeção dos documentos em 2026-11-04: no PDF, a posição lógica de um contêiner pode continuar na página mesmo quando sua tabela inteira foi movida; somente a regra de título sem sucessor não impede uma legenda órfã. Títulos imediatamente anteriores e legendas passam a compor linhas sem borda do cabeçalho repetido da tabela, mantidas com a primeira linha de dados. Rótulos descritivos longos recebem mais largura, preservando espaço para números; o ordinal ocupa uma coluna compacta. A regra de divisão e os dados exportados permanecem os mesmos. Conferir a composição em PDF real de modelos mistos, além das matrizes de potência; o XML Word não certifica paginação no Microsoft Word.

## Complemento de execução dos relatórios — AU-P05 (2026-11-04)

Decisão antes do código dependente, após medir 4096×32: montagem em partes das tabelas extensas do relatório, sem milhares de componentes/hooks React por célula; texto/precisão/estados indefinidos devem permanecer equivalentes. Reutilizar formatadores Intl em cache limitado, sem mudar valores, idiomas ou regras de apresentação. PDF/Word extensos passam a gerar em worker dedicado, liberado ao concluir/cancelar, com no máximo um relatório por janela. Cancelamento e mudanças da identidade/dados consultados invalidam a tarefa antes de salvar; um documento não combina conteúdo novo com metadados antigos. Salvamento do projeto e motor científico preservam suas filas independentes.

O worker usa a entrada de worker do [LinkeDOM](https://github.com/WebReflection/linkedom#whats-new), biblioteca DOM para ambientes sem DOM, consultada em 2026-11-04, versão 0.18.15/ISC verificada no registro. Reutilizar os conversores de conteúdo e regras de tabela existentes, ajustando apenas acessos DOM não disponíveis nesse ambiente; não criar um segundo formato de relatório nem depender de rede. Fontes virtuais/SVG e PNG do Word continuam locais; rasterização necessária pode ocorrer antes do envio. Dependência é carregada no worker, com licença registrada.

Aceite: conteúdo e símbolos equivalentes nos três motores e WebView2, documentos pequenos/extensos renderizados, cancelamento real sem download parcial e próxima exportação funcional; edição/troca de projeto/experimento não salva documento misturado. Repetir medidas de memória, feedback e quadros no tamanho máximo; uma geração no worker não prova sozinha menor custo total nem estabelece um limite global de RAM.

Conferência adversa do worker: no Firefox, os relatórios maiores registraram falhas de abertura de `Roboto-*.ttf` no SVG e não concluíram. O callback SVG do pdfmake devolve a origem da fonte; nomes do sistema virtual não são caminhos legíveis pelo PDFKit fora de Node. O ensaio com URLs de dados foi rejeitado: apesar da sugestão da mensagem de erro, esta versão do leitor de fontes do PDFKit não as decodifica. Os 12 arquivos embutidos foram lidos com fontkit e seus nomes PostScript conferidos: correspondem ao nome do arquivo sem `.ttf`. Registrar os mesmos bytes no sistema virtual sob esse nome e preparar os quatro estilos de cada família antes de desenhar SVG; o callback passa a encontrar precisamente a fonte já decodificada pelo PDFKit, sem depender da fonte corrente nem abrir caminhos. Não alterar o fornecedor instalado. Repetir os casos nos três motores, conferir ausência dos avisos, nomes/pesos e símbolos/textos vetoriais no PDF; não basta o cabeçalho do arquivo. O travamento continua sob investigação até essa conferência.

Reprodução dirigida adicional: no Firefox, texto/tabelas sem SVG com logotipo e SVG sem logotipo concluem; SVG + PNG com transparência fica pendente na descompressão assíncrona. No mesmo payload completo, um adaptador que mantém referência explícita ao worker filho de `fflate` até seu `terminate()` permite conclusão (~434 kB, sem avisos de fonte). Isso localiza a interação de ciclo de vida; não basta para afirmar a causa interna do coletor do navegador. Instalar esse adaptador somente no worker temporário de relatório, antes de carregar os geradores; encaminhar falha de filho, encerrar filhos remanescentes no `finally` e restaurar o construtor. O encerramento/cancelamento do pai deve ser conferido nos três motores e no WebView2, sem deixar trabalho descendente órfão. Não mudar ou remover o logo/figuras para contornar o defeito.

Reconferência concluída do defeito Firefox: 27/27 percursos Chromium/Firefox/WebKit passaram após o adaptador; os três PDFs antes pendentes concluíram. 21 PDFs foram conferidos quanto a texto extraível e caracteres, e os arquivos Firefox de relatório/figura foram renderizados e inspecionados. O uso dos aliases PostScript e preparação dos quatro estilos supera a limitação histórica (e) de perda do negrito/fonte corrente; as famílias DejaVu também já fazem parte do código vigente. A aceitação integrada Windows e de memória segue independente desta conferência funcional.

Para medir entrada extensa, distinguir inserção automatizada por CDP de uma colagem: perfil real de `.fill()` encontrou ~31,9 s no evento nativo `textInput`; textarea simples também reproduziu lentidão. Ctrl+V confiável no app levou ~0,53 s e manteve undo/redo. O teste de colagem usa apenas o clipboard isolado do Chromium headless: [registro no início do navegador headless](https://raw.githubusercontent.com/chromium/chromium/main/headless/lib/browser/headless_browser_main_parts.cc), [implementação independente da plataforma](https://chromium.googlesource.com/chromium/src/+/refs/tags/135.0.7049.43/components/headless/clipboard/headless_clipboard.cc) e [permissões do contexto Playwright](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions), consultados em 2026-11-04. A comparação de exportação mantém o mesmo conteúdo; não atribuir ao produto um ganho obtido por trocar o mecanismo de entrada do roteiro. Não generalizar o clipboard isolado para o WebView2 normal ou sobrescrever o clipboard do usuário para medir.
