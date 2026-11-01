# DT-0011 — Planejamentos de dois níveis: aleatorização, fracionários, Plackett–Burman, curvatura e desenhos saturados (ET06)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET06-T01 |
| Pendências relacionadas | PD-04 (variantes e algoritmos), PD-05 (rótulo CCD; ver [catálogo funcional](../produto/catalogo-funcional.md#inventário-protimiza-et06)) |
| Substitui / substituída por | — |

## Contexto

A ET06 entrega o caminho **Planejar experimento** para triagem: gerar fatoriais, fracionários e Plackett–Burman, registrar resultados e analisar efeitos. Quatro escolhas técnicas precisam ser fixadas: gerador aleatório, fonte dos geradores de fracionários, tamanhos de PB e tratamento de desenhos sem graus de liberdade do erro. Todo cálculo permanece no núcleo Rust; a interface só apresenta.

## Decisões

### 1. Gerador aleatório: PCG32 + Fisher–Yates

PCG-XSH-RR 64/32 com sequência fixa 54 e semente do usuário; embaralhamento de Fisher–Yates de trás para frente com inteiros limitados sem viés (rejeição). Apenas aritmética inteira, portanto **idêntico** no Windows e no WebAssembly. Verificado contra o vetor do programa de demonstração oficial do PCG e contra uma reimplementação independente em Python. ChaCha foi descartado: exige mais código e dependência sem ganho para ordenação de ensaios. A identificação `pcg32-xsh-rr/fisher-yates` é gravada no planejamento, para que mudanças futuras de algoritmo não alterem silenciosamente planejamentos antigos. Detalhes: [aleatorização](../metodos/aleatorizacao.md).

### 2. Fracionários: geradores digitados + catálogo de aberração mínima

O usuário pode digitar geradores (`D=ABC`, `D=-ABC`); relação definidora, resolução e confundimento são **calculados** por álgebra em `GF(2)`, nunca copiados de tabelas. O catálogo (k = 3…8) apenas sugere geradores de aberração mínima, e um teste recalcula a resolução de cada entrada. Limite: 26 letras. Blocos e fracionários de níveis mistos ficam fora (v0.2). Detalhes: [fatorial fracionário](../metodos/fatorial-fracionario.md).

### 3. Plackett–Burman por matrizes de Hadamard

Paley (N = q + 1, q primo ≡ 3 mod 4) e Sylvester (N = 2ᵐ): **8, 12, 16, 20, 24, 32, 44 e 48** ensaios. Cada matriz é normalizada e verificada (`H·Hᵀ = N·I`). Fora da v0.1: 28, 36, 40 e maiores (sem construção implementada; recusa explícita). A recomendação oferece os **dois menores** tamanhos que comportam os fatores: o maior dá graus de liberdade ao erro pelas colunas fictícias. Informa-se a correlação máxima entre efeito principal e interação de dois fatores (confundimento parcial). Detalhes: [Plackett–Burman](../metodos/plackett-burman.md).

### 4. Efeito e coeficiente

O ajuste usa fatores **codificados** (−1, 0, +1) pelo modelo linear do núcleo. Mostram-se separados o **coeficiente** `b` e o **efeito** `2b` (diferença entre níveis). Erros-padrão, t, valor-p e intervalo do efeito derivam do mesmo ajuste.

### 5. Curvatura por coluna indicadora

Com pontos centrais, o termo de curvatura é uma coluna indicadora do ponto central incluída no modelo. Equivale ao teste clássico de média dos centrais contra a dos fatoriais quando o modelo é saturado nos pontos fatoriais (verificado no caso 001) e se generaliza a modelos parciais. Opcional na interface (ligado por padrão quando há centrais).

### 6. Desenhos saturados e sem erro

Sem graus de liberdade do erro: **nenhum EP, t ou valor-p é apresentado** — ficam indefinidos como estado explícito. Usa-se o método de Lenth (PSE, ME e SME) como único indicativo, sempre rotulado ("indicativo, não um teste") e com fato `design.saturated`/`design.lenth_only`. O Pareto muda de base (`|t|`, `|efeito|` com margem de Lenth, ou `|efeito|` sem referência). Termos aliasados são `não estimáveis`, com o confundimento mostrado.

### 7. Contrato e arquivo

Operações `designCount`, `designGenerate`, `designAnalyze` e `designRecommend` (esta devolve `DesignOptions{candidates}`, struct, pois variantes marcadas internamente não aceitam `Vec`). `Experiment.design` (opcional) guarda a especificação; `AnalysisOptions` ganha `terms` e `includeCurvature` (opcionais); `AnalysisResult::TwoLevelDesign`; `RevisionReason::Design`. Esquema do `.enzitag` permanece **1** (campos opcionais, retrocompatíveis na leitura). Aplicar um planejamento preserva os dados anteriores numa revisão (`edit`) e registra outra revisão (`design`); identificadores de revisão são únicos.

### 8. Limites operacionais

Fatorial completo até 12 fatores; 5000 ensaios no total; contagem calculada antes de gerar e exibida; recusa explícita acima disso.

### 9. Rótulo CCD e inventário Protimiza (PD-05)

Sem acesso ao serviço ou às capturas, a nomenclatura da referência não é copiada. Os planejamentos de superfície (ET07) são nomeados pela geometria e pela fórmula, com `α` e contagens de pontos sempre exibidos; a opção rotulada CCD é coberta pelo composto central com `α` informado. O inventário, o que foi conferido e o que permanece incerto estão no [catálogo funcional](../produto/catalogo-funcional.md#inventário-protimiza-et06); a pergunta ao usuário não bloqueia a ET07.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| ChaCha8 | Mais código; sem benefício na ordenação de ensaios |
| Ordenação por `sort_by` com chaves aleatórias | Viés potencial e dependência de empates; Fisher–Yates é o padrão |
| Tabelas fixas de fracionários sem cálculo | Não valida geradores digitados; confundimento teria de ser tabelado |
| PB cíclico de Plackett–Burman para todos os N | Geradores originais só existem para parte dos tamanhos; Hadamard cobre 8 tamanhos com verificação |
| Teste de curvatura só para modelo saturado | Não generaliza a modelos reduzidos |
| Pseudo-p para desenhos saturados | Pode induzir à leitura como teste válido; adotado apenas o indicativo de Lenth rotulado |

## Critérios e evidências

[Fatorial de dois níveis](../metodos/fatorial-dois-niveis.md#10-validação), [fracionário](../metodos/fatorial-fracionario.md#10-validação), [Plackett–Burman](../metodos/plackett-burman.md#10-validação), [aleatorização](../metodos/aleatorizacao.md#10-validação); E2E planejar → preencher → analisar em Chromium e Firefox; exemplo 02.

## Consequências

- ET07 reutiliza `designs::{spec,coding,generate}` e a análise via `models::fit_model`; adiciona CCD/Box–Behnken em módulo próprio (C12).
- Novos algoritmos de aleatorização exigem novo identificador, preservando a leitura de planejamentos antigos.
- Tamanhos de PB adicionais exigem construção documentada e verificação de ortogonalidade.
