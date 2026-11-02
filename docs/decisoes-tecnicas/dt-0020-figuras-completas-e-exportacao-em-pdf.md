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
