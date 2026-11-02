# Edição simultânea: especificação

| Campo | Valor |
|---|---|
| Estado | **Especificação para revisão do usuário** — nada disto está implementado |
| Origem | [ET20](../planos-execucao/concluidos/et20-docx-comentarios-e-distribuicao.md) (T07); PD-14 |
| Depende de | [formato `.enzitag`](formato-enzitag.md), [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md) (Drive), [DT-0026](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md) (comentários) |
| Decisão pedida | §9: qual caminho seguir e se haverá infraestrutura de transporte |

## 1. Problema e premissas

Hoje o projeto é **um arquivo** (`.enzitag`) editado por **uma pessoa por vez**; o Google Drive é só um lugar para guardar o arquivo (DT-0025) e, quando duas pessoas gravam, o segundo salvamento **não sobrescreve** e vira cópia. Edição simultânea é permitir que duas ou mais pessoas editem o **mesmo experimento ao mesmo tempo**, vendo as alterações umas das outras, sem perder trabalho.

Premissas que a especificação respeita:

1. **Local primeiro.** O aplicativo continua funcionando sem rede e sem conta; colaboração é opcional.
2. **O arquivo `.enzitag` continua sendo a fonte da verdade** e o único formato de troca; nada de banco de dados do aplicativo.
3. **Resultados científicos não se mesclam.** Análises e resultados são **derivados** dos dados e das opções; depois de uma mesclagem eles são **recalculados** pelo motor (nunca fundidos número a número).
4. **Revisões são imutáveis** e identificadas pelo resumo (`contentHash`); o histórico só cresce.
5. **Privacidade.** Dados experimentais podem ser sigilosos: nenhum servidor do projeto armazena conteúdo em claro (§7).

Fora de escopo desta especificação: cálculo, permissões de organização, controle de acesso por papel (editor/leitor além do que o Drive já oferece) e edição em tempo real do **texto das notas** com cursores de vários usuários (as notas seguem a política «última gravação vence» da §4, com aviso).

## 2. O que é replicado

| Parte do experimento | Natureza | Política de mesclagem |
|---|---|---|
| Fatores, respostas (lista ordenada, `id` estável) | Estrutura | Conjunto com **lápides**: adicionar é sempre mantido; remover vence edição concorrente do mesmo item (com opção de restaurar); ordem por posição fracionária |
| Linhas de dados (`id` estável) | Estrutura | Igual: conjunto com lápides; ordem fracionária |
| Célula (linha × coluna) | **Registrador** | Última escrita vence, por relógio lógico de Lamport + identificador do dispositivo para desempate; **conflito visível** (§4) |
| Nome do experimento, unidade, observações (`notes`) | Registrador | Última escrita vence, com aviso na tela de quem perdeu |
| Planejamento gerado (`design`, `crd`, `rcbd`, `mixed`, `mixture`) | Registrador **bloqueante** | Só **uma pessoa por vez** pode (re)gerar; gerar apaga/recria linhas e muda a matriz, então exige o «bastão» da §5 |
| Seleção de análise, modelos por resposta | Registrador por campo | Última escrita vence |
| Estilos de figura (`figureStyles`) | Mapa de registradores | Última escrita vence por chave de figura |
| Comentários e respostas | **Conjunto só de acréscimo** | União; «resolvido» é registrador (último vence); exclusão = lápide |
| Revisões | **Grafo acíclico** | União por `id`/`contentHash`; ver §3 |
| Análises guardadas | Derivadas | Mantêm-se as que apontam para revisões existentes; resultados **recalculados** ao abrir quando a revisão ou a versão do método mudou |

A **lista de ações do reducer** (`projectReducer`/`workspaceReducer`) já é, na prática, o catálogo de operações: `setCell`, `addRow`, `removeRow`, `addFactor`, `updateFactor`, `removeFactor`, `addResponse`…, `addComment`, `setCommentResolved`, `setFigureStyle`, `setAnalysis`, `rename`, `setNotes`. Cada uma ganharia um **envelope** (§3) sem mudar o significado.

## 3. Modelo de operações

Cada alteração local vira uma **operação** imutável:

```text
op = {
  id:        "<deviceId>:<contador>"          // único
  device:    "<deviceId>"                     // gerado no dispositivo, sem dado pessoal
  lamport:   <inteiro>                        // relógio lógico (máximo visto + 1)
  experiment:"<experimentId>"
  parents:   ["<opId>", …]                    // operações vistas (vetor causal compacto)
  kind:      "setCell" | "addRow" | "removeRow" | …
  payload:   { … }                            // os mesmos campos da ação atual
  author:    "<nome opcional>"                // o mesmo nome livre dos comentários
  at:        "<RFC 3339>"
}
```

- O **estado** de um experimento é o resultado de aplicar o conjunto de operações em qualquer ordem **consistente com a causalidade**, desempatando por `(lamport, device)`. Duas pessoas com o mesmo conjunto de operações chegam ao **mesmo estado** (convergência).
- **Revisão** = instantâneo nomeado de um estado. Hoje a revisão tem **um** pai; para mesclagens é preciso permitir **dois ou mais pais** (`parents: [..]`). Isto é uma **mudança de esquema** (`schemaVersion` 2, com migração e leitura do campo antigo `parent`): só entra com a implementação, nunca antes.
- O **resumo da revisão** (`contentHash`) continua calculado só pelo Rust sobre os dados canônicos: serve de **verificação de convergência** (dois dispositivos no mesmo estado têm o mesmo resumo).
- **Compactação:** ao criar uma revisão, as operações anteriores a ela podem ser descartadas do registro local, mantendo só o instantâneo e as operações novas.

## 4. Conflitos

| Situação | Resultado | O que a pessoa vê |
|---|---|---|
| Duas pessoas editam a **mesma célula** | Vence a de maior `(lamport, device)` | A célula mostra um marcador «alterada por X; seu valor anterior: …» até ser confirmada; o valor perdido fica na lista de conflitos |
| Uma remove uma linha, outra edita uma célula dela | A linha **fica removida** (lápide) | Aviso «a linha foi removida por X; restaurar» preservando o que foi digitado |
| Uma remove um fator, outra o usa no modelo | Remoção vence; o modelo é **revalidado** pelo motor | Aviso e, se o modelo ficar inválido, volta ao padrão com mensagem |
| Ambas geram o planejamento | O segundo pedido é **recusado** enquanto o «bastão» estiver com outra pessoa | «X está gerando o planejamento» |
| Ambas editam as observações | Última gravação vence | Aviso com o texto anterior para copiar |
| Mesma operação recebida duas vezes | Ignorada (idempotência por `id`) | — |

Regra geral: **nunca descartar silenciosamente** um valor digitado por alguém; o que perde fica recuperável pela lista de conflitos e pelo histórico de revisões.

## 5. Presença e bastão

- **Presença** (quem está no experimento, em qual célula/etapa) é **efêmera**: não é gravada no arquivo nem no registro de operações; some ao desconectar. Mostra nome livre e cor.
- **Bastão do planejamento:** ação de (re)gerar o planejamento adquire um bloqueio por tempo (renovado enquanto a pessoa estiver conectada, expirando em 2 min sem sinal). Sem rede, não há bloqueio: o conflito é resolvido na reconexão pela regra da §4 (o segundo planejamento vira **cópia** de experimento, nunca sobrescreve).

## 6. Transporte (três caminhos possíveis)

| Caminho | Como funciona | Vantagens | Limites |
|---|---|---|---|
| **A. Mesclagem de três vias no arquivo** (sem tempo real) | Ao salvar no Drive e detectar que o arquivo mudou (DT-0025), em vez de gerar cópia, o aplicativo lê a versão remota, mescla **por entidade** (§2) com a versão-base e grava o resultado | Nenhum servidor novo; reaproveita o Drive e o formato; menor risco | Não é tempo real; conflitos aparecem ao salvar |
| **B. Registro de operações em arquivo compartilhado** | As operações vão para um segundo arquivo no Drive (`.enzitag-log`), lido por consulta periódica (por exemplo a cada 10 s) | Quase tempo real, sem servidor próprio | Limite de requisições do Drive; latência; precisa de formato novo |
| **C. Canal em tempo real ponto a ponto ou por retransmissor** | Operações trocadas por WebRTC, com um retransmissor mínimo só para a conexão (sinalização) | Tempo real de fato; conteúdo criptografado de ponta a ponta | Exige infraestrutura de sinalização e decisão de custo/hospedagem; NAT |

**Recomendação:** implementar **A primeiro** (entrega valor com o que já existe e testa o modelo de mesclagem das §2–§4), depois **B** se houver demanda de quase tempo real, deixando **C** como evolução condicionada à decisão sobre infraestrutura (§9). O modelo de operações da §3 serve aos três; só o transporte muda.

## 7. Segurança e privacidade

- **Sem conteúdo em claro em servidor do projeto.** No caminho C o retransmissor só vê blocos cifrados (chave derivada do convite, no fragmento `#` do endereço, que o navegador não envia ao servidor).
- **Autorização:** quem pode editar é quem tem acesso ao arquivo no Drive (caminhos A e B) ou ao convite (C). O aplicativo não cria contas nem papéis próprios.
- **Identidade:** apenas o **nome livre opcional** já usado nos comentários; nenhum identificador pessoal é enviado.
- **Integridade:** toda operação recebida é validada pelo mesmo `validate` do documento (limites de tamanho, identificadores, referências); operações inválidas são rejeitadas e registradas.
- **Escopo do Drive:** continua `drive.file` (DT-0025); nenhuma ampliação de escopo é necessária para A e B.

## 8. Verificação prevista

1. **Testes de convergência por propriedade**: gerar sequências aleatórias de operações em N dispositivos, entregá-las em ordens e com duplicatas diferentes, e exigir o **mesmo estado e o mesmo `contentHash`** em todos.
2. **Simulação determinística** de partição de rede e reconexão (semente registrada).
3. **Casos de conflito** da §4, um a um, com o resultado esperado escrito antes.
4. **Compatibilidade:** arquivos `schemaVersion` 1 abrem e são migrados; arquivos novos recusados com explicação por versões antigas (já é o comportamento do formato).
5. **Teste com duas pessoas reais** no Drive, registrado como evidência manual (não substituído por simulação).

## 9. Perguntas para o usuário (decisões que esta especificação não toma)

1. **Qual caminho** (A, A depois B, ou direto C)? A recomendação é A.
2. Haverá **infraestrutura própria** (retransmissor de sinalização) e quem arca com o custo? Sem isso o caminho C não é possível.
3. **Mudança de esquema** (revisão com vários pais, `schemaVersion` 2) é aceitável na versão que trouxer a colaboração?
4. Nas **observações**, «última gravação vence» com aviso é suficiente, ou é necessária edição colaborativa de texto?
5. Ordem de prioridade frente a outras evoluções (a especificação não entra em nenhuma versão por si).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Mesclagem altera dados sem a pessoa perceber | Conflitos sempre visíveis e recuperáveis (§4); revisão automática antes de mesclar |
| Complexidade do relógio lógico e das lápides | Começar por A (por entidade, sem relógio contínuo) e só então generalizar |
| Limites e custos da API do Drive (B) | Consulta com intervalo adaptativo; medir antes de prometer «tempo real» |
| Mudança de esquema quebrar leitores antigos | Leitores antigos recusam com mensagem clara (já previsto no formato) |
