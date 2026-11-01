# Fatorial de dois níveis: planejamento e análise de efeitos

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| IDs no registro do motor | `two_level_design` (geração) e `two_level_design_analysis` (análise) |
| Módulos | C11 `designs/{spec,coding,factorial,generate,recommend,analysis}`, C07 `inference/{lenth,lack_of_fit}`, C06–C08 (ajuste), C16 `visualization/effects`, C18 `design_facts` |
| Etapa | [ET06](../planos-execucao/ativos/et06-fatoriais-plackett-burman.md) |
| Casos de validação | [`validation/cases/two_level_design`](../../validation/cases/two_level_design/) (matrizes) e [`two_level_design_analysis/001…005`](../../validation/cases/two_level_design_analysis/001-fatorial-2x3-replicas-centrais/README.md) |
| Decisão | [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) |

## 1. Pergunta

**Planejamento:** quais condições experimentais executar para estimar os efeitos de `k` fatores, cada um em dois níveis? **Análise:** quais fatores (e interações) alteram a resposta, e o quanto?

## 2. Pressupostos

Fatores numéricos com dois níveis reais distintos (`baixo ≠ alto`); resposta numérica. A inferência (erro-padrão, t, valor-p) exige graus de liberdade de erro: réplicas, pontos centrais ou termos de ordem alta fora do modelo. Sem eles, **nenhum teste é apresentado como válido** (seção 7). A independência dos ensaios não é verificável pelos dados e nunca é presumida (fato `design.independence_not_assessed`).

## 3. Entradas e opções

`DesignSpec`: tipo (`fullFactorial`, `fractional`, `plackettBurman`), fatores (id, nome, `low`, `high`, unidade), repetições do planejamento básico (≥ 1; cada repetição é uma réplica experimental), pontos centrais, aleatorizar (sim/não) e semente (inteiro ≥ 0). Análise: termos do modelo (principais e interações), α (0 < α < 1) e inclusão do termo de curvatura. Limites: 12 fatores no fatorial completo (2¹² = 4096) e 5000 ensaios no total; a **contagem é obtida antes de gerar** (`designCount`).

## 4. Fórmulas

**Codificação (reversível).** `x = (real − centro)/meia-amplitude`, com `centro = (alto + baixo)/2` e `meia-amplitude = (alto − baixo)/2`; baixo → −1, alto → +1, centro → 0. A inversa `real = centro + x · meia-amplitude` reproduz os valores digitados nos extremos e no centro.

**Ordem padrão (Yates).** A coluna do fator `A` alterna a cada ensaio, a de `B` a cada 2, a de `C` a cada 4 etc.; −1 antes de +1. Réplicas repetem o bloco básico; os pontos centrais vêm ao final.

**Ensaios.** `N = N_básico · repetições + pontos centrais`, com `N_básico = 2ᵏ`, `2^(k−p)` ou o tamanho do PB.

**Modelo e efeito.** Ajuste linear por mínimos quadrados na escala codificada. O coeficiente `b` é a variação da resposta por unidade codificada; o **efeito** (média no nível alto − média no baixo) vale `2·b`. As duas grandezas são mostradas separadas. Erro-padrão do efeito: `2·EP(b)`; `t = b/EP(b)`; intervalo do efeito `2·(b ± t₁₋α/₂(gl)·EP(b))`.

**Curvatura.** Com pontos centrais, acrescenta-se ao modelo uma coluna indicadora do ponto central (1 nos centrais, 0 nos demais). Seu coeficiente é a diferença entre a média dos centrais e o valor previsto pelo modelo linear nos pontos fatoriais; `t` com os graus de liberdade do erro. Em modelos saturados nos pontos fatoriais coincide com o teste clássico `(ȳ_F − ȳ_C)` (Montgomery), verificado no caso 001.

**Falta de ajuste e erro puro.** Veja [regressão linear](regressao-linear.md): com réplicas verdadeiras, `SQ_puro = Σ (y − ȳ_ajuste)²` e `F = (SQ_falta/gl_falta)/(SQ_puro/gl_puro)`.

**Método de Lenth** (planejamentos sem erro estimável): `s₀ = 1,5·mediana|cⱼ|`; `PSE = 1,5·mediana{|cⱼ| : |cⱼ| < 2,5·s₀}`; `gl = m/3`; `ME = t₁₋α/₂(gl)·PSE`; `SME = t_γ(gl)·PSE`, `γ = (1 + (1 − α)^{1/m})/2`, sobre os `m` efeitos. É um **indicativo** (rotulado como tal), não um teste com erro experimental real.

## 5. Algoritmo numérico

Fatorial por enumeração em ordem padrão; ajuste pela fatoração QR do núcleo ([regressão linear](regressao-linear.md)); termos que a QR com pivoteamento declara dependentes ficam `não estimáveis`. Lenth sobre os efeitos estimáveis dos termos escolhidos. Distribuição t pelos módulos do C04.

## 6. Saídas

Geração: ensaios (`run`, `standardOrder`, tipo de ponto, repetição, valores codificados e reais), contagem, relação definidora e confundimento (fracionários), resolução, colunas fictícias (PB), correlação máxima entre efeito principal e interação de dois fatores, algoritmo e semente. Análise: intercepto, termos (coeficiente, efeito, EP, t, p, IC, indicação de Lenth, confundidos), ANOVA da regressão, falta de ajuste e erro puro, curvatura, Lenth, Pareto, séries de efeitos principais e de interações, observado × predito, avisos e fatos.

## 7. Casos sem resultado válido

| Situação | Comportamento |
|---|---|
| Gl do erro = 0 (saturado) | `design.saturated`: EP, t, p e IC ficam **indefinidos** (estado explícito, nunca zero ou `NaN`); só Lenth indica, e com rótulo de indicativo; o Pareto usa `|efeito|` com a margem de Lenth |
| Sem Lenth e sem erro | Pareto só com `|efeito|`, sem linha de referência; `design.no_inference` |
| Termo aliasado ou dependente | `não estimável` (`design.not_estimable_terms`); excluído do ajuste e da contagem de efeitos |
| Interação confundida com principal | Aviso `design.main_effects_aliased_with_two_factor` e fato `design.aliased_active` quando ativo |
| Um só ponto central | Aviso de geração `design.single_center_point`: com um ponto central não há erro puro; usar ao menos dois |
| Níveis inesperados nos dados | `design.unexpected_levels` (a linha não é descartada em silêncio) |
| Fator não numérico, níveis iguais, α inválido, termo fora do planejamento | Erros `design.factor_not_numeric`, `design.invalid_levels`, `design.invalid_alpha`, `design.term_not_in_design` |

## 8. Exemplo

Fatorial 2³ com 4 pontos centrais (caso 001): 12 ensaios; os efeitos principais e as interações são estimados com 4 graus de liberdade do erro (os centrais contribuem com erro puro); a curvatura é testada com o termo indicador. Outro exemplo completo: [exemplo 02](../../examples/02-triagem-meio-cultivo/README.md) (PB de 12 ensaios, seis fatores, 4 centrais).

## 9. Interpretação apresentada ao usuário

Fatos `design.active_effects`, `design.no_active_effects`, `design.lenth_only`, `design.saturated`, `design.curvature_detected|not_detected|unavailable`, `design.lack_of_fit_*`, `design.aliased_active`, `design.screening_pb`, `design.not_estimable`, `design.independence_not_assessed`. Efeito significativo não é apresentado como causalidade nem como ótimo; o texto lembra que a triagem indica candidatos a estudo posterior.

## 10. Validação

- **Matrizes:** enumeração independente em Python (ordem padrão), comparada ensaio a ensaio com o motor; contagens e limites.
- **Análise:** cinco casos aplicados contra NumPy (`lstsq`, inversa de `XᵀX`) e SciPy (`t`, `F`), com Lenth, falta de ajuste e curvatura implementados em Python pela definição: fatorial 2³ com réplicas e centrais, fracionário de resolução IV, PB 12 com 8 fatores e curvatura, saturado com Lenth, 2⁴ sem réplica com erro por interações de ordem alta. Tolerância: erro relativo ≤ 1e-9 + 1e-12 × escala (satisfeita nos 5 casos).
- Paridade WebAssembly × nativo da geração e da análise (`design.parity.test.ts`).
- Windows 11: pendente.

## 11. Referências

- Box, G. E. P.; Hunter, J. S.; Hunter, W. G. (2005). *Statistics for Experimenters*, 2ª ed. Wiley.
- Montgomery, D. C. (2019). *Design and Analysis of Experiments*, 10ª ed. Wiley (teste de curvatura com pontos centrais).
- Lenth, R. V. (1989). Quick and easy analysis of unreplicated factorials. *Technometrics* 31(4), 469–473.
