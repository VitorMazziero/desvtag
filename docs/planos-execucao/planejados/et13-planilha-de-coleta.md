# ET13 — Planilha de coleta: matriz com respostas e importação das respostas

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 (pode sair antes como v0.2.1, por decisão do usuário; [plano da v0.3 §6](../plano-v0.3.md#6-critérios-de-lançamento-da-v030)) |
| Fases do roteiro | F02 (importação), F05–F06 (planejamentos), F10 (exportação) |
| Marco | Prepara a v0.3 |
| Depende de | v0.2.0 (DIC, DBC, planejamentos de dois níveis e superfícies) |
| Módulos | U05 (importação), U06 (planejamento e matriz), U04 (grade), U16 (exportação), U11 (estado), P01 (projeto), C11–C12 (identificação dos ensaios) |
| Ativado em | — |
| Concluído em | — |

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

- [ ] **T01** — DT do identificador do ensaio, da correspondência e da tolerância (§5).
- [ ] **T02** — Projeto: `run_id` opcional nas linhas geradas por planejamento (esquema 1, campo aditivo) e regra para projetos sem o campo; testes de abertura dos exemplos.
- [ ] **T03** — Exportação: colunas de resposta e `run_id` em `matrixCsv.ts`, `CrdMatrix` e matriz do DBC; metadados com identificadores do experimento, das respostas e do planejamento; XLSX com aba de metadados.
- [ ] **T04** — Importação de CSV: reconhecer e separar as linhas `# chave: valor` (`services/import/csv.ts`), com teste de ida e volta de todas as tabelas exportadas.
- [ ] **T05** — Correspondência e conferência (módulo e testes, inclusive linhas reordenadas, faltantes, extras, níveis divergentes, vírgula decimal e células vazias).
- [ ] **T06** — Interface: modo «Preencher respostas do planejamento» no `ImportWizard`, resumo da conferência, confirmação e revisão no histórico.
- [ ] **T07** — Botão «Baixar planilha de coleta» na matriz e texto de orientação na importação; PT/EN.
- [ ] **T08** — E2E: gerar planejamento → exportar CSV e XLSX → preencher fora do aplicativo (script) → importar → analisar, nos quatro navegadores; verificação nativa no Windows 10.
- [ ] **T09** — Exemplo e documentação: guia de importação (formato da planilha), fichas U05 e U06, matriz de cobertura, CHANGELOG.

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

## 13. Desvios e descobertas

- Descoberto ao planejar (2026-11-02): o importador de CSV não ignora as linhas `# chave: valor` que o próprio aplicativo grava nas tabelas exportadas; corrigido na T04.
