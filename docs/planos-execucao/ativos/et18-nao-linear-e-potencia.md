# ET18 — Ajuste não linear (Monod) e potência

| Campo | Valor |
|---|---|
| Estado | **Ativo** (Monod/Haldane/Hill e potência entregues; perfil de verossimilhança, NIST e simulação pendentes) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F09f (não lineares), F09g (potência e precisão) |
| Marco | Prepara M4 |
| Depende de | ET17 (graus de liberdade e incerteza em modelos não triviais); ET15 (níveis mistos, para potência de ANOVA geral) |
| Módulos | C14 (`models/{nonlinear,monod}.rs`), C15 (`power/{anova,regression,contrasts,simulation}.rs`), C03 (otimização numérica), C04 (distribuições não centrais), U07, U08, U09 |
| Ativado em | 2026-11-02 |
| Concluído em | — |

## 1. Objetivo

Ajustar o **modelo de Monod** (e a família de saturação aprovada na DT) a dados de bioprocesso, com limites, inicialização, incerteza e identificabilidade explícitos; e calcular **potência e tamanho de amostra** para os desenhos do aplicativo (comparação de tratamentos, fatoriais e regressão), declarando o efeito e as hipóteses.

## 2. Escopo

**Inclui**

- Monod `μ = μmax·S/(Ks + S)`; candidatos da DT: Michaelis–Menten (mesma forma, nomes de enzimologia), Haldane/Andrews (inibição pelo substrato).
- Mínimos quadrados não lineares (Levenberg–Marquardt com limites), inicialização automática documentada e editável, intervalos assintóticos e por perfil de verossimilhança, correlação entre parâmetros, diagnóstico de identificabilidade, curva ajustada com faixa de confiança.
- Potência: ANOVA de um fator e fatorial (F não central), contrastes, regressão e efeitos de dois níveis; tamanho de amostra para potência-alvo; simulação com semente e incerteza quantificada quando não houver fórmula fechada.
- Planejamento da precisão: número de repetições para largura-alvo de intervalo.

**Não inclui**

- Modelos dinâmicos (equações diferenciais de crescimento e consumo): posterior.
- Ajuste global de vários experimentos com parâmetros compartilhados: avaliar na DT.

## 3. Entradas e referências

- [Roteiro F09f e F09g](../roteiro-produto.md#f09--famílias-avançadas-do-catálogo): «Soluções conhecidas, não convergência e incerteza documentadas»; «Cálculo independente ou simulação com incerteza quantificada».
- Bates e Watts, *Nonlinear Regression Analysis and Its Applications*; Seber e Wild, *Nonlinear Regression*; Cohen, *Statistical Power Analysis*; Montgomery (capítulos de tamanho de amostra).
- Referências independentes: SciPy `curve_fit`/`least_squares`, lmfit; conjuntos NIST StRD de regressão não linear; statsmodels `stats.power` e SciPy `ncf`; simulação Python própria.

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Modelos de saturação | Quais além de Monod? | Michaelis–Menten (rótulo), Haldane/Andrews, Hill | Uso no grupo, identificabilidade com dados típicos |
| Intervalos | Assintóticos, perfil ou ambos? | Wald; perfil de verossimilhança | Cobertura em amostras pequenas, custo |
| Potência por simulação | Quando simular e com quantas réplicas? | Fórmula fechada sempre que existir; simulação com erro de Monte Carlo exibido | Exatidão, tempo, reprodutibilidade |

## 5. Tarefas

- [x] **T01** — Especificações [`ajuste-nao-linear.md`](../../metodos/ajuste-nao-linear.md) e [`potencia.md`](../../metodos/potencia.md); as decisões (modelos de saturação, Wald e não perfil, fórmulas exatas em vez de simulação) estão nelas, sem DT separada.
- [~] **T02** — `models/nonlinear.rs`: LM com limites, vários inícios, convergência e não convergência explícitas; casos SciPy e recuperação de parâmetros. **NIST StRD não linear não foi incluído** (sem acesso aos arquivos nesta sessão).
- [~] **T03** — Monod, Haldane e Hill com intervalos de Wald, correlação, condição e avisos de identificabilidade. **Intervalos por perfil de verossimilhança não entregues.**
- [x] **T04** — `distributions/noncentral.rs`: F e t não centrais (AS 243), validadas contra `scipy.stats.ncf` e `nct` (erro < 1e-10). A qui-quadrado não central não foi necessária.
- [~] **T05** — `power/`: potência, tamanho de amostra e precisão (ANOVA, t); **sem simulação** (as fórmulas são exatas) e sem regressão, contrastes e efeitos de dois níveis.
- [x] **T06** — Operações `modelNonlinear` e `powerAnalyze`, contratos gerados e paridade WebAssembly.
- [~] **T07** — `SaturationFit` (tabela, avisos, gráfico com faixa) na etapa de análise e `PowerCalculator` na tela inicial; PT/EN. *O resultado não é guardado no projeto e não entra nos relatórios; limites e valores iniciais editáveis não estão na interface.*
- [~] **T08** — E2E (calculadora com n = 37 igual ao SciPy; ajuste de Monod) feito; exemplos sintéticos em `examples/` e verificação nativa pendentes.

## 6. Entregas

Ajuste de Monod (e modelos aprovados) com incerteza e identificabilidade; potência, tamanho de amostra e precisão para os desenhos do aplicativo.

## 7. Critérios de conclusão

1. Conjuntos NIST StRD não lineares reproduzidos nas tolerâncias certificadas (ou a não convergência informada nos casos de partida difícil, com registro).
2. Monod com solução conhecida recuperada; intervalos e correlação iguais à referência; caso não identificável sinalizado.
3. Potência por fórmula igual a statsmodels/SciPy; por simulação dentro do erro de Monte Carlo informado.
4. Paridade WebAssembly × nativo; E2E; axe.

## 8. Verificação

Rust e casos independentes; vitest; E2E nos quatro navegadores; verificação nativa no Windows 10.

## 9. Documentação a criar ou atualizar

Especificações, DTs, mapa de módulos (C14, C15), fichas, matriz de cobertura (F09f, F09g), limites operacionais (simulação), CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Inicialização ruim levar a mínimos locais | Inicialização por linearização documentada, vários inícios, edição pelo usuário |
| Parâmetros pouco identificáveis com faixa estreita de substrato | Diagnóstico explícito e recomendação de ensaios em concentrações maiores |
| Simulação lenta no navegador | Número de réplicas ajustável, cancelamento, erro de Monte Carlo exibido |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Etapa não iniciada. |
| 2026-11-02 | **Ativada e implementada** (Monod, Haldane, Hill; potência por F e t não centrais), validada contra o SciPy. Descoberta: `scipy.stats.ncf.sf` dá valores negativos com não centralidade 0 (usada a F central como referência nesse ponto). Pendentes: perfil de verossimilhança, NIST StRD, simulação, exemplos e verificação nativa. |

## 12. Desvios e descobertas

Nenhum até o momento.
