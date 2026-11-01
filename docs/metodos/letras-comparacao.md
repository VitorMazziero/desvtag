# Letras de comparação (inserção e absorção)

**Estado:** implementado; validado semanticamente e contra uma referência independente (nativo e WebAssembly) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `one_way_comparison` (parte do mesmo método) |
| Módulos | C09 `comparisons/letters` |
| Etapa | [ET05](../planos-execucao/concluidos/et05-anova-tukey-letras.md) |
| Casos de validação | [`validation/cases/one_way_comparison/101…104`](../../validation/cases/one_way_comparison/README.md); testes `comparisons::letters::tests` |

## 1. Pergunta

Como resumir, no gráfico de médias, todas as comparações de pares sem esconder sobreposições?

## 2. Garantia semântica

**Dois grupos compartilham ao menos uma letra se e somente se a diferença entre eles não foi detectada.** Pares **não testados ou não estimáveis são tratados como diferentes** (nunca se afirma igualdade sem teste) e o resultado carrega `hasUnknownPairs`. Compartilhar letra indica diferença **não detectada**, **não equivalência**; a legenda do gráfico diz isso sempre.

## 3. Entradas e opções

Relação de cada par (`NotDifferent`, `Different`, `Unknown`) e a ordem de apresentação. O motor usa as **médias em ordem decrescente**: a letra `a` pertence ao grupo de maior média (outros programas podem usar a ordem inversa; a conclusão não muda).

## 4. Algoritmo

Piepho (2004): parte-se de uma coluna com todos os grupos; para cada par diferente `(i, j)`, cada coluna que contém ambos é substituída por duas cópias, uma sem `i` e outra sem `j` (**inserção**); em seguida removem-se colunas vazias, repetidas ou contidas em outra (**absorção**). As colunas são ordenadas pela posição do primeiro membro na ordem de apresentação e nomeadas `a…z, aa, ab, …` (mais de 26 grupos). O limite de 2000 colunas intermediárias (grafos de pares muito irregulares, que não ocorrem com médias ordenadas) declara as letras indisponíveis (`comparison.letters_unavailable`) em vez de travar.

## 5. Saídas

`letters[]` (texto por grupo), `memberships[]` (índices das letras, sem ambiguidade), `nLetters`, `hasUnknownPairs`.

## 6. Casos sem resultado válido

Sem comparações de Tukey não há letras. Pares `Unknown` separam os grupos.

## 7. Exemplo

`A–C` diferem; `B` não difere de nenhum ⇒ `a`, `ab`, `b`. Cadeia `0≠2`, `0≠3`, `1≠3` ⇒ `a`, `ab`, `bc`, `c`. Sete grupos do caso 103: `d, cd, cd, bcd, abc, a, ab`.

## 8. Validação

- **Propriedade** (testes unitários): para grafos aleatórios (2 a 12 grupos, densidades 0–100 %) e para grafos de intervalos com **27, 40 e 60 grupos**, `compartilha letra ⇔ não diferente`, e todo grupo tem letra; 30 grupos distintos usam 30 letras, a 27ª nomeada `aa`.
- **Referência independente** (casos 101–104): as letras do motor são **idênticas** às obtidas pelos **cliques maximais** do grafo de pares não significativos (Bron–Kerbosch em Python), um algoritmo diferente do de inserção e absorção, sobre os p ajustados do SciPy; ordenação pela mesma regra.
- Grafo patológico (complemento de um emparelhamento perfeito com 24 grupos, 2¹² colunas): recusado, não trava.

## 9. Referências

- Piepho, H.-P. (2004). An algorithm for a letter-based representation of all-pairwise comparisons. *J. Comput. Graph. Statist.* 13, 456–466.
- Lenth, R. V. *emmeans*, `cld`: <https://rvlenth.github.io/emmeans/reference/CLD.emmGrid.html>.
