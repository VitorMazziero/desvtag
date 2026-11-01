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

- [x] **T01** — `app/{App,AppShell,Router}.tsx` e tela inicial (`features/home`) com as três entradas; Abrir projeto aparece desabilitado até a ET03.
- [x] **T02** — `features/workflow`: cinco etapas (Objetivo → Fatores e respostas → Planejamento/dados → Análise → Resultados), regras de acesso (`guards.ts`) e indicação de etapas satisfeitas.
- [x] **T03** — Tipos C01 de fator, resposta, observação e conjunto de dados; validação C02 com códigos (coluna vazia, valor não numérico, n insuficiente).
- [x] **T04** — `features/experiment`: editores de fatores e respostas; `features/data`: grade, edição, papéis de coluna básicos e erros por célula.
- [x] **T05** — C03 `numeric/summation.rs` e C05 `descriptive/{summary,grouped}.rs` com estado indefinido explícito.
- [x] **T06** — Operação `descriptive.summarize` no engine; despacho nos dois adaptadores; descarte de respostas de tarefas antigas.
- [x] **T07** — C18 inicial: fatos interpretáveis por chave (por exemplo, amostra insuficiente, ausentes excluídos) com parâmetros; textos em U17.
- [x] **T08** — `features/results`: tabela descritiva e explicação curta.
- [x] **T09** — Temas aplicados a botões, campos, tabelas, navegação e estados; contraste verificado; laranja EnziTAG fora de texto normal.
- [x] **T10** — Idiomas em toda a interface; troca de idioma e tema preserva dados; formatação de números e datas por idioma.
- [x] **T11** *(mensagens feitas; `logging/local.ts` não criado por falta de uso, ver seção 12)* — U19: códigos de erro → mensagens PT/EN; registro local sem dados experimentais.
- [x] **T12** — Caso de validação `validation/cases/descriptive_summary/` com referência Python e conjuntos de precisão numérica do NIST StRD (estatística univariada).
- [x] **T13** — Teste de paridade nativo × WASM com os mesmos dados.
- [ ] **T14** *(navegador concluído; Windows pendente, ver seção 11)* — E2E no navegador (cadastro → dados → resultado em PT e EN) e verificação do aplicativo Windows conforme DT.
- [x] **T15** *(automatizada; leitor de tela manual pendente)* — Acessibilidade: navegação por teclado no fluxo, foco visível, rótulos de campos e verificação automatizada de contraste.
- [x] **T16** — Documentação: [`docs/metodos/estatistica-descritiva.md`](../../metodos/README.md), fichas C05, U01–U04, U17–U19; matriz de cobertura.

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

### Estado atual (retomada)

| Item | Valor |
|---|---|
| Branch | `claude/epic-keller-3ad7jc` (PR [#1](https://github.com/VitorMazziero/enzitag-optima/pull/1) para `main`, rascunho) |
| Etapa e tarefa | ET02: T01–T13 e T15–T16 concluídas; **T14 aberta** só pela verificação no Windows |
| Código entregue | Rust: dados, validação, soma compensada, descritiva, fatos, operação `descriptiveSummarize`. Web: início, fluxo de cinco etapas, editores, grade, análise, resultados e interpretação em PT/EN nos três temas |
| Pendente para concluir | Evidência no **Windows** (critério 1 e T14), a mesma pendência da [ET01](et01-fundacao-tecnica.md): job `desktop-windows` da CI e/ou máquina Windows 11. Verificação manual com leitor de tela |
| Próxima ação | Resolver a verificação nativa no Windows; depois mover ET01 e ET02 para `concluidos/` e ativar a ET03 |
| Windows (CI) | na [execução 41334658975](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41334658975) (disparo manual, commit `492db19`) o job `desktop-windows` passou em `windows-latest` — Microsoft Windows Server 2025 Datacenter, build 26100, 64 bits: build NSIS e verificação nativa por WebView2/CDP com `native-checks.mjs` (`engine.info`, descritiva, `.enzitag` e adulteração, XLSX, regressão NIST, quantil t, comparação de tratamentos, planejamento e análise). **Não é Windows 11 de usuário**, sem diálogos nativos e sem clone limpo pelo guia: a evidência literal em Windows 11 segue pendente e a etapa continua aberta. |

### Evidências (2026-11-01)

Ambiente: Linux (Ubuntu 24.04), Rust 1.97.0, Node 22.23.4, Python 3.13.18 (numpy 2.5.4, scipy 1.18.1, mpmath 1.4.1), Chromium 1248 e Firefox 157.0 (Playwright 1.64.1), WebKitGTK 2.52.6.

| Verificação | Comando | Resultado |
|---|---|---|
| Rust: formato, lint, testes | `cargo fmt --check`; `cargo clippy --workspace --all-targets -- -D warnings`; `cargo test --workspace` | sem diferenças; sem avisos; 69 testes passam (inclui 2 de validação NIST nativos) |
| Validação nativa | `cargo test -p optima-core --test descriptive_validation` | 9 de 9 conjuntos NIST dentro de erro relativo 1e-12 do exato; o caso `NumAcc4` derrota a fórmula ingênua (erro > 1e-3) |
| Validação WebAssembly | `npm test` (`descriptive.parity.test.ts`) | 9 de 9 conjuntos, mesmas tolerâncias, mais estado indefinido preservado na fronteira WASM |
| Testes web | `npm test` | 83 testes (cliente, i18n com plural, componentes, contraste, guardas do fluxo, colagem, montagem do conjunto de dados, interpretação) |
| E2E (motor WASM real) | `E2E_BROWSERS=chromium,firefox npm run test:e2e` | 28 de 28: fluxo completo em PT e EN, colagem do Excel, erro de célula, troca de idioma e tema preservando o resultado, resultado obsoleto bloqueado, teclado, três temas, axe sem violações em cada etapa e tema |
| Acessibilidade | `tests/e2e/accessibility.spec.ts` | axe WCAG 2.0/2.1 A e AA sem violações; controle negativo detecta `image-alt`, `label`, `button-name` |
| Nativo (Tauri, Linux) | `xvfb-run -a node tests/native-smoke.mjs …` | `engine.info` e a descritiva (média 5, variância 32/7) calculadas pelo motor nativo via IPC |
| Inspeção visual | capturas das etapas nos três temas | conferidas; tabela, interpretação, erro de célula e passos legíveis |
| Sem estatística no TypeScript | `grep` por `Math.sqrt/pow/log/exp`, `reduce`, `variance` em `src` | nenhuma ocorrência fora de testes, tipos gerados e textos (só `parseNumberCell` e `formatNumber`) |

### Registro por tarefa

| Tarefa | Registro |
|---|---|
| ET02-T01, T02 | `app/App.tsx`, `features/home`, `features/workflow`. Sem `AppShell`/`Router` ([DT-0007](../../decisoes-tecnicas/dt-0007-decisoes-et02-interface.md)); caminhos "Planejar" e "Comparar" mostram "Parcial" derivado do registro de métodos |
| ET02-T03, T05, T06 | Commit `feat(et02): add descriptive statistics in Rust…`; ver [C05](../../modulos/c05-estatistica-descritiva.md) |
| ET02-T04 | `features/experiment`, `features/data` (grade própria, colagem, erros por célula) |
| ET02-T07, T08 | Fatos em `interpretation/`; `features/results` |
| ET02-T09, T10, T11 | Temas aplicados e testados; idiomas com plural; `services/errors` |
| ET02-T12 | `validation/cases/descriptive_summary/` (9 casos) e `validation/tools/` |
| ET02-T13 | Paridade: os mesmos casos de referência validam o motor nativo e o WASM; a equivalência entre as duas plataformas é por transitividade (ambas dentro de 1e-12 do exato), não por comparação direta dos bits |
| ET02-T14 | Navegador concluído. **Windows pendente**: ver [ET01](et01-fundacao-tecnica.md#11-registro-de-progresso) |
| ET02-T15 | Contraste, axe e teclado automatizados; leitor de tela **não** testado |
| ET02-T16 | Especificação do método, fichas C05, U01–U04, U17–U19, DT-0007, matriz e mapa atualizados |

## 12. Desvios e descobertas

- **Defeito de `NaN.max(0.0)`** (teste unitário): um estouro viraria variância 0; corrigido antes do truncamento e coberto por teste.
- **Plural**: a primeira versão tinha "observação(ões)". O teste de plural revelou ainda que, em pt-BR, contagens ≥ 1.000.000 caíam no inglês por faltar a categoria `many`; corrigido, e a paridade de chaves agora compara formas de plural por idioma.
- **Parâmetros dos fatos são texto**: o plural não funcionava no navegador real porque `count` chegava como `"1"`; o teste E2E mostrou a chave crua na tela; `factParams` converte e há teste de componente.
- **Servidor de preview antigo** reaproveitado pelo Playwright mascarou o resultado de uma execução; encerrado e rerodado (28 de 28 com build novo).
- **Firefox**: `ClipboardEvent` ignora `clipboardData` no construtor; o teste usa `Event` com `clipboardData` definido. A colagem com o clipboard real do sistema não foi exercitada de forma automatizada.
- **`services/logging/local.ts`** não foi criado: não há o que registrar ainda.
- **Resultado numérico da `NumAcc4`**: o desvio-padrão sobre os binários (0,100000000559) difere do certificado (0,1) por 5,6e-10, dentro do limite 5,9e-10 derivado da conversão decimal→binário; isso é propriedade dos dados, não erro do algoritmo.
