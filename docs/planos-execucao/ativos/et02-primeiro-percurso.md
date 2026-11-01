# ET02 — Primeiro percurso ponta a ponta

| Campo | Valor |
|---|---|
| Estado | **Ativo** |
| Versão-alvo | v0.1.0 |
| Fases do roteiro | F01 |
| Marco | Prepara M1 |
| Depende de | ET01 (código concluído; evidência Windows 11 pendente, ver [exceção](../README.md)) |
| Módulos | C01–C03 e C05 iniciais, C18 inicial, E01–E04, U01–U04, U08, U12, U17–U19 |
| Ativado em | 2026-11-01 |
| Concluído em | — |

## 1. Objetivo

Entregar o primeiro caminho executável completo: cadastrar fatores e respostas, digitar observações, calcular estatística descritiva no motor Rust e apresentar o resultado com explicação curta, nas duas plataformas, em PT/EN e nos três temas.

## 2. Escopo

**Inclui**

- Estrutura principal (U01), tela inicial com **Planejar experimento**, **Analisar dados existentes** e **Comparar tratamentos**, e fluxo guiado de cinco etapas com navegação contextual (U02).
- Cadastro básico de fatores (nome, tipo numérico/categórico, unidade, níveis) e respostas (nome, unidade) (U03).
- Tabela de observações com edição, colagem simples de células e erros por célula (U04).
- Estatística descritiva: contagem, ausentes, média, variância e desvio-padrão amostrais, mínimo e máximo, geral e por grupo (C05).
- Política explícita para ausentes e amostra insuficiente: resultado indefinido é um estado, não `NaN` nem zero.
- Execução no Worker (navegador) e fora da thread da interface (Windows), com ID de tarefa para descartar respostas antigas.
- Temas aplicados aos componentes comuns e logo; idiomas em toda a interface; formatação numérica por idioma separada do valor.
- Mensagens PT/EN para entrada inválida e falha de cálculo (U19).

**Não inclui**

- Projetos persistidos, projetos recentes e importação de arquivos (ET03). O estado desta etapa vive em memória, com formato alinhado aos contratos para ser substituído pelo documento da ET03.
- Modelos, testes e gráficos científicos (ET04 em diante).

## 3. Entradas e referências

- [Roteiro — F01](../roteiro-produto.md#f01--primeiro-percurso-completo-e-interface-básica).
- [Decisões aprovadas](../../produto/decisoes-aprovadas.md) §1, §2, §4, §5 e §6.
- [Temas](../../temas/README.md); contraste da paleta EnziTAG em [adaptação do Soft Light](../../temas/adaptacao-soft-light.md).
- Pendências: PD-06 (grade de dados), PD-04 (algoritmo de soma).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Grade de dados | Componente da tabela de observações | TanStack Table, AG Grid Community, Glide Data Grid | Teclado, colagem do Excel, virtualização, acessibilidade, licença compatível com MIT |
| Navegação | Rotas compatíveis com Pages e Tauri | Rotas por hash, rotas em memória ou histórico com fallback | Funcionamento em `/enzitag-optima/`, deep links, simplicidade |
| Estado da interface | Organização do estado do projeto e preferências | Contexto React com reducers; biblioteca leve de estado | Previsibilidade, testes, ausência de duplicação de resultados |
| Soma e variância | Algoritmo numérico | Duas passagens; soma compensada (Neumaier); Welford | Exatidão nos dados NIST de precisão numérica |
| Teste do aplicativo Windows | Verificação E2E do Tauri | WebDriver do Tauri; roteiro manual registrado | Viabilidade no Windows, custo de manutenção |

## 5. Tarefas

- [ ] **T01** — `app/{App,AppShell,Router}.tsx` e tela inicial (`features/home`) com as três entradas; Abrir projeto aparece desabilitado até a ET03.
- [ ] **T02** — `features/workflow`: cinco etapas (Objetivo → Fatores e respostas → Planejamento/dados → Análise → Resultados), regras de acesso (`guards.ts`) e indicação de etapas satisfeitas.
- [ ] **T03** — Tipos C01 de fator, resposta, observação e conjunto de dados; validação C02 com códigos (coluna vazia, valor não numérico, n insuficiente).
- [ ] **T04** — `features/experiment`: editores de fatores e respostas; `features/data`: grade, edição, papéis de coluna básicos e erros por célula.
- [ ] **T05** — C03 `numeric/summation.rs` e C05 `descriptive/{summary,grouped}.rs` com estado indefinido explícito.
- [ ] **T06** — Operação `descriptive.summarize` no engine; despacho nos dois adaptadores; descarte de respostas de tarefas antigas.
- [ ] **T07** — C18 inicial: fatos interpretáveis por chave (por exemplo, amostra insuficiente, ausentes excluídos) com parâmetros; textos em U17.
- [ ] **T08** — `features/results`: tabela descritiva e explicação curta.
- [ ] **T09** — Temas aplicados a botões, campos, tabelas, navegação e estados; contraste verificado; laranja EnziTAG fora de texto normal.
- [ ] **T10** — Idiomas em toda a interface; troca de idioma e tema preserva dados; formatação de números e datas por idioma.
- [ ] **T11** — U19: códigos de erro → mensagens PT/EN; registro local sem dados experimentais.
- [ ] **T12** — Caso de validação `validation/cases/descriptive_summary/` com referência Python e conjuntos de precisão numérica do NIST StRD (estatística univariada).
- [ ] **T13** — Teste de paridade nativo × WASM com os mesmos dados.
- [ ] **T14** — E2E no navegador (cadastro → dados → resultado em PT e EN) e verificação do aplicativo Windows conforme DT.
- [ ] **T15** — Acessibilidade: navegação por teclado no fluxo, foco visível, rótulos de campos e verificação automatizada de contraste.
- [ ] **T16** — Documentação: [`docs/metodos/estatistica-descritiva.md`](../../metodos/README.md), fichas C05, U01–U04, U17–U19; matriz de cobertura.

## 6. Entregas

Primeiro percurso executável nas duas plataformas, com arquivos de cada camada documentados e o primeiro método validado (estatística descritiva).

## 7. Critérios de conclusão

1. Mesmos dados produzem resultados equivalentes no navegador e no Windows, compatíveis com a referência independente dentro das tolerâncias registradas.
2. Ausentes e amostra insuficiente produzem estado e mensagem explícitos, nunca número substituto.
3. Navegação por teclado, troca de tema e troca de idioma verificadas sem perda de dados.
4. Toda string visível existe em PT e EN; teste de chaves ausentes passa.
5. Nenhum cálculo estatístico em TypeScript.

## 8. Verificação

Testes Rust de C05 e C02; caso de validação descritiva; paridade nativo × WASM; testes web de componentes; E2E do percurso; verificação Windows registrada.

## 9. Documentação a criar ou atualizar

DTs da seção 4; fichas de módulo; especificação do método descritivo; [matriz de cobertura](../../produto/matriz-cobertura.md); guia de ambiente, se comandos mudarem.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Grade de dados sem colagem robusta | Testar colagem do Excel com vírgula decimal antes da DT |
| Retrabalho do estado em memória na ET03 | Formato do estado espelha os contratos C01 desde já |
| Estados de tarefa inconsistentes | ID de tarefa e revisão em toda resposta; teste de resposta atrasada |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| — | Etapa não iniciada. |

## 12. Desvios e descobertas

Nenhum até o momento.
