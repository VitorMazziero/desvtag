# Limites operacionais da v0.1

**Estado:** vigente · **Atualizado em:** 2026-11-01 · **Origem:** ET10-T04

Tempos e memória **medidos** do motor, para que a documentação não prometa mais do que o produto entrega. Valores são de uma máquina de desenvolvimento (container Linux, Intel Xeon, 4 núcleos, 16 GiB), motor nativo compilado em `release`, pelo transporte JSON (o mesmo caminho do Tauri e do WebAssembly). **Não são garantias**: dependem do equipamento, e o WebAssembly é tipicamente mais lento que o nativo (ver [Navegador](#navegador-webassembly)). Nenhuma medição foi feita no Windows 11.

## Como reproduzir

Em `app/`:

```bash
cargo test --release -p optima-engine --test performance -- --ignored --nocapture
```

O teste (`app/crates/optima-engine/tests/performance.rs`) é ignorado por padrão: não participa da CI e não verifica correção, só mede. Dados sintéticos determinísticos; mediana de 3 execuções.

## Resultados (nativo, `release`)

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
- **Comparação de tratamentos**: o custo cresce com o número de pares (`g(g−1)/2`) e é compatível com o do valor-p de Tukey (distribuição da amplitude studentizada, por integração numérica), que medido isoladamente leva **≈ 10–12 ms por valor** em todos os tamanhos testados (`measure_studentized_range_share`); por par, a comparação completa levou de ≈ 3 a ≈ 26 ms nas medições acima. Não foi feito perfil detalhado das demais partes (diagnósticos, letras). Para os usos da v0.1 (até cerca de 12 tratamentos) a resposta fica abaixo de 1 s nativa; **com 40 ou mais tratamentos pode levar vários segundos e com 100 mais de 15 s**, sem indicação de progresso. Os cálculos continuam corretos; é uma limitação de desempenho.
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

## Melhorias identificadas (não bloqueiam a v0.1.0)

1. Acelerar o cálculo dos valores-p de Tukey (por exemplo, reaproveitar a integral interna entre pares de mesmos graus de liberdade) ou calcular sob demanda e mostrar progresso.
2. Medir o WebAssembly com os mesmos conjuntos sintéticos (aqui só há uma medição de ponta a ponta).
3. Repetir as medições no Windows 11 (instalador) e em equipamento de referência.
