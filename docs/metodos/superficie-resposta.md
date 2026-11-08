# Superfície de resposta de segunda ordem

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `response_surface` |
| Módulos | C16 `surface/{terms,model,equation,grid,contour}`, C07 `inference/lack_of_fit`, C06 `models/linear` |
| Etapa | [ET07](../planos-execucao/concluidos/et07-superficies-resposta.md) |
| Casos de validação | [`validation/cases/response_surface/001…006`](../../validation/cases/response_surface/001-ccd-rotacional-2-fatores/README.md) |
| Decisão | [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |

## 1. Pergunta

Como a resposta varia com `k` fatores quantitativos numa região, e o modelo quadrático descreve bem essa região?

## 2. Pressupostos

Erros independentes, de variância constante e aproximadamente normais (usados nos intervalos e testes; a independência nunca é presumida: fato `surface.independence_not_assessed`). Modelo polinomial de grau 2 como aproximação local.

## 3. Entradas e opções

Dados com os valores **reais** dos fatores, resposta, fatores (`id`, nome, `low`, `high`: os níveis definem a codificação), termos do modelo e `α` (significância, `0 < α < 1`). Termos aceitos: efeito principal, quadrático (`Power`, grau 2) e interação de **dois** fatores distintos; lista vazia = **modelo completo** (principais, quadráticos e interações de dois fatores). Ao menos um fator quantitativo para o ajuste; contornos e superfície 3D exigem dois eixos quantitativos. **Nenhum termo é eliminado automaticamente**; o usuário escolhe os termos e cada ajuste fica guardado como análise distinta.

## 4. Fórmulas

**Codificação.** `x = (real − centro)/meia-amplitude` por fator. Para uma matriz sem planejamento gerado (importada ou personalizada), os níveis são o menor e o maior valor ensaiado de cada fator.

**Modelo.** `y = β₀ + Σ βᵢxᵢ + Σ βᵢᵢxᵢ² + Σ βᵢⱼxᵢxⱼ + ε`, ajustado por mínimos quadrados pela fatoração QR do núcleo ([regressão linear](regressao-linear.md)). Coeficientes, erros-padrão, `t`, valores-p e intervalos na escala codificada.

**ANOVA da regressão e ajuste.** Modelo, resíduo e total; `F`, valor-p, `R²`, `R²` ajustado e desvio-padrão residual.

**Falta de ajuste e erro puro.** Com réplicas verdadeiras (ensaios nas mesmas condições de todos os fatores), `SQ_puro = Σ (y − ȳ_condição)²` com `n − m` graus de liberdade (`m` = condições distintas), `SQ_falta = SQE − SQ_puro` e `F = (SQ_falta/gl_falta)/(SQ_puro/gl_puro)`. **Só é calculada quando identificável** (`gl_puro > 0` e `gl_falta > 0`); caso contrário a interface explica a ausência.

**Equação em unidades reais.** Com `xᵢ = (zᵢ − cᵢ)/hᵢ`:
`a₀ = b₀ − Σ bᵢcᵢ/hᵢ + Σ bᵢᵢcᵢ²/hᵢ² + Σ bᵢⱼcᵢcⱼ/(hᵢhⱼ)`; `aᵢ = bᵢ/hᵢ − 2bᵢᵢcᵢ/hᵢ² − Σⱼ bᵢⱼcⱼ/(hᵢhⱼ)`; `aᵢᵢ = bᵢᵢ/hᵢ²`; `aᵢⱼ = bᵢⱼ/(hᵢhⱼ)`. A substituição é exata; mesmo sem o efeito principal no modelo aparece o termo linear em unidades reais.

**Região experimental e extrapolação.** Intervalo observado de cada fator e a maior alavancagem `h_max` entre os ensaios. Um ponto `x₀` é **extrapolação** se algum fator sai do seu intervalo observado ou se `x₀ᵀ(XᵀX)⁻¹x₀ > h_max` (extrapolação oculta; Montgomery, Peck e Vining).

**Malha e curvas de nível.** Para dois fatores escolhidos e valores fixados nos demais (padrão: centro), `5–101` passos por eixo cobrindo o intervalo observado; predição em cada nó; curvas de nível por *marching squares* em níveis "redondos" (passos `1, 2, 5 × 10ⁿ`).

## 5. Algoritmo numérico

QR com pivoteamento e colunas normalizadas (núcleo); formas quadráticas pelo fator `R`. Malha: avaliação direta do polinômio ajustado; curvas: interpolação linear nas arestas das células, com resolução de selas pela média dos vértices. Células com vértice indefinido são ignoradas.

## 6. Saídas

`SurfaceResult`: intercepto e termos (estimativa, EP, `t`, `p`, IC), ANOVA com `R²`, falta de ajuste (ou ausência), equação codificada e real, intervalos experimentais, alavancagem máxima, observado × predito (com resíduo e alavancagem), lacunas de hierarquia, ajuste completo, avisos e fatos. `SurfaceGrid`: eixos, `z`, indicador de extrapolação, `zMin`/`zMax`, condições fixadas, curvas de nível.

## 7. Casos sem resultado válido

| Situação | Comportamento |
|---|---|
| Nenhum fator, fator não quantitativo, níveis iguais, `α` inválido | Erro `surface.*` |
| Termo não suportado (grau ≠ 2, interação de ≠ 2 fatores), repetido ou fora do modelo | Erro `surface.unsupported_term`, `surface.duplicate_term`, `surface.term_not_in_design` |
| Sem graus de liberdade do erro | `surface.saturated`: erros-padrão, `t` e `p` indefinidos (estado explícito) |
| Termos não estimáveis (planejamento não os separa) | Marcados `não estimáveis`; equação real indisponível |
| Falta de ajuste não identificável | Ausente; fato `surface.lack_of_fit_unavailable` |
| Quadrático ou interação sem os principais | Aviso `surface.hierarchy_gaps` (a equação segue válida) |
| Malha: eixos iguais, passos fora de 5–101, valor fixado inválido | Erro `surface.invalid_axes`, `surface.invalid_steps`, `surface.invalid_fixed_value` |

## 8. Exemplo

[Exemplo 03](../../examples/03-superficie-meio-cultivo/README.md): DCCR de 3 fatores, 19 ensaios, `R² = 0,9878`, falta de ajuste `p = 0,692`.

## 9. Interpretação apresentada ao usuário

Fatos `surface.model_significant|model_not_significant`, `fit_measures`, `lack_of_fit_significant|not_significant|unavailable`, `not_estimable`, `saturated`, `extrapolation_note` e `independence_not_assessed`. O texto recomenda confirmar pontos promissores com ensaios novos e não extrapolar além da região. O aplicativo **não declara ótimo** na tela de superfície: a busca do ótimo é da etapa de otimização.

## 10. Validação

Seis casos aplicados contra NumPy (`lstsq`, `(XᵀX)⁻¹`) e SciPy (`t`, `F`): CCD rotacional de 2 fatores, FCD de 3, Box–Behnken de 3, planejamento personalizado irregular com repetições, modelo reduzido sem hierarquia e CCD com um só ponto central (sem erro puro). Comparados: coeficientes, EP, `t`, `p`, IC, ANOVA, `R²`, falta de ajuste, ajustados, alavancagens, intervalos, malha 5×5 com indicador de extrapolação e a **equação em unidades reais** (obtida de um segundo ajuste dos valores ajustados com colunas nos fatores reais, sem usar a fórmula de substituição). Tolerância: erro relativo ≤ 1e-8 + 1e-9 × escala. Além disso, o teste confirma que as duas equações coincidem com o preditor em todos os ensaios. Paridade WebAssembly × nativo; verificação nativa no CI. Windows 11: pendente.

## 11. Referências

- Myers, R. H.; Montgomery, D. C.; Anderson-Cook, C. M. (2016). *Response Surface Methodology*, 4ª ed. Wiley.
- Montgomery, D. C.; Peck, E. A.; Vining, G. G. (2012). *Introduction to Linear Regression Analysis*, 5ª ed. Wiley (extrapolação oculta, §3.8).
- Box, G. E. P.; Draper, N. R. (2007). *Response Surfaces, Mixtures, and Ridge Analyses*, 2ª ed. Wiley.

## ET25 T06 — bloco fixo aditivo

Seleção opcional de coluna categórica e nível de referência explícito. O ajuste acrescenta B−1 indicadores de tratamento ao polinômio; os coeficientes de bloco são apresentados em separado. Sem interação com bloco e sem efeito aleatório. Equação, malha, otimização e intervalos são condicionais ao bloco de referência. A interpretação não prevê o deslocamento de um bloco futuro desconhecido. O erro puro agrupa apenas condições dentro do mesmo bloco (a identidade numérica de réplicas será reforçada em AU-B19/ET28).

Cinco ajustes independentes com statsmodels conferem coeficientes, erros-padrão, IC, SSE, erro puro e previsões/intervalos: um e dois fatores, dois e três blocos e mudança de referência. Ao abrir uma análise salva ou trocar a fatia, a figura usa os coeficientes, a maior alavancagem e o bloco arquivados. O motor reconstrói a matriz de desenho da revisão vinculada com o centro e a meia-amplitude salvos e a fatora para conferir posto, estimabilidade e extrapolação. Isso evita a perda de precisão ao reconstruir os limites decimais. Os coeficientes permanecem os do ajuste original. Se as observações, os termos ou a codificação não corresponderem ao ajuste, a malha retorna um diagnóstico. Chamadores do protocolo que omitem o ajuste arquivado mantêm o comportamento de cálculo completo.
