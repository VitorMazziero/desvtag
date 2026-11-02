# DT-0019 — Procedimentos de comparação, ANOVA multifatorial com blocos, DBC e desempenho do valor-p de Tukey (v0.2)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Pedido do usuário em 2026-11-01 (Fase 2 da v0.2): blocos (DBC) e ANOVA multifatorial; médias marginais e contrastes; Welch/Games–Howell, Dunnett, Bonferroni/Holm e Kruskal–Wallis/Dunn; acelerar o valor-p de Tukey |
| Pendências relacionadas | — |
| Substitui / substituída por | Estende a [DT-0010](dt-0010-comparacao-de-tratamentos.md) (comparação de tratamentos) e a [DT-0016](dt-0016-dic-aleatorizado-e-estilo-por-figura.md) (DIC) |

## Contexto

A v0.1 comparava tratamentos só por ANOVA de um fator com variâncias iguais e Tukey, e o valor-p de Tukey por integração numérica tornava 40 tratamentos lentos (3,4 s no Linux da v0.1; 5,0 s na máquina Windows) e 100 tratamentos muito lentos (16 s; 30 s). Experimentos reais têm variâncias desiguais, controle, dados não normais, dois ou mais fatores e blocos.

## Decisões

### 1. Um método novo e um procedimento por pedido, sem alterar o que já existe

`multiple_comparison_procedures` e `factorial_anova` são métodos próprios do registro (todos `NumericallyValidated`); a operação `comparisonOneWay` (ANOVA + Tukey) **não muda**. `comparisonProcedure` recebe um `Procedure` (`gamesHowell`, `dunnett{control}`, `bonferroni`, `holm`, `kruskalDunn{adjustment}`) e devolve o teste global, os grupos, os pares e as letras (quando todos os pares têm veredito). O protocolo ganha operações aditivas; `PROTOCOL_VERSION` permanece 1.

### 2. Dunnett exato, sem simulação

A distribuição de `max|T|` é calculada pela estrutura de **um fator comum** (`λᵢ = √(nᵢ/(nᵢ + n₀))`), integrando em `S = s/σ` e em `Z₀`; vale para tamanhos desiguais. Alternativa descartada: quase Monte Carlo (como o SciPy), que dá resultados diferentes a cada execução e não passa na exigência de resultado reprodutível entre Windows e navegador.

### 3. ANOVA multifatorial por modelos encaixados, soma zero e tipo III por padrão

Soma de quadrados por diferença do resíduo entre modelos encaixados com codificação de **soma zero**; tipos I, II e III disponíveis, **III como padrão** (hipóteses sobre médias marginais, que é o que a interface compara). O bloco entra só como efeito principal aditivo. Médias marginais por mínimos quadrados (média das predições com pesos iguais); comparações Tukey–Kramer, Bonferroni, Holm ou nenhuma; contrastes com ajuste de Bonferroni entre os contrastes pedidos.

### 4. DBC como método próprio, com um único PCG32 em sequência por bloco

Fisher–Yates por bloco, na ordem dos blocos, com **um** gerador (semente registrada): reprodutível e idêntico entre Windows e navegador (`designRcbdGenerate`). O projeto guarda `Experiment.rcbd` (só a especificação; a ordem é regenerada) e `analysis.factorial` já preparado com o bloco; ambos opcionais e aditivos (`schemaVersion` permanece 1). A unidade experimental recebe `B<bloco>-T<tratamento>`, independente da semente.

### 5. Valor-p de Tukey por tabela de Chebyshev de `W(w; k)`

A função `W` (distribuição da amplitude de `k` normais) depende só de `k` e era avaliada por quadratura em cerca de 400 pontos por valor-p. Passou a ser **tabulada uma vez por `k`** por interpolação de Chebyshev em trechos; cada valor-p custa ~400 avaliações polinomiais. O erro máximo medido contra a quadratura direta é ≤ 1e-14 em `W`, e todos os casos de validação de Tukey continuam dentro das tolerâncias da v0.1 sem alteração. Ganho medido no [documento de limites](../arquitetura/limites-operacionais.md), com o código da v0.1 e o da v0.2 na mesma máquina (Windows 10, Core i5-11600K): 40 grupos × 30 repetições de ≈ 5,0 s para ≈ 61 ms; 100 grupos × 30 repetições de ≈ 30 s para ≈ 126 ms.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Games–Howell por simulação | Resultado não reprodutível; a fórmula com a amplitude studentizada já é exata |
| Tipo III por padrão sem oferecer I e II | Quem reproduz resultados de outros programas precisa dos três; o tipo é explicitado no resultado |
| Bloco com interação | Não estimável sem réplicas dentro do bloco |
| Reduzir a precisão da quadratura para ganhar tempo | Mudaria resultados já validados; a tabela preserva a precisão |

## Critérios e evidências

[Procedimentos](../metodos/procedimentos-comparacao-multipla.md), [Dunnett](../metodos/dunnett.md), [Kruskal–Wallis/Dunn](../metodos/kruskal-wallis-dunn.md), [ANOVA multifatorial](../metodos/anova-multifatorial.md), [médias marginais e contrastes](../metodos/medias-marginais-contrastes.md), [DBC](../metodos/delineamento-em-blocos.md), [Tukey](../metodos/tukey.md); casos independentes em `validation/cases/` (statsmodels, SciPy, scikit-posthocs, integração dupla própria, PCG32 em Python); paridade WebAssembly; E2E `methods-flow`; [relatório de validação da v0.2](../../validation/reports/v0.2.0/README.md).
