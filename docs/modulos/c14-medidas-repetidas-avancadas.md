# C14 — Modelos de medidas repetidas

Estado: v1 entregue; v2 entregue e verificada localmente na ET23. Atualizado em 2026-11-03.

## Responsabilidade e API

`optima-core::models::mixed::fit(MixedModelRequest)` recebe dados, efeitos fixos e extensão opcional; devolve coeficientes, covariância, inferência, médias/perfis e proveniência, ou diagnósticos. Não há I/O, tema ou idioma. [`Especificação`](../metodos/modelos-mistos.md#12-extensão-v2--covariância-testes-conjuntos-emm-e-perfis).

## Arquivos

`models/mixed/mod.rs` seleciona o percurso; `types.rs` e `advanced_types.rs` definem contratos; `random_intercept.rs` conserva o estimador v1; `prepare.rs` resolve casos completos, tempo e identificabilidade; `linalg.rs` faz Cholesky; `covariance.rs` representa os blocos CS/AR1/UN; `optimizer.rs` faz BFGS/Armijo; `estimation.rs` estima REML/GLS; `inference.rs` calcula informação observada/Satterthwaite/Fai–Cornelius; `estimates.rs` aplica a inferência às funções lineares; `marginal.rs` constrói EMM/comparações; `profiles.rs` calcula os perfis. `design_matrix::term_columns` conserva a hipótese por termo.

Na interface: `MixedOptions.tsx` configura, `mixedRequest.ts` apenas converte texto/mapeia índices e rótulos; `MixedAdvancedResults.tsx`/`MixedResultTable.tsx` apresentam, `MixedProfileChart.tsx`/`repeatedProfiles.ts` desenham a geometria. Dados/revisões e resultados seguem a ET22. `family_mixed_validation.rs` confere estrutura do arquivo sem ajustar o modelo.

## Dependências, erros e verificação

Tipos C01, matriz do modelo C06, distribuições C04 e estados Stat/diagnósticos. Sem dependência de adaptadores. Erros de tempo, pares duplicados, estruturas não identificáveis, grade excessiva ou não convergência são traduzidos em PT/EN. Estados indefinidos e não aplicáveis são separados. Casos independentes, tolerâncias, logs e limites: [relatório ET23](../../validation/reports/et23/README.md). CI e critérios da versão são conferidos no fechamento da v0.4.
