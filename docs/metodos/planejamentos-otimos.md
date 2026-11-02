# Planejamentos D e I-ótimos, com restrições e ampliação

**Estado:** implementado; métricas e ótimos validados contra NumPy e busca exaustiva · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `optimal_design` |
| Módulo | C13 `designs/optimal` |
| Etapa | [ET16](../planos-execucao/concluidos/et16-planejamentos-otimos-e-restritos.md) |
| Casos de validação | [`validation/cases/optimal_design`](../../validation/cases/optimal_design/optimal.json) (5 de métricas e 6 de busca exaustiva); gerador [`make_optimal_cases.py`](../../validation/tools/make_optimal_cases.py) |

## 1. Pergunta

Dado um modelo, um número fixo de ensaios, uma região (com restrições entre os fatores) e, às vezes, ensaios já realizados, **quais combinações de níveis** estimam melhor o modelo?

## 2. Pressupostos

O modelo escolhido descreve a resposta; o erro é aditivo, independente e de variância constante. Fatores quantitativos com faixa `[baixo, alto]`; os candidatos são uma malha regular de 3 ou 5 níveis por fator, dentro das restrições. O planejamento depende do modelo declarado.

## 3. Entradas e opções

1 a 5 fatores com faixa; modelo (linear, com interações de dois fatores, quadrático completo); critério D ou I; total de ensaios (até 60, **incluindo** os já realizados, e pelo menos o número de parâmetros); níveis da malha (3 ou 5); restrições `Σ aᵢxᵢ ≤ b` em unidades reais; ensaios já realizados (mantidos); inícios aleatórios (1 a 50), aleatorização da ordem dos ensaios novos e semente. No máximo 1 500 candidatos depois do filtro.

## 4. Fórmulas

Com `X` a matriz do modelo dos `n` ensaios e `M = XᵀX`, `p` parâmetros e `W` a média de `xxᵀ` sobre os candidatos:
**D:** maximiza `ln|M|`; eficiência `|M|^(1/p)/n`. **I:** minimiza `tr(M⁻¹W)` (variância média de predição); relatada como `n·tr(M⁻¹W)`. Também: eficiência A = `p/(n·tr M⁻¹)` e eficiência G = `p/(n·máx d(x))`, com `d(x) = xᵀM⁻¹x` sobre os candidatos.

## 5. Algoritmo numérico

**Troca de Fedorov** com vários inícios. Para cada ensaio livre `o` e cada candidato `c`, o critério após a troca sai de **atualizações de posto 1** de `M⁻¹`: `M₁⁻¹ = M⁻¹ + (M⁻¹xₒ)(M⁻¹xₒ)ᵀ/(1 − dₒ)`, `ln|M₂| = ln|M| + ln(1 − dₒ) + ln(1 + x_cᵀM₁⁻¹x_c)` e, para I, `tr(M₂⁻¹W) = tr(M₁⁻¹W) − x_cᵀM₁⁻¹WM₁⁻¹x_c/(1 + d_c)`. Aplica-se a melhor troca que melhora o critério e repete até não haver melhora (máximo de 60 passagens). Início `s`: permutação dos candidatos por PCG32 com a semente `semente + s`. Cholesky das matrizes simétricas. **Não há garantia de ótimo global**: o resultado informa em quantos inícios o melhor valor foi alcançado.

## 6. Saídas

Ensaios (os já realizados primeiro, depois os novos na ordem aleatorizada ou na da busca) em unidades reais e codificadas; número de candidatos; parâmetros; `ln|M|`; eficiências D, A e G; variância média de predição; inícios executados e inícios que alcançaram o melhor valor; algoritmo; avisos.

## 7. Casos sem resultado válido

`design.optimal_invalid_factor_count`, `_invalid_range`, `_invalid_levels`, `_invalid_starts`, `_invalid_runs`, `_invalid_constraint`, `_invalid_fixed_run`, `_too_few_runs` (menos ensaios que parâmetros), `_more_fixed_than_runs`, `_empty_region` (restrições sem candidatos), `_too_many_candidates` e `_singular` (nenhum início chegou a matriz de informação de posto completo).

## 8. Exemplo

3 fatores, modelo com interações, 8 ensaios: o critério D encontra o fatorial `2³` (ótimo conhecido, `ln|M| = 7·ln 8` e eficiência D = 1).

## 9. Interpretação apresentada ao usuário

O aplicativo mostra a contagem de candidatos, quantos inícios alcançaram o melhor valor e a nota de que a busca é local e **não garante o ótimo global**. O resultado vai para a grade de dados e a análise é a de superfície de resposta; **modelos lineares ou com interações exigem escolher os termos** no resultado, porque a análise de superfície parte do modelo quadrático.

## 10. Validação

`optimal_validation.rs`: (a) `ln|M|`, eficiências D, A e G e a variância média de predição de 5 planejamentos dados coincidem com o NumPy (`slogdet`, `inv`, `einsum`) a 1e-9; (b) em 6 problemas pequenos (D e I; quadrático, interações, linear; com restrição; com ensaios já realizados) o melhor critério da **busca exaustiva com reposição** (`itertools.combinations_with_replacement`, até 137 mil seleções) é alcançado pela troca; (c) o fatorial `2³` é recuperado como D-ótimo. O teste do WebAssembly repete (b) e (c). E2E no navegador: busca com restrição, tabela com as restrições respeitadas e uso nos dados.

**Desempenho** (nativo, `release`, 10 inícios, critério I, modelo quadrático): 5 fatores × 3 níveis (243 candidatos, 40 ensaios) ≈ 1,6 s; 4 fatores × 5 níveis (625 candidatos, 30 ensaios) ≈ 2,2 s. No WebAssembly espera-se mais tempo; não foi medido separadamente.

## 11. Referências

Atkinson, Donev e Tobias, *Optimum Experimental Designs, with SAS*; Fedorov (1972), *Theory of Optimal Experiments*; Goos e Jones, *Optimal Design of Experiments*; Meyer e Nachtsheim (1995).

## Limitações desta versão

- Só **troca de Fedorov sobre malha** (sem troca por coordenadas contínuas); candidatos limitados a 1 500.
- Sem blocos na ampliação, sem misturas restritas (ótimo para misturas fica fora) e sem critérios A, G ou bayesianos como objetivo (só como relatório).
- A análise posterior é a de superfície de resposta; o planejamento ótimo **não é guardado como especificação** no projeto (as linhas geradas e o registro nos metadados da exportação são o que fica).
