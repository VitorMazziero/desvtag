# Exemplo 12 — Potência e tamanho de amostra

O arquivo [`projeto.enzitag`](projeto.enzitag) guarda as hipóteses e o resultado da calculadora. Abra-o para consultar o resultado sem calcular novamente. As hipóteses são prospectivas e independem de uma tabela de observações.

## Como reproduzir

1. Para reproduzir do zero, abra **Extras → Calculadora de potência e tamanho de amostra**.
2. Teste **t de duas amostras**, objetivo **tamanho de amostra**: diferença esperada **1**, desvio-padrão esperado **1,5**, α = 0,05, potência desejada 0,80.
3. Use **Calcular**.

## Resultado esperado

Conferido contra o SciPy (`scipy.stats.nct`, teste bilateral com variâncias iguais): **37 por grupo (74 no total)**, com potência **0,8076** (com 36 por grupo a potência fica abaixo de 0,80). O mesmo cálculo é verificado automaticamente no teste de ponta a ponta (`methods-flow.spec.ts`) e a distribuição t não central em 220 pontos contra o SciPy ([método](../../docs/metodos/potencia.md)). Sem simulação.
