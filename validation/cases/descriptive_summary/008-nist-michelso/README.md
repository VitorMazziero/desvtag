# descriptive_summary / 008-nist-michelso

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

A média, a variância e o desvio-padrão amostrais (denominador n − 1) calculados pelo motor são exatos para o conjunto NIST StRD `Michelso` (100 observações)?

## Dados

Conjunto univariado do NIST Statistical Reference Datasets (https://www.itl.nist.gov/div898/strd/univ/data/Michelso.dat), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv` (coluna `y`).

## Configuração

`config.json`: método `descriptive_summary`, resposta `y`, sem agrupamento.

## Referência independente

Aritmética racional exata em Python (`fractions`) com raiz quadrada de 60 dígitos (`mpmath` 1.4.1) sobre os números binários de 64 bits lidos do CSV; verificação cruzada com NumPy 2.5.4 e comparação com os valores certificados pelo NIST. Gerado por `validation/tools/make_descriptive_cases.py`.

## Resultados esperados e tolerâncias

`expected.json`. Média, variância e desvio-padrão: erro relativo ≤ 1e-12 em relação ao valor exato sobre os binários de 64 bits (o algoritmo — soma compensada e segunda passagem corrigida — erra na ordem de 1e-16; 1e-12 deixa margem de quatro ordens de grandeza sem aceitar erros de algoritmo ingênuo).

Valores certificados do NIST (decimais): o aplicativo lê cada decimal como binário de 64 bits, o que perturba os dados por δᵢ. Pela desigualdade triangular, |s_bin − s_cert| ≤ √(Σδᵢ² / (n−1)) e |média_bin − média_cert| ≤ Σ|δᵢ|/n; esses limites estão em `certifiedBounds` e são a diferença admitida, mais 1e-12 relativo.

## Diferenças admitidas

Somente a conversão decimal→binário descrita acima.

## Execução

Ver `app/crates/optima-core/tests/descriptive_validation.rs` (nativo) e `app/web/src/services/engine/descriptive.parity.test.ts` (WebAssembly).
