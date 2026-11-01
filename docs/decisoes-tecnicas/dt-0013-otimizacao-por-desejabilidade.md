# DT-0013 — Otimização por desejabilidade: busca, domínio, candidatos, confirmação e cancelamento (ET08)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET08-T01 |
| Pendências relacionadas | PD-04 (algoritmos e tolerâncias), PD-07 (estratégia de busca e critérios de parada) |
| Substitui / substituída por | — |

## Contexto

A ET08 fecha o percurso triagem → superfície → otimização → confirmação. É preciso fixar o algoritmo de busca e seus critérios de parada, o domínio, a forma de apresentar candidatos, o vínculo da confirmação no projeto e o tratamento de buscas longas, sem afirmar ótimo global.

## Decisões

### 1. Estratégia de busca (PD-07)

**Hipercubo latino com semente + Nelder–Mead com projeção nos limites.** Hipercubo latino garante cobertura estratificada de cada fator com poucos inícios e é reprodutível pelo PCG32 já usado na aleatorização; Nelder–Mead dispensa derivadas (a desejabilidade tem quinas e platôs), e a projeção respeita o domínio. Parada: simplex ≤ 1e-9 e dispersão ≤ 1e-12, ou `200·k` iterações; **o relatório de convergência** informa quantos inícios convergiram, quantos terminaram viáveis, quantas soluções distintas houve e quantos inícios chegaram à melhor. Descartados: busca em grade (explosão com `k`), evolução diferencial/algoritmos genéticos (mais parâmetros, sem ganho nesta escala) e busca por padrões (equivalente, sem vantagem). **Nenhuma afirmação de ótimo global** (fato `no_global_claim` sempre presente).

### 2. Platôs de desejabilidade zero

A função minimizada é `−D` quando `D > 0` e, em platô de zeros, a distância média até a aceitabilidade `Σ(1 − dᵢ)/r`, que preserva a ordem de comparação do Nelder–Mead fora da região desejável. Se, ainda assim, `D = 0` em todos os pontos viáveis, o resultado é `OnlyZeroDesirability`, nunca um "ótimo".

### 3. Restrições obrigatórias × preferências

Limites obrigatórios sobre o **valor previsto** são tratados por penalidade (`2 + violação`, em unidades da amplitude observada) com tolerância de viabilidade registrada de **1e-9**; candidatos listados satisfazem todos os limites dentro dela (verificado nos testes). Preferências entram na desejabilidade e podem ser compensadas por outras respostas; limites obrigatórios, não.

### 4. Domínio (extrapolação)

Padrão: **região experimental** — intervalos observados e alavancagem de predição ≤ a maior dos ensaios em cada modelo (a mesma noção de [DT-0012](dt-0012-superficie-de-resposta.md), item 6). Extensão **somente por escolha explícita** de limites por fator; candidatos fora da região são marcados. A forma cuboidal pura foi descartada como padrão porque admitiria os cantos de um composto central, onde o modelo não foi testado.

### 5. Agrupamento de candidatos

Distância euclidiana em unidades codificadas ≤ 0,05 (ajustável): duas soluções mais próximas que isso são a mesma. Cada candidato informa quantos inícios o alcançaram (indicador de robustez; `single_start` quando só um).

### 6. Compromissos entre respostas

Busca isolada de cada resposta (até 20 inícios, mesmas restrições) para obter a melhor desejabilidade individual; a **perda** de cada resposta em um candidato é a diferença. Custo: uma busca extra por resposta.

### 7. Modelos e incerteza

Cada resposta usa seu próprio modelo de segunda ordem (completo por padrão; termos informáveis no pedido) ajustado aos mesmos dados. Previsões com intervalo de confiança da média e **intervalo de predição**. Modelos com termos não estimáveis são recusados (`model_not_estimable`): otimizar sobre coeficientes indefinidos seria enganoso. Na interface a otimização usa o modelo completo de cada resposta; reduzir termos por resposta fica para melhoria.

### 8. Confirmação como experimento vinculado

`Experiment.origin` (experimento e análise de origem) e `Experiment.confirmation` (nível de confiança e previsões por linha e resposta) — campos opcionais; esquema do `.enzitag` permanece **1**. As previsões são gravadas **nas condições arredondadas** a 5 algarismos (as realmente propostas). O projeto é inválido se `origin` aponta para experimento ou análise inexistente (`project.origin_not_found`). A conferência (observado dentro, abaixo ou acima do intervalo) compara números já calculados e não é estatística nova.

### 9. Cancelamento (E02 inicial)

`EngineClient.cancel(canal)`: marca a tarefa do canal como descartada; no navegador o Worker é **encerrado e recriado** (interrompe o cálculo; as demais tarefas pendentes são descartadas); no Windows o comando nativo não é interrompido e o resultado é **descartado**. **Não há progresso incremental**: o núcleo é síncrono e a busca típica leva milissegundos a poucos segundos; o aplicativo mostra "Buscando…" com o botão de cancelamento. Interrupção cooperativa no Windows e progresso por tarefa ficam como melhoria registrada.

### 10. Registro no projeto

Resultado `AnalysisResult::Optimization` e configuração em `AnalysisOptions.optimization` (restaura a tela). A otimização é análise própria: não substitui o resultado da superfície exibido.

## Alternativas consideradas

| Alternativa | Motivo de não adotar agora |
|---|---|
| Algoritmos genéticos / evolução diferencial | Mais parâmetros e menor reprodutibilidade sem benefício aqui |
| Gradiente com restrições | Quinas e platôs da desejabilidade; exigiria suavização |
| Interrupção cooperativa no Rust | Exige estado compartilhado entre adaptadores; custo desproporcional para buscas de segundos |
| Progresso incremental | Idem; o tamanho típico da busca não o justifica |
| Domínio cuboidal como padrão | Admite extrapolação oculta |
| Confirmação sem previsões gravadas | Perde a comparação posterior com o intervalo de predição |

## Critérios e evidências

[Desejabilidade](../metodos/desejabilidade.md#10-validação) e [busca](../metodos/busca-otimizacao.md#10-validação): comparação com busca exaustiva independente, restrições, sementes, cancelamento (testes do cliente e E2E), exemplo 04, axe nos três temas.

## Consequências

- ET09 reutiliza `contourChart`, `ChartFigure` e a exportação para o gráfico de desejabilidade.
- A ET10 mede o desempenho de buscas grandes; qualquer mudança no formato do resultado exige regenerar tipos e testar a abertura de projetos antigos.
