# U10 — Otimização e confirmação (com E02 cancelamento inicial)

**Estado:** implementado · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| Pasta | `app/web/src/features/optimization/`; `services/engine/{EngineClient,wasmClient}.ts` |
| Arquivos de entrada | `features/optimization/index.ts` (`OptimizationPanel`, `ConfirmationCheck`) |
| Etapa de criação | ET08 |
| Depende de | U12 (cliente do motor), U11 (estado), U07 (`buildRequest`), U09 (`ChartFigure`, `contourChart`) |
| Módulos do núcleo | [C17](c17-otimizacao-por-desejabilidade.md) |

## 1. Responsabilidade

Coletar objetivos (maximizar, minimizar, alvo, faixa), importâncias, limites obrigatórios, domínio (região experimental ou extensão explícita) e opções da busca; executar e **cancelar** a busca; mostrar candidatos (condições reais e codificadas, previsões com intervalo de predição, `d`, perdas, observações), compromissos, o gráfico de desejabilidade e a proposta de confirmação; conferir o observado com as previsões gravadas. **Nenhum cálculo estatístico**.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `OptimizationPanel.tsx` | Painel (nos resultados da superfície): configuração, execução, cancelamento, resultados |
| `GoalsEditor.tsx` | Objetivos, importâncias e limites por resposta |
| `CandidateTable.tsx` | Candidatos, previsões, intervalos e observações |
| `DesirabilityView.tsx` | Eixos e gráfico de desejabilidade (malha do motor) |
| `ConfirmationPanel.tsx` | Escolha de candidatos e repetições; cria o experimento vinculado |
| `ConfirmationCheck.tsx` | Observado × intervalo de predição gravado (etapa de dados do experimento de confirmação) |
| `optimizationSetup.ts`, `NumberField.tsx` | Padrões sugeridos pelo intervalo observado, pedido, assinatura, linhas de confirmação; campo numérico |

## 3. Comportamento

Padrão: a resposta analisada, maximizar, região experimental, 40 inícios, semente 20261101. Resultado marcado como desatualizado quando dados ou configuração mudam. *Cancelar a busca* encerra o Worker e recria-o (navegador) ou descarta o resultado (Windows) e mantém o resultado anterior. O experimento de confirmação abre na etapa de dados, com a tabela de conferência. Textos em português e inglês; três temas; teclado.

## 4. Erros e limitações

Mensagens `optimization.*` localizadas. Sem progresso incremental; modelo completo por resposta; sem comparação lado a lado de otimizações.

## 5. Manutenção

Novo campo da configuração: tipo gerado do Rust, `GoalsEditor`/painel e textos PT/EN. Testes: `npm test`, `npm run test:e2e` (`optimization-flow.spec.ts`), axe nos três temas.

## 6. Testes

Unitários de padrões, linhas e plano de confirmação e das ações de estado; testes do cliente (cancelamento); E2E com o exemplo 04 (candidato, previsões, limite inviável, domínio estendido, objetivo inválido, cancelamento de 5000 inícios, confirmação e reabertura).
