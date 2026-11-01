# Histórico de mudanças

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O produto segue versionamento semântico; a `0.x` é o **canal experimental**.

## [0.1.0] — não publicada (candidata local)

> Esta versão **não foi publicada**: não há URL pública, instalador em Releases nem atualizador. O texto abaixo descreve o que a candidata contém e a situação de validação; ver o [relatório de validação](validation/reports/v0.1.0/README.md).

### Métodos e variantes disponíveis

| Método | Variantes | Validação numérica |
|---|---|---|
| Estatística descritiva | geral e por grupo | 9 conjuntos NIST StRD |
| Distribuições Normal, t, F, qui-quadrado e amplitude studentizada | cdf, cauda, quantis | 531 pontos mpmath; 432 pontos SciPy |
| Modelo linear | termos, interações, quadráticos, estimabilidade, predição, resíduos, alavancagem | 11 conjuntos NIST StRD; 6 casos NumPy/SciPy |
| ANOVA de um fator, Tukey/Tukey–Kramer, letras | variâncias iguais; diagnósticos (Brown–Forsythe, QQ) | 11 conjuntos NIST ANOVA; SciPy |
| Fatorial completo, fracionário (geradores, resolução) e Plackett–Burman (8–48 ensaios) | réplicas, pontos centrais, aleatorização com semente (PCG32) | enumeração independente; análise 5 casos |
| Análise de efeitos, curvatura, Lenth, falta de ajuste e erro puro | desenhos saturados | NumPy/SciPy |
| Composto central (rotacional, face centrada, α informado, inscrito) e Box–Behnken (3–5 fatores) | matriz personalizada | enumeração independente; 6 casos de superfície |
| Superfície de resposta de 2ª ordem | equação codificada e em unidades reais, região experimental, malha e contornos | NumPy/SciPy |
| Otimização por desejabilidade | maximizar, minimizar, alvo, faixa; limites obrigatórios; pesos; vários candidatos; compromissos; ensaios de confirmação | busca exaustiva independente (6 casos) |

### Aplicativo

- Planejar experimento, analisar dados existentes e comparar tratamentos; digitação, colagem do Excel e importação CSV/XLSX com prévia.
- Projetos `.enzitag` com vários experimentos, revisões e recuperação automática; uso local, sem login.
- Português e inglês; temas Soft Light, Modern Dark e Professional; navegação por teclado; axe sem violações nos percursos testados.
- Exportação: figuras SVG/PNG, tabelas CSV (técnico e Excel PT) e XLSX, relatório HTML autocontido; metadados de proveniência; proteção contra fórmulas.
- Navegador (WebAssembly) e Windows (Tauri) com o mesmo motor Rust.

### Limitações conhecidas

- **Windows 11 não verificado**; apenas `windows-latest` (Windows Server 2025) na CI. Chrome e Edge estáveis não testados (Chromium e Firefox, sim).
- Sem geração aleatorizada de DIC com fator categórico; sem edição por figura (título, eixos, letras) nem configuração gráfica salva no projeto.
- Comparação de tratamentos com 40 ou mais tratamentos pode levar vários segundos ([limites operacionais](docs/arquitetura/limites-operacionais.md)).
- A otimização é uma busca local com vários inícios: **não prova ótimo global** e pede confirmação com ensaios novos.
- Sem PDF, DOCX, Google Drive ou DBC; sem atualizador e sem assinatura de código.
- Marcos M1–M3 não declarados.
