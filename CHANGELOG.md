# Histórico de mudanças

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O produto segue versionamento semântico; a `0.x` é o **canal experimental**.

## Planejado para 0.2

- Migração do Node.js 22 para o 26 como primeira tarefa da ET11, antes de novas funcionalidades ([DT-0015](docs/decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)). Ainda não executada; a 0.1 permanece no Node 22.
- Seleção e comparação de modelos: termos ligáveis na tabela de resultados, comparação entre o modelo completo, o atual e o recomendado, e recomendação de remoção de termos; um modelo por resposta ([plano da ET11](docs/planos-execucao/planejados/et11-selecao-de-modelos-e-navegacao.md)).
- Resultados organizados em seções com barra lateral (otimização por desejabilidade, confirmação e outras), com a exportação ao final.

## [0.1.0] — candidata pronta, aguardando publicação

> Esta versão está **pronta localmente e ainda não foi publicada** (sem etiqueta, release nem Pages). O texto abaixo descreve o que ela contém e a situação de validação; ver o [relatório de validação](validation/reports/v0.1.0/README.md).

### Métodos e variantes disponíveis

| Método | Variantes | Validação numérica |
|---|---|---|
| Estatística descritiva | geral e por grupo | 9 conjuntos NIST StRD |
| Distribuições Normal, t, F, qui-quadrado e amplitude studentizada | cdf, cauda, quantis | 531 pontos mpmath; 432 pontos SciPy |
| Modelo linear | termos, interações, quadráticos, estimabilidade, predição, resíduos, alavancagem | 11 conjuntos NIST StRD; 6 casos NumPy/SciPy |
| ANOVA de um fator, Tukey/Tukey–Kramer, letras | variâncias iguais; diagnósticos (Brown–Forsythe, QQ) | 11 conjuntos NIST ANOVA; SciPy |
| Fatorial completo, fracionário (geradores, resolução) e Plackett–Burman (8–48 ensaios) | réplicas, pontos centrais, aleatorização com semente (PCG32) | enumeração independente; análise 5 casos |
| DIC aleatorizado (um fator categórico) | 2 a 100 níveis, unidades experimentais com identificador, ordem de execução reprodutível | PCG32/Fisher–Yates independente (6 casos) |
| Análise de efeitos, curvatura, Lenth, falta de ajuste e erro puro | desenhos saturados | NumPy/SciPy |
| Composto central (rotacional, face centrada, α informado, inscrito) e Box–Behnken (3–5 fatores) | matriz personalizada | enumeração independente; 6 casos de superfície |
| Superfície de resposta de 2ª ordem | equação codificada e em unidades reais, região experimental, malha e contornos | NumPy/SciPy |
| Otimização por desejabilidade | maximizar, minimizar, alvo, faixa; limites obrigatórios; pesos; vários candidatos; compromissos; ensaios de confirmação | busca exaustiva independente (6 casos) |

### Aplicativo

- Planejar experimento, analisar dados existentes e comparar tratamentos; digitação, colagem do Excel e importação CSV/XLSX com prévia.
- Projetos `.enzitag` com vários experimentos, revisões e recuperação automática; uso local, sem login.
- Português e inglês; temas Soft Light, Modern Dark e Professional; navegação por teclado; axe sem violações nos percursos testados.
- Exportação: figuras SVG/PNG, tabelas CSV (técnico e Excel PT) e XLSX, relatório HTML autocontido; metadados de proveniência; proteção contra fórmulas.
- Personalização por figura (título, rótulos dos eixos, exibição das letras e fonte), salva no projeto e válida na tela e nos arquivos exportados.
- Aplicativo Windows com verificação de atualizações assinadas (canal experimental).
- Navegador (WebAssembly) e Windows (Tauri) com o mesmo motor Rust.

### Limitações conhecidas

- **Windows 11 não verificado.** O aplicativo foi verificado no Windows 10 Pro 22H2 e em `windows-latest` (Windows Server 2025); o navegador, em Chromium, Firefox, Chrome e Edge estáveis (versões 156–157).
- O instalador **não tem assinatura de código**: na primeira execução o Windows pode mostrar “O Windows protegeu seu computador” (escolha *Mais informações* e *Executar assim mesmo* após conferir a soma SHA-256 do release). As atualizações são verificadas pela assinatura do próprio aplicativo; a atualização ponta a ponta ainda não foi verificada.
- Figuras: sem letras manuais, anotações livres, símbolos nem posição das letras.
- Comparação de tratamentos com 40 ou mais tratamentos pode levar vários segundos ([limites operacionais](docs/arquitetura/limites-operacionais.md)).
- A otimização é uma busca local com vários inícios: **não prova ótimo global** e pede confirmação com ensaios novos.
- Sem PDF, DOCX, Google Drive ou DBC.
- Marcos M1–M3 não declarados.
