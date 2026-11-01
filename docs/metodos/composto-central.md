# Composto central (CCD): DCCR, face centrada e α informado

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `response_surface_design` |
| Módulos | C12 `designs/central_composite`, C11 `designs/{generate,fractional,randomization}` |
| Etapa | [ET07](../planos-execucao/ativos/et07-superficies-resposta.md) |
| Casos de validação | [`validation/cases/surface_design/designs.json`](../../validation/cases/surface_design/designs.json) |
| Decisão | [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |

## 1. Pergunta

Como planejar ensaios para estimar um modelo de segunda ordem (termos lineares, quadráticos e interações de dois fatores) em `k` fatores, com curvatura estimável e erro puro?

## 2. Pressupostos

Fatores quantitativos contínuos; região de interesse onde o modelo quadrático é uma aproximação razoável. A parte fatorial deve permitir estimar as interações de dois fatores (resolução ≥ V para fracionários; o aplicativo avisa se for menor).

## 3. Entradas e opções

`k ≥ 2` fatores com níveis baixo e alto (`DesignFactor.low/high`); réplicas do planejamento; pontos centrais; tipo de `α`; arranjo; geradores opcionais da parte fatorial. Tipos de `α`: **rotacional** (`α = F^(1/4)`, `F` = pontos da parte fatorial; DCCR/CCRD), **face centrada** (`α = 1`; FCD) e **informado** (`0 < α ≤ 10`; caso geral). Arranjo **circunscrito** (padrão) ou **inscrito**. Limites: fatorial completo até 8 fatores na parte fatorial; 5000 ensaios no total; a contagem aparece antes de gerar.

## 4. Fórmulas

Parte fatorial `2^(k−p)` em ordem de Yates (completa se não houver geradores); pontos axiais `(…, ±a, …, 0)` para cada fator, na ordem `−`, `+`, fator por fator; pontos centrais ao final. Número de ensaios do planejamento básico: `F + 2k`; total: `(F + 2k) · réplicas + centrais`.

- **Circunscrito:** parte fatorial em `±1`, axiais em `±α` (a região excede os níveis informados).
- **Inscrito:** axiais em `±1` e parte fatorial em `±1/α` (os níveis informados são os extremos da região).
- **Valores reais:** `real = centro + x · meia-amplitude`, com `centro = (alto + baixo)/2` e `meia-amplitude = (alto − baixo)/2`.

**Rotacionalidade** (Box e Hunter, 1957): a variância da predição depende só da distância ao centro quando os momentos de ordem 2 são iguais e os de ordem 4 satisfazem `Σx_i⁴ = 3·Σx_i²x_j²`. Com a parte fatorial completa e `α = F^(1/4)` a condição é satisfeita (verificada nos casos de 2, 3, 4 e 5 fatores).

Exemplos: 2 fatores, `F = 4`: `α = √2 ≈ 1,414`, 8 ensaios básicos; 3 fatores: `α ≈ 1,682`, 14 ensaios básicos; 4 fatores: `α = 2`, 24 ensaios básicos.

## 5. Algoritmo numérico

Enumeração e aritmética de ponto flutuante simples (potência `¼`); sem iteração. A aleatorização usa [PCG32 e Fisher–Yates](aleatorizacao.md), e a ordem de execução fica gravada.

## 6. Saídas

Ensaios (ordem de execução e padrão, tipo `factorial`/`axial`/`center`, repetição, valores codificados e reais), contagem (`axialRuns` incluído), `axialDistance`, resolução e relação definidora da parte fatorial (fracionária), avisos.

## 7. Casos sem resultado válido

`design.invalid_axial_distance` (`α` fora de `(0, 10]` ou não finito), geradores inválidos (`design.generator_*`), menos de 2 fatores, parte fatorial completa com mais de 8 fatores, mais de 5000 ensaios. Avisos: `design.cube_resolution_low` (parte fatorial de resolução < V: nem todas as interações de dois fatores são estimáveis) e `design.surface_needs_center` (sem pontos centrais não há erro puro).

## 8. Exemplo

[Exemplo 03](../../examples/03-superficie-meio-cultivo/README.md): DCCR de 3 fatores com 5 pontos centrais, 19 ensaios, `α = 1,682`, semente 20261101.

## 9. Interpretação apresentada ao usuário

A matriz e as propriedades mostram `α`, o número de pontos fatoriais, axiais e centrais. O aplicativo **nomeia o planejamento pela geometria e pela fórmula** e não copia rótulos de outros programas (decisão sobre o rótulo CCD em [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md), item 9): a opção rotulada CCD na referência é coberta pelo composto central com `α` informado, circunscrito ou inscrito.

## 10. Validação

Doze casos comparados com uma enumeração independente em Python: 2, 3, 4 e 5 fatores rotacionais, face centrada (2 e 3), `α` informado (1,5 e 2), inscritos (2 e 3 fatores) — ensaio a ensaio, distância axial, contagens de pontos axiais e rotacionalidade (momentos calculados nos dois lados). Paridade WebAssembly × nativo. A verificação nativa no CI inclui o DCCR de 3 fatores. Windows 11: pendente.

## 11. Referências

- Box, G. E. P.; Wilson, K. B. (1951). On the experimental attainment of optimum conditions. *Journal of the Royal Statistical Society B* 13, 1–45.
- Box, G. E. P.; Hunter, J. S. (1957). Multi-factor experimental designs for exploring response surfaces. *Annals of Mathematical Statistics* 28, 195–241.
- Myers, R. H.; Montgomery, D. C.; Anderson-Cook, C. M. (2016). *Response Surface Methodology*, 4ª ed. Wiley.
