# DT-0009 — Fundamentos numéricos e modelos lineares (ET04)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET04-T01 (registrada depois do primeiro código da etapa; ver desvio na [ET04](../planos-execucao/ativos/et04-fundamentos-numericos-modelos.md#12-desvios-e-descobertas)) |
| Pendências relacionadas | PD-04 (variantes, estimadores, algoritmos e tolerâncias — parte de F03) |
| Substitui / substituída por | — |

## Contexto

Todos os métodos da v0.1 (ANOVA, Tukey, fatoriais, superfícies, otimização) consomem a mesma base: álgebra matricial estável, funções especiais, distribuições e ajuste linear. O resultado precisa ser **idêntico em lógica** no Windows (Rust nativo) e no navegador (WebAssembly), auditável e com exatidão medida contra referências independentes.

## Decisões

### 1. Álgebra linear própria, sem biblioteca

Matriz densa própria (`numeric/matrix.rs`), **QR de Householder com pivoteamento de colunas** (`qr.rs`) e **SVD por Jacobi unilateral** (`svd.rs`, só diagnóstico). Nenhuma crate de álgebra linear (nalgebra, faer) entra.

- QR: as colunas são **normalizadas** (norma 1) antes da fatoração, para que a decisão de posto não dependa da escala das variáveis; o pivô de cada passo é a coluna restante de maior norma; posto = número de passos cujo pivô supera `max(m, n)·ε` vezes o primeiro pivô.
- Regressão **nunca** forma nem inverte `XᵀX` de modo geral: coeficientes por `R·b = Qᵀy`; covariância por `(RᵀR)⁻¹` obtida de `R` por substituição; formas quadráticas de predição por substituição direta em `Rᵀ`.
- Cholesky e integração numérica **não** foram criadas: nenhum método da ET04 as consome. A integração entra na ET05 (amplitude studentizada) e Cholesky só se um método a exigir.

### 2. Funções matemáticas: `std` de cada alvo, sem `libm`

`ln`, `exp`, `sqrt`, `powi` e `mul_add` vêm de `std`. Não se adiciona a crate `libm`. O WebAssembly usa a implementação de `compiler-builtins` e o Windows a do sistema; as diferenças são de ordem de 1 ULP. A paridade é **medida**, não presumida: os mesmos casos de referência rodam nos dois alvos com as mesmas tolerâncias ([numeric.parity.test.ts](../../app/web/src/services/engine/numeric.parity.test.ts), [linear.parity.test.ts](../../app/web/src/services/engine/linear.parity.test.ts)). Cálculos que exigem exatidão extra usam técnicas locais (produto exato por `mul_add` na `erfc`, correção de Stirling, soma compensada de Neumaier), não funções externas.

### 3. Algoritmos das distribuições

- Gama e beta incompletas regularizadas por série e fração contínua (Lentz), com a **cauda menor calculada diretamente** (precisão relativa em p pequenos) e `x`/`1−x` recebidos separados quando há cancelamento.
- `ln Γ` por Lanczos (g = 7) abaixo de 15 e série de Stirling acima; `ln B` e o fator de Poisson sem cancelamento (correção de Stirling, `bd0`, como no R).
- Normal por `erfc`; t, qui-quadrado e F por gama/beta incompleta.
- **Quantis por busca de raiz de Brent sobre o logaritmo da cauda**, o que mantém precisão relativa até caudas de 1e-300.
- Limite documentado: para t com graus de liberdade ≥ 1e5 a fração contínua perde precisão (erro medido 2e-11 em `sf`), com tolerância própria registrada.

Detalhes e erros medidos: [funcoes-especiais](../metodos/funcoes-especiais.md) e [distribuicoes](../metodos/distribuicoes.md).

### 4. Codificação categórica

A matriz do modelo aceita **tratamento** (primeiro nível = referência; coeficiente = diferença) e **soma zero** (último nível recebe −1; coeficiente = desvio da média geral). A escolha é do chamador (campo `coding`); somas de quadrados, valores ajustados, resíduos e F **não dependem** dela (verificado nos casos 101 e 102). A interface escolherá a codificação conforme a pergunta (ET05 em diante).

### 5. Métrica de exatidão

LRE (*log relative error*, Wild e Seber): `−log10(|q − c| / |c|)`, limitado a 15; se `c = 0`, erro absoluto na escala dos dados. Cada caso registra o LRE **mínimo exigido** por grandeza: piso do medido menos 1 dígito, no máximo 13. Referências: NIST StRD (regressão linear) comparado com mínimos quadrados **exatos em racionais** sobre os binários de 64 bits lidos do CSV; NumPy/SciPy para o construtor de modelos; mpmath (60 dígitos) para distribuições.

### 6. Leitura exata de decimais em JSON

`serde_json` com a característica `float_roundtrip`. Sem ela, a leitura de decimais pode errar por 1 ULP, o que alteraria dados de entrada e quebraria a reprodução exata dos resultados (defeito descoberto por teste de ida e volta de `LinearFit`). Vale para o núcleo, o motor, o WASM e o pacote Tauri. `JSON.parse` do JavaScript já é exato.

### 7. Estados indefinidos

Além de `Stat::Undefined`, os motivos novos são `notEstimable` (coluna aliasada), `noResidualDegreesOfFreedom`, `constantResponse`, `noModelTerms` e `outOfDomain`. Resultados que estourariam em 64 bits (escala extrema) viram erro `model.non_finite_result`, nunca `NaN`.

### 8. Operação de avaliação de distribuições

`distributionEvaluate` (lote de `cdf`, `sf`, quantis) existe para que a interface use as mesmas distribuições do motor e para a verificação nativo × WebAssembly dos pontos de referência. Argumentos fora do domínio devolvem estado explícito.

### 9. Mau condicionamento

O número de condição das colunas retidas (normalizadas) é calculado por SVD de Jacobi. A partir de **1e8** o ajuste carrega o aviso `model.ill_conditioned` (perda de cerca de 8 dígitos). Limiar escolhido pelo caso NIST Filip (cond ≈ 5,2e9, 7 dígitos corretos obtidos); Longley (4e4) e Wampler (2e3) não disparam.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| nalgebra ou faer | Cálculo menos transparente para auditar, aumento do WASM e dependência grande para a pequena parte usada; a exatidão própria foi medida em NIST |
| Equações normais com Cholesky | Eleva o número de condição ao quadrado; falha em Filip e Wampler |
| Crate `libm` nos dois alvos | Aumenta dependência sem necessidade comprovada; a paridade medida é suficiente |
| Quantil por Newton sobre a probabilidade | Perde precisão relativa em caudas; Brent no log da cauda a preserva |
| LRE medido contra os valores certificados apenas | Os decimais certificados não são exatos em binário (Filip, Wampler 4–5); a referência exata sobre os binários isola o erro do algoritmo |

## Critérios e evidências

- NIST StRD de regressão linear (11 conjuntos) e 6 casos do construtor de modelos, nativo e WebAssembly, com LRE medidos em [validation/cases/linear_model](../../validation/cases/linear_model/README.md).
- 4 casos de distribuições (mpmath) com 531 pontos, nativo e WebAssembly.
- Referência exata × certificado NIST: LRE ≥ 13,2 em todos os coeficientes (confirma a referência).

## Consequências

- ET05–ET08 usam `models::fit_model`, `inference`, `diagnostics` e `distributions` sem reimplementar álgebra.
- A amplitude studentizada (ET05) exigirá integração numérica própria, a validar contra mpmath/R.
- A tolerância para t com df ≥ 1e5 pode ser apertada com outra expansão assintótica, se algum método exigir.
