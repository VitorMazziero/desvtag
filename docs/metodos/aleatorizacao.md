# Aleatorização reprodutível (PCG32 e Fisher–Yates)

**Estado:** implementado; validado contra implementação independente; Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | parte de `two_level_design` |
| Módulos | C11 `designs/randomization` |
| Etapa | [ET06](../planos-execucao/ativos/et06-fatoriais-plackett-burman.md) |
| Casos de validação | [`two_level_design/permutations.json`](../../validation/cases/two_level_design/permutations.json) |
| Decisão | [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) |

## 1. Pergunta

Como definir a ordem de execução dos ensaios de modo que seja (a) casual, (b) **reprodutível** a partir de uma semente registrada e (c) idêntica no Windows e no navegador?

## 2. Pressupostos

A semente é um inteiro sem sinal; a interface usa inteiros seguros de JavaScript (até 2⁵³ − 1), sem perda de precisão no contrato JSON. Aleatorizar protege contra tendências no tempo; não substitui blocos quando há fonte de variação conhecida (v0.2).

## 3. Entradas e opções

`randomize` e `seed`. Sem aleatorização, a ordem de execução é a ordem padrão. Com aleatorização, a **ordem efetivamente usada** é gravada nos ensaios (`run`, `standardOrder`) e o algoritmo em `randomizationAlgorithm = "pcg32-xsh-rr/fisher-yates"`. Pontos centrais entram na permutação como quaisquer outros ensaios.

## 4. Fórmulas

**PCG32 (PCG-XSH-RR 64/32, O'Neill, 2014).** Estado de 64 bits; `estado' = estado · 6364136223846793005 + incremento`; saída: `xorshifted = ((s >> 18) ^ s) >> 27` (32 bits), rotação `s >> 59`. Inicialização como `pcg32_srandom_r(semente, 54)`. Sequência fixa 54 em todo o aplicativo.

**Inteiro limitado sem viés.** `limiar = (−limite) mod limite`; descarta saídas `< limiar`; devolve `saída mod limite`.

**Fisher–Yates.** Para `i = n−1 … 1`: `j = limitado(i + 1)`; troca `i ↔ j`. Cada uma das `n!` permutações é igualmente provável dado um gerador uniforme.

## 5. Algoritmo numérico

Apenas aritmética inteira (`u64` com envolvimento e `u32`): o resultado não depende de ponto flutuante, de plataforma ou da largura de ponteiro, portanto é **idêntico** no Windows (nativo) e no WebAssembly.

## 6. Saídas

Ordem de execução, semente e identificação do algoritmo guardados no planejamento e no arquivo `.enzitag`.

## 7. Casos sem resultado válido

`n = 0` devolve lista vazia e `n = 1` a identidade.

## 8. Exemplo

Semente 42: as seis primeiras saídas de `Pcg32` são `0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e`, as do programa de demonstração oficial do PCG.

## 9. Interpretação apresentada ao usuário

A tela mostra a semente e o algoritmo e permite regenerar a mesma ordem; mudar a semente muda a ordem.

## 10. Validação

Teste unitário com o vetor oficial do PCG32; permutações para várias sementes e tamanhos comparadas com uma **reimplementação independente em Python** (inteiros arbitrários) — ordens idênticas; paridade WebAssembly × nativo (`design.parity.test.ts`). Teste de uniformidade simples (contagens por posição) sem pretensão de certificação estatística do gerador. Windows 11: pendente (mesma aritmética inteira).

## 11. Referências

- O'Neill, M. E. (2014). *PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation*. Relatório HMC-CS-2014-0905.
- Knuth, D. E. (1997). *The Art of Computer Programming*, vol. 2, §3.4.2 (algoritmo P, embaralhamento).
