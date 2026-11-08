# Fatorial completo de níveis mistos

**Estado:** implementado; validado contra a reimplementação independente (geração); análise pela ANOVA multifatorial · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `mixed_levels_design` |
| Módulo | C13 `designs/mixed_levels` |
| Etapa | [ET15](../planos-execucao/concluidos/et15-niveis-mistos-e-misturas.md) (níveis mistos entregues; misturas em seguida) |
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

## 12. ET25 T08 — estimabilidade (decisão em preparação)

O gerador existente oferece o fatorial completo. A extensão diagnostica também subconjuntos/frações personalizadas recebidos pela grade/importação e analisados pelo modelo multifatorial suportado; não acrescenta silenciosamente um catálogo de arranjos ortogonais. Fatores numéricos neste fluxo continuam como níveis nomeados, conforme §2, sem pressupor tendência polinomial entre os valores.

A propriedade é do modelo e das linhas informativas: uma função Lβ é estimável se L pertence ao espaço-linha de X, ou se é ortogonal ao núcleo de X. A [referência primária do pacote estimability](https://journal.r-project.org/articles/RJ-2015-016/) fornece esse critério. A [documentação do emmeans](https://rvlenth.github.io/emmeans/articles/FAQs.html) também mostra que comparações podem ser estimáveis mesmo quando as médias individuais não são. Portanto, testar diretamente cada média, diferença e contraste combinado; não somar estimativas arbitrárias nem exigir que as médias isoladas existam antes de avaliar sua diferença.

Registrar posto, número de colunas, graus de liberdade nominais e separáveis por termo e relações de confundimento na codificação usada. Uma coluna retida como pivô no cálculo não implica que seu coeficiente isolado seja identificável. Os termos da ANOVA I/II/III precisam conservar a interpretação de suas projeções/modelos encaixados; um termo confundido não pode ser apresentado como efeito isolado só por receber SQ sequencial. Com zero graus de liberdade identificáveis, não chamar SQ=0 de ausência de efeito.

Reutilizar QR e o teste compartilhado, substituindo a exigência de inversa completa para médias/contrastes. As famílias declaradas dos ajustes permanecem explícitas; funções não estimáveis ficam indefinidas, sem letras ou valores-p inventados. A média uniforme sobre fatores não mostrados deve ser fatorada analiticamente, com referência por enumeração em exemplos pequenos. Células, pares e trabalho acumulado terão orçamento antes da alocação (AU-B21), sem enumerar toda uma grade apenas para promediar seus contrastes.

O diagnóstico da geometria não deve exigir graus de liberdade residuais. A origem planejada (condições antes da coleta) deve ser distinguida da amostra efetivamente usada para uma resposta, excluindo linhas incompletas conforme o modo. A escolha da exposição/configuração no app e dos contratos aditivos será fechada após as referências, mantendo acesso pelo fluxo normal. Resultados novos terão versão/proveniência e origem salvas; históricos anteriores permanecem legíveis, com aviso quando houver deficiência de posto, sem análise automática ao abrir. T08 continua em execução.

As primeiras 13 referências SVD/statsmodels e o teste público reproduzem AU-B20. O caso de três células de um 2×3 aditivo tem posto 3/4: nenhuma média marginal de B é estimável, mas B2−B3 = −4 com EP=√(2/3). Outro teste público reproduz AU-B22: NaN vira 1 no helper Bonferroni/Holm. Preservar a família completa declarada; valores indefinidos não serão publicados como 1 nem usados como evidência de não diferença. As revisões de `factorial_anova` e `multiple_comparison_procedures` serão identificadas, com históricos mantidos e sinalizados quando afetados.
