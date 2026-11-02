# ET13 — Planilha de coleta: matriz com respostas e importação das respostas

| Campo | Valor |
|---|---|
| Estado | **Concluído** (2026-11-02) |
| Versão-alvo | v0.3.0 (pode sair antes como v0.2.1, por decisão do usuário; [plano da v0.3 §6](../plano-v0.3.md#6-critérios-de-lançamento-da-v030)) |
| Fases do roteiro | F02 (importação), F05–F06 (planejamentos), F10 (exportação) |
| Marco | Prepara a v0.3 |
| Depende de | v0.2.0 (DIC, DBC, planejamentos de dois níveis e superfícies) |
| Módulos | U05 (importação), U06 (planejamento e matriz), U04 (grade), U16 (exportação), U11 (estado), P01 (projeto), C11–C12 (identificação dos ensaios) |
| Ativado em | 2026-11-02 |
| Concluído em | 2026-11-02 |

Origem: pergunta do usuário em 2026-11-02: «Para importar os valores de resposta, como o usuário deve saber do modelo de dados que deve ser importado? Seria bom ter, no modelo de dados do planejamento, já a coluna de resultados a completar, assim o usuário pode usar o mesmo arquivo que usou para exportar a matriz para importar os valores de respostas.»

## 1. Objetivo

O arquivo da matriz de ensaios exportado pelo aplicativo (CSV ou XLSX) passa a ser **a planilha de coleta**: traz uma coluna vazia por resposta, é preenchida no laboratório e é importada de volta. A importação reconhece o arquivo, cruza cada linha com o ensaio planejado, confere os níveis, **preenche só as respostas** e mantém a ligação com o planejamento (codificação, tipo de ponto, blocos).

## 2. Situação atual (v0.2.0)

| Aspecto | Hoje | Depois da ET13 |
|---|---|---|
| Matriz exportada | Ordem, ordem padrão, tipo de ponto, repetição, níveis reais e codificados; **sem respostas** (`features/design/matrixCsv.ts`); DIC e DBC com `unit_id` | Mesmas colunas + **uma coluna por resposta** (nome e unidade no cabeçalho), vazia ou com os valores já digitados |
| Importação | **Substitui todos os dados**; recria fatores e respostas com identificadores novos; o planejamento só sobrevive se os identificadores coincidirem por acaso (`state/project.ts`, `withData`) | Modo **«Preencher respostas do planejamento»**: só as respostas mudam; fatores, ensaios e planejamento ficam |
| Linhas `# chave: valor` do CSV exportado | Entram como dados na prévia | Reconhecidas como metadados e ignoradas (vale para qualquer CSV exportado pelo aplicativo) |
| Colunas `run`, `standard_order`, codificadas | O usuário marca «ignorar» à mão | Reconhecidas automaticamente |
| Orientação | Nenhuma indicação do formato esperado | Botão «Baixar planilha de coleta» na matriz e explicação curta na importação |

## 3. Escopo

**Inclui**

- Colunas de resposta na matriz exportada (CSV e XLSX) dos planejamentos de dois níveis, superfícies, DIC e DBC.
- Identificador estável de cada ensaio na planilha (coluna `run_id`, além de `run`), gravado no projeto junto às linhas geradas.
- Modo de importação que preenche respostas por correspondência de ensaio, com conferência dos níveis e relatório de diferenças.
- Leitura das linhas de metadados `#` em CSV (ignoradas na prévia; usadas para reconhecer o arquivo).
- XLSX: planilha de coleta com a aba de dados e uma aba de metadados; células de resposta sem fórmula.
- Preenchimento parcial (células vazias = valor ausente), reimportação repetida (atualiza) e desfazer pelo histórico de revisões.
- Guia de importação com o formato da planilha e exemplo em `examples/`.

**Não inclui**

- Importar uma matriz **sem** planejamento no projeto como se fosse planejamento (continua o caminho do planejamento personalizado, ET07).
- Leitura de arquivos editados em outros programas que reordenem e renomeiem colunas sem o cabeçalho original (a importação geral continua disponível).
- Sincronização com o Drive (ET19).

## 4. Requisitos detalhados

1. **Cabeçalho.** As colunas de resposta seguem os fatores com o nome da resposta e a unidade entre parênteses (`Atividade (U/mL)`); o mapeamento usa o identificador da resposta gravado nos metadados, não só o nome.
2. **Identificação dos ensaios.** `run_id` estável (gerado com o planejamento, independente da ordem de execução); planejamentos antigos sem `run_id` usam a ordem padrão mais o tipo de ponto e a repetição, e o caso é testado.
3. **Reconhecimento.** Ao abrir um arquivo cujos metadados indicam a mesma matriz (projeto, experimento, método do planejamento e semente), a importação oferece o modo «Preencher respostas do planejamento» como padrão. Arquivos sem metadados podem usar o modo se as colunas `run_id` ou `run` e os fatores existirem.
4. **Conferência.** Para cada linha: ensaio encontrado; níveis reais iguais aos planejados (tolerância relativa registrada, porque planilhas arredondam); valor numérico válido em cada resposta. A tela mostra contagens (preenchidos, vazios, divergentes, ensaios sem linha, linhas sem ensaio) e a lista das divergências. **Nada é gravado com divergência de nível sem confirmação explícita.**
5. **Gravação.** Uma revisão «import-responses» no histórico; valores existentes substituídos só com aviso («12 valores já preenchidos serão substituídos»). Análises guardadas ficam marcadas como desatualizadas, como em qualquer edição.
6. **Números.** Vírgula ou ponto decimal (o mesmo detector da importação atual), texto não numérico recusado por célula com mensagem localizada, sem `NaN`.
7. **Acessibilidade e idiomas.** PT/EN, seis temas, teclado, axe e 375 px no assistente.

## 5. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Identificador do ensaio | Como identificar cada ensaio de forma estável? | `run_id` gravado nas linhas; ordem padrão + tipo de ponto + repetição; `unit_id` do DIC/DBC | Estabilidade ao reordenar, projetos antigos, legibilidade na planilha |
| Onde fazer a correspondência | Interface ou motor? | `optima-project` (função de correspondência testada em Rust); TypeScript | Regra «cálculo científico só no core» (correspondência não é cálculo científico, mas a conferência numérica de níveis é); paridade |
| Tolerância de nível | Que diferença entre o nível planejado e o da planilha é aceitável? | Relativa 1e-9; arredondamento ao número de casas exportadas | Planilhas que arredondam; evitar falsos alarmes |

## 6. Tarefas

- [x] **T01** — DT do identificador do ensaio, da correspondência e da tolerância (§5): [DT-0022](../../decisoes-tecnicas/dt-0022-planilha-de-coleta-e-correspondencia-de-ensaios.md). Decisão: sem `run_id` novo; unidade experimental quando houver, senão combinação de níveis (réplicas na ordem de aparição), tolerância relativa 1e-9.
- [x] **T02** — *Substituída pela DT-0022:* nenhum campo novo no projeto (esquema 1 intacto); a correspondência usa `unitId` e os níveis que já existem, e funciona em projetos da v0.1 e da v0.2.
- [x] **T03** — Exportação: colunas de resposta (nome e unidade, com os valores já digitados) em `matrixCsv.ts`/`RunMatrix`, `CrdMatrix` e matriz do DBC (que ganhou `unit_id`); o XLSX usa as mesmas colunas pelo mesmo caminho. *Adiado:* aba de metadados no XLSX (não é necessária para a importação).
- [x] **T04** — Importação de CSV: `splitMetadata` em `services/import/csv.ts`, usada na leitura e na detecção do separador; teste de ida e volta com `toCsv`.
- [x] **T05** — Correspondência e conferência: `features/import/fillResponses.ts` com `fillResponses.test.ts` (linhas reordenadas, réplicas, faltantes, extras, níveis divergentes, vírgula decimal, células vazias, valores já digitados, unidade experimental).
- [x] **T06** — Interface: modo «Preencher respostas do planejamento» no `ImportWizard` (padrão quando o arquivo é uma planilha de coleta), resumo, avisos, ação `applyResponses` e revisões `edit` + `import`; `ImportWizard.fill.test.tsx`.
- [x] **T07** — Orientação: nota «Planilha de coleta» ao lado da matriz dos três planejadores e texto no assistente; PT/EN. O botão de exportação manteve o nome atual («Baixar matriz (CSV)»), já usado nos testes e nos guias.
- [x] **T08** — E2E `collection-flow.spec.ts` (dois níveis com pontos centrais, DIC por unidade, **XLSX exportado reconhecido** pelo leitor do motor, recusa de arquivo errado) em Chromium, Firefox, Chrome e Edge. Suíte completa (2026-11-02): **401 aprovados**; 3 testes do Edge (`design-flow` e dois de `export-flow`, downloads cancelados por tempo) falharam sob a carga de 4 navegadores em paralelo e **passaram ao repetir sozinhos** (17 aprovados). *Windows 10 nativo:* a lógica da importação é TypeScript compartilhada com a versão web; a leitura de XLSX pelo motor nativo e a gravação de arquivos já são verificadas pela verificação nativa (v0.1/v0.2). **Não foi feita uma verificação nativa específica do fluxo «preencher respostas»**, e isso consta do relatório.
- [x] **T09** — Documentação: [guia da planilha de coleta](../../guias/planilha-de-coleta.md) (com o formato da planilha), DT-0022, ficha U05, mapa de módulos, matriz de cobertura e CHANGELOG. *Decisão:* sem arquivo de exemplo em `examples/` (a planilha depende do planejamento gerado no projeto; o guia descreve o fluxo e o formato).

## 7. Entregas

Planilha de coleta exportada em CSV e XLSX para todos os planejamentos gerados; importação que preenche respostas com conferência; leitura correta das linhas de metadados; guia e exemplo.

## 8. Critérios de conclusão

1. Exportar a matriz, preencher as respostas e importar o **mesmo arquivo** preenche as respostas sem alterar fatores, ensaios nem o planejamento, nos quatro tipos (dois níveis, superfície, DIC, DBC). *Evidência:* E2E e teste de estado.
2. Linhas reordenadas, faltantes, extras e níveis divergentes são detectados e mostrados; nada é gravado com divergência sem confirmação. *Evidência:* testes da correspondência e E2E.
3. Qualquer CSV exportado pelo aplicativo é reimportado sem que as linhas `#` apareçam como dados. *Evidência:* teste de ida e volta.
4. Projetos da v0.1 e da v0.2 abrem sem migração; os sem `run_id` também funcionam. *Evidência:* teste de abertura dos exemplos.
5. PT/EN, temas, teclado, axe e 375 px. *Evidência:* E2E e axe.

## 9. Verificação

Testes Rust e vitest; E2E em Chromium, Firefox, Chrome e Edge; verificação nativa no Windows 10 (CSV e XLSX); inspeção do arquivo XLSX no Excel e no LibreOffice.

## 10. Documentação a criar ou atualizar

DT nova; guia de importação (novo, ou seção no guia de exportação); fichas U05 e U06; [mapa de módulos](../../arquitetura/mapa-modulos.md); [matriz de cobertura](../../produto/matriz-cobertura.md); README do exemplo; CHANGELOG.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Excel ou LibreOffice alterarem o arquivo (separador, decimal, datas, arredondamento) | Detecção de separador e decimal já existente; tolerância de nível; XLSX como formato recomendado no guia |
| Usuário editar fatores na planilha | Conferência de níveis com confirmação explícita |
| Substituir respostas já digitadas | Aviso com contagem e revisão no histórico (desfazer) |
| Projetos antigos sem identificador de ensaio | Regra alternativa testada (ordem padrão + tipo + repetição) |

## 12. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado a pedido do usuário (planilha de coleta). Etapa não iniciada. |
| 2026-11-02 | **Concluída**: T08 (XLSX e quatro navegadores) e T09 fechadas; PR [#6](https://github.com/VitorMazziero/enzitag-optima/pull/6). |
| 2026-11-02 | **Ativada** («Sim, fundir e iniciar o plano v 0.3»). T01–T07 implementadas (branch `feat/v0.3`): DT-0022, colunas de resposta nas matrizes, `splitMetadata`, correspondência, modo de importação e nota de orientação; 333 testes de unidade e E2E nos quatro navegadores aprovados (ver T08). Restam o XLSX no E2E, a verificação nativa, a matriz de cobertura e o exemplo. |

## 13. Desvios e descobertas

- Descoberto ao planejar (2026-11-02): o importador de CSV não ignora as linhas `# chave: valor` que o próprio aplicativo grava nas tabelas exportadas; corrigido na T04.
- Teste do XLSX: o arquivo baixado pelo Playwright não tem extensão, e o assistente escolhe o leitor pelo nome; o teste copia o arquivo para um nome `.xlsx` (não é defeito do aplicativo).
- Sem `run_id` (DT-0022): a tarefa T02 foi substituída; nenhum campo novo no projeto.
- Aba de metadados no XLSX: não foi necessária; o XLSX já traz a planilha «Proveniência» do motor.
