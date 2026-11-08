# Ajuste não linear de curvas de saturação (Monod, Michaelis–Menten, Haldane e Hill)

**Estado:** implementado; validado contra o SciPy (`curve_fit`) e por recuperação de parâmetros conhecidos · **Atualizado em:** 2026-11-02

| Campo | Valor |
|---|---|
| ID no registro do motor | `nonlinear_saturation_fit` |
| Módulo | C14 `models/nonlinear` |
| Etapa | [ET18](../planos-execucao/concluidos/et18-nao-linear-e-potencia.md) |
| Casos de validação | [`validation/cases/nonlinear_saturation_fit`](../../validation/cases/nonlinear_saturation_fit/nonlinear.json) (4 casos); gerador [`make_power_nonlinear_cases.py`](../../validation/tools/make_power_nonlinear_cases.py) |

## 1. Pergunta

Como a velocidade (ou a taxa específica de crescimento) varia com o substrato `S`, e quais são `μmax` (`Vmax`) e `Ks` (`Km`) com a incerteza associada?

## 2. Pressupostos

`y = f(S; θ) + ε` com `ε` independente, de média zero e variância constante; o modelo escolhido descreve a curva na faixa medida. Substrato `S ≥ 0` (`S > 0` no Hill); parâmetros estritamente positivos por padrão.

## 3. Entradas e opções

Vetores `S` e `y` (mais observações que parâmetros); modelo; valores iniciais (opcionais), limites por parâmetro (opcionais) e α. Sem valores iniciais, o motor usa **vários inícios** determinados a partir dos dados.

## 4. Fórmulas

- **Monod / Michaelis–Menten:** `y = a·S/(b + S)` (`a = μmax` ou `Vmax`; `b = Ks` ou `Km`).
- **Haldane (Andrews):** `y = a·S/(b + S + S²/c)` (`c = Ki`, inibição pelo substrato).
- **Hill:** `y = a·Sⁿ/(bⁿ + Sⁿ)` (`b = K`, `n` = coeficiente de Hill).
Resíduos `r = y − f`; `SQR = Σr²`; `σ̂² = SQR/(n − p)`; `Cov(θ̂) ≈ σ̂²(JᵀJ)⁻¹`; `R² = 1 − SQR/SQT` (centrada).

## 5. Algoritmo numérico

**Levenberg–Marquardt** com Jacobiana analítica: `(JᵀJ + μ·diag(JᵀJ))δ = Jᵀr` por Cholesky; `μ` é dividido por 5 após um passo aceito e multiplicado por 5 após um recusado; projeção nos limites; parada quando a redução relativa da `SQR` é < 1e-13 com passo relativo < 1e-9, ou quando nenhum passo reduz a `SQR`; no máximo 500 iterações (**não convergência explícita**). Inícios: grade de `a ∈ {1; 1,5; 3}·máx(y)` e `b` em quatro valores a partir da mediana e do máximo de `S`; vence a menor `SQR` e o resultado informa em quantos inícios ela foi alcançada. **Intervalos de Wald** com `n − p` graus de liberdade; faixa de confiança da curva pelo método delta, `ŷ ± t·√(gᵀ Cov g)`.

## 6. Saídas

Parâmetros (estimativa, erro-padrão, t, valor-p, intervalo, indicação de limite), `SQR`, `σ̂`, `R²`, matriz de correlação, número de condição da Jacobiana com colunas normalizadas, convergência, iterações, inícios, resíduos e curva de 80 pontos com faixa de confiança.

## 7. Casos sem resultado válido

`nonlinear.invalid_dimensions`, `nonlinear.too_few_observations`, `nonlinear.invalid_values`, `nonlinear.hill_needs_positive_substrate`, `nonlinear.invalid_initial`, `nonlinear.invalid_bounds`, `nonlinear.no_fit`. Avisos de **identificabilidade**: `nonlinear.not_converged`, `nonlinear.parameter_at_bound`, `nonlinear.ill_conditioned` (condição > 1e8 ou informação singular), `nonlinear.highly_correlated` (|corr| > 0,99), `nonlinear.imprecise_parameter` (erro-padrão > 10× a estimativa), `nonlinear.few_degrees_of_freedom` e `nonlinear.single_start_best`.

## 8. Exemplo

Dez concentrações de 0,3 a 25 com `y = 3S/(2,5 + S)` e ruído: o ajuste devolve `μmax ≈ 3` e `Ks ≈ 2,5` com intervalos de confiança.

## 9. Interpretação apresentada ao usuário

A tela mostra a tabela de parâmetros com intervalos, `σ`, `R²`, em quantos inícios o melhor ajuste foi encontrado e o gráfico da curva com a faixa. **Avisos explicam em português por que um parâmetro pode não ser identificável** (por exemplo, faixa de substrato muito abaixo de `Ks`, que deixa `μmax` e `Ks` quase colineares). Os intervalos de Wald são aproximados em amostras pequenas.

## 10. Validação

`power_nonlinear_validation.rs::nonlinear_fits_equal_scipy_curve_fit`: em 4 casos (Monod com ruído baixo e alto, Haldane e Hill, `n = 10` cada) os parâmetros coincidem com o `scipy.optimize.curve_fit` (`trf`, limites positivos, tolerâncias 1e-14) a 1e-5 relativo, os erros-padrão (da `pcov`) a 1e-4, e `SQR`, `σ̂` e `R²` a 1e-7. Testes unitários: curvas **sem ruído** recuperam os parâmetros (Monod, Haldane e Hill) e uma faixa de substrato estreita dispara os avisos de identificabilidade. O teste do WebAssembly repete os 4 casos; o E2E ajusta um Monod e confere a tabela e o gráfico.

## 11. Referências

Bates e Watts, *Nonlinear Regression Analysis and Its Applications*; Seber e Wild, *Nonlinear Regression*; Moré (1978) para o Levenberg–Marquardt; Andrews (1968) para a inibição pelo substrato.

## Limitações do percurso v1 (histórico; extensão ET24 abaixo)

- **Sem intervalos por verossimilhança perfilada** (só Wald) e **sem os conjuntos NIST StRD** (a referência é o SciPy e a recuperação de parâmetros conhecidos).
- Só os três modelos de saturação; sem Hill com limites informados na interface, sem ajuste global de vários experimentos e sem modelos dinâmicos (equações diferenciais).
- A ET22 guarda configuração em edição e resultado calculado, com entradas/revisão/proveniência. Abrir não recalcula; HTML/PDF/Word e CSV/XLSX usam o registro consultado. As variantes avançadas desta especificação continuam na ET24.

## Extensão ET24 — perfil de verossimilhança

[DT-0033](../decisoes-tecnicas/dt-0033-perfil-de-verossimilhanca-e-dominio-nao-linear.md). `profile: true` produz método v2 e `profiles`; ausente conserva o contrato e a proveniência v1. Os resultados guardados não são recalculados ao abrir. O motor valida inícios positivos dentro do domínio e limites finitos positivos estritamente ordenados antes de projetar; não há limite superior padrão.

Para erros normais independentes com variância comum desconhecida, `LR(θ_j)=n ln[SQR(θ_j, θ̂_−j)/SQR(θ̂)]`, maximizando a variância em cada ajuste. Corte assintótico `χ²₁(1−α)`. O otimizador retira a coordenada fixada do sistema, executa vários inícios e explora ambos os lados em escala logarítmica, refinando cruzamentos por 36 bisseções. O perfil t do R usa outro corte e não é declarado equivalente.

São registrados pontos e estados dos extremos: `crossing`, `domainBound`, `searchLimit`, `failed`, `resourceLimit`. Somente cruzamentos recebem estatística finita de IC. Queda material de LR ao afastar-se do mínimo ou mínimo condicional melhor invalida a certificação numérica; ajuste exato (SQR < 1e−24) ou não convergido não recebe IC inventado. A unimodalidade refere-se **à região examinada**, nunca a uma prova global. A busca tem até 52 passos geométricos por lado, deslocamento logarítmico máximo 32, e examina três pontos adicionais depois do cruzamento. Incerteza indefinida fica explícita. A faixa da curva continua sendo delta/Wald.

[NIST Misra1d e perfis independentes](../../validation/cases/nonlinear_profile/profile.json): valores certificados com `Vmax=b1`, `K=1/b2` e `SE(b2)=SE(K)/K²` na aproximação linear. Dois inícios publicados são testados. Os certificados cobrem estimativas, erro-padrão e SQR; os IC por perfil são referência **SciPy independente**, não valores certificados NIST. Casos sintéticos Monod/Haldane/Hill têm semente 20261103. Tolerâncias: estimativas relativas 2e−5 (NIST 1e−7), SQR 2e−7 (NIST 2e−8), limites por perfil 3e−4. Gerador e versões no arquivo, contrato WASM repetindo os quatro casos. Apenas o problema NIST compatível com o modelo disponível é declarado coberto.

O [relatório ET24](../../validation/reports/et24/README.md) reúne o aceite local do perfil, das referências e da potência avançada. O [exemplo Misra1d](../../examples/16-perfil-de-saturacao/README.md) inclui o projeto com resultado salvo.

### Integridade do ajuste exato (AU-B02)

SQR exatamente zero ou ausência de convergência preservam estimativas, resíduos e curva; erro-padrão, t, p, IC de Wald e faixa delta passam a `Stat::Undefined(CovarianceInformationUnavailable)`. Correlação indefinida usa matriz vazia, conforme o contrato existente; nunca uma matriz com null ou correlação zero substituta. Correlações são normalizadas dividindo separadamente pelos desvios, evitando o produto das variâncias. Avisos discriminam inferência indisponível, condição do ajuste e parâmetro no limite. O aviso de baixa precisão exige um erro-padrão definido.

Testes existentes ampliados em `models/nonlinear/tests.rs`: ajuste exato com serialização/desserialização tipada, posto deficiente e limite imposto; teste real `et24-integrity.spec.ts`: tela, reabertura sem cálculo e HTML/PDF/Word/CSV/XLSX. Evidências e revisão final no relatório ET24.

### Orçamento operacional qualificado no bloco 05 (AU-P05)

A implementação v0.4 admite até 4.096 pares por novo ajuste e compartilha 100 milhões de unidades de linha entre estimação e perfil; previsão/resíduo e gradiente são cobrados antes de cada lote. Se o multistart principal não terminar, retorna `nonlinear.work_budget`, sem publicar um ótimo incompleto. Se somente o perfil não terminar, mantém parâmetros, Wald, curva e resíduos do ajuste concluído; os dois limites do parâmetro com perfil incompleto ficam indefinidos/`resourceLimit`, com `nonlinear.profile_budget`. Perfis integralmente concluídos conservam seus limites; pontos de coordenadas cujo multistart não terminou são descartados. O estado e o aviso integram projeto e relatórios.

É um envelope operacional, não hipótese estatística, SLA ou limite matemático. Arquivos antigos maiores continuam legíveis sem recalcular ou truncar. As medidas, referência de trabalho, testes das fronteiras e aceite web/nativo são controlados na [§9.10 do plano v0.4](../planos-execucao/plano-v0.4.md#910-execução-do-bloco-05--custo-2026-11-04); o aceite global de carga permanece na ET28.
