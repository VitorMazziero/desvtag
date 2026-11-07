# Guia de exportação

**Estado:** vigente (v0.4, ET27) · **Atualizado em:** 2026-11-03

O que o aplicativo exporta, como e com que garantias. Decisões em [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md) e [DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md).

## Formatos

| Conteúdo | Formatos | Onde |
|---|---|---|
| Figuras | SVG, PNG e **PDF** | Menu **Figura** abaixo do gráfico |
| Tabelas | CSV e XLSX | Pares de botões `(CSV)` / `(XLSX)` junto de cada tabela (comparação, planejamento, matriz de ensaios, matriz do DIC, superfície, malha de predições, candidatos da otimização) |
| Relatório | HTML autocontido, **PDF** e **Word (.docx)** | Seção **Exportar** dos resultados (painel **Exportação e aparência das figuras**): *Exportar relatório (HTML)*, *(PDF)* e *(Word)* |
| Projeto | `.desvtag` | Menu Arquivo. O app também abre projetos `.enzitag` |

Em telas compactas, a ação de salvar fica no menu **Arquivo**. No Windows, use **Salvar como** para gravar um projeto legado com a extensão `.desvtag`. A ação **Salvar** grava no arquivo já aberto.

O Google Drive (opcional, versão web) guarda o **projeto**, não os relatórios: veja o [guia do Drive](google-drive.md). **A seção Exportar é a última** da barra lateral dos resultados; as tabelas e as figuras têm seus botões junto de cada uma.

### PDF

- **PDF da figura:** uma página do tamanho da figura, sem margens; o desenho é **vetorial** (texto selecionável) e já inclui a personalização escolhida (textos, letras manuais, anotações, cor, grade, legenda).
- **PDF do relatório:** A4, com o logotipo do grupo como crédito (desligável no painel de exportação), a proveniência no fim, as mesmas seções do relatório HTML (tabelas, interpretação, figuras vetoriais) e «Página X de Y». O relatório HTML continua sendo o formato completo e autocontido.
- O PDF usa fontes incorporadas, geradas **localmente**, sem rede: Roboto no corpo e na opção sem serifa; DejaVu Serif/Mono nas figuras quando escolhidas.
- A exportação tem aparência neutra, mostrada na prévia. A família escolhida, o negrito e a hachura de extrapolação são preservados no PDF desde a ET27.

### Word (.docx)

- Mesmas seções do relatório HTML e do PDF: proveniência no início, títulos, interpretação, listas, **tabelas editáveis** (com linha de cabeçalho repetida entre páginas) e «Página X de Y»; logotipo do grupo opcional.
- **As figuras entram como imagens PNG** de alta resolução (não são editáveis); para figuras editáveis use o SVG ou o PDF vetorial.
- O arquivo é gerado **no próprio dispositivo**, sem rede. Foi aberto e convertido no **LibreOffice**; **não foi aberto no Microsoft Word** neste ambiente: se algo aparecer diferente no Word, por favor registre.
- A fonte padrão é a do computador de quem abre (Calibri, com substituição automática).

### Comentários no relatório

A opção **Incluir os comentários do experimento no fim dos relatórios** (desligada por padrão) acrescenta a seção «Comentários» ao HTML, ao PDF e ao Word. Veja o [guia de comentários](comentarios.md).

## Preferências (painel de resultados)

| Preferência | Efeito |
|---|---|
| Idioma dos arquivos exportados | Relatório e rótulos de exportação em português ou inglês, independente da interface |
| Formato do CSV | *Técnico* (vírgula e ponto decimal) ou *Para Excel* (em português: `;` e vírgula decimal) |
| Paleta | Padrão ou acessível a daltonismo (Okabe–Ito) |
| Tamanho do texto das figuras | Menor, normal, maior |
| Algarismos significativos nas figuras | 3 a 6 |

As preferências do dispositivo aparecem nos metadados dos arquivos exportados. O projeto guarda as configurações próprias de cada figura.

## Personalização por figura

Abaixo de cada figura, **Personalizar figura** reúne quatro grupos de ajustes, aplicados à tela e a todos os arquivos exportados (SVG, PNG, PDF e relatório HTML):

| Grupo | Ajustes |
|---|---|
| Textos | título e rótulos dos eixos (quando a figura os tem) |
| Letras de comparação | mostrar ou ocultar; **letras manuais** (uma por grupo, na ordem do gráfico, separadas por espaço; `-` deixa o grupo sem letra) |
| Anotações livres | até 20 textos com posição horizontal e vertical em porcentagem da figura |
| Aparência | tamanho e família da fonte, **cor principal**, fundo (branco ou transparente) da imagem exportada, **resolução do PNG** (1×, 2× ou 3×), linhas de grade e legenda |

- A configuração é **salva no projeto** (campo opcional `figureStyles` do experimento).
- É só apresentação: dados, escalas e resultados não mudam. **Letras manuais substituem as calculadas apenas no desenho**, e a legenda passa a dizer «Letras digitadas manualmente (não calculadas pelo aplicativo)»; a tabela de resultados continua com as letras calculadas.
- A cor principal tem precedência sobre a paleta para daltonismo; a escolha de uma cor com contraste adequado é de quem a escolhe.
- Textos até 200 caracteres; letras de até 8 caracteres.

## Proveniência

Todo arquivo informa aplicativo e versão, motor, método e versão, análise, revisão (e resumo dos dados), projeto, experimento, configuração, idioma, formato e data:

- CSV: linhas iniciais `# chave: valor` (leia com `pandas.read_csv(..., comment="#")`).
- XLSX: planilha **Proveniência**.
- SVG: elemento `<metadata>`; PNG: bloco `tEXt`; PDF da figura: campos de informação do documento; PDF do relatório: tabela de proveniência no fim.
- Relatório HTML: tabela de proveniência no fim.

## Segurança das planilhas

Texto iniciado por `=`, `+`, `-`, `@`, tabulação ou retorno de carro nunca vira fórmula: no CSV recebe aspa simples inicial; no XLSX é gravado como texto com prefixo de aspas. Números não são alterados.

## Relatório HTML

Arquivo único e offline: método, configuração, revisão, versões, tabelas, figuras (SVG embutido, fundo branco) e a interpretação exibida na tela, no idioma escolhido para exportação. Não carrega fontes, scripts nem imagens externas. A otimização aparece em versão somente leitura.

## Limitações e verificações

- Os rótulos dos eixos da superfície 3D não são editáveis; símbolos e posição individual das letras não existem (as letras ficam acima das barras).
- O PNG é rasterizado a partir do SVG (1×, 2× ou 3×); gráficos 3D são desenhados em SVG.
- A ET27 preserva a família Serif/Mono, o negrito e a hachura no PDF. As fontes DejaVu licenciadas acompanham o aplicativo; o desenho usa a aparência neutra exibida na prévia, independentemente do tema.
- Inspeção em Excel e LibreOffice foi feita por leitura programática (openpyxl) e pelo importador do próprio aplicativo; a abertura manual nesses programas não foi registrada. Os PDFs foram inspecionados com o PyMuPDF (texto extraível e renderização), não em todos os leitores de PDF.

## Revisão da exportação na ET29

Antes de exportar, o painel identifica a análise, o modelo, o idioma e a aparência das figuras. Preferências dos arquivos ficam separadas das de aparência no dispositivo; personalizações de uma figura continuam salvas no projeto e prevalecem sobre o padrão do dispositivo.

O relatório é montado numa raiz independente da navegação: traz todas as seções mesmo quando só uma aparece na tela. Ajudas como «desmarque um efeito» são excluídas, e o texto do método/modelo efetivamente ajustado entra no documento. O painel de modelos informa termos mantidos e retirados. PDF e Word evitam separar o título do conteúdo seguinte.

Em «Sobre e atualizações», confira a versão da interface, do motor e o commit da compilação. Durante esta implementação a versão é `0.4.0-dev`; isso não representa publicação de uma versão nova. Pareto e Q–Q são exportados em PNG/PDF nos testes da ET29 com fonte 1,2; as sete famílias de SVG são conferidas nas escalas 0,85, 1 e 1,2.

## Menu Figura e prévia (ET27)

Abra **Figura** abaixo do gráfico para escolher SVG, PNG ou PDF, personalizar e comentar. **Prévia da exportação** mostra a aparência neutra do arquivo; Escape fecha a janela. A fonte e a escala escolhidas pertencem à figura e ficam guardadas no projeto. Em telas pequenas, percorra a área do gráfico com sua rolagem horizontal; a página mantém a largura da janela.

A ET27 conferiu fontes incorporadas em PDFs renderizados e hachura como linhas vetoriais recortadas. As famílias novas de ternário e saturação compartilham essas ações. Evidência e limites no [relatório da ET27](../../validation/reports/et27/README.md).

## Resultados das famílias novas (ET22)

Misturas, pareados/modelos mistos, saturação e potência usam os mesmos relatórios HTML/PDF/Word. O relatório refere-se ao **cálculo guardado** consultado, inclusive quando anterior ao mais recente. Configuração validada, método, motor, identificador e revisão acompanham o conteúdo; os nomes/unidades são os históricos. Tabelas CSV/XLSX usam valores completos; células indefinidas mantêm causas no metadado `undefinedStates`. Modelos mistos incluem os coeficientes, componentes de variância e efeitos previstos por unidade.
