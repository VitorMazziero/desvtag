# ET06 — Fatoriais, fracionários e Plackett–Burman

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F05 |
| Marco | Prepara M3 |
| Depende de | ET04; reutiliza a apresentação da ET05 |
| Módulos | C11, C06–C08, C07 (`lack_of_fit` para curvatura), C16 (`effects`, `interactions`, `pareto`, `observed_predicted`), C18, U06–U09 |
| Ativado em | 2026-11-01 |
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

- [x] **T01** — DTs da seção 4: [DT-0011](../../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) (gerador aleatório, geradores de fracionários, tamanhos de PB, curvatura, desenhos saturados, contrato).
- [x] **T02** — C11 `spec`, `coding`, `factorial`, `randomization` (réplicas e centrais em `generate.rs`; não há `replication.rs`); testes de codificação reversível e ordem reprodutível.
- [x] **T03** — C11 `fractional` e `alias`: geradores, relação definidora, resolução e confundimento.
- [x] **T04** — C11 `plackett_burman`: tamanhos suportados e verificação de ortogonalidade.
- [x] **T05** — Análise de efeitos com C06–C08; curvatura com pontos centrais; estados para termos não estimáveis.
- [x] **T06** — C16 `effects` (principais e interações); Pareto e observado × predito em `designs/analysis.rs`; C18 `design_facts` com interpretação de triagem.
- [x] **T07** — U06 `DesignPanel.tsx` (seletor, opções e contagem), `RunMatrix.tsx`; exportação da matriz em CSV.
- [x] **T08** — U07–U09: termos do modelo, resultados e gráficos de triagem.
- [x] **T09** — Inventário Protimiza: listar funções conferidas, ausentes e incertas; registrar decisão sobre o rótulo CCD. *Parcial por limite de acesso:* sem acesso ao serviço, o inventário usa a descrição das capturas; ver [catálogo funcional](../../produto/catalogo-funcional.md#inventário-protimiza-et06).
- [x] **T10** — Exemplo sintético em `examples/`: triagem PB de componentes de meio de cultivo com pontos centrais ([exemplo 02](../../../examples/02-triagem-meio-cultivo/README.md)).
- [x] **T11** — Validação de matrizes (contagem, níveis, ortogonalidade, geradores, codificação, aleatorização) e de análises contra referências independentes.
- [x] **T12** — Documentação: `docs/metodos/fatorial-dois-niveis.md`, `fatorial-fracionario.md`, `plackett-burman.md`, `aleatorizacao.md`; fichas C11, C16, U06.

## 6. Entregas

Planejamento e análise de triagem completos, exemplo PB e inventário Protimiza atualizado.

## 7. Critérios de conclusão

1. [x] Matrizes e propriedades (contagem, níveis, ortogonalidade quando esperada, geradores, codificação e aleatorização reprodutível) verificadas independentemente. *Evidência:* `tests/design_validation.rs` contra enumeração em Python, força bruta em GF(2), Hadamard com NumPy e PCG32 reimplementado ([métodos](../../metodos/fatorial-dois-niveis.md#10-validação)); paridade `design.parity.test.ts`.
2. [x] Fluxo PB funciona sem apresentar testes não estimáveis como válidos. *Evidência:* caso de validação 004 (saturado: EP, t e p indefinidos; Lenth rotulado como indicativo), caso 003 (PB 12), `design-flow.spec.ts` (inclui exemplo 02), fatos `design.saturated`/`design.lenth_only`.
3. [ ] Mesma semente produz a mesma ordem no Windows e no navegador. *Evidência obtida:* navegador (WebAssembly) = Linux nativo = referência Python (parity e `native-checks.mjs`, que agora inclui `designGenerate`). **No Windows 11: pendente** (aritmética inteira, sem dependência de plataforma; aguarda execução do job `desktop-windows`).
4. [x] Inventário Protimiza e decisão sobre o rótulo CCD registrados antes da ET07. *Evidência:* [catálogo funcional](../../produto/catalogo-funcional.md#inventário-protimiza-et06), [DT-0011, item 9](../../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md). **Limite:** sem acesso ao serviço; itens incertos e pergunta não bloqueante ao usuário permanecem.

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
| 2026-11-01 | Etapa ativada. [DT-0011](../../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) registrada junto às primeiras evidências. |
| 2026-11-01 | **Núcleo (C11):** especificação, codificação, fatorial em ordem de Yates, fracionários (geradores digitados, relação definidora, resolução e confundimento por GF(2); catálogo k = 3…8), Plackett–Burman por Paley e Sylvester (8 tamanhos), PCG32 + Fisher–Yates, réplicas e pontos centrais, recomendação, contagem prévia. |
| 2026-11-01 | **Análise:** efeitos × coeficientes, curvatura por coluna indicadora, falta de ajuste e erro puro, Lenth (PSE/ME/SME), Pareto com três bases, efeitos principais e interações, observado × predito, fatos de triagem. Termos aliasados ficam não estimáveis. |
| 2026-11-01 | **Validação:** `design_validation.rs` com permutações iguais às de uma reimplementação independente do PCG32, matrizes por enumeração, fracionários por força bruta, 8 PB ortogonais e 5 análises contra NumPy/SciPy. Vetor oficial do PCG32 conferido. |
| 2026-11-01 | **Interface:** caminho "Planejar experimento" (painel, contagem, recomendação, matriz real/codificada, CSV), aplicação à grade com revisão, termos e curvatura, resultados e gráficos de triagem. E2E em Chromium e Firefox; axe nos três temas (resultados e matriz); contrato e projeto `.enzitag` ampliados (esquema permanece 1). |
| 2026-11-01 | **Exemplo 02** (PB 12 + 4 centrais, seis componentes de meio de cultivo): efeitos recalculados com NumPy fora do código e conferidos no E2E. A recomendação passou a oferecer **dois** tamanhos de PB. |
| 2026-11-01 | **Nativo:** `native-checks.mjs` ampliado (planejamento aleatorizado e análise 2³) e executado sob Xvfb no Linux: aprovado. |
| 2026-11-01 | **Documentação:** especificações de quatro métodos, DT-0011, fichas C11 e U06, catálogo (inventário Protimiza), matriz, mapa de módulos, formato `.enzitag`, validação e exemplos. |

**Retomada.** Ramo `claude/epic-keller-3ad7jc`; T01–T12 concluídas; pendente apenas o critério 3 (Windows). Próxima etapa em código: ET07.

## 12. Desvios e descobertas

- **Defeitos encontrados na interface pelo E2E:** `applyDesign` não era encaminhada pelo reducer do espaço de trabalho, e contadores de revisão eram sobrescritos, gerando identificadores duplicados; corrigido, com teste de unidade.
- **Recomendação de PB:** a primeira versão oferecia um só tamanho; passou a oferecer os dois menores.
- **Arquivos não criados:** `replication.rs` (cabe em `generate.rs`), `interactions.rs`, `pareto.rs` e `observed_predicted.rs` (cabem em `visualization/effects.rs` e `designs/analysis.rs`), `DesignSelector.tsx` e `DesignOptions.tsx` (cabem em `DesignPanel.tsx`). Mapa de módulos atualizado.
- **Inventário Protimiza parcial:** sem acesso ao serviço, às capturas originais e a `referencias/` neste ambiente; a decisão sobre o rótulo CCD não depende dele (composto central com `α` informado).
- **DIC com fator categórico:** a geração aleatorizada de um DIC não estava no escopo da ET06 (apenas dois níveis); a análise do DIC já existe (ET05). Pendente para decisão de etapa (registrado na matriz).
- **Teste de curvatura:** implementado por coluna indicadora em vez de um teste separado; equivale ao clássico em modelos saturados (verificado).
