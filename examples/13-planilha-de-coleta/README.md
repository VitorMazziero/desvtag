# Exemplo 13 — Planilha de coleta (matriz com respostas)

**Dados sintéticos.** Fatorial 2² com **dois pontos centrais** (6 ensaios, sem aleatorização): **Temperatura** (20 a 30 °C) e **pH** (5 a 7); resposta **Atividade** (U/mL). Mostra o ciclo: o aplicativo exporta a matriz **já com a coluna da resposta**, a pessoa preenche fora do aplicativo e **o mesmo arquivo** é importado para preencher as respostas, sem mexer no planejamento.

| Arquivo | O que é |
|---|---|
| [`planilha-vazia.csv`](planilha-vazia.csv) | A matriz como o aplicativo a exporta (*Baixar matriz (CSV)*), com a coluna `Atividade (U/mL)` vazia |
| [`planilha-preenchida.csv`](planilha-preenchida.csv) | A mesma planilha com um valor por ensaio (10,0; 11,5; 13,0; 14,5; 16,0; 17,5) |
| [`projeto.enzitag`](projeto.enzitag) | O projeto depois de importar a planilha preenchida |

## Como reproduzir

1. **Planejar experimento** → fatores Temperatura e pH, resposta Atividade; níveis 20–30 e 5–7; 2 pontos centrais; sem aleatorizar; **Gerar planejamento**.
2. **Baixar matriz (CSV)** (ou XLSX) e preencher a coluna da resposta.
3. **Importar arquivo (CSV ou XLSX)…** e escolher a planilha preenchida: o aplicativo reconhece o modo «preencher respostas», mostra «6 valor(es)» e **Preencher respostas** grava cada valor no ensaio de mesmo número, **conferindo os níveis** dos fatores. Reimportar não duplica nem desloca nada. [Guia](../../docs/guias/planilha-de-coleta.md).
