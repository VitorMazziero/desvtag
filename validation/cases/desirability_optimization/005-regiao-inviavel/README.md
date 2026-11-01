# desirability_optimization / 005-regiao-inviavel

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

Limite obrigatório inatingível: nenhum ponto viável. A solução encontrada pela busca (hipercubo latino com semente + Nelder–Mead com projeção) é pelo menos tão boa quanto o melhor ponto de uma **busca exaustiva** numa malha densa da região viável, e as previsões, intervalos e desejabilidades do motor concordam com a referência independente em pontos de sondagem?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng`) a partir de superfícies quadráticas conhecidas mais ruído normal, arredondados a 3 casas. `input.csv` tem os valores **reais** dos fatores e as respostas.

## Configuração

`config.json`: fatores e níveis, termos (modelo completo de segunda ordem), objetivo, limite obrigatório e importância de cada resposta, α, semente e número de inícios.

## Referência independente

NumPy 2.5.4 (`lstsq`, inversa de XᵀX), SciPy 1.18.1 (`t`); desejabilidades de Derringer e Suich; **busca exaustiva** na malha da região (intervalo observado de cada fator e alavancagem de predição não superior à maior dos ensaios), sem algoritmo de otimização. [Método](../../../../docs/metodos/desejabilidade.md) e [busca](../../../../docs/metodos/busca-otimizacao.md).

## Resultados esperados e tolerâncias

`expected.json`. Previsões e intervalos: erro relativo ≤ 1e-8; desejabilidades ≤ 1e-9. O melhor `D` do motor deve ser **≥ o da busca exaustiva − 1e-9** e **≤ ele + 5e-3** (resolução da malha); a posição do ótimo deve concordar até 0,05 em unidades codificadas quando o máximo é único.

## Diferenças admitidas

Nenhuma além da tolerância; o motor refina além da malha.

## Execução

`cargo test -p optima-core --test optimization_validation` e `npm test` (paridade WebAssembly). Regenerar: `python validation/tools/make_optimization_cases.py`.
