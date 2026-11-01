# Busca de condições ótimas e ensaios de confirmação

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `desirability_optimization` |
| Módulos | C17 `optimization/{search,candidates,optimize,grid,evaluate}`, E01/E02 (cancelamento), P01 (`origin`, `confirmation`) |
| Etapa | [ET08](../planos-execucao/concluidos/et08-otimizacao.md) |
| Casos de validação | [`validation/cases/desirability_optimization/`](../../validation/cases/desirability_optimization/001-um-resposta-maximizar/README.md) |
| Decisão | [DT-0013](../decisoes-tecnicas/dt-0013-otimizacao-por-desejabilidade.md) |

## 1. Pergunta

Quais condições dos fatores maximizam a [desejabilidade global](desejabilidade.md) dentro da região em que os modelos são confiáveis, e como confirmá-las?

## 2. Pressupostos

Modelos de segunda ordem estimáveis (sem termos não estimáveis) para todas as respostas incluídas. A busca é **local, com vários inícios**: reduz o risco de parar em um ótimo local, mas **não prova** ótimo global.

## 3. Entradas e opções

`OptimizationSetup`: objetivos e limites (ver [desejabilidade](desejabilidade.md)), domínio, `α` (intervalos de predição), e busca: inícios (1–5000, padrão 40), semente, candidatos devolvidos (1–20) e tolerância de agrupamento (padrão 0,05 em unidades codificadas). **Domínio:** *região experimental* (padrão) = intervalos observados dos fatores **e** alavancagem de predição `x₀ᵀ(XᵀX)⁻¹x₀` não superior à maior alavancagem dos ensaios em cada modelo (sem extrapolação oculta); ou *estendido*, com limites informados por fator **por escolha explícita**, marcando como extrapolação os candidatos fora da região.

## 4. Fórmulas

**Inícios.** Hipercubo latino de `n` pontos no domínio codificado: para cada fator uma permutação de `0…n−1` ([PCG32 e Fisher–Yates](aleatorizacao.md)) e deslocamento uniforme dentro do estrato.

**Função minimizada.** Ponto inviável (violação de limite obrigatório > 1e-9 na amplitude observada da resposta, ou extrapolação oculta no domínio padrão): `2 + violação`. Viável com `D > 0`: `−D`. Viável com `D = 0`: distância média até a aceitabilidade `Σ(1 − dᵢ)/r`, que guia a busca para fora do platô de zeros.

**Nelder–Mead** (coeficientes 1, 2, 0,5 e 0,5) com **projeção** de cada vértice nos limites do domínio; simplex inicial com passo de 10 % da amplitude; parada quando o simplex tem tamanho ≤ 1e-9 e a dispersão da função ≤ 1e-12, ou após `200·k` iterações.

**Agrupamento e ordenação.** Pontos finais viáveis são ordenados pela função e agrupados quando a distância euclidiana codificada é ≤ tolerância; cada grupo vira um candidato com o número de inícios que o alcançaram.

**Compromissos.** Com mais de uma resposta, cada uma é otimizada **sozinha** (até 20 inícios, mesmas restrições); a diferença entre a melhor desejabilidade individual e a do candidato é a perda de cada resposta.

**Previsões.** Em cada candidato: valor previsto, intervalo de confiança da média e **intervalo de predição** de uma nova observação (`1 − α`), pelo modelo de cada resposta.

**Malha de desejabilidade.** Para dois fatores e os demais fixados, a desejabilidade global em `5–101` passos por eixo, com curvas de nível e extrapolação; pontos que violam limites obrigatórios têm `D = 0` no gráfico.

**Confirmação.** O usuário escolhe candidatos e repetições; as condições são arredondadas a 5 algarismos significativos; o motor avalia as previsões **nas condições arredondadas** (`optimizationEvaluate`), e o aplicativo cria um novo experimento com as mesmas variáveis, as linhas propostas e as previsões gravadas, com `origin` apontando para o experimento e a análise de origem. Observado dentro do intervalo de predição é compatível com o modelo; fora, indica que o modelo pode não descrever bem a condição (conferência por comparação direta de números já calculados).

## 5. Algoritmo numérico

Operações de ponto flutuante (`+ − × ÷`, `powf`, `ln`, `exp`). A **mesma semente produz os mesmos candidatos** em uma plataforma (determinístico); entre plataformas a aritmética de `powf`/`ln` pode diferir no último bit e a trajetória da busca pode não ser idêntica bit a bit; por isso a comparação entre plataformas é feita sobre o **resultado** (melhor `D` dentro do intervalo da referência independente e candidatos viáveis), não sobre a igualdade bit a bit dos candidatos.

## 6. Saídas

`OptimizationResult`: `status` (`found`, `onlyZeroDesirability`, `infeasible`), candidatos (coordenadas reais e codificadas, previsões com intervalos, `d`, `D`, extrapolação, fatores no limite, inícios, violação), compromissos, relatório de convergência (algoritmo, semente, inícios, convergidos, viáveis, soluções distintas, inícios da melhor, iterações, avaliações, tolerância), domínio por fator, avisos e fatos.

## 7. Casos sem resultado válido

- **Região inviável:** nenhum início termina em ponto que satisfaça os limites obrigatórios → `infeasible`, **sem candidatos**.
- **Desejabilidade zero:** pontos viáveis existem, mas `D = 0` em todos → `onlyZeroDesirability`, candidatos mais próximos e fato `optimization.zero_desirability`.
- Modelo não estimável, objetivos ou opções inválidos, limites de domínio inválidos: recusa com `optimization.*`.
- **Cancelamento:** no navegador, o Worker é encerrado e recriado (a busca é interrompida) e o resultado atual permanece; no Windows o comando nativo termina sozinho e o resultado é **descartado** (não há interrupção cooperativa do cálculo).

## 8. Exemplo

[Exemplo 04](../../examples/04-otimizacao-e-confirmacao/README.md): `D = 0,9255` em glicose 31,45, peptona 6,20 e NaCl 1,27; 40 inícios na mesma solução; confirmação com 2 repetições dentro dos intervalos de predição.

## 9. Interpretação apresentada ao usuário

Fatos: `no_global_claim` (sempre), `infeasible`, `zero_desirability`, `single_start`, `boundary` (ótimo no limite do domínio), `extrapolated`, `compromise`, `confirm_with_runs`. A linguagem nunca afirma ótimo global; recomenda confirmar com ensaios novos.

## 10. Validação

Seis casos: um ótimo interior, dois conflitantes com limite obrigatório e pesos (3 fatores), alvo e faixa (Box–Behnken), ótimo na fronteira, região inviável e desejabilidade zero. Referência: **busca exaustiva** em malha densa (401² ou 61³ pontos) na região permitida, em NumPy, com os ajustes e as fórmulas feitos à parte. Critérios: o `D` do motor ≥ o da malha − 1e-9 e ≤ + 5e-3; a posição do ótimo a ≤ 0,05 codificado quando único; nenhum candidato viola restrição além da tolerância; mesma semente → mesmos candidatos; sementes diferentes → mesmo ótimo (1e-6 em `D`, 1e-3 na posição). Sondagens: previsões, intervalos de confiança e de predição, `d` e `D` iguais ao NumPy (1e-8). Medido no caso 002: motor 0,538089 × malha 0,538056. Paridade WebAssembly × nativo e verificação nativa no CI. Cancelamento: testes do cliente e E2E (busca de 5000 inícios cancelada). Windows 11: pendente.

## 11. Referências

- Nelder, J. A.; Mead, R. (1965). A simplex method for function minimization. *The Computer Journal* 7, 308–313.
- McKay, M. D.; Beckman, R. J.; Conover, W. J. (1979). A comparison of three methods for selecting values of input variables in the analysis of output from a computer code. *Technometrics* 21, 239–245.
- Derringer, G.; Suich, R. (1980), citado em [desejabilidade](desejabilidade.md).
