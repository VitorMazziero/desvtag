# response_surface / 003-box-behnken-3-fatores

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

Box–Behnken com 3 fatores, 3 pontos centrais e modelo completo. Coeficientes, erros-padrão, t, valores-p e intervalos (escala codificada), ANOVA, R² e R² ajustado, falta de ajuste e erro puro, equação em unidades reais, valores ajustados, alavancagens, intervalos experimentais e a malha 5×5 de predições com o indicador de extrapolação concordam com a referência independente?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng`) a partir de uma superfície quadrática conhecida mais ruído normal, arredondados a 3 casas. `input.csv` tem os valores **reais** dos fatores e a resposta `y`.

## Configuração

`config.json`: fatores e níveis (definem a codificação), termos (A, B, C, AA, BB, CC, AB, AC, BC), α = 0.05 e os eixos da malha.

## Referência independente

NumPy 2.5.4 (`lstsq`, inversa de XᵀX) e SciPy 1.18.1 (`t`, `f`). A equação em unidades reais vem de **outro ajuste** dos valores ajustados, feito diretamente com os fatores reais; a falta de ajuste e o erro puro, pela definição; a extrapolação, pela alavancagem `x₀ᵀ(XᵀX)⁻¹x₀` comparada com a maior alavancagem dos ensaios e pelos intervalos observados. [Método](../../../docs/metodos/superficie-resposta.md).

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-8 + 1e-9 × escala.

## Diferenças admitidas

Nenhuma além da tolerância.

## Execução

`cargo test -p optima-core --test surface_validation` e `npm test` (paridade WebAssembly). Regenerar: `python validation/tools/make_surface_cases.py`.
