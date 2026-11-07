# 18 — Mistura de solventes com limites

Abra [projeto.enzitag](projeto.enzitag) e vá para **Resultados**. O arquivo guarda a matriz, o ajuste, o traço de Cox e a busca de compromisso entre duas respostas. [Ensaios em CSV](ensaios.csv).

## Dados e configuração

Os dados são sintéticos. As frações de água, etanol e glicerol somam 1 e cada componente varia de 0 a 0,6. O planejamento de vértices extremos usa duas repetições e um ponto central adicional, totalizando 25 ensaios. A resposta **Rendimento** foi gerada com a expressão `10a + 20b + 30c + 8ab` nas frações exibidas e uma perturbação cíclica de 0, 0,002 e 0,004. A **Pureza** é `40 − Rendimento` e tem uma medição ausente. O CSV guarda os dados usados no ajuste.

Selecione Scheffé quadrático, referência de Cox (0,2, 0,3, 0,5) e nível de significância 0,05. Na otimização, maximize as duas respostas com menor valor aceitável 0, alvo 40 e pesos iguais.

## Conferência

- O ajuste usa 25 observações de Rendimento e 24 de Pureza. O traço de Cox parte da mesma composição para os três componentes.
- O primeiro candidato salvo tem composição aproximadamente (0,26327, 0,60000, 0,13673). As duas médias previstas estão próximas de 20 e a desejabilidade global está próxima de 0,5. Outros pontos da região podem produzir um compromisso próximo.
- O relatório inclui os intervalos de confiança da média e de predição das duas respostas para cada candidato salvo. Use os arquivos CSV/XLSX para conferir os dados fonte.

O percurso do zero pode ser reproduzido pelo teste `et25-simplex.spec.ts` em `app/web`. [Método de misturas](../../docs/metodos/misturas.md).
