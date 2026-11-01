# Estatística descritiva

**Estado:** implementado; validado numericamente (nativo e WebAssembly); verificação no Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `descriptive_summary` (versão 1) |
| Operação do protocolo | `descriptiveSummarize` (`descriptive.summarize`) |
| Módulos | C01 `domain/dataset`, C02 `validation/dataset`, C03 `numeric/summation`, C05 `descriptive/{summary,grouped}`, C18 `interpretation/{facts,rules}` |
| Etapa | [ET02](../planos-execucao/ativos/et02-primeiro-percurso.md) |
| Casos de validação | [`validation/cases/descriptive_summary/`](../../validation/cases/descriptive_summary/001-nist-numacc1/README.md) (nove conjuntos NIST StRD) |

## 1. Pergunta estatística

Como se resumem os valores medidos de uma resposta — no conjunto todo e em cada grupo definido por fatores? É uma descrição dos dados observados; **não** é um teste nem uma comparação entre grupos.

## 2. Pressupostos e estruturas compatíveis

- Nenhum pressuposto distribucional: são contagens e resumos aritméticos.
- Cada observação (linha) é uma observação. O método **não afirma** que as observações sejam réplicas independentes nem corrige dependência: `n` conta linhas válidas. Essa advertência é sempre emitida (fato `descriptive.independence_not_assessed`).
- A unidade experimental (`unitId`) é registrada quando informada, mas ainda não altera o cálculo.

## 3. Entradas e opções

- `dataset`: fatores (id, nome, tipo, unidade, níveis declarados), respostas (id, nome, unidade) e observações (id, unidade experimental opcional, valor de cada fator e de cada resposta). Valores ausentes são `null` explícito.
- `responseId`: resposta a resumir.
- `groupBy`: identificadores de fatores; vazio = apenas o resumo geral. Sem outras opções.

## 4. Fórmulas

Sejam `x₁,…,xₙ` os valores **válidos** (não ausentes) da resposta no conjunto considerado.

- Contagens: `nTotal` (linhas), `nMissing` (valores ausentes), `nValid = nTotal − nMissing`.
- Média: `x̄ = (Σ xᵢ) / n`.
- Variância amostral: `s² = Σ (xᵢ − x̄)² / (n − 1)`, definida para `n ≥ 2`.
- Desvio-padrão amostral: `s = √s²`.
- Mínimo e máximo: menor e maior valor válido.

## 5. Algoritmo numérico

1. **Soma compensada de Neumaier** (`numeric/summation.rs`) em todas as somas. Erro típico: o valor exato arredondado uma vez.
2. Desvios `dᵢ = xᵢ − x̄` e **segunda passagem corrigida**: `s² = (Σ dᵢ² − (Σ dᵢ)² / n) / (n − 1)` (Chan, Golub e LeVeque, 1983). O termo `(Σ dᵢ)²/n` remove o erro de arredondamento da própria média.
3. Se a variância calculada for negativa por arredondamento (valores todos iguais), vale 0. A verificação de finitude ocorre **antes** do truncamento em 0, porque `NaN.max(0.0)` devolveria `0.0` (defeito encontrado e corrigido durante a implementação; há teste).

A fórmula ingênua `(Σ x² − n x̄²)/(n−1)` não é usada: o caso NIST `NumAcc4` (deslocamento 10⁷, desvio 0,1) a derrota, e um teste confirma que o caso discrimina algoritmos.

**Grupos.** Cada combinação de níveis dos fatores de agrupamento forma um grupo. Ordem: por fator, pelos níveis declarados; sem níveis declarados, numérica (fator quantitativo) ou alfabética (categórico). Rótulos numéricos usam a menor notação decimal que reproduz o valor.

## 6. Saídas

`overall` e, por grupo, `summary` com `nTotal`, `nMissing`, `nValid`, `mean`, `variance`, `sd`, `min`, `max`; `excludedMissingFactor`; `facts`; `provenance` (método, versão do método, versão do motor). Cada estatística é `{status: "defined", value}` ou `{status: "undefined", reason}`.

## 7. Casos sem resultado válido

| Situação | Comportamento |
|---|---|
| Nenhuma observação válida | média, variância, desvio, mínimo e máximo `undefined` (`noValidObservations`) |
| Uma observação válida | média, mínimo e máximo definidos; variância e desvio `undefined` (`fewerThanTwoObservations`) |
| Estouro ou entrada extrema (por exemplo, `MAX + MAX`) | `undefined` (`nonFiniteResult`); nunca `NaN`, infinito ou 0 |
| Valores todos iguais | variância 0 e desvio 0 (definidos) |
| Observação sem valor em fator de agrupamento | fica fora dos grupos, entra no geral e é contada em `excludedMissingFactor` (fato `descriptive.excluded_missing_factor`) |
| Dados inconsistentes (ids duplicados, tipo de valor errado, nível não declarado, valor não finito, resposta ou fator inexistente) | erro `invalidInput` com diagnósticos; nada é calculado |

## 8. Exemplo com valores intermediários

Dados `2, 4, 4, 4, 5, 5, 7, 9` (n = 8): `x̄ = 40/8 = 5`; desvios `−3, −1, −1, −1, 0, 0, 2, 4`; `Σ d = 0`; `Σ d² = 9+1+1+1+0+0+4+16 = 32`; `s² = 32/7 ≈ 4,571428571`; `s ≈ 2,138089935`. Este exemplo é usado em testes unitários, no teste E2E e na verificação nativa.

## 9. Interpretação apresentada ao usuário

Conclusão (quantas observações foram resumidas), evidência (média geral e desvio-padrão com unidade) e próximo passo (os grupos são descritos, mas nenhum teste de comparação foi entregue). Fatos adicionais por chave (`results:facts.descriptive.*`), em português e inglês. A formatação numérica (até 10 algarismos significativos, separador decimal do idioma) é apenas de apresentação.

## 10. Validação

Nove conjuntos NIST StRD univariados, com referência por aritmética racional exata (Python `fractions` + `mpmath` 1.4.1, verificação cruzada com NumPy 2.5.4) sobre os mesmos binários de 64 bits, e comparação com os valores certificados pelo NIST dentro do limite de representação decimal→binário (derivado em [cada caso](../../validation/cases/descriptive_summary/004-nist-numacc4/README.md)).

| Verificação | Resultado (2026-11-01) |
|---|---|
| Nativo (Rust, `optima-core/tests/descriptive_validation.rs`) | 9/9 casos dentro de erro relativo 1e-12 do valor exato |
| WebAssembly em Node (`app/web/src/services/engine/descriptive.parity.test.ts`) | 9/9 casos, mesmas tolerâncias |
| IPC Tauri em Linux (`app/desktop/tests/native-smoke.mjs`) | exemplo da seção 8 correto |
| Windows 11 | **pendente** (ver [ET01](../planos-execucao/ativos/et01-fundacao-tecnica.md)); situação do método no registro: `numericallyValidated` |

Tolerância: erro relativo ≤ 1e-12 contra o exato. O algoritmo erra na ordem de 1e-16; 1e-12 deixa margem de quatro ordens de grandeza sem aceitar o erro de algoritmos ingênuos.

## 11. Referências

- Neumaier, A. (1974). Rundungsfehleranalyse einiger Verfahren zur Summation endlicher Summen. *ZAMM* 54, 39–51.
- Chan, T. F.; Golub, G. H.; LeVeque, R. J. (1983). Algorithms for computing the sample variance: analysis and recommendations. *The American Statistician* 37(3), 242–247.
- NIST Statistical Reference Datasets, Univariate Summary Statistics: <https://www.itl.nist.gov/div898/strd/univ/univ.shtml>.
