# DT-0014 — Exportação: XLSX em Rust, CSV por formato, proteção contra fórmulas, relatório HTML e estilo das figuras (ET09)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET09-T01 |
| Pendências relacionadas | PD-06 (renderização e exportação) |
| Substitui / substituída por | — |

## Contexto

A v0.1 exporta figuras (SVG/PNG), tabelas (CSV/XLSX) e um relatório HTML para todas as análises disponíveis (comparação, planejamentos, superfície, otimização), com proveniência e sem enviar dados a serviços externos. É preciso fixar como cada arquivo é produzido, como evitar fórmulas acidentais e onde ficam as preferências de exportação.

## Decisões

### 1. Escrita de XLSX no motor (Rust), sem biblioteca nova

Escritor próprio em `optima-project::xlsx_writer`, exposto pela operação `ExportXlsx` do motor (mesmo transporte JSON no Worker/WASM e no Tauri). Usa a dependência `zip` já adotada na leitura de XLSX; o XML é gerado como texto com escape. Células: números como números (`t="n"`), textos como **cadeias embutidas** (`t="inlineStr"`), vazias omitidas; cabeçalho em negrito; nomes de planilha validados (≤ 31 caracteres, sem `[]:*?/\`, únicos). Segunda planilha **Proveniência** com o mesmo conteúdo dos metadados do CSV. Alternativa descartada: biblioteca JavaScript (peso no pacote web, dois caminhos de código entre navegador e Windows). Verificação: leitura do arquivo gerado com openpyxl (tipos, estilos) e ida-e-volta pelo importador do próprio aplicativo (teste de paridade do motor).

### 2. Proteção contra fórmulas

Texto que começa com `=`, `+`, `-`, `@`, tabulação ou retorno de carro é **dado**, nunca fórmula: no CSV recebe aspa simples inicial; no XLSX é gravado como texto com o estilo `quotePrefix`, de modo que o Excel o exibe como texto e não o avalia. Números não são afetados (um número negativo é número, não texto). Testes: CSV (unitário) e XLSX (Rust e leitura com openpyxl).

### 3. CSV em dois formatos

**Técnico** (padrão): vírgula como separador e ponto decimal, números com todos os algarismos que os reproduzem. **Excel em português**: ponto e vírgula e vírgula decimal, aplicado apenas quando o idioma de exportação é português (em inglês cai no técnico). Sempre UTF-8 com BOM; linhas `#` iniciais registram método, configuração, revisão, versões, idioma e formato (leitores como pandas usam `comment="#"`).

### 4. Relatório HTML por renderização dos próprios resultados

O relatório é obtido **renderizando os componentes de resultado em um contêiner oculto**, com uma instância de i18n clonada no idioma da exportação (a interface não muda), e serializando o DOM depois que as figuras terminam de carregar. Controles (botões, campos, seletores, seções de exportação) são removidos; cada figura é trocada pelo SVG de exportação (cores literais, fundo branco); nada é calculado de novo. O documento é autocontido (CSS próprio, incluindo regras de impressão, SVG embutido, sem recursos externos) e começa com a tabela de proveniência. Vantagem: o relatório mostra exatamente as tabelas, fatos e avisos já localizados da tela, sem um segundo conjunto de textos. Limitação: depende do DOM do navegador/WebView (disponível nas duas plataformas). A otimização entra em versão somente leitura (estado, fatos, convergência, candidatos e compromissos).

### 5. Estilo das figuras e preferências de exportação

Paleta padrão ou acessível a daltonismo (Okabe–Ito), escala de fonte (0,85; 1; 1,2) e algarismos significativos (3–6) são aplicados por `applyChartStyle` sobre o SVG já gerado, tanto na tela quanto na exportação. As preferências (idioma dos arquivos, formato do CSV, paleta, fonte, algarismos) são **preferências do dispositivo** guardadas no armazenamento local do navegador/aplicativo e **registradas nos metadados dos arquivos**; **não** são gravadas no `.enzitag`, que permanece no esquema 1. Consequência: a personalização por figura (título, rótulos de eixos, posição de letras) não existe na v0.1 — ver [plano ET09, desvios](../planos-execucao/concluidos/et09-graficos-exportacao.md#12-desvios-e-descobertas).

### 6. Formatos fora da v0.1

PDF, DOCX, Google Drive e DBC permanecem fora ([decisões aprovadas](../produto/decisoes-aprovadas.md)); o navegador permite imprimir o relatório HTML em PDF, o que não é um formato de exportação do produto.

## Alternativas consideradas

| Alternativa | Motivo de não adotar agora |
|---|---|
| Biblioteca XLSX em JavaScript | Peso e duplicidade de caminho entre navegador e Windows |
| Montar o relatório com textos próprios | Segundo conjunto de textos PT/EN e risco de divergir da tela |
| Preferências de exportação no `.enzitag` | Mudaria o esquema; o arquivo do projeto não deve depender do dispositivo |
| Prefixar `'` também nos textos do XLSX | O estilo `quotePrefix` preserva o texto sem alterar o conteúdo |

## Critérios e evidências

Testes unitários e de integração (CSV, proteção contra fórmulas, pasta de trabalho, ida e volta XLSX, estilo das figuras), validação com openpyxl, E2E de exportação em Chromium e Firefox (XLSX, CSV Excel, relatório em inglês com interface em português, paleta) e inspeção visual registrada no plano da ET09.
