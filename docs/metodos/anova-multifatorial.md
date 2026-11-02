# ANOVA multifatorial com blocos

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 10 verificado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `factorial_anova` |
| Módulo | C08b `models/factorial_anova` |
| Etapa | [ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| Casos de validação | [`validation/cases/factorial_anova`](../../validation/cases/factorial_anova/factorial.json) (6 casos: desbalanceado com bloco e balanceado, nos tipos I, II e III; gerador [`make_factorial_cases.py`](../../validation/tools/make_factorial_cases.py)) |
| Complementos | [médias marginais e contrastes](medias-marginais-contrastes.md), [DBC](delineamento-em-blocos.md) |

## 1. Pergunta

Em um experimento com **dois ou mais fatores categóricos** (e, opcionalmente, um fator de **bloco**), quais fatores e interações explicam a variação da resposta? O bloco remove da variação residual a diferença entre dias, lotes ou operadores.

## 2. Pressupostos

Observações independentes dentro dos blocos; erros aproximadamente normais com variância comum; efeitos de bloco **aditivos** (sem interação bloco × tratamento, que não é estimável sem réplicas dentro do bloco). Cada fator tem ao menos 2 níveis e há graus de liberdade do erro.

## 3. Entradas e opções

Fatores (ao menos um), `blockId` opcional, **ordem máxima das interações** (1 = sem interação; padrão 2), **tipo de soma de quadrados** (I, II ou III; padrão III), `α`, médias marginais e contrastes pedidos.

## 4. Fórmulas

Modelo linear com codificação de **soma zero** (efeitos): intercepto, um termo por fator, interações até a ordem pedida e o bloco como efeito principal. As somas de quadrados vêm de **diferenças da soma de quadrados do resíduo** entre modelos encaixados:

- **Tipo I** (sequencial): cada termo depois dos anteriores; depende da ordem dos fatores.
- **Tipo II**: cada termo depois de todos os que **não o contêm** (marginalidade); sem interação coincide com o III.
- **Tipo III**: cada termo depois de todos os outros; com soma zero, hipóteses sobre as médias marginais; é o padrão porque as comparações marginais usam as mesmas hipóteses.

`F = (SQ_termo/gl_termo)/QMR` com `gl` do resíduo `n − p`. `R²` e `R²` ajustado do modelo completo. Em dados **balanceados** os três tipos coincidem.

## 5. Algoritmo numérico

Decomposição QR da matriz de delineamento (a do [modelo linear](regressao-linear.md)), uma por modelo encaixado; o posto da decomposição dá os graus de liberdade de cada termo, de modo que células vazias reduzem `gl` em vez de produzir resultado inventado, e o aviso `anova.empty_cells` é emitido.

## 6. Saídas

`ssType`, `n`, `rSquared`, `adjustedRSquared`, `terms[]` (termo, `gl`, soma e quadrado médio, F, valor-p, `isBlock`), `residual`, `total`, `marginals[]` e `contrasts[]` (ver o documento irmão), `issues`, `provenance`.

## 7. Casos sem resultado válido

Erros de entrada localizados: `anova.no_factors`, `anova.duplicate_factor`, `anova.factor_needs_two_levels`, `anova.no_residual_df` (modelo saturado), `anova.too_many_columns` (modelo grande demais) e `anova.cells_not_estimable` (médias marginais de células sem dados). Células vazias só geram o aviso `anova.empty_cells`; termos sem graus de liberdade ficam sem teste.

## 8. Exemplo

Duas doses × três tipos, 3 repetições (percurso `methods-flow`): a tabela traz Dose, Tipo, Dose × Tipo, Resíduo e Total (5 linhas) e as médias marginais de cada fator. Em experimento em blocos (quatro dias × três tratamentos): Tratamento, Dia (bloco), Resíduo e Total.

## 9. Interpretação apresentada ao usuário

Frase com o tipo de soma de quadrados, `n`, `R²` e `R²` ajustado; lista dos termos significativos em α ou «nenhum termo significativo»; tabela de ANOVA com o bloco identificado.

## 10. Validação

`statsmodels` (`ols` com `C(·, Sum)` e `anova_lm` tipos I, II e III) como referência independente, em um conjunto **desbalanceado com bloco** e em um **balanceado**. Tolerâncias de `app/crates/optima-core/tests/factorial_anova_validation.rs`: somas de quadrados, quadrados médios, `F`, médias e erros-padrão 1e-9 relativo (1e-10 absoluto); valores-p 1e-6 relativo (1e-12 absoluto). Todos os casos passaram.

## 11. Referências

- Searle, S. R. (1987). *Linear Models for Unbalanced Data*. Wiley.
- Montgomery, D. C. (2019). *Design and Analysis of Experiments*, 10ª ed., cap. 4 (blocos) e 5 (fatoriais). Wiley.
- Langsrud, Ø. (2003). ANOVA for unbalanced data: use Type II instead of Type III sums of squares. *Statistics and Computing* 13, 163–167.
