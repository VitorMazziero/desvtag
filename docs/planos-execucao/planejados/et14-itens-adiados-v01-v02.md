# ET14 — Itens adiados da v0.1 e da v0.2

| Campo | Valor |
|---|---|
| Estado | Planejado |
| Versão-alvo | v0.3.0 |
| Fases do roteiro | F05 (efeitos), F10 (exportação), F12 (verificação), F13 (atualizações) |
| Marco | Prepara a v0.3 |
| Depende de | ET13 (ordem do plano); publicação da v0.1.0 e da v0.2.0 pelo usuário (T01) |
| Módulos | C11/C16 (efeitos), C18 (recomendações), U08 (resultados), U09/U16 (figuras e PDF), U12 (contratos), U17 (textos), U18 (temas), E04 (atualizador) |
| Ativado em | — |
| Concluído em | — |

## 1. Objetivo

Fechar o que ficou pendente nas versões anteriores, mais o defeito encontrado ao verificar a atualização (notas de versão sem formatação): verificar a atualização ponta a ponta e encerrar a [ET10](../ativos/et10-integracao-publicacao.md); entregar a seleção de modelos para os efeitos de planejamentos de dois níveis (ET11-T09); arquivar as capturas em inglês e a inspeção dos temas no WebView2 (ET12-T10); escrever o guia de resultados; resolver as sementes acima de 2⁵³ no navegador; e, se possível, retirar as duas limitações aceitas do PDF.

## 2. Escopo

**Inclui**

- Verificação da atualização v0.1.0 → v0.2.0 (e v0.2.0 → candidata da v0.3) com projetos abertos e preservados.
- Conferência da opção CCD no Protimiza, se o usuário enviar as capturas (PD-05).
- Seleção e comparação de modelos para efeitos de dois níveis.
- Sementes como texto nos contratos (ou outra solução da DT), para que qualquer semente `u64` funcione no navegador.
- PDF: família de fonte da figura (serifa e monoespaçada embutidas) e hachura real na região de extrapolação, se a DT mostrar que é viável sem dependência pesada.
- Capturas em PT e EN dos seis temas e inspeção no WebView2; guia de resultados.
- **Notas de versão formatadas no aviso de atualização** (T09), encontradas pelo usuário em 2026-11-02.

**Não inclui**

- Windows 11: validação **não será realizada** (decisão do usuário, [§17](../../produto/decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02)).
- Novos métodos (ET15–ET18).

## 3. Entradas e referências

- [ET10](../ativos/et10-integracao-publicacao.md) (T08, T09, critérios 2 e 3); [registro de publicação](../../distribuicao/publicacao.md); [DT-0017](../../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md).
- [ET11](../concluidos/et11-selecao-de-modelos-e-navegacao.md) (T09; descoberta 9); [DT-0018](../../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md); [seleção de modelos](../../metodos/selecao-de-modelos.md).
- [ET12](../concluidos/et12-temas-adicionais-e-identidade-do-grupo.md) (T10); [DT-0020](../../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md) (limitações do PDF).
- Pendências: PD-05 (CCD no Protimiza), PD-12 (matriz de navegadores).

## 4. Decisões técnicas a registrar

| Decisão | Pergunta | Candidatos a avaliar | Critérios |
|---|---|---|---|
| Seleção em dois níveis | Que critério usar com efeitos de dois níveis, inclusive desenhos saturados? | Eliminação regressiva por valor-p (como DT-0018); Lenth para saturados; AICc/BIC | Coerência com DT-0018, graus de liberdade, desenhos sem erro puro |
| Sementes no navegador | Como representar sementes `u64` sem perda no JavaScript? | Texto decimal no contrato; `bigint`; limitar a 2⁵³ − 1 na geração | Compatibilidade de projetos (esquema 1), ts-rs, paridade |
| Notas de versão | Como mostrar as notas da atualização? | Renderizar Markdown seguro no aplicativo; texto curto e estruturado no `latest.json`; só um resumo e um link para o CHANGELOG | Segurança (sem HTML arbitrário), tamanho do manifesto, leitura rápida, PT |
| Fontes e hachura no PDF | Vale embutir mais famílias e desenhar padrões? | Fontes OFL já empacotadas (Source Serif 4, IBM Plex Mono) passadas ao conversor como bytes; hachura por linhas recortadas | Tamanho do pacote, fidelidade, carga sob demanda |

## 5. Tarefas

- [ ] **T01** — Depois da publicação da v0.1.0 e da v0.2.0 pelo usuário: instalar a v0.1.0 no Windows 10, abrir projetos de exemplo, atualizar pelo aplicativo, conferir versão, projetos e preferências; repetir na web (aviso de versão nova). Registrar em `docs/distribuicao/publicacao.md` e concluir a ET10.
- [ ] **T02** — PD-05: se o usuário enviar as capturas do Protimiza, comparar matriz e rótulo da opção CCD com o composto central do aplicativo e registrar o resultado na matriz de cobertura; sem capturas, manter a pendência registrada.
- [ ] **T03** — DT e implementação da seleção de modelos para efeitos de dois níveis (núcleo, operação, painel na seção «Efeitos»), com casos independentes (statsmodels) e E2E.
- [ ] **T04** — DT e correção das sementes acima de 2⁵³ (contratos, projeto, geração do DIC/DBC e dos planejamentos); casos com a semente 9223372036854775813 também no WebAssembly e no nativo pela interface.
- [ ] **T05** — DT e, se aprovada, fontes da figura e hachura no PDF; teste de conteúdo do PDF e inspeção visual em dois leitores.
- [ ] **T06** — Capturas em PT e EN dos seis temas (navegador e WebView2), arquivadas em `docs/imagens/` com inspeção registrada.
- [ ] **T07** — Guia de resultados (`docs/guias/resultados.md`): seções, modelo, diagnóstico, figuras, otimização, confirmação e exportação, com as capturas da T06.
- [ ] **T08** — Atualizar matriz de cobertura, relatório de validação da v0.3 (parcial) e CHANGELOG.
- [ ] **T09** — **Notas de versão formatadas.** Defeito observado na tela «Verificar atualizações» (`features/settings/UpdateCheck.tsx`) em 2026-11-02: as notas aparecem como **um único parágrafo de Markdown cru** (títulos `###`, tabelas `|---|`, negritos `**`, links), **cortadas no meio de uma frase** (limite de 4 000 caracteres em `scripts/make-updater-manifest.mjs`) e com **texto desatualizado** copiado do CHANGELOG («Nenhuma etiqueta, release ou publicação existe…»). Corrigir: (a) mostrar as notas formatadas (títulos, listas, tabelas, negrito e links seguros; **sem HTML arbitrário** e sem carregar recursos externos) com rolagem interna e botões sempre visíveis; (b) gerar as notas do `latest.json` e do release a partir da **seção da versão** no CHANGELOG, sem cortar no meio de uma frase (resumo curto + link), em vez de anexar o arquivo inteiro (`release.yml` hoje faz `Get-Content CHANGELOG.md`); (c) atualizar o CHANGELOG antes da etiqueta para que não afirme «não publicada»; (d) teste de unidade (conversão e sanitização), E2E do painel com notas longas e verificação do manifesto gerado.

## 6. Entregas

Atualização verificada e ET10 concluída; seleção de modelos em dois níveis; sementes sem perda; PDF com fontes e hachura (ou DT justificando manter as limitações); capturas e guia de resultados.

## 7. Critérios de conclusão

1. Atualização v0.1.0 → v0.2.0 verificada sem perda de projetos. *Evidência:* registro de publicação. **Situação em 2026-11-02:** o usuário relatou que a atualização funcionou (releases v0.1.0 e v0.2.0 publicados; o aplicativo mostrou «Nova versão disponível: 0.2.0»); o registro formal e o fechamento da [ET10](../ativos/et10-integracao-publicacao.md) aguardam a confirmação dos detalhes (projeto reaberto sem perda, versão após atualizar).
2. Seleção de modelos em dois níveis igual à referência independente; E2E. *Evidência:* casos em `validation/cases/`.
3. A semente máxima `u64` gera a mesma matriz no WebAssembly, no nativo e na referência. *Evidência:* teste de paridade.
4. Capturas PT/EN dos seis temas arquivadas; guia de resultados publicado no repositório.
5. Limitações do PDF retiradas ou mantidas por DT.
6. O aviso de atualização mostra as notas **formatadas, completas e sem texto desatualizado**; o manifesto e o release trazem só a seção da versão. *Evidência:* teste de unidade, E2E e manifesto gerado.

## 8. Verificação

Rust, vitest, E2E nos quatro navegadores, verificação nativa no Windows 10, instalação e atualização reais.

## 9. Documentação a criar ou atualizar

DTs novas; [seleção de modelos](../../metodos/selecao-de-modelos.md); guia de resultados; [publicação](../../distribuicao/publicacao.md); [matriz de cobertura](../../produto/matriz-cobertura.md); [decisões pendentes](../../produto/decisoes-pendentes.md) (PD-05); CHANGELOG.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Releases não publicados impedirem a T01 | A etapa pode concluir as demais tarefas e registrar a T01 como aguardando o usuário |
| Mudar o tipo da semente quebrar projetos | Leitura aceita número e texto; teste com projetos da v0.1 e da v0.2 |
| Fontes extras aumentarem o pacote | Carga sob demanda (já usada pelo pdfmake); medir o tamanho |

## 11. Registro de progresso

| Data | Registro |
|---|---|
| 2026-11-02 | Plano criado (plano da v0.3: «tudo que ficou pendente»). Windows 11 retirado por decisão do usuário. Etapa não iniciada. |
| 2026-11-02 | O usuário publicou os releases v0.1.0 (pré-lançamento) e v0.2.0 (mais recente) e relatou que a atualização funcionou. Adicionada a **T09** (notas de versão formatadas) a pedido do usuário, «somente ao plano por enquanto». |

## 12. Desvios e descobertas

Nenhum até o momento.
