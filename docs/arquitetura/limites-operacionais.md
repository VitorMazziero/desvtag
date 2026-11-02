# Limites operacionais (medidos na v0.1 e na v0.2)

**Estado:** vigente · **Atualizado em:** 2026-11-01 · **Origem:** ET10-T04 (v0.1) e ET11-T15 (v0.2)

Tempos e memória **medidos** do motor, para que a documentação não prometa mais do que o produto entrega. Motor nativo compilado em `release`, pelo transporte JSON (o mesmo caminho do Tauri e do WebAssembly). **Não são garantias**: dependem do equipamento, e o WebAssembly é tipicamente mais lento que o nativo (ver [Navegador](#navegador-webassembly)). Nenhuma medição foi feita no Windows 11.

Há **duas máquinas** nestas medições, e elas não se misturam:

- **v0.1** (tabela original, preservada abaixo): container Linux, Intel Xeon, 4 núcleos, 16 GiB.
- **v0.2** (tabelas desta seção): **Windows 10 Pro 22H2**, Intel Core i5-11600K @ 3,9 GHz (6 núcleos, 12 threads), 15,9 GiB. Para a comparação da v0.2 com a v0.1 **o código da v0.1 foi medido de novo nesta mesma máquina** (commit `5261ea8`), de modo que a comparação é entre os mesmos equipamento, compilador e conjuntos de dados.

## Como reproduzir

Em `app/`:

```bash
cargo test --release -p optima-engine --test performance -- --ignored --nocapture
```

O teste (`app/crates/optima-engine/tests/performance.rs`) é ignorado por padrão: não participa da CI e não verifica correção, só mede. Dados sintéticos determinísticos; mediana de 3 execuções.

## Resultados da v0.2 (nativo, `release`, Windows 10, mediana de 3 execuções)

| Operação | Tamanho | v0.1 na mesma máquina (ms) | v0.2 (ms) | Ganho |
|---|---|---:|---:|---:|
| ANOVA + Tukey + letras | 4 grupos × 5 repetições (20 obs.) | 177,2 | 42,0 | 4× |
| ANOVA + Tukey + letras | 12 grupos × 10 repetições (120 obs.) | 740,6 | 44,1 | 17× |
| ANOVA + Tukey + letras | 40 grupos × 30 repetições (1200 obs.) | 4 975,9 | 61,2 | 81× |
| ANOVA + Tukey + letras | 100 grupos × 30 repetições (3000 obs.) | 30 359,0 | 126,2 | 241× |
| Superfície de segunda ordem | 2 fatores (13 ensaios) | 0,2 | 0,2 | — |
| Superfície de segunda ordem | 3 fatores (19 ensaios) | 0,5 | 0,4 | — |
| Superfície de segunda ordem | 4 fatores (29 ensaios) | 0,6 | 0,7 | — |
| Superfície de segunda ordem | 5 fatores (47 ensaios) | 1,0 | 1,1 | — |
| Otimização, 2 respostas | 2 fatores (13 ensaios), 40 / 200 inícios | 6,6 / 19,5 | 5,8 / 19,0 | — |
| Otimização, 2 respostas | 3 fatores (19 ensaios), 40 / 200 inícios | 11,7 / 34,9 | 11,0 / 34,1 | — |
| Otimização, 2 respostas | 4 fatores (29 ensaios), 40 / 200 inícios | 19,7 / 57,7 | 18,3 / 56,2 | — |
| Otimização, 2 respostas | 5 fatores (47 ensaios), 40 / 200 inícios | 29,3 / 89,7 | 29,1 / 86,9 | — |

O ganho do Tukey vem da tabela de `W(w; k)` por interpolação de Chebyshev ([DT-0019](../decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md)), que troca a quadratura por ponto por avaliações polinomiais; os valores-p e as letras continuam dentro das tolerâncias de validação da v0.1. O tempo restante (≈ 40 ms com poucos grupos) é o custo único de montar a tabela de cada `k`. As demais operações não mudaram (diferenças dentro da variação entre execuções).

**Operações novas da v0.2** (procedimentos adicionais, ANOVA multifatorial, DBC e seleção de modelos) **não foram medidas no limite**: os casos de validação e os dos exemplos respondem em milissegundos, mas não há medição sistemática por tamanho. O Dunnett exato usa integração dupla e cresce com o número de tratamentos; o limite prático ainda não foi caracterizado.

## Resultados da v0.1 (máquina Linux, preservados como registro)

| Operação | Tamanho | Mediana (ms) |
|---|---|---:|
| ANOVA + Tukey + letras | 4 grupos × 5 repetições (20 obs.) | 158 |
| ANOVA + Tukey + letras | 12 grupos × 10 repetições (120 obs.) | 668 |
| ANOVA + Tukey + letras | 40 grupos × 30 repetições (1200 obs.) | 3 429 |
| ANOVA + Tukey + letras | 100 grupos × 30 repetições (3000 obs.) | 16 392 |
| Superfície de segunda ordem | 2 fatores (13 ensaios) | 0,2 |
| Superfície de segunda ordem | 3 fatores (19 ensaios) | 0,3 |
| Superfície de segunda ordem | 4 fatores (29 ensaios) | 0,4 |
| Superfície de segunda ordem | 5 fatores (47 ensaios) | 0,7 |
| Otimização, 2 respostas | 2 fatores (13 ensaios), 40 / 200 inícios | 3,5 / 9,3 |
| Otimização, 2 respostas | 3 fatores (19 ensaios), 40 / 200 inícios | 7,1 / 19,5 |
| Otimização, 2 respostas | 4 fatores (29 ensaios), 40 / 200 inícios | 13,3 / 37,3 |
| Otimização, 2 respostas | 5 fatores (47 ensaios), 40 / 200 inícios | 20,8 / 62,9 |

Memória: pico de **48 MiB** (RSS) para o processo inteiro de medição, incluindo o caso de 3000 observações.

## Interpretação

- **Superfície e otimização**: dezenas de milissegundos até 5 fatores (composto central de 47 ensaios) e 200 inícios. Não foi encontrado limite prático dentro do que foi medido (até 5 fatores).
- **Comparação de tratamentos**: o custo cresce com o número de pares (`g(g−1)/2`) e é compatível com o do valor-p de Tukey (distribuição da amplitude studentizada, por integração numérica), que medido isoladamente leva **≈ 10–12 ms por valor** em todos os tamanhos testados (`measure_studentized_range_share`); por par, a comparação completa levou de ≈ 3 a ≈ 26 ms nas medições acima. Não foi feito perfil detalhado das demais partes (diagnósticos, letras). Para os usos da v0.1 (até cerca de 12 tratamentos) a resposta fica abaixo de 1 s nativa; **com 40 ou mais tratamentos pode levar vários segundos e com 100 mais de 15 s** (na v0.1; **resolvido na v0.2**: ≈ 61 ms e ≈ 126 ms, ver a tabela acima). Os cálculos sempre foram corretos; era uma limitação de desempenho.
- **Planejamentos**: o motor recusa, com mensagem localizada, mais de 12 fatores em fatoriais completos e mais de 5 000 ensaios (`MAX_RUNS`). A geração e a análise de dois níveis não foram medidas no limite; os casos usados nos exemplos e nos testes respondem em milissegundos.

## Navegador (WebAssembly)

Medida de ponta a ponta no Chromium e no Firefox (exemplo 04, otimização com 40 inícios, 3 fatores e 2 respostas, do clique até o botão voltar a ficar habilitado, incluindo Worker e redesenho): **cerca de 180–440 ms** (primeira execução mais lenta). O motor roda em um Worker; a interface não trava, e a busca pode ser cancelada (o Worker é recriado).

## Limites declarados e como o produto se comporta

| Limite | Comportamento |
|---|---|
| Planilhas importadas | Até 2 000 000 de células por planilha (`import.xlsx`); acima disso recusa com mensagem localizada |
| XLSX exportado | Até 1 048 576 linhas × 16 384 colunas por planilha; acima disso `export.too_large` |
| Arquivo `.enzitag` | Limites do contêiner em [formato `.enzitag`](formato-enzitag.md) |
| Fatores em superfície | Medido de 2 a 5 fatores; o limite de fatores do planejamento é o de ensaios (5 000) |
| Otimização | Cancelável; sem progresso incremental (ver [DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md), item 9) |

## Melhorias identificadas

1. ~~Acelerar o cálculo dos valores-p de Tukey~~ — feito na v0.2 (tabela de `W(w; k)`). Falta caracterizar os limites do Dunnett exato e das operações novas.
2. Medir o WebAssembly com os mesmos conjuntos sintéticos (aqui só há uma medição de ponta a ponta).
3. Repetir as medições no Windows 11 (instalador) e em equipamento de referência.

## Planejamento ótimo (v0.3)

Limites do aplicativo: 5 fatores, 60 ensaios, 50 inícios e 1 500 candidatos depois das restrições. Medições nativas (`release`, 10 inícios, critério I, quadrático, Windows 10): 5 fatores × 3 níveis × 40 ensaios ≈ 1,6 s; 4 × 5 níveis × 30 ensaios ≈ 2,2 s ([`worst_cases_timing`](../../app/crates/optima-core/tests/optimal_validation.rs)). O WebAssembly não foi medido separadamente; a busca pode ser cancelada.
