# Exemplo 01 — Quatro condições de reação enzimática

**Dados sintéticos**, criados para este exemplo (não são medições reais): atividade enzimática (U/mL) de uma enzima em quatro condições, com **cinco réplicas experimentais independentes** por condição (cada linha é um tubo de reação separado).

| Item | Conteúdo |
|---|---|
| Fator | Condição (`controle`, `pH 5`, `pH 7`, `pH 9`) |
| Resposta | Atividade, U/mL |
| Delineamento | Inteiramente casualizado (DIC), 4 grupos × 5 réplicas |
| Análise | ANOVA de um fator, comparações de Tukey (α = 0,05) e letras |
| Arquivos | [`dados.csv`](dados.csv) (importável no aplicativo) e [`projeto.enzitag`](projeto.enzitag) (projeto com a análise já calculada) |

## Como reproduzir

1. No aplicativo, escolha **Comparar tratamentos**, cadastre o fator *Condição* e a resposta *Atividade* (U/mL) e cole ou importe `dados.csv` (colunas `condicao` e `atividade_U_mL`).
2. Em **Análise**, escolha *Condição* como fator e calcule. Ou abra `projeto.enzitag`: o resultado guardado aparece sem recálculo.

## Resultado esperado

Conferido contra a referência independente em [`validation/cases/one_way_comparison/101-enzimas-quatro-condicoes`](../../validation/cases/one_way_comparison/101-enzimas-quatro-condicoes/README.md) (SciPy, NumPy e letras por cliques maximais):

- ANOVA: F(3; 16) ≈ 343,4 (p ≈ 1e-14) — há diferença detectada entre as médias.
- Letras (a = maior média): `pH 7` **a**, `pH 5` e `pH 9` **b**, `controle` **c**. `pH 5` e `pH 9` compartilham a letra *b*: diferença **não detectada** entre eles, o que não significa que sejam equivalentes.
- Os valores exatos (diferenças, erros-padrão, p ajustados e intervalos simultâneos) estão em `expected.json` do caso de validação.

O arquivo `projeto.enzitag` foi gerado pelo próprio aplicativo (`app/web/scripts/make-example.mjs`) e é aberto em um teste de ponta a ponta.
