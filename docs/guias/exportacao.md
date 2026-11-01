# Guia de exportação

**Estado:** vigente (v0.1, ET09) · **Atualizado em:** 2026-11-01

O que o aplicativo exporta, como e com que garantias. Decisões em [DT-0014](../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md).

## Formatos da v0.1

| Conteúdo | Formatos | Onde |
|---|---|---|
| Figuras | SVG e PNG | Botões abaixo de cada figura |
| Tabelas | CSV e XLSX | Pares de botões `(CSV)` / `(XLSX)` junto de cada tabela (comparação, planejamento, matriz de ensaios, superfície, malha de predições, candidatos da otimização) |
| Relatório | HTML autocontido | Painel **Exportação e aparência das figuras**, botão *Exportar relatório (HTML)* |
| Projeto | `.enzitag` | Menu do projeto (não é exportação de resultados) |

Não existem PDF, DOCX, Google Drive nem DBC na v0.1. Para obter PDF, abra o relatório HTML no navegador e imprima.

## Preferências (painel de resultados)

| Preferência | Efeito |
|---|---|
| Idioma dos arquivos exportados | Relatório e rótulos de exportação em português ou inglês, independente da interface |
| Formato do CSV | *Técnico* (vírgula e ponto decimal) ou *Para Excel* (em português: `;` e vírgula decimal) |
| Paleta | Padrão ou acessível a daltonismo (Okabe–Ito) |
| Tamanho do texto das figuras | Menor, normal, maior |
| Algarismos significativos nas figuras | 3 a 6 |

As preferências valem para o dispositivo, ficam registradas nos metadados dos arquivos e **não** entram no `.enzitag`.

## Proveniência

Todo arquivo informa aplicativo e versão, motor, método e versão, análise, revisão (e resumo dos dados), projeto, experimento, configuração, idioma, formato e data:

- CSV: linhas iniciais `# chave: valor` (leia com `pandas.read_csv(..., comment="#")`).
- XLSX: planilha **Proveniência**.
- SVG: elemento `<metadata>`; PNG: bloco `tEXt`.
- Relatório HTML: tabela de proveniência no início.

## Segurança das planilhas

Texto iniciado por `=`, `+`, `-`, `@`, tabulação ou retorno de carro nunca vira fórmula: no CSV recebe aspa simples inicial; no XLSX é gravado como texto com prefixo de aspas. Números não são alterados.

## Relatório HTML

Arquivo único e offline: método, configuração, revisão, versões, tabelas, figuras (SVG embutido, fundo branco) e a interpretação exibida na tela, no idioma escolhido para exportação. Não carrega fontes, scripts nem imagens externas. A otimização aparece em versão somente leitura.

## Limitações conhecidas (v0.1)

- Não há edição por figura (título, rótulos dos eixos, posição das letras); a personalização se limita às preferências acima.
- O PNG tem resolução fixa; gráficos 3D são desenhados em SVG (não há partes rasterizadas).
- Inspeção em Excel e LibreOffice foi feita por leitura programática (openpyxl) e pelo importador do próprio aplicativo; a abertura manual nesses programas não foi registrada.
