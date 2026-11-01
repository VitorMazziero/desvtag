# ET06 — Fatoriais, fracionários e Plackett–Burman

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F05 |
| Marco | Prepara M3 |
| Depende de | ET04; reutiliza a apresentação da ET05 |
| Módulos | C11, C06–C08, C07 (`lack_of_fit` para curvatura), C16 (`effects`, `interactions`, `pareto`, `observed_predicted`), C18, U06–U09 |
| Ativado em | — |
| Concluído em | — |

## 1. Objetivo

Entregar o caminho **Planejar experimento** para triagem: gerar fatoriais completos de dois níveis, fracionários e Plackett–Burman com fatores e respostas livres, registrar resultados e analisar efeitos sem apresentar testes não estimáveis como válidos.

## 2. Escopo

**Inclui**

- C11: especificação do planejamento, codificação reversível real ↔ codificado, fatorial 2^k, réplicas, pontos centrais, ordem padrão e aleatória com semente registrada e ordem efetivamente usada.
- Fracionários com geradores, relação definidora, resolução e estrutura de confundimento.
- Plackett–Burman por construções documentadas, com lista explícita de tamanhos suportados; colunas fictícias quando aplicável.
- Contagem de ensaios antes de gerar; limites operacionais para matrizes grandes.
- Análise: efeitos e coeficientes (distinção explícita), erros-padrão, t, p quando estimáveis, Pareto, efeitos principais e interações quando suportadas, observado × predito, ANOVA e verificação de curvatura com pontos centrais.
- Comportamento documentado para desenhos saturados, ausência de erro residual e interações confundidas.
- U06: seletor com recomendação curta baseada em objetivo, número de fatores e orçamento de ensaios; opções; matriz de ensaios real/codificada; preenchimento dos resultados.
- Inventário das funções do Protimiza não visíveis nas capturas e esclarecimento da opção rotulada CCD (PD-05).

**Não inclui**

- Blocos em planejamentos e DBC (v0.2, F08); níveis mistos (F09a).
- Superfícies de resposta (ET07).

## 3. Entradas e referências

- [Roteiro — F05](../roteiro-produto.md#f05--fatoriais-fracionários-e-plackettburman).
- [Catálogo funcional — referência Protimiza](../../produto/catalogo-funcional.md#referência-protimiza).
- Plackett, R. L.; Burman, J. P. (1946). The design of optimum multifactorial experiments. *Biometrika*, 33(4), 305–325.
- Literatura de planejamento usada no laboratório disponível no acervo local `referencias/` (citar a obra na documentação pública, sem copiar o material).
- Referências de validação: pacote R FrF2, pyDOE3 e exemplos publicados com resultados conhecidos.
- Pendências: PD-04 e PD-05.

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Gerador aleatório | Algoritmo e semente da aleatorização | PRNG documentado (família PCG ou ChaCha) + Fisher–Yates | Reprodutível e idêntico nativo × WASM |
| Geradores de fracionários | Fonte da tabela de geradores | Tabelas de aberração mínima publicadas | Resolução máxima, referência citável |
| Tamanhos de PB | Quais N suportar e como construir | Geradores cíclicos de Plackett–Burman; construção específica onde necessária | Ortogonalidade verificável, cobertura dos casos do laboratório |
| Desenhos saturados | Estimativa de erro sem graus de liberdade residuais | Pontos centrais; colunas fictícias; método de Lenth | Transparência, referência publicada, interpretação para iniciantes |

## 5. Tarefas

- [ ] **T01** — DTs da seção 4.
- [ ] **T02** — C11 `spec`, `coding`, `factorial`, `replication`, `randomization`; testes de codificação reversível e ordem reprodutível.
- [ ] **T03** — C11 `fractional` e `alias`: geradores, relação definidora, resolução e confundimento.
- [ ] **T04** — C11 `plackett_burman`: tamanhos suportados e verificação de ortogonalidade.
- [ ] **T05** — Análise de efeitos com C06–C08; curvatura com pontos centrais; estados para termos não estimáveis.
- [ ] **T06** — C16 `effects`, `interactions`, `pareto`, `observed_predicted`; C18 com interpretação de triagem.
- [ ] **T07** — U06 `DesignSelector.tsx`, `DesignOptions.tsx`, `RunMatrix.tsx`; exportação da matriz em CSV.
- [ ] **T08** — U07–U09: termos do modelo, resultados e gráficos de triagem.
- [ ] **T09** — Inventário Protimiza: listar funções conferidas, ausentes e incertas; registrar decisão sobre o rótulo CCD.
- [ ] **T10** — Exemplo sintético em `examples/`: triagem PB de componentes de meio de cultivo com pontos centrais.
- [ ] **T11** — Validação de matrizes (contagem, níveis, ortogonalidade, geradores, codificação, aleatorização) e de análises contra referências independentes.
- [ ] **T12** — Documentação: `docs/metodos/fatorial-dois-niveis.md`, `fatorial-fracionario.md`, `plackett-burman.md`, `aleatorizacao.md`; fichas C11, C16, U06.

## 6. Entregas

Planejamento e análise de triagem completos, exemplo PB e inventário Protimiza atualizado.

## 7. Critérios de conclusão

1. Matrizes e propriedades (contagem, níveis, ortogonalidade quando esperada, geradores, codificação e aleatorização reprodutível) verificadas independentemente.
2. Fluxo PB funciona sem apresentar testes não estimáveis como válidos.
3. Mesma semente produz a mesma ordem no Windows e no navegador.
4. Inventário Protimiza e decisão sobre o rótulo CCD registrados antes da ET07.

## 8. Verificação

Testes de propriedades das matrizes; casos de validação de análise; paridade de aleatorização; E2E planejar → preencher → analisar nas duas plataformas.

## 9. Documentação a criar ou atualizar

Especificações, fichas, DTs, [catálogo funcional](../../produto/catalogo-funcional.md) (inventário Protimiza), [matriz de cobertura](../../produto/matriz-cobertura.md) e exemplo.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Usuário iniciante interpretar desenho saturado como conclusivo | C18 explica a limitação; testes indisponíveis aparecem como tal |
| Inventário Protimiza incompleto sem acesso autenticado | Registrar o que foi conferido e o que permanece incerto |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
