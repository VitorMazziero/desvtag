# ET20 — DOCX, comentários, Safari, domínio próprio e canais de atualização

| Campo | Valor |
|---|---|
| Estado | **Concluído na v0.3** (2026-11-02) com itens movidos para a v0.4 (§13) |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F13 (canais), F14 (DOCX, comentários, Safari, domínio próprio, especificação da edição simultânea) |
| Marco | Prepara M5 e M6 |
| Depende de | ET14; ET19 para comentários em projetos compartilhados |
| Módulos | U16 (`services/export/docx.ts`), U15 (`CommentsPanel`), P01 (`annotation.rs`), E04 (`updater.rs`), U18/U12 (compatibilidade WebKit), `.github/workflows/{release,pages}.yml` |
| Ativado em | 2026-11-02 |
| Concluído em | 2026-11-02 (itens não entregues → v0.4) |

## 1. Objetivo

Exportar relatórios em **DOCX** com o mesmo conteúdo e metadados do relatório HTML/PDF; permitir **comentários** ligados a análises e gráficos, com referência à revisão; verificar o aplicativo web no **Safari**; publicar em **domínio próprio** se o usuário o registrar; separar os **canais experimental e estável** no atualizador; e entregar a **especificação** da edição simultânea.

## 2. Escopo

**Inclui**

- DOCX: relatório completo (texto, tabelas editáveis, figuras em PNG de alta resolução e, se viável, SVG), metadados e logo opcional; gerado localmente, sem rede.
- Comentários: criar, responder, resolver; ligados a análise, figura ou tabela e à revisão em que foram feitos; gravados no projeto (campo opcional); exibidos no relatório quando o usuário pedir.
- Safari: compatibilidade da versão web (WebAssembly, Worker, IndexedDB, downloads, fontes) e verificação registrada.
- Domínio próprio: configuração do Pages e caminhos, se o usuário decidir (PD-13).
- Canais: manifestos separados `experimental` e `stable` no atualizador e no release, com escolha nas preferências; a primeira publicação no canal estável continua ligada à v1.0.0.
- Especificação da edição simultânea (granularidade das operações, conflitos, presença, recuperação), **sem implementação**.

**Não inclui**

- Implementação da edição simultânea.
- Assinatura de código do instalador (PD-11 resolvida como «sem assinatura»; reabrir só por decisão do usuário).

## 3. Entradas e referências

- [Roteiro F13 e F14](../roteiro-produto.md#f14--extensões-posteriores-previstas); [DT-0014](../../decisoes-tecnicas/dt-0014-exportacao-e-relatorio.md), [DT-0017](../../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md), [DT-0020](../../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md).
- Pendências: PD-13 (Safari e domínio), PD-14 (comentários e edição simultânea).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Biblioteca DOCX | Qual gerar DOCX no navegador e no Tauri? | `docx` (MIT); geração própria de OOXML | Licença, tamanho, carga sob demanda, tabelas e imagens |
| Modelo de comentários | Como guardar e referenciar? | Lista no experimento com alvo (análise/figura/tabela) e revisão | Esquema aditivo, sobrevivência a revisões, exportação |
| Canais | Como separar experimental e estável? | Dois `latest.json` no release; endpoint por canal na configuração | Simplicidade, segurança da assinatura, reversão |
| Safari sem Mac | Como verificar sem equipamento? | WebKit do Playwright no Windows/Linux; Mac emprestado | Honestidade da evidência: WebKit ≠ Safari |

## 5. Tarefas

- [x] **T01** — DTs (§4): [DT-0026](../../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md).
- [x] **T02** — DOCX: gerador, conteúdo igual ao relatório, botão na seção «Exportar». Verificado por teste de unidade (pacote e estrutura), E2E em navegador real (mesmos títulos do HTML, na mesma ordem; figuras PNG) e **abertura e conversão no LibreOffice**; **Word não foi aberto** (não há Word neste ambiente).
- [x] **T03** — Comentários: projeto (campo opcional `comments`), interface (`CommentThread` na figura e `CommentsPanel`), exportação opcional no relatório; PT/EN, seis temas, axe. **Sem interface por tabela** (o modelo aceita) e sem edição de comentário já enviado.
- [~] **T04** — Safari: E2E no **WebKit do Playwright** (suíte inteira verde; no CI em Linux); **Safari real não verificado** (sem Mac).
- [ ] **T05** — Domínio próprio: **sem decisão do usuário (PD-13)**; nada feito; continua o endereço do GitHub Pages. Passos previstos na [DT-0026 §5](../../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md).
- [~] **T06** — Canais experimental e estável: `channels.yml`, `scripts/channels.mjs` (testado), comandos Rust `update_check`/`update_install` com endereço por canal (testado), preferência no aplicativo. **Fluxo ponta a ponta não verificado** (exige um release publicado).
- [x] **T07** — [Especificação da edição simultânea](../../arquitetura/edicao-simultanea.md) (sem código), **aguardando a revisão do usuário**.
- [~] **T08** — Matriz de cobertura e CHANGELOG atualizados; [relatório de validação da v0.3](../../../validation/reports/v0.3.0/README.md) escrito como **rascunho** (a v0.3.0 não está publicada).

## 6. Entregas

Relatório DOCX, comentários no projeto, compatibilidade com WebKit/Safari, domínio (se decidido), canais no atualizador e especificação da edição simultânea.

## 7. Critérios de conclusão

1. DOCX abre no Word e no LibreOffice com o mesmo conteúdo do relatório HTML (inspeção registrada).
2. Comentários sobrevivem a salvar, reabrir e novas revisões; apontam para a revisão em que foram feitos.
3. E2E no WebKit verde; Safari real verificado ou registrado como não verificado.
4. Troca de canal verificada com manifestos assinados.
5. Especificação da edição simultânea revisada pelo usuário.

## 8. Verificação

vitest; E2E em Chromium, Firefox, Chrome, Edge e WebKit; verificação nativa no Windows 10; inspeção de DOCX em dois programas; teste do atualizador por canal.

## 9. Documentação a criar ou atualizar

DTs; guia de exportação (DOCX); guia de comentários; [publicação](../../distribuicao/publicacao.md) (canais); especificação da edição simultânea; matriz de cobertura (F13 canal estável, F14); decisões pendentes (PD-13, PD-14); CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Diferenças de renderização do DOCX entre programas | Estrutura simples (estilos nativos); inspeção em dois programas |
| WebKit do Playwright não representar o Safari | Registrar a evidência com o nome correto; não declarar Safari verificado sem o navegador real |
| Canal estável confundido com versão estável | Texto claro nas preferências e nas notas; primeira versão estável só na v1.0.0 |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3). Etapa não iniciada. |
| 2026-11-02 | **Ativada.** Entregues T01–T03 e T07; T04 e T06 parciais (WebKit do Playwright; canais sem verificação com release real); T05 aguarda decisão do usuário; T08 rascunho. Vitest 380+; Chromium E2E verde; WebKit E2E verde após duas correções de premissa dos testes. |

## 12. Desvios e descobertas

- **Link de salto no WebKit:** o WebKit (Safari) não põe links na ordem do Tab; o teste do link «Ir para o conteúdo» passou a conferir, no WebKit, a ordem dos controles do cabeçalho. Para usuários de Safari, o guia de acessibilidade deve lembrar Option+Tab.
- **Resolvido sem opacidade:** comentários resolvidos usam borda tracejada (a opacidade reduzia o contraste abaixo de 4,5:1; detectado pelo axe).

## 13. Destino dos itens não entregues (decisão de 2026-11-02)

O usuário fechou a v0.3 e levou as demais pendências para a [v0.4](../plano-v0.4.md) ([decisões aprovadas §18](../../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02)). Itens desta etapa que ficam sem entrega na v0.3:

- Safari real; canal de atualização ponta a ponta; domínio próprio (PD-13); caminho da edição simultânea (PD-14) → [ET28](../plano-v0.4.md#et28--verificações-adicionais-e-itens-que-dependem-do-usuário).
- Editar um comentário já enviado → [ET27](../plano-v0.4.md#et27--acabamento-da-interface-e-da-exportação).
- Interface de comentários por tabela: **entregue** na v0.3 depois do plano (ver o registro de progresso).
