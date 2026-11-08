# ET22 — Resultados das famílias novas guardados no projeto

Estado: concluída em 2026-11-03 (T01–T10), sem publicação. Versão: v0.4.0. Dependências: ET29 e ET27.

## Objetivo

Guardar, reabrir, apresentar e exportar as análises de mistura, medidas repetidas/modelo misto, saturação e potência. Preservar as entradas históricas, mostrar desatualização e evitar recálculo automático. A [DT-0030](../../decisoes-tecnicas/dt-0030-resultados-persistidos-das-familias.md) antecede a implementação.

## Tarefas

- [x] **T01 — Contrato e decisão.** Inventariar estados locais, escolher extensão aditiva e definir referência à revisão/assinatura sem alterar o esquema 1.
- [x] **T02 — Persistência Rust e estado.** Tipos de configuração/registro, quatro campos opcionais, histórico imutável por família para preservar referências de comentários, validação de referências históricas, integração de leitura/gravação/revisões e seleção da família ativa. Testes de arquivos anteriores e ida e volta. Corrigir o instante inicial da interface: o contexto padrão ainda usa a época Unix como data de criação, detectado na conferência nativa da ET27.
- [x] **T03 — Mistura.** Configuração e resultado no estado; salvar modelo/resposta/α e entradas usadas; gráfico sempre com componentes/pontos/unidades históricos. Preservar resultado anterior em erro e marcar edição posterior.
- [x] **T04 — Medidas repetidas.** Guardar comparação pareada e modelo misto, configuração de unidade/efeitos/resposta/α; estado desatualizado e problemas de pareamento. Não implementar covariâncias avançadas antes da ET23.
- [x] **T05 — Saturação.** Persistir fator/resposta/modelo/α, pontos/solicitação e resultado; preservar faixa e rótulos históricos. Integrar futuras opções iniciais/limites sem recálculo na abertura.
- [x] **T06 — Potência.** Guardar hipóteses e objetivo em edição, solicitação validada e resultado; configuração inválida não substitui resultado válido; edição da tabela não altera a atualidade das hipóteses.
- [x] **T07 — Resultados e relatórios.** Seleção entre famílias presentes, seções Resumo/Tabelas/Diagnóstico/Gráficos/Exportar conforme o conteúdo; resultado novo abre Resumo. HTML/PDF/Word, comentários, idioma, unidades e proveniência.
- [x] **T08 — Tabelas e exemplos.** CSV/XLSX com valores completos; atualizar os exemplos 07, 08, 11 e 12 para reabrirem resultados guardados. Acrescentar percurso de duas famílias no mesmo experimento.
- [x] **T09 — Verificação por tarefa.** Navegador real após T02–T08, PT/EN, telas pequenas, casos inválidos e obsoletos, salvar/reabrir sem cálculo, resposta tardia, WASM×nativo e relatórios renderizados. Preservar as evidências da auditoria e das ET29/ET27.
- [x] **T10 — Fechamento.** Atualizar fichas, especificações, mapa, cobertura, guias, CHANGELOG, evidências com hashes e relatório honesto; mover para concluídos somente após verificações.

## Critérios de aceite

Os quatro resultados reabrem sem chamar o respectivo cálculo; ausência dos campos continua compatível; revisões históricas referenciadas são conferidas; alterações de dados e opções não mudam silenciosamente figuras ou unidades; resultado antigo é identificado; todos os formatos expõem a família calculada; verificação nativa e WASM consistente. Falha em um cálculo preserva o anterior sem apresentá-lo como novo.

Referências: [plano da v0.4](../plano-v0.4.md), [ET27](../concluidos/et27-acabamento-da-interface-e-da-exportacao.md).

## Progresso

2026-11-03: contrato aditivo em `optima-project/families.rs`, campos opcionais no experimento, referências contra a revisão histórica e verificação estrutural sem recálculo. Testes de ida e volta dos quatro campos, histórico, opções em edição, comentários e entradas não finitas em execução. T02 permanece aberta até a integração do estado e a avaliação no navegador.

2026-11-03 (integração): T02–T06 avaliadas em Chromium/Firefox/WebKit; 18/18 percursos de arquivos e famílias. Configurações inválidas preservam resultados, nomes/pontos históricos permanecem após edição, mistura/saturação/potência coexistem e pareado/misto guardam registros distintos. T07 acrescenta consulta histórica com exportação/comentários do registro consultado (3/3 motores); T08 atualiza exemplos 07/08/11/12 pelo app real. Matriz inicial 36/36 (seis temas, PT/EN, quatro larguras e 200%); regressão pertinente e renderização final em andamento. T07–T10 aguardam a reconferência dos ajustes encontrados nos PDFs e a avaliação nativa da interface mais recente.

2026-11-03 (fechamento): 448 unitários da interface, 583 Rust, contratos/TypeScript/clippy e regressão pertinente de 381/381 aprovados. Delta visual de 36 casos aprovado; correções complementares de CSV/relatórios/recuperação e espera da automação reconferidas, com aceite final 18/18 Chromium/Firefox/WebKit. Build nativo final 5m38s e percurso real de Monod + potência, recuperação conjunta e três relatórios aprovados. PDFs renderizados e inspecionados. A conferência requisito por requisito, falhas iniciais e limites estão no [relatório da ET22](../../../validation/reports/et22/README.md). As ET23–ET26/ET28 continuam pendentes; não se declara a v0.4 concluída.
