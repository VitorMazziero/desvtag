# Potência, tamanho de amostra e precisão

**Estado:** implementado; validado contra o SciPy · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `power_analysis` |
| Módulos | C15 `power/{anova,t_test}`; C04 `distributions/noncentral` |
| Etapa | [ET18](../planos-execucao/concluidos/et18-nao-linear-e-potencia.md) |
| Casos de validação | [`validation/cases/power_analysis`](../../validation/cases/power_analysis/power.json) (100 pontos de F não central, 120 de t não central e 9 casos de potência); gerador [`make_power_nonlinear_cases.py`](../../validation/tools/make_power_nonlinear_cases.py) |

## 1. Pergunta

Com quantas unidades se detecta uma diferença esperada com a probabilidade desejada (potência)? Que potência uma amostra tem? Quantas unidades dão um intervalo de confiança com a semiamplitude desejada?

## 2. Pressupostos

Erros normais, independentes, de variância constante `σ²` (suposta pelo usuário); efeito esperado conhecido (suposição do usuário); duas amostras com variâncias iguais e `n` por grupo. **A potência vale para o `σ` e o efeito informados**: um `σ` real maior reduz a potência.

## 3. Entradas e opções

Desenho (ANOVA de um fator com as médias esperadas, t de uma amostra, t pareado ou t de duas amostras); `σ`; `α`; bilateral ou unilateral (testes t); objetivo: **potência para um `n`**, **menor `n` para uma potência-alvo** ou **menor `n` para uma semiamplitude do intervalo** (testes t).

## 4. Fórmulas

- **ANOVA:** `λ = n·Σ(μᵢ − μ̄)²/σ²`, `gl₁ = k − 1`, `gl₂ = k(n − 1)`, potência `= P(F′(gl₁, gl₂, λ) > F₁₋α)`.
- **t de uma amostra e pareado:** `δ = d·√n/σ`, `gl = n − 1`.
- **t de duas amostras:** `δ = d·√(n/2)/σ`, `gl = 2n − 2`.
- Bilateral: `P(T′ > t₁₋α/₂) + P(T′ < −t₁₋α/₂)`; unilateral: `P(T′ > t₁₋α)` (efeito tomado em módulo).
- **Precisão:** menor `n` com `t₁₋α/₂(gl)·σ·√(c/n) ≤ h`, `c = 1` (uma amostra, pareado) ou `2` (duas amostras).

## 5. Algoritmo numérico

`F′` não central: `P(F′ > x) = Σⱼ Pois(j; λ/2)·(1 − I_u(gl₁/2 + j, gl₂/2))`, `u = gl₁x/(gl₁x + gl₂)`, soma compensada até `λ/2 + 14√(λ/2) + 60` termos. `T′` não central: algoritmo AS 243 de Lenth (1989); para `t < 0`, `P(T′ ≤ t; δ) = 1 − P(T′ ≤ −t; −δ)`. **Tamanho de amostra:** a potência cresce com `n`; busca por dobramento até atingir a meta e bisseção inteira entre o último `n` que falha e o primeiro que atinge (até 100 000). A curva de potência mostra 40 valores de `n`.

## 6. Saídas

`n` (por grupo na ANOVA e em duas amostras; unidades ou pares nos demais), total de observações, potência, não centralidade, graus de liberdade, valor crítico, semiamplitude do intervalo (testes t) e curva de potência.

## 7. Casos sem resultado válido

`power.invalid_sigma`, `power.invalid_alpha`, `power.invalid_means`, `power.no_effect` (efeito nulo), `power.invalid_difference`, `power.invalid_n`, `power.invalid_target`, `power.invalid_half_width`, `power.precision_needs_t` e `power.unreachable` (meta não atingida até 100 000). Aviso `power.small_n`.

## 8. Exemplo

Diferença esperada 1, `σ = 1,5`, `α = 0,05` bilateral, duas amostras, potência 0,8: **37 por grupo (74 no total)**, potência 0,8076 (igual ao SciPy).

## 9. Interpretação apresentada ao usuário

A calculadora fica na tela inicial, antes dos ensaios, e diz que o resultado depende do `σ` e do efeito supostos e que convém uma margem. Mostra a não centralidade, os graus de liberdade, o valor crítico e uma curva de potência em texto.

## 10. Validação

`power_nonlinear_validation.rs`: **100 pontos de `F′`** (cauda superior) e **120 pontos de `T′`** (função de distribuição) coincidem com o `scipy.stats.ncf` e o `scipy.stats.nct` com erro absoluto máximo < 1e-10; **9 casos** de potência, tamanho de amostra e precisão (ANOVA com 3 e 4 grupos, t de uma amostra, pareado unilateral, duas amostras, precisão) coincidem com a varredura inteira do SciPy (`n` idêntico; potência, não centralidade e valor crítico a 1e-9). O teste do WebAssembly repete os casos e o E2E confere `n = 37`.

**Descoberta:** `scipy.stats.ncf.sf` devolve valores **negativos** com não centralidade exatamente 0 (SciPy 1.18.1); nesse ponto a referência é a F central (`scipy.stats.f.sf`).

## 11. Referências

Cohen, *Statistical Power Analysis for the Behavioral Sciences*; Lenth, R. V. (1989), «Algorithm AS 243: cumulative distribution function of the non-central t distribution», *Applied Statistics* 38; Montgomery, *Design and Analysis of Experiments*, cap. 3.

## Limitações desta versão

- A versão 1 descrita acima não tinha simulação, regressão, contrastes ou efeitos de dois níveis. Essas variantes e o contraste com alocações desiguais estão implementados na extensão ET24 descrita abaixo; correção para comparações múltiplas continua fora do escopo da calculadora.
- A ET22 guarda configuração em edição e resultado calculado, com entradas/revisão/proveniência. Abrir não recalcula; HTML/PDF/Word e CSV/XLSX usam o registro consultado. As variantes avançadas desta especificação continuam na ET24.

## ET24 em execução — correção numérica das caudas

A [DT-0035](../decisoes-tecnicas/dt-0035-caudas-nao-centrais-com-orcamento-numerico.md) corrige o custo sem orçamento da soma F e pesos iniciais zerados na série t. F usa agora a moda de Poisson e recorrências para ambos os lados; peso estável por Stirling, janela 14√(λ/2)+60 e soma compensada. Para λ/2>2.000.000, retorna SF=1 somente se um limite probabilístico certificar erro absoluto ≤1e−12 (df1≥1); caso contrário o cálculo é explicitamente indisponível. Para |δ|>8, t usa quadratura condicional normal/qui-quadrado, truncamento da normal a ±12 e Gauss–Legendre 12/24 adaptativo (até 20 subdivisões), exigindo concordância absoluta distribuída de 1e−12. Não há aproximação normal indiscriminada.

[54 pontos F, 120 t e potência de uma amostra pequena](../../validation/cases/noncentral_extreme/tails.json) conferidos contra SciPy; erro absoluto aceito 2e−9 nos extremos e casos legados mantêm tolerância 1e−10. Com duas observações, δ=40, α=0,01 bilateral, a potência continua abaixo de 0,6; a série antiga podia devolver 1 por underflow. Fora do orçamento não se apresenta n inválido nem um número de potência substituto. Meta por busca propaga falha numérica, em vez de declarar artificialmente a meta inalcançável.

O registro deste incremento antecedeu a implementação das variantes de regressão/contrastes/efeitos e simulação. O estado atual está na seção seguinte, com fórmulas na [DT-0034](../decisoes-tecnicas/dt-0034-potencia-linear-e-simulacao-gaussiana.md) e [progresso/evidências](../../validation/reports/et24/README.md).

## Incremento ET24 e integridade

Regressão com desenho fixo, contraste planejado, efeito de fatorial completo de dois níveis e simulação estão implementados localmente conforme a [DT-0034](../decisoes-tecnicas/dt-0034-potencia-linear-e-simulacao-gaussiana.md); o aceite integral da ET24 permanece aberto. A referência independente inclui dez desenhos NumPy/SciPy e simulação de dados gaussianos com OLS, em `validation/cases/power_advanced`.

AU-B04: a preparação usa coeficientes/σ antes dos quadrados na regressão, efeito/σ no fatorial e pesos normalizados no contraste. Não centralidade e erro-padrão são preparados separadamente. Produtos de escala do erro-padrão combinam primeiro o menor e o maior fator; respostas/pesos recíprocos representáveis não transbordam por um produto intermediário. Testes cobrem unidades entre 10^-160 e 10^160 nos dez desenhos e objetivos, sinal/escala dos pesos e escalas recíprocas 10^±308. Valores fora do orçamento/domínio continuam produzindo erro explícito.

AU-B03: arquivos conferem total, dimensões, graus de liberdade e compatibilidade de precisão/hipótese; resumo Monte Carlo confere contagem/B, erro-padrão e Wilson na rotina compartilhada do core. Tolerância estrutural: 10^-14 + 10^-10 |esperado|, sem repetir a simulação ou avaliar potência ao abrir. Algoritmo deve ser a versão reconhecida. Isso detecta contradições redundantes; não autentica o resultado nem prova que as observações produziram o número salvo. Testes preservam arquivos históricos e recusam mutações isoladas no Rust e WASM.

Apresentação: resultados principais e incerteza precedem as suposições; texto corrido usa a fonte de leitura. `formatSignificant` usa notação científica para |x| ≥ 10^12 ou 0 < |x| < 10^-6, respeitando idioma e algarismos significativos; `formatNumber`, valores armazenados e CSV/XLSX completos não mudam. A prévia de 20 linhas vale apenas na tela. HTML/PDF/Word incluem a matriz inteira; PDF/Word dividem mais de seis colunas em partes, com referência repetida e ordinal quando a referência não é única. Fonte de tabela mínima de 9 pt, títulos/legendas/cabeçalho com a primeira linha no PDF. Simulação não repete no relatório a tabela de campos que já estão no resumo; semente/B/algoritmo continuam no arquivo e na proveniência. [Aceite de interface/exportação](../planos-execucao/plano-v0.4.md#99-execução-do-bloco-04--interface-e-documentos-2026-11-03).
