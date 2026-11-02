# Planejamentos de misturas e modelos de Scheffé

**Estado:** implementado; geração e modelos validados contra referências independentes · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| IDs no registro do motor | `mixture_design` (geração) e `mixture_model` (modelos de Scheffé) |
| Módulos | C13 `designs/mixture`, C06 `models/mixture` |
| Etapa | [ET15](../planos-execucao/ativos/et15-niveis-mistos-e-misturas.md) |
| Casos de validação | [`validation/cases/mixture_design`](../../validation/cases/mixture_design/mixture.json) (6 casos) e [`validation/cases/mixture_model`](../../validation/cases/mixture_model/scheffe.json) (5 casos); gerador [`make_mixture_cases.py`](../../validation/tools/make_mixture_cases.py) |

![Previsão do modelo quadrático sobre o triângulo (exemplo do E2E)](../imagens/capturas/misturas-ternario.png)

## 1. Pergunta

Em que proporções misturar `q` componentes (que somam 1) para estimar como a resposta depende da composição, e qual modelo descreve essa dependência?

## 2. Pressupostos

As proporções somam 1 em todos os ensaios; cada ensaio é uma unidade experimental independente; o erro é aditivo, independente e de variância constante. Limites inferiores `Lᵢ` com `ΣLᵢ < 1`. **Limites superiores e restrições lineares gerais não são tratados** (a região deixa de ser um simplex).

## 3. Entradas e opções

**Geração:** 2 a 8 componentes com nome e limite inferior; tipo (simplex-lattice de grau 1 a 6 ou simplex-centroide); repetições (≥ 1); pontos centrais extras (0 a 100); aleatorização e semente (0 a 2⁵³ − 1 na interface). **Análise:** modelo (linear, quadrático, cúbico especial — este com 3 ou mais componentes), α dos intervalos.

## 4. Fórmulas

Pseudocomponentes `x′ᵢ = (xᵢ − Lᵢ)/(1 − ΣL)`; proporções reais `xᵢ = Lᵢ + (1 − ΣL)·x′ᵢ`.
Scheffé: `E(y) = Σ βᵢx′ᵢ [+ Σ βᵢⱼx′ᵢx′ⱼ [+ Σ βᵢⱼₖx′ᵢx′ⱼx′ₖ]]`, **sem intercepto**.
ANOVA com soma total **centrada**: `SQT = Σ(y − ȳ)²` (n − 1 gl), `SQR = SQT − SQE` (posto − 1 gl), `F = (SQR/gl)/(SQE/gl)`, `R² = 1 − SQE/SQT`, `R²aj = 1 − (1 − R²)(n − 1)/(n − posto)`.

## 5. Algoritmo numérico

**Lattice `{q, m}`:** vetores inteiros de soma `m` em ordem lexicográfica crescente (o primeiro componente varia mais devagar), pseudocomponentes `a/m`; número de pontos `C(m + q − 1, q − 1)`. **Centroide:** subconjuntos não vazios por tamanho e ordem lexicográfica, partes iguais `1/k`; `2^q − 1` pontos. Repetições repetem todos os pontos; os centrais extras vêm por último; a execução é uma permutação da ordem padrão (PCG32 e Fisher–Yates, [aleatorização](aleatorizacao.md)). **Ajuste:** mínimos quadrados por QR com pivoteamento (o mesmo do [modelo linear](regressao-linear.md)) sobre as colunas do modelo; com três componentes, previsões em uma malha triangular de 24 subdivisões (325 pontos).

## 6. Saídas

Planejamento: pontos distintos, total, ensaios (execução, ordem padrão, suporte, pseudocomponentes, proporções, repetição). Análise: coeficientes com erro-padrão, t, valor-p e intervalo; ANOVA centrada; `R²` e `R²` ajustado; resíduos e diagnósticos por observação; malha ternária.

## 7. Casos sem resultado válido

`design.mixture_*` (componentes, nomes, limites, grau, centrais) e `design.too_many_runs`; `mixture.invalid_*` (dimensões, limites, proporções que não somam 1 ou abaixo do limite) e `mixture.special_cubic_needs_three`. Aviso `design.mixture_no_pure_error` sem repetições nem centrais. Modelo com mais parâmetros que ensaios: coeficientes não estimáveis são listados como aliasados, sem inventar valores.

## 8. Exemplo

Lattice `{3, 2}` com um central extra e duas repetições: 6 pontos × 2 + 1 = 13 ensaios; o modelo quadrático tem 6 coeficientes e 7 graus de liberdade residuais.

## 9. Interpretação apresentada ao usuário

O aplicativo explica que **não há intercepto** (os termos lineares já contêm o nível médio), que os coeficientes estão em pseudocomponentes e que a previsão só vale dentro da região do planejamento. O gráfico ternário usa escala viridis (acessível a daltonismo) com a tabela de coeficientes como equivalente em texto.

## 10. Validação

`mixture_validation.rs`: a geração coincide com `itertools` e PCG32 em Python (ordem padrão, suporte, pseudocomponentes e proporções a 1e-14); os modelos (linear, quadrático e cúbico especial; 2, 3 e 4 componentes; com limites inferiores) coincidem com o `statsmodels.OLS` sem intercepto em coeficientes, erros-padrão, t, valores-p e intervalos (tolerância relativa ≤ 1e-7) e com a ANOVA centrada calculada em Python (`F`, valor-p, `R²`, `R²` ajustado). E2E com o motor real: gerar, preencher, ajustar e ver o gráfico ternário.

## 11. Referências

Cornell, J. A. *Experiments with Mixtures*, 3.ª ed.; Scheffé, H. (1958) «Experiments with mixtures», *JRSS B* 20; Montgomery, D. C. *Design and Analysis of Experiments*, cap. 11.

## Limitações desta versão

- Sem limites superiores, restrições lineares gerais, vértices extremos, modelos cúbicos completos, transformação de razões e **otimização por desejabilidade no simplex**.
- A análise de misturas é calculada ao pedir e **não é guardada no projeto** (o planejamento e o modelo escolhido são); relatórios HTML e PDF ainda não incluem a análise de misturas.
- Sem teste de falta de ajuste nem PRESS nos modelos de misturas.
