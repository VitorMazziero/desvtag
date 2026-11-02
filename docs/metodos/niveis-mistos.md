# Fatorial completo de níveis mistos

**Estado:** implementado; validado contra a reimplementação independente (geração); análise pela ANOVA multifatorial · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `mixed_levels_design` |
| Módulo | C13 `designs/mixed_levels` |
| Etapa | [ET15](../planos-execucao/ativos/et15-niveis-mistos-e-misturas.md) (níveis mistos entregues; misturas em seguida) |
| Casos de validação | [`validation/cases/mixed_levels_design`](../../validation/cases/mixed_levels_design/mixed.json) (6 casos; gerador [`make_mixed_cases.py`](../../validation/tools/make_mixed_cases.py)) |
| Análise | [ANOVA multifatorial](anova-multifatorial.md) |

## 1. Pergunta

Quais combinações de níveis testar quando os fatores têm **números de níveis diferentes** (por exemplo 3 cepas × 2 valores de pH × 4 agitações), e em que ordem executá-las?

## 2. Pressupostos

Cada ensaio é uma unidade experimental independente; todas as combinações de níveis são realizadas (fatorial **completo**); os níveis são tratados como **nomes** (um fator numérico entra como níveis nomeados e a ANOVA os trata como categorias).

## 3. Entradas e opções

Dois a 8 fatores, cada um com 2 a 50 níveis de nomes distintos; repetições ≥ 1 da combinação completa; aleatorizar (sim/não); semente (inteiro de 0 a 2⁵³ − 1 na interface; o motor aceita `u64`). Total de ensaios ≤ o máximo do aplicativo (`design.too_many_runs`).

## 4. Fórmulas

Número de combinações `∏ nᵢ`; total `∏ nᵢ × r`.

## 5. Algoritmo numérico

**Ordem padrão:** repetição 1 com todas as combinações, depois a repetição 2, e assim por diante; dentro da repetição, o **primeiro fator varia mais depressa**: o índice `j` da combinação decompõe-se em `l₁ = j mod n₁`, `l₂ = ⌊j / n₁⌋ mod n₂`, … **Ordem de execução:** permutação da ordem padrão por Fisher–Yates de trás para frente com PCG32 e a semente informada ([aleatorização](aleatorizacao.md)); sem aleatorização, a ordem padrão.

## 6. Saídas

Combinações, total, ensaios (execução, ordem padrão, índice e nome do nível de cada fator, repetição), algoritmo de aleatorização, avisos e proveniência. Cada ensaio recebe o identificador de unidade `C<níveis>-R<repetição>` (por exemplo `C2.1-R3`: nível 2 do 1.º fator, nível 1 do 2.º, repetição 3), usado na [planilha de coleta](../guias/planilha-de-coleta.md).

## 7. Casos sem resultado válido

`design.mixed_too_few_factors`, `design.mixed_too_many_factors`, `design.mixed_duplicate_factor`, `design.mixed_empty_factor_name`, `design.mixed_too_few_levels`, `design.mixed_too_many_levels`, `design.mixed_empty_level`, `design.mixed_duplicate_level`, `design.invalid_replicates` e `design.too_many_runs`. Aviso `design.mixed_single_replicate` com uma só repetição (sem erro puro, não há graus de liberdade do resíduo sem interações de maior ordem).

## 8. Exemplo

3 cepas (A, B, C) × 2 pH (5, 7), uma repetição, sem aleatorizar: A·5, B·5, C·5, A·7, B·7, C·7.

## 9. Interpretação apresentada ao usuário

A tela mostra a contagem (`12 ensaios: 6 combinações × 2 repetições`), a matriz e a semente e o algoritmo usados; a análise segue pela ANOVA multifatorial com médias marginais e contrastes.

## 10. Validação

O teste `mixed_levels_validation.rs` compara execução, ordem padrão, índices e nomes dos níveis e repetições com a implementação independente em Python (`itertools.product` e PCG32 reimplementado, sem usar o código Rust) em 6 casos (2 a 3 fatores, 1 a 4 repetições, com e sem aleatorização, sementes pequenas e 2⁶³ + 5); o teste do WebAssembly (`v02.parity.test.ts`) repete os casos de semente segura; o E2E gera, preenche, analisa pela ANOVA e confere a ordem padrão.

## 11. Referências

Montgomery, D. C. *Design and Analysis of Experiments*, cap. 5 (fatoriais gerais); [aleatorização](aleatorizacao.md).
