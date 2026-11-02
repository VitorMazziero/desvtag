# ET18 — Ajuste não linear (Monod) e potência

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F09f (não lineares), F09g (potência e precisão) |
| Marco | Prepara M4 |
| Depende de | ET17 (graus de liberdade e incerteza em modelos não triviais); ET15 (níveis mistos, para potência de ANOVA geral) |
| Módulos | C14 (`models/{nonlinear,monod}.rs`), C15 (`power/{anova,regression,contrasts,simulation}.rs`), C03 (otimização numérica), C04 (distribuições não centrais), U07, U08, U09 |
| Ativado em | — |
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

- [ ] **T01** — Especificações (`docs/metodos/monod.md`, `docs/metodos/potencia.md`) e DTs.
- [ ] **T02** — Núcleo: Levenberg–Marquardt com limites, inicialização, convergência e não convergência explícitas; NIST StRD não linear (níveis de dificuldade baixo, médio e alto).
- [ ] **T03** — Núcleo: Monod e modelos aprovados, intervalos, correlação, identificabilidade; casos SciPy/lmfit.
- [ ] **T04** — Núcleo: distribuições não centrais (F, t, qui-quadrado) validadas contra SciPy/mpmath.
- [ ] **T05** — Núcleo: potência e tamanho de amostra por desenho; simulação com semente e erro de Monte Carlo; casos statsmodels.
- [ ] **T06** — Operações do motor, contratos e paridade.
- [ ] **T07** — Interface: ajuste não linear (dados S × μ, inicialização, limites, resultados em seções, curva com faixa, exportação); potência como ferramenta de planejamento antes dos ensaios; PT/EN, temas, axe.
- [ ] **T08** — Exemplos sintéticos (Monod com solução conhecida; potência de um DIC), E2E, verificação nativa e documentação.

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

## 12. Desvios e descobertas

Nenhum até o momento.
