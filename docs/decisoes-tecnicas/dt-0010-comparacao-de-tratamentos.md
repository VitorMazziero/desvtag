# DT-0010 — Comparação de tratamentos: amplitude studentizada, letras, diagnósticos, gráficos e exportação (ET05)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET05-T01 |
| Pendências relacionadas | PD-04 (variantes e algoritmos), PD-06 (biblioteca de gráficos) |
| Substitui / substituída por | — |

## Contexto

A ET05 entrega o primeiro percurso científico completo: DIC → ANOVA de um fator → Tukey/Tukey–Kramer → letras → gráficos → exportação → salvar e reabrir. É preciso fixar algoritmo, família de comparações, política de pressupostos, formato dos gráficos e dos arquivos exportados, sem introduzir cálculo científico fora do núcleo Rust.

## Decisões

### 1. Amplitude studentizada

Quadratura composta de Gauss–Legendre sobre a definição `∫ f_s(s)·W(q·s; k) ds` (Copenhaver e Holland, 1988), com nós calculados em `numeric/integration.rs` e a variável externa em `ln(cauda do χ²)`. Descartado o algoritmo AS 190 (precisão de ~1e-8 na literatura) por não atender à tolerância de 2e-12 medida contra o SciPy e o mpmath. Custo aceito: 0,4 s para 45 pares (compilação otimizada). Detalhes e medidas: [amplitude-studentizada](../metodos/amplitude-studentizada.md).

### 2. Família e variante do Tukey

A família é **todos os pares de médias de um fator**, α e confiança `1 − α` simultâneas informados no resultado. A variante é escolhida pelo balanceamento (Tukey se todos os grupos têm o mesmo `n`; Tukey–Kramer caso contrário) e **informada**. Dunnett, Games–Howell, Bonferroni/Holm e contrastes planejados ficam para a v0.2.

### 3. Letras

Inserção e absorção (Piepho, 2004), ordem das colunas pelas médias decrescentes (`a` = maior média). Pares sem resultado são **diferentes** nas letras e sinalizados. Limite de 2000 colunas intermediárias com recusa explícita. Garantia testada por propriedade e contra cliques maximais (algoritmo independente). Nomes `a…z, aa, ab…`.

### 4. Tamanho de efeito, CV e homogeneidade

`η²` e `ω²` (este não é truncado em 0) e CV percentual. Homogeneidade pelo **Brown–Forsythe** (Levene pela mediana), junto com a razão entre o maior e o menor desvio-padrão. A normalidade dos resíduos é avaliada **visualmente** (quantis de Blom) — nenhum teste de normalidade automático. **Nenhum selo de validade** baseado em p ou R² e **nenhuma troca automática de método**: os diagnósticos são fatos com texto (`diagnostics.*`) e gráficos. A independência nunca é presumida: o fato `independence_not_assessed` sempre aparece.

### 5. Séries científicas no núcleo

Boxplot (quartis do tipo 7, cercas em 1,5 × AIQ, pontos distantes com a observação), pontos do QQ, resíduos padronizados, intervalos e as barras `média ∓ dp` e `média ∓ erro-padrão` são calculados em Rust; a interface só desenha. Cálculos científicos continuam fora do TypeScript.

### 6. Gráficos: renderizador SVG próprio (PD-06)

Um módulo pequeno em TypeScript (`services/charts/`) gera SVG para barras com incerteza, boxplot e dispersão. **Uma única fonte** serve à tela (cores por variáveis CSS dos três temas, com cor literal de reserva) e à exportação (cores literais, fundo opaco, `<metadata>` com a proveniência). Todo texto de usuário é escapado; títulos e descrições acessíveis com identificadores únicos por gráfico; legendas quebradas em linhas; a barra de incerteza é **sempre nomeada**. Alternativas e motivos:

| Alternativa | Motivo de não adotar agora |
|---|---|
| Plotly.js | ~3 MB, cores e texto fora dos temas, SVG exportado sem controle de metadados; reavaliar para a superfície 3D da ET07 |
| Apache ECharts | Exportação SVG exige renderer específico; 3D só com extensão |
| Vega-Lite | Dependência grande para três tipos de gráfico, estilos fora dos temas |
| D3/visx | Equivale a escrever o mesmo renderizador com mais código e dependências |

A superfície 3D e o contorno (ET07) terão DT própria, que pode reaproveitar `svg.ts` (escala, eixos, escape) ou adotar biblioteca com licença e tamanho avaliados.

### 7. Exportação com proveniência (formatos da v0.1)

- **CSV**: UTF-8 com BOM (o Excel reconhece acentos), vírgula, ponto decimal, números com todos os algarismos que os reproduzem; linhas `# chave: valor` no início (aplicativo, versões, método, análise, revisão e hash, projeto, experimento, configuração, data) — pandas as ignora com `comment="#"`.
- **SVG**: `<metadata>` com o mesmo JSON.
- **PNG**: rasterização do SVG de exportação em 2× e chunk `tEXt` (`Description`) com o mesmo JSON.
- **Windows**: comando Tauri `export_file` com diálogo nativo, extensões permitidas (`csv`, `svg`, `png`, `html`), limite de 64 MiB e gravação segura; **o caminho não passa pelo JavaScript**. No navegador, download.

### 8. Resultado guardado no projeto

`AnalysisResult::OneWayComparison` e, em `AnalysisOptions`, `factorId` e `alpha` opcionais (omitidos nas análises descritivas, mantendo idênticos os arquivos já escritos). O esquema do `.enzitag` permanece **1**: a v0.1 ainda não foi publicada e as adições são retrocompatíveis na leitura (campos opcionais). A assinatura do resultado inclui o tipo, o fator e α; mudar qualquer um invalida o resultado exibido.

### 9. Verificação mais rápida

`[profile.test] opt-level = 2` no workspace: os casos de quadratura levavam 60 s sem otimização e agora rodam em segundos.

## Alternativas consideradas

Ver tabelas acima; adicionalmente: calcular `1 − cdf` com precisão relativa para p muito pequenos (não necessário na v0.1; documentado o limite de ~1e-9) e usar `statsmodels`/R como referência (indisponíveis no ambiente; SciPy + mpmath + cliques maximais foram suficientes e independentes).

## Critérios e evidências

[ANOVA](../metodos/anova-um-fator.md#10-validação) (15,0 dígitos em 11 conjuntos NIST), [amplitude studentizada](../metodos/amplitude-studentizada.md#10-validação) (432 pontos), [Tukey](../metodos/tukey.md#10-validação), [letras](../metodos/letras-comparacao.md#8-validação), E2E com exportação e reabertura em Chromium e Firefox, axe em três temas.

## Consequências

- ET06–ET08 reaproveitam `svg.ts`, `ChartFigure`, a exportação e o registro de análises.
- Fatoriais e superfícies usarão `models::fit_model`; as letras e o Tukey continuam restritos a um fator na v0.1.
- Qualquer novo tipo de resultado exige variante em `AnalysisResult`, tipos gerados e teste de abertura de arquivo.
