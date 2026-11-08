# DT-0034 — Potência linear e simulação gaussiana

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-03 |
| Origem | ET24-T01/T05–T08 |
| Pendências relacionadas | — |
| Substitui / substituída por | — |

## Contexto

A calculadora oferece ANOVA e t, com erro normal independente e σ informado. O plano pede regressão, contrastes, efeitos de dois níveis e simulação com semente/erro de Monte Carlo. É necessário definir desenho, hipótese e a unidade de n, preservar arquivos e evitar uma simulação sem modelo de teste.

## Decisão

Estender `PowerDesign` aditivamente, mantendo variantes antigas. Novas solicitações/resultados usam proveniência v2; sem extensões, preservar v1.

- **Regressão:** matriz de preditores por réplica do desenho-base, inclinações esperadas, intercepto incluído automaticamente; hipótese conjunta de todas as inclinações zero. Com n réplicas completas de m linhas, N=nm, p=k+1, gl₁=k, gl₂=N−p, λ=n β′X_c′X_cβ/σ², com X_c centrada no desenho-base. Não é R² arbitrário nem desenho aleatório. Conferir posto completo antes do cálculo.
- **Contraste planejado:** médias μ, pesos c com soma zero e alocação inteira positiva r por grupo. n multiplica a alocação: N=nΣr, gl=N−k, δ=|Σcμ|√n/[σ√Σ(c²/r)]. Uma hipótese por cálculo, sem ajuste de múltiplos contrastes; não confundir com busca pós-hoc.
- **Efeito de dois níveis:** fatorial completo 2^k, termos indicados por subconjuntos de fatores e efeitos esperados na escala alto−baixo; coluna codificada é o produto dos ±1 e β=efeito/2. Termos distintos e estimáveis, hipótese de um termo selecionado. n réplicas de cada condição, N=n2^k, gl=N−p, δ=|efeito|√N/(2σ). Permitir interações explicitadas, sem generalizar a frações/PB.

Regressão usa F não central; contraste/efeito usa t não central (bilateral ou direção esperada, módulo explicitado como nos testes t atuais). Tamanho da amostra usa busca analítica mínima inteira, incluindo n=1 quando o desenho tiver gl residuais; precisão é permitida para contrastes/efeito via a variância correspondente, recusada para F conjunto. Totais, n e gl saem do Rust. Validar dimensões, finitude, posto, pesos/termos, σ/α e orçamento antes de multiplicar; limitar tamanho total a 100.000 observações, regressão a 32 preditores/4.096 linhas base e fatorial a 8 fatores. Não reduzir termos nem trocar o modelo silenciosamente.

**Simulação:** opção aditiva com semente u32 e B entre 1.000 e 1.000.000. Reutilizar PCG32 (sequência 54, vetor oficial já testado). Uniforme aberto por `(u32+0,5)/2³²`, normais Box–Muller e qui-quadrado por Gamma de Marsaglia–Tsang. Simular a distribuição das estatísticas gaussianas do teste (equivalente ao ajuste de dados gaussianos de desenho fixo), não Bernoulli com probabilidade da fórmula: t=(Z+δ)/√(Q/gl), ou F=[Σ(Z_i+δ_i)²/q]/(Q/gl₂), δ₁=√λ, demais zero; Q independente. Cada repetição aplica o mesmo corte central do teste.

O resultado guarda B, rejeições, semente, algoritmo versionado, estimativa, erro-padrão de Monte Carlo e IC binomial Wilson de 95%, inclusive nos extremos 0/1. Potência analítica e curva continuam identificadas separadamente; a simulação confere a potência no n escolhido/encontrado, não fundamenta a busca de tamanho mínimo. Aceitar efeito zero no objetivo potência para permitir calibração de H0, recusando meta inalcançável quando efeito nulo. Busca de precisão não é baseada em Monte Carlo. Alterações nas suposições tornam o resultado desatualizado e não apagam o histórico.

A execução web ocorre em worker cancelável; cancelamento nativo invalida a resposta, sem alegar interrupção física da rotina já iniciada. Medir o orçamento máximo. Nada científico é calculado em TypeScript; UI apenas faz parsing e mapeia dados/opções.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| R² sem desenho de regressão | Esconde a geometria que determina a informação. |
| Simular Bernoulli com a potência analítica | Não exercita a distribuição da estatística. |
| Simular e ajustar N observações em cada repetição | Para erros gaussianos/desenho fixo, estatísticas suficientes são equivalentes e evitam custo O(BN). A equivalência precisa de referência independente por dados completos. |
| Busca mínima com estimativa Monte Carlo ruidosa | Não certifica minimalidade e exige regra sequencial; a busca desta entrega permanece analítica e identificada como tal. |

## Critérios e evidências

Consultadas em 2026-11-03: [SciPy nct](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html), [ncf](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncf.html), [PCG oficial](https://www.pcg-random.org/using-pcg-c-basic.html), [Gamma no NumPy](https://github.com/numpy/numpy/blob/main/numpy/random/src/distributions/distributions.c), Marsaglia e Tsang (2000), DOI 10.1145/358407.358414. SciPy/NumPy são referência independente: fórmulas e busca inteira, simulação por dados completos/OLS, calibração H0 e erro Monte Carlo. Registrar versões, semente, tolerância e desempenho; mesma semente/solicitação deve repetir rejeições no WASM/nativo e no arquivo reaberto. Fontes de referência não são declaração de implementação.

## Consequências

Contratos/seleção bruta, assinatura, resultado histórico, persistência estrutural, relatórios e CSV/XLSX precisam incluir as novas hipóteses e a simulação. Interface discrimina n por grupo/réplica/condição e N total; explica efeitos codificados e σ suposto. Novo exemplo e matrizes PT/EN/seis temas, teclado/axe, 375 px e Windows fazem parte do aceite.


## Complemento de execução — auditoria bloco 03 (2026-11-03)

A correção AU-B07/B08 usa duas filas limitadas: cálculo científico e operações de arquivo/registro do motor. Cada fila executa no máximo uma operação. No WASM cada fila tem um worker reutilizável, criado sob demanda; cancelar encerra somente o worker que executa aquela tarefa e remove somente os pedidos daquele canal. Arquivo/registro permanece independente; erro do worker rejeita a tarefa identificada e permite recriação no próximo pedido. Pedidos substituídos/cancelados são estados obsoletos, nunca falhas genéricas para o usuário. Descarte fecha workers e rejeita pendências.

No Windows a fila JavaScript aguarda o término real do invoke ativo antes de iniciar outro cálculo, mesmo quando a interface já descartou a resposta cancelada. Cancelar pendência remove-a; cancelar trabalho já iniciado não afirma liberação da CPU. O adaptador Rust impõe também um limite global de uma execução por classe antes de spawn_blocking, com erro técnico reconhecível se outro cliente exceder o limite. Arquivos de projeto/importação/XLSX/engineInfo usam a classe de serviço; diálogos/escrita de arquivo seguem separados. Até 64 pendências por fila, com recusa explícita ao exceder; esse limite controla a fila, não altera orçamento ou resultado científico. Não adicionar polling de cancelamento às fórmulas neste incremento.

Saturação/potência cancelam seu canal ao desmontar a ferramenta ou trocar a identidade do projeto/experimento. Edições durante cálculo mantêm o vínculo da solicitação e tornam o resultado histórico desatualizado. Resposta só afeta UI se ainda pertencer à geração atual. Falha real mostra orientação traduzida, focada, e preserva registro anterior. Estado ocupado e explicação do cancelamento nativo são acessíveis. Testar simultaneidade com arquivo/exportação, substituição, erro/recuperação, fechamento e troca de destino; medir concorrência no executável Windows. Esse complemento substitui a limitação de cancelamento isolado descrita no texto anterior e não modifica fórmulas/contratos científicos.

## Complemento de custo — AU-P04 (2026-11-04)

Antes do código dependente: o predicado da busca de precisão consulta apenas graus de liberdade e semiamplitude do intervalo central, sem calcular caudas não centrais em cada tentativa; conservar o menor inteiro, inclusive n=1 quando admissível. Calcular potência/curva após encontrar esse inteiro. Uma potência indisponível deve ter estado/causa explícitos, sem número substituto e sem descartar uma precisão válida; qualquer ajuste do contrato precisa preservar a leitura e os bytes dos registros históricos íntegros. Medir separadamente busca e resultado completo: a curva ainda pode dominar a latência.

### Precisão válida com potência indisponível

Contrato antes do código: `PowerResult.noncentrality` torna-se opcional (`number | null` no protocolo). Valores finitos antigos continuam números, com serialização idêntica; ausência só é aceita em um resultado de precisão com semiamplitude válida e diagnóstico explícito. `power` continua `Stat`; não usar 0/1 ou outro número substituto. Os detalhes centrais (gl/corte) são calculados separadamente das caudas e da não centralidade. O menor n de precisão depende somente da semiamplitude central; falha da potência posterior não elimina esse resultado.

Se uma simulação pedida não puder ser executada por ausência de não centralidade, falha ou orçamento total, conservar a precisão e avisar explicitamente que a simulação não foi produzida. Solicitação/semente/B permanecem no registro; `simulation` fica ausente com aviso validado. Isso não vale como simulação realizada nem muda o orçamento do método. Demais objetivos continuam propagando a falha. A versão 2 identifica os novos estados parciais; registros v1 íntegros devem manter os bytes e a leitura.

Produtos positivos da semiamplitude usam a expressão existente quando o resultado é representável. Se um intermediário transbordar ou subfluir, recombinar fatores de magnitudes opostas antes de concluir indisponibilidade; nunca apresentar zero como substituto. Referências equivalentes em unidades normalizadas verificam o menor inteiro e a semiamplitude. Revisar também o caminho legado de precisão, cuja fórmula pode transbordar antes de dividir por raiz de n.

Observação de trabalho antes do próximo código de orçamento: acrescentar contadores deterministas opcionais (`validation-metrics`, desativado nos adaptadores normais), apenas para ferramentas de validação. Medir preparações, avaliações, inversões, iterações e linhas processadas no próprio motor, sem alterar fórmulas, ordens ou contratos de resultado. O executável de observação pode ler fixtures; a biblioteca continua sem I/O. Usar esses números para fundamentar orçamento, não apresentar latência de um build instrumentado como desempenho normal. Se medir a base antiga, extrair uma cópia recuperável do ZIP em pasta temporária, sem modificar a base/arquivo original nem criar outro motor do produto. Relacionar contagens a respostas idênticas e aos ensaios normais já medidos.
