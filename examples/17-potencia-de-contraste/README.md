# Exemplo 17 — Potência e simulação para um contraste planejado

O exemplo usa três médias hipotéticas `10`, `11,2` e `12`, desvio-padrão comum `1,2`, pesos `−2, 1, 1` e alocação `1, 2, 1`. O teste bilateral usa α de 0,05. Oito réplicas dessa alocação correspondem a 32 observações, com 8, 16 e 8 por grupo.

Abra o [projeto com resultado salvo](projeto.enzitag) para consultar a hipótese, a curva e a verificação por simulação. Para reproduzir em **Extras → Potência**, escolha contraste planejado e potência para um tamanho dado. Informe os valores acima, marque teste bilateral e simule 50.000 estudos com semente `20261106`.

| Quantidade | Valor aproximado |
|---|---:|
| Graus de liberdade residuais | 29 |
| Potência analítica | 0,87451403 |
| Rejeições simuladas | 43.671 / 50.000 |
| Potência simulada | 0,87342 |
| Erro-padrão de Monte Carlo | 0,001487 |
| Intervalo de Wilson da simulação (95%) | [0,870477; 0,876306] |

A potência analítica foi conferida com SciPy. A simulação usa o gerador e as hipóteses gravados no arquivo. O intervalo de Wilson expressa a incerteza da estimativa de Monte Carlo. O projeto foi produzido e reaberto pelo aplicativo com o [roteiro de geração](../../app/web/scripts/save-examples-et24.mjs). [Referências independentes](../../validation/cases/power_advanced/power.json).
