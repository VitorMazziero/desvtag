# DT-0029 — Conferência de confirmação no motor

| Campo | Valor |
|---|---|
| Estado | Aceita para execução |
| Data | 2026-11-03 |
| Origem | ET27-T07, UX38 |
| Pendências relacionadas | — |
| Substitui / substituída por | — |

## Contexto

A confirmação guarda a previsão e seu intervalo no experimento derivado. O usuário informa depois o observado e precisa ler observado − previsto com unidade. Essa diferença é uma quantidade científica e deve continuar no Rust, conforme a arquitetura do projeto. A proposta de origem também precisa permanecer reconhecível quando o experimento original recebe edições posteriores.

## Decisão

- Acrescentar uma operação aditiva `confirmationCompare` ao protocolo 1. Ela recebe identificadores, previsão, intervalo opcional e observação opcional e devolve diferença e situação perante o intervalo. O núcleo não lê o projeto ou a interface.
- Validar valores finitos e ordem dos limites. Ausência de observado produz estatística indefinida; eventual estouro da subtração também é explícito. Não imputar zero, extrapolar ou realizar teste de hipótese.
- A interface solicita novamente a conferência quando os valores mudam e não mostra uma diferença antiga enquanto aguarda a nova. A classificação não substitui as ressalvas sobre poucos ensaios.
- A ligação da confirmação abre uma leitura da análise de origem guardada no projeto, identificada por análise/revisão/data; ir ao experimento continua sendo uma ação separada. Consultar a origem não restaura ou altera os dados atuais.
- O resultado da conferência é derivado de valores já guardados e não cria uma nova análise persistida. Não há mudança de esquema do documento ou de critério da otimização.

## Alternativas consideradas

Subtrair/classificar no TypeScript duplicaria responsabilidade científica. Restaurar automaticamente o experimento original ao abrir a origem alteraria dados sem necessidade. Ler apenas a otimização mais recente poderia mostrar uma proposta diferente da que gerou os ensaios.

## Critérios e evidências esperados

Testes de limites inclusivos, ausência de observado, intervalo indisponível, valor inválido e estouro; protocolo JSON; paridade WASM/nativo; navegador com edição de observações e consulta da origem. Os resultados executados serão registrados no relatório da ET27.
