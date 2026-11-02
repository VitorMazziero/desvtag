# Plano da v0.3

**Estado:** planejado · **Criado em:** 2026-11-02 · **Versão-alvo:** v0.3.0 (canal experimental)

Plano de versão pedido pelo usuário em 2026-11-02: «escreva o plano v0.3 com tudo que ficou pendente». Reúne **todos os itens ainda não entregues** do [roteiro do produto](roteiro-produto.md), do [plano da v0.1](plano-v0.1.md#3-fora-da-v01), dos planos [ET10](concluidos/et10-integracao-publicacao.md), [ET11](concluidos/et11-selecao-de-modelos-e-navegacao.md) e [ET12](concluidos/et12-temas-adicionais-e-identidade-do-grupo.md), do [relatório de validação da v0.2](../../validation/reports/v0.2.0/README.md) e da [matriz de cobertura](../produto/matriz-cobertura.md), além da planilha de coleta pedida na mesma data. As decisões do usuário estão em [decisões aprovadas §17](../produto/decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02).

Os destinos indicativos do plano da v0.1 (Drive na v0.3, famílias F09 da v0.4 em diante, F14 depois da v1.0.0) **foram antecipados para a v0.3** por essa decisão. A versão continua no canal **experimental**: a v1.0.0 (canal estável e cobertura completa do catálogo) mantém os critérios do roteiro.

## 1. Objetivo

Ao final da v0.3:

1. o usuário exporta a matriz de ensaios com as colunas de resposta vazias, preenche no laboratório e importa **o mesmo arquivo**, sem perder a ligação com o planejamento;
2. os itens adiados nas versões anteriores estão entregues ou têm destino explícito;
3. as famílias F09a–F09g do catálogo têm uma variante inicial documentada e validada;
4. o projeto pode ser aberto e salvo no Google Drive (opcional), com compartilhamento por leitura e cópia;
5. há exportação DOCX, comentários ligados às análises, verificação no Safari, domínio próprio (se o usuário o registrar), canais experimental e estável no atualizador e a especificação da edição simultânea.

## 2. Itens pendentes e etapa responsável

| Item pendente | Origem | Etapa |
|---|---|---|
| Matriz exportada com colunas de resposta; importação que preenche respostas do planejamento; importação ignora as linhas `# metadados` | Pedido do usuário (2026-11-02) | [ET13](concluidos/et13-planilha-de-coleta.md) |
| Verificar a atualização ponta a ponta (v0.1 → v0.2) e fechar a ET10 | ET10 (T08, T09, critérios 2 e 3); relatório da v0.2 | [ET14](ativos/et14-itens-adiados-v01-v02.md) |
| Seleção de modelos para os efeitos de planejamentos de dois níveis | ET11-T09 | ET14 |
| Capturas em inglês e inspeção visual dos temas no WebView2 | ET12-T10 | ET14 |
| Notas de versão sem formatação, cortadas e desatualizadas no aviso de atualização | Verificação do usuário (2026-11-02) | ET14-T09 |
| Botões próximos: auditoria de distância, preenchimento e tamanho dos controles em toda a interface | Verificação do usuário (2026-11-02) | [ET21](ativos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md) |
| Dois logotipos na interface: manter só o do cabeçalho (retirar o da tela inicial) | Verificação do usuário (2026-11-02) | ET21-T08 |
| Ao avançar de etapa, a interface deve voltar ao topo de forma orgânica (rolagem suave e foco no título) | Verificação do usuário (2026-11-02) | ET21-T09 |
| Guia de resultados | ET11-T14 | ET14 |
| Conferência da opção CCD e do rótulo no Protimiza | PD-05; decisões aprovadas §15, item 5 | ET14 (depende do usuário) |
| Sementes acima de 2⁵³ no navegador (precisão do JavaScript) | ET11, descoberta 9 | ET14 |
| Família de fonte da figura e hachura no PDF | DT-0020 (limitações aceitas) | ET14 (melhoria; aceitas até lá) |
| Níveis mistos | F09a | [ET15](ativos/et15-niveis-mistos-e-misturas.md) |
| Misturas | F09b | ET15 |
| Ótimos e sujeitos a restrições, ampliação sequencial | F09c | [ET16](ativos/et16-planejamentos-otimos-e-restritos.md) |
| Modelos mistos | F09d | [ET17](ativos/et17-modelos-mistos-e-medidas-repetidas.md) |
| Comparações pareadas (amostras dependentes) e medidas repetidas | F08/F09e | ET17 |
| Ajuste não linear (Monod) | F09f | [ET18](ativos/et18-nao-linear-e-potencia.md) |
| Potência e planejamento da precisão | F09g | ET18 |
| Google Drive, pasta visível, abrir compartilhado e criar cópia | F11; PD-09, PD-10 | [ET19](ativos/et19-google-drive-e-compartilhamento.md) |
| Exportação DOCX | F14 | [ET20](ativos/et20-docx-comentarios-e-distribuicao.md) |
| Comentários ligados a análises e gráficos | F14; PD-14 | [ET20](ativos/et20-docx-comentarios-e-distribuicao.md) |
| Especificação da edição simultânea (sem implementação) | F14; PD-14 | ET20 |
| Safari | F14; PD-13 | ET20 |
| Domínio próprio | F14; PD-13 | ET20 (depende do usuário) |
| Canal estável no atualizador (infraestrutura) | F13 | ET20 |

**Fora da v0.3:**

- **Windows 11:** a validação **não será realizada** (decisão do usuário em 2026-11-02, [§17](../produto/decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02)). A plataforma Windows verificada continua sendo o Windows 10 Pro 22H2 da máquina de desenvolvimento e o `windows-latest` da CI; as notas de versão continuam dizendo que o Windows 11 não foi verificado.
- **Implementação da edição simultânea:** o roteiro exige especificação própria antes; a v0.3 entrega só a especificação (ET20).
- **Declaração da v1.0.0** e primeira publicação no canal estável: dependem dos critérios de F12–F13 completos e de decisão do usuário. A ET20 prepara a infraestrutura dos dois canais.
- **Publicação das versões v0.1.0/v0.2.0:** é ato do mantenedor; a ET14 verifica a atualização depois que estiverem publicadas.

## 3. Etapas e ordem

| Etapa | Nome | Fases | Depende de | Entrega principal |
|---|---|---|---|---|
| [ET13](concluidos/et13-planilha-de-coleta.md) | Planilha de coleta: matriz com respostas e importação das respostas | F02, F05–F06 (U05, U16) | v0.2.0 | Ida e volta da matriz com conferência de níveis |
| [ET14](ativos/et14-itens-adiados-v01-v02.md) | Itens adiados da v0.1 e da v0.2 | F05, F10, F12, F13 | ET13 (ordem); publicação da v0.2 (T01) | Atualização verificada, seleção em dois níveis, capturas EN, guia de resultados |
| [ET15](ativos/et15-niveis-mistos-e-misturas.md) | Níveis mistos e misturas | F09a, F09b | ET14 | Geração e análise com referência independente |
| [ET16](ativos/et16-planejamentos-otimos-e-restritos.md) | Planejamentos ótimos, restritos e ampliação sequencial | F09c | ET15 | Critérios D/I, restrições lineares, ampliação |
| [ET17](ativos/et17-modelos-mistos-e-medidas-repetidas.md) | Modelos mistos, medidas repetidas e comparações pareadas | F08, F09d, F09e | ET14 | REML, componentes de variância, covariância repetida |
| [ET18](ativos/et18-nao-linear-e-potencia.md) | Ajuste não linear (Monod) e potência | F09f, F09g | ET17 (graus de liberdade e incerteza) | Monod com incerteza; potência por desenho |
| [ET19](ativos/et19-google-drive-e-compartilhamento.md) | Google Drive e compartilhamento inicial | F11 | ET14; credenciais OAuth do usuário (PD-09) | Abrir, salvar, compartilhar por leitura e cópia |
| [ET20](ativos/et20-docx-comentarios-e-distribuicao.md) | DOCX, comentários, Safari, domínio e canais | F13, F14 | ET14; ET19 para comentários compartilhados | DOCX, comentários, Safari, canais, especificação da edição simultânea |
| [ET21](ativos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md) | Revisão de espaçamento, tamanho dos controles, logo único e rolagem entre etapas | F12, F01 | v0.2.0 (pode correr junto da ET13) | Regras em tokens, interface corrigida nos seis temas, teste de medidas |

**Ordem recomendada:** ET13 e ET21 (interface; podem correr juntas) → ET14 → ET15 → ET16 → ET17 → ET18 → ET20, com a **ET19 em paralelo** a partir do momento em que o usuário criar o projeto OAuth (ela depende de configuração externa, não de código anterior). A regra «uma etapa ativa por vez» admite esse paralelismo, registrado aqui.

### Estado de execução (2026-11-02)

| Etapa | Estado | O que falta |
|---|---|---|
| ET13 Planilha de coleta | **Concluída** | — |
| ET21 Espaçamento, logotipo único e rolagem | **Quase concluída** (T01 parcial, T04 e T06 pendentes: revisão tela a tela fora das telas medidas e inspeção no WebView2) | Capturas antes/depois e conferência no aplicativo instalado |
| ET14 Itens adiados | **Em andamento** (T01, T04–T07 e T09 feitas) | T02 (depende do usuário: capturas do Protimiza) e T03 (seleção de modelos para efeitos de dois níveis) |
| ET15 Níveis mistos e misturas | **Em andamento** (níveis mistos e misturas feitos e validados) | Limites superiores, otimização no simplex, guarda da análise de misturas no projeto, exemplos; estimabilidade em fracionários de níveis mistos |
| ET16 Planejamentos ótimos | **Em andamento** (D e I-ótimos, restrições e ampliação entregues e validados) | Exemplo, verificação nativa, blocos na ampliação, gráfico de variância de predição |
| ET17 Modelos mistos e medidas repetidas | **Em andamento** (pareados e modelo misto de simetria composta entregues e validados) | AR(1) e não estruturada, testes F multi-gl, resultados guardados no projeto, exemplos |
| ET18 Monod e potência | **Em andamento** (Monod/Haldane/Hill e potência entregues e validados) | Perfil de verossimilhança, NIST StRD, simulação, exemplos |
| ET19 Google Drive | **Em andamento** (versão web entregue, testada com Google simulado) | Verificação com conta real (usuário), Windows (loopback + PKCE), fila persistente |
| ET20 DOCX, comentários, Safari, domínio, canais | **Em andamento** (DOCX, comentários e especificação entregues; WebKit e canais parciais) | Safari real (Mac), domínio (decisão do usuário), canal verificado com release publicado, comentários por tabela, revisão da especificação |

## 4. Dependências do usuário

| Pendência | Etapa | O que o usuário precisa fazer |
|---|---|---|
| Publicar a v0.1.0 (release em rascunho) e a v0.2.0 | ET14-T01 | Publicar os releases; sem isso a atualização ponta a ponta não pode ser verificada |
| PD-05 — conferência da opção CCD no Protimiza | ET14-T06 | Gerar no serviço uma matriz CCD com parâmetros combinados e enviar as capturas para `referencias/` (local) |
| PD-09 — cliente OAuth do Google | ET19-T01 | Criar o projeto no Google Cloud, a tela de consentimento e os clientes web e desktop; informar apenas os identificadores públicos |
| PD-13 — domínio próprio | ET20 | Decidir se haverá domínio e registrá-lo; sem decisão, o endereço continua o do GitHub Pages |
| Safari | ET20 | Disponibilizar um Mac com Safari, ou aceitar a verificação apenas com WebKit do Playwright (registrada como tal) |
| PD-08 — dados reais para exemplos novos (misturas, Monod) | ET15, ET18 | Autorizar a distribuição ou aceitar exemplos sintéticos (padrão) |

Nenhuma dessas pendências bloqueia as etapas locais: cada etapa registra o item como pendente e continua.

## 5. Princípios que continuam valendo

- Cálculo só no núcleo Rust, paridade WebAssembly × nativo × Tauri, estados indefinidos explícitos.
- Todo método novo: especificação em `docs/metodos/`, caso de validação com referência **independente** (statsmodels, SciPy, R quando disponível, implementação Python própria), testes e linha na matriz de cobertura.
- Esquema do projeto aditivo (`schemaVersion` 1, campos opcionais). Se alguma família exigir mudança incompatível, ela passa por decisão técnica com migração testada antes de ser implementada.
- PT/EN, os seis temas, teclado, axe e 375 px em cada tela nova.
- Windows 10 Pro 22H2 e `windows-latest` como plataformas Windows verificadas; Chromium, Firefox, Chrome e Edge no E2E.

## 6. Critérios de lançamento da v0.3.0

1. Etapas ET13–ET21 concluídas, ou itens não entregues registrados com destino e aprovados pelo usuário.
2. Todos os métodos novos com caso de validação independente e paridade WebAssembly × nativo.
3. Projetos da v0.1 e da v0.2 abrem sem perda; reabrir não recalcula.
4. CI verde (Rust, web, E2E, Tauri Linux e Windows); verificação nativa no Windows 10.
5. Instalador assinado para o atualizador, instalado, executado e desinstalado; atualização a partir da v0.2 verificada.
6. Relatório de validação da v0.3.0 com o que foi e o que não foi verificado.
7. Publicação (etiqueta, release e Pages) **somente por decisão expressa do usuário**.

**Publicações intermediárias:** a v0.3 é grande. Por decisão do usuário, uma etapa concluída pode ser publicada antes como versão de correção ou prévia (por exemplo, a ET13 como v0.2.1); o padrão é publicar só a v0.3.0.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Escopo grande atrasar entregas pequenas de alto valor | ET13 primeiro; publicações intermediárias possíveis (§6) |
| Famílias F09 sem referência independente acessível | Referências em Python (statsmodels, SciPy, pyDOE/implementação própria); R quando instalado; caso sintético com solução conhecida |
| Modelos mistos e não lineares com convergência frágil | Estados de não convergência explícitos; limites e inicialização documentados; nunca resultado silencioso |
| Drive bloqueado por configuração externa | ET19 em paralelo; módulos locais não esperam |
| Mudança de esquema por misturas ou modelos mistos | Campos opcionais; decisão técnica e migração testada antes de qualquer mudança incompatível |
| Safari sem equipamento | Registrar como verificação WebKit do Playwright, sem declarar Safari verificado |
