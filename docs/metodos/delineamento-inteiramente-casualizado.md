# Delineamento inteiramente casualizado (DIC) aleatorizado

**Estado:** implementado; validado contra implementação independente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `completely_randomized_design` (versão 1) |
| Módulos | C11 `designs/completely_randomized`; interface U06 (`CrdPanel`, `CrdMatrix`) |
| Etapa | Fechamento da v0.1 ([DT-0016](../decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)) |
| Casos de validação | [`completely_randomized_design/crd.json`](../../validation/cases/completely_randomized_design/crd.json), gerado por [`make_crd_cases.py`](../../validation/tools/make_crd_cases.py) |

## 1. Pergunta

Como distribuir `r` unidades experimentais independentes por cada um dos `a` tratamentos (níveis de um fator categórico) e sortear a ordem de execução de modo **reprodutível**, idêntico no Windows e no navegador?

## 2. Pressupostos

Um único fator categórico; mesmo número de unidades por nível (delineamento balanceado); unidades homogêneas e independentes. A casualização protege contra tendências no tempo e vieses de alocação; **não substitui blocos** quando há fonte de variação conhecida (v0.2).

## 3. Entradas e opções

`factorId`, `factorName`, `levels` (2 a 100, nomes não vazios e únicos), `replicates` (≥ 1; com 1 há aviso, pois não há estimativa do erro), `randomize` e `seed`. O total `a × r` não pode passar de 5000 ensaios.

## 4. Fórmulas

**Ordem padrão.** Posição `p = (i − 1)·r + j`, com `i` o índice do nível e `j` a unidade (1-based): nível 1 com suas `r` unidades, depois o nível 2, e assim por diante.

**Ordem de execução.** Com aleatorização, é a permutação de `0 … a·r − 1` obtida por **Fisher–Yates com PCG32** (ver [aleatorização](aleatorizacao.md)): a posição de execução `k` recebe o ensaio de ordem padrão `perm[k]`. Sem aleatorização, a execução segue a ordem padrão.

## 5. Algoritmo numérico

Apenas aritmética inteira (a mesma da aleatorização): o resultado não depende de ponto flutuante nem de plataforma.

## 6. Saídas

`GeneratedCrd`: ensaios na ordem de execução (`run`, `standardOrder`, `levelIndex`, `level`, `replicate`), total, algoritmo (`pcg32-xsh-rr/fisher-yates` ou `standard-order`), avisos e proveniência. Na interface cada ensaio recebe o identificador de unidade experimental `T<nível>-R<unidade>`, que não depende da semente.

## 7. Casos sem resultado válido

Menos de 2 níveis, mais de 100, nome do fator vazio, nível vazio ou repetido, 0 unidades por nível e mais de 5000 ensaios são recusados com códigos tipados (`design.crd_*`, `design.invalid_replicates`, `design.too_many_runs`); nenhum ensaio é inventado.

## 8. Exemplo

Níveis `Controle, pH 5, pH 7, Temperatura 37`, 5 unidades por nível, semente 42: 20 ensaios; o primeiro a executar é o de ordem padrão 15 (`pH 7`, unidade 5). A mesma entrada gera a mesma ordem no Windows e no navegador.

## 9. Interpretação apresentada ao usuário

A tela explica que cada unidade é um preparo ou amostra independente (medir a mesma amostra várias vezes não cria unidade nova), mostra a contagem antes de gerar, a ordem de execução, o algoritmo e a semente, e permite exportar a matriz (CSV/XLSX) com proveniência. Os dados gerados são analisados como comparação de tratamentos (ANOVA, Tukey, letras).

## 10. Validação

- Testes unitários no núcleo: ordem padrão e sem aleatorização, determinismo, permutação completa com `r` unidades por nível, códigos de erro, aviso de unidade única, contagem.
- **Referência independente:** reimplementação em Python (inteiros arbitrários) da enumeração por nível e do Fisher–Yates/PCG32; 6 casos (inclusive semente `2⁵³ − 1` e 25 níveis × 8 unidades). Ordens **idênticas** no Rust nativo (`optima-core/tests/crd_validation.rs`), no WebAssembly (`crd.parity.test.ts`) e na interface (E2E `crd-flow.spec.ts`, que compara a matriz exibida com o arquivo de referência).
- Windows 11: pendente (mesma aritmética inteira); verificado em Windows 10 (máquina de desenvolvimento) e em `windows-latest`.

## 11. Referências

- O'Neill, M. E. (2014). *PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation*. HMC-CS-2014-0905.
- Montgomery, D. C. *Design and Analysis of Experiments* (delineamento completamente aleatorizado).
