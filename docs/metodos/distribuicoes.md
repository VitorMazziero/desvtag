# Distribuições Normal, t, qui-quadrado e F

**Estado:** implementado; validado numericamente (nativo e WebAssembly) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | — (operação `distributionEvaluate`, sem método estatístico próprio) |
| Módulos | C04 `distributions/{normal,student_t,chi_square,f,quantile,evaluate}` |
| Etapa | [ET04](../planos-execucao/ativos/et04-fundamentos-numericos-modelos.md) |
| Casos de validação | [`validation/cases/distributions/`](../../validation/cases/distributions/001-normal/README.md) |

## 1. Pergunta

Quais são `P(X ≤ x)`, `P(X > x)` e os quantis das distribuições usadas por testes e intervalos, com precisão relativa também nas caudas (valores-p pequenos)?

## 2. Pressupostos

Graus de liberdade reais positivos (fracionários são aceitos, como exigirão Welch e Satterthwaite em versões posteriores). Probabilidades dos quantis em `(0, 1)`; a cauda inferior mínima é `1e-300`.

## 3. Entradas e opções

`distribution` (`normal`, `studentT{df}`, `chiSquare{df}`, `f{df1, df2}`), `function` (`cdf`, `sf`, `quantileUpper`, `quantileLower`), `values`.

## 4. Fórmulas

- Normal: `Φ(x) = ½ erfc(−x/√2)`; `1−Φ(x) = ½ erfc(x/√2)`.
- t com ν g.l.: `P(|T| > |t|) = I_{ν/(ν+t²)}(ν/2, ½)`; a cauda de um lado é a metade.
- Qui-quadrado: `P(X ≤ x) = P(ν/2, x/2)`; cauda `Q(ν/2, x/2)`.
- F: `P(F ≤ x) = I_u(d₁/2, d₂/2)` com `u = d₁x/(d₁x + d₂)` e `1−u = d₂/(d₁x + d₂)` passado sem subtração.

## 5. Algoritmo numérico

Funções especiais em [funcoes-especiais](funcoes-especiais.md). **Quantis:** resolve-se `ln(cauda(x)) = ln(q)` por Brent, ampliando o limite superior por duplicação; trabalhar no logaritmo da cauda preserva a precisão relativa de `x` para `q` até 1e-300 (resolver `1 − p` jamais permitiria). Quantis simétricos (t, normal) usam a simetria para `q > ½`.

## 6. Saídas

Um `Stat` por argumento, na mesma ordem.

## 7. Casos sem resultado válido

Parâmetro de forma não positivo ou não finito → erro `invalidInput` (`distribution.invalid_parameter`). Argumento fora do domínio (probabilidade fora de `(0, 1)` ou abaixo de `1e-300`, `x < 0` em F/qui-quadrado, `NaN`) → `undefined` (`outOfDomain`).

## 8. Exemplo

`Φ⁻¹(0,975) = 1,959963984540054`; `t₀,₉₇₅(10) = 2,228138851986274`; `F(1,3)` com `x = 16/3`: cauda `0,104088038661827…` (os dois últimos aparecem em testes de ANOVA/intervalos).

## 9. Interpretação ao usuário

Não aplicável: as distribuições sustentam os valores-p e intervalos dos métodos.

## 10. Validação

Referência: mpmath 1.4.1 com 60 dígitos (beta e gama incompletas e `erfc` do mpmath; quantis por busca de raiz em alta precisão), 4 casos, 531 pontos, incluindo graus de liberdade fracionários e muito grandes e caudas até 1e-290. Medido em 2026-11-01 (erro relativo máximo; igual no WebAssembly, que passa as mesmas tolerâncias):

| Função | Pontos | Erro máximo | Tolerância |
|---|---|---|---|
| Normal `cdf`/`sf` | 35 | 1,5e-14 | 5e-14 |
| Normal quantil | 9 | 5,2e-16 | 1e-12 |
| t `sf` (df < 1e5) | 71 | 2,6e-14 | 1e-12 |
| t `sf` (df ≥ 1e5) | 6 | 2,0e-11 | 5e-11 |
| t quantil (df < 1e5 / ≥ 1e5) | 54 / 6 | 2,8e-14 / 3,1e-12 | 1e-10 / 5e-9 |
| Qui-quadrado `cdf`/`sf` | 87 | 2,5e-14 | 1e-12 |
| Qui-quadrado quantis superior / inferior | 40 / 32 | 4,6e-15 / 1,8e-13 | 1e-10 |
| F `cdf`/`sf` | 151 | 1,3e-13 | 1e-12 |
| F quantil superior | 40 | 8,5e-15 | 1e-10 |

**Limite conhecido.** Para t com graus de liberdade ≥ 1e5 a fração contínua da beta incompleta com parâmetro enorme perde dígitos (erro 2e-11 em `sf`); a tolerância desses pontos é registrada separadamente. Para ν tão grande a t é praticamente normal, e nenhum método da v0.1 exige mais.

Windows 11: pendente (como as demais verificações nativas da v0.1).

## 11. Referências

As de [funcoes-especiais](funcoes-especiais.md#11-referências); Johnson, Kotz e Balakrishnan, *Continuous Univariate Distributions*, vols. 1–2.
