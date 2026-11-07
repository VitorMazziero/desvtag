# DT-0033 — Perfil de verossimilhança e domínio não linear

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-03 |
| Origem | ET24-T01–T04 |
| Pendências relacionadas | — |
| Substitui / substituída por | — |

## Contexto

O catálogo de saturação usa parâmetros positivos e erros gaussianos independentes/homocedásticos. Os intervalos Wald existentes podem ser assimétricos de maneira inadequada em modelos pouco identificáveis. A interface ainda não oferece os inícios/limites já presentes no contrato. O código aceita limites inconsistentes que podem provocar panic e contabiliza incorretamente inícios equivalentes.

## Decisão

Extensão opcional `profile` na solicitação e perfis opcionais no resultado, preservando arquivos/resultados v1 sem recálculo. Perfil usa proveniência v2; registro do motor anuncia versão mais recente. Para cada parâmetro fixado, minimizar SQR nos demais com LM projetado, múltiplos inícios deterministas e início no ajuste global. Maximizar também a variância gaussiana: estatística LR = n·ln(SQR_perfil/SQR_mínima), corte qui-quadrado(1) em 1−α. É intervalo **assintótico de razão de verossimilhança**, distinto do perfil t de `stats::profile.nls`; não afirmar equivalência dos cortes.

Explorar ambos os lados, adaptar o passo na escala logarítmica positiva e refinar as raízes por bisseção. Registrar pontos, região examinada e status de cada extremo (cruzamento, limite imposto, não limitado na busca, falha). A verificação de unimodalidade é numérica no domínio explorado: LR deve crescer ao afastar-se do mínimo; queda material ou mínimo melhor invalidam a certificação do intervalo simples. Busca finita não prova unimodalidade global. Não apresentar limite imposto ou fim da busca como cruzamento do corte. SQR zero, ajuste não convergido ou perfil falho não recebem IC finito inventado. Curva mantém faixa delta/Wald e o rótulo explicita isso; IC de parâmetro por perfil não vira automaticamente faixa da curva.

Validação de domínio no core: todos os limites finitos informados, estritamente positivos, inferior < superior; inícios finitos positivos e dentro dos limites explícitos. Vazios da interface significam padrão positivo/sem teto. Nomes físicos dos parâmetros, valores brutos e diagnóstico por campo na interface, apenas parsing/mapeamento em TS. Limite igual não é forma de fixar um parâmetro na API pública; fixação interna do perfil remove a coordenada do sistema.

Separar contratos, avaliação do modelo, LM, perfil e montagem do resultado em arquivos por responsabilidade. Corrigir contador de inícios e diagnóstico de convergência com testes; não rotular mera incapacidade de reduzir SQR como convergência quando o gradiente projetado é grande. Novos estados/diagnósticos em PT/EN.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Só Wald | Não atende perfil nem assimetria. |
| Repetir IC t de perfil do R sob o nome LR | São cortes diferentes; esconderia a aproximação adotada. |
| Perfil sem registrar amostras/estado dos extremos | Não permite avaliar multimodalidade nem distinguir teto imposto de IC. |
| Garantir unimodalidade global pela amostragem | Impossível a partir de busca finita; expor alcance e falhas. |

## Critérios e evidências

[NIST Misra1d](https://www.itl.nist.gov/div898/strd/nls/data/misra1d.shtml) e [certificados](https://www.itl.nist.gov/div898/strd/nls/data/LINKS/v-misra1d.shtml) consultados em 2026-11-03: reparametrização exata Vmax=b1, K=1/b2, sem chamar todo o catálogo NIST de validado. [R profile.nls](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/profile.nls.html) descreve o perfil t e confirma a distinção do corte. Referência LR independente em SciPy, ambos os lados dos IC, limites, parâmetros fracos, SQR zero, inícios/limites inválidos e paridade WASM/nativo deverão passar antes do aceite.

## Consequências

Opções/resultado entram na família persistida, assinatura, histórico, relatórios e tabelas fonte de figuras. UI descreve hipótese gaussiana, aproximação, domínio e intervalo falho/limitado. Controle em worker continua permitindo cancelar/substituir cálculo; medir custo e definir orçamento explícito se necessário.

## Complemento de custo — AU-P01 (2026-11-04)

Antes da otimização: medir pelo worker real e pelo IPC nativo, com aquecimento/repetições e casos pequenos/maiores/fronteira. Reutilizar a grade determinística de inícios durante o perfil e buffers de Jacobiana/resíduos/informação dentro de cada LM. Preservar todos os inícios, sua ordem, os critérios de convergência, as avaliações de salvaguarda e os pontos/diagnósticos do perfil; não substituir multistart por continuação local nesta mudança. Somente reutilizar uma avaliação já calculada na mesma coordenada exata, sem tratar o ponto ótimo inicial como prova de mínimo condicional. Validar intervalos/diagnósticos contra as referências e comparar os resultados completos antes/depois. Limites de custo adicionais dependerão das medidas e serão explícitos.

Observação de trabalho antes do próximo código de orçamento: acrescentar contadores deterministas opcionais (`validation-metrics`, desativado nos adaptadores normais), apenas para ferramentas de validação. Medir preparações, avaliações, inversões, iterações e linhas processadas no próprio motor, sem alterar fórmulas, ordens ou contratos de resultado. O executável de observação pode ler fixtures; a biblioteca continua sem I/O. Usar esses números para fundamentar orçamento, não apresentar latência de um build instrumentado como desempenho normal. Se medir a base antiga, extrair uma cópia recuperável do ZIP em pasta temporária, sem modificar a base/arquivo original nem criar outro motor do produto. Relacionar contagens a respostas idênticas e aos ensaios normais já medidos.

## Orçamento operacional da v0.4 — decisão antes do código (2026-11-04)

Qualificar até 4.096 pares de entrada por ajuste não linear. O limite se refere ao trabalho/interface admitidos, não a uma exigência estatística; arquivos históricos maiores não são recalculados nem truncados ao abrir. Dentro dessa dimensão, compartilhar um orçamento determinista de 100 milhões de unidades de linha entre multistart e perfil: cada avaliação de previsão/resíduo ou gradiente de uma linha consome uma unidade; cobrar antes das etapas em lote, inclusive tentativas amortecidas. Os ensaios contaram ~48,8 milhões de chamadas de modelo/gradiente no Hill de 256 linhas (~5,74 s WASM), o caso maior qualificado até agora. Esse envelope permite os casos existentes, impede multiplicação sem limite e deve ser conferido no limite admitido; não é um SLA de segundos ou limite global de RAM.

Se o multistart principal não puder terminar, retornar erro de orçamento reconhecível, sem publicar um ótimo incompleto como convergido. Se somente o perfil atingir o orçamento, conservar o ajuste completo/Wald e os pontos de perfil já concluídos, marcar ambos os extremos do parâmetro cujo perfil não terminou como `resourceLimit` e emitir aviso explícito; parâmetros com perfil integralmente concluído mantêm seus resultados. Não usar um mínimo obtido sem terminar todos os inícios de uma coordenada. Nenhuma redução silenciosa de inícios, linhas ou busca de mínimos. Inícios, custo e estados parciais devem sobreviver ao projeto e aos relatórios. Validar pequenos/típicos, limite 4.096, limiar de trabalho, cancelamento e arquivos antigos nas duas plataformas antes do aceite.
