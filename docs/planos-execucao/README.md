# Planos de execução

**Estado:** vigente · **Atualizado em:** 2026-11-02

Diretório exclusivo dos planos de execução do EnziTAG Optima. Requisitos de produto ficam em [`docs/produto/`](../produto/README.md); decisões técnicas, em [`docs/decisoes-tecnicas/`](../decisoes-tecnicas/README.md).

Para iniciar ou retomar a implementação, use o [prompt de execução passo a passo da v0.1](prompt-execucao-v0.1.md). A [análise da base recebida do GitHub](analise-github-v0.1.md) registra a origem dos planos e as verificações realizadas antes de preparar o prompt. Esses documentos não alteram o estado das etapas.

## Planos ativos

> **v0.3** · [plano da versão](plano-v0.3.md)
>
> Ativos em 2026-11-02: **ET14** — [itens adiados da v0.1 e da v0.2](ativos/et14-itens-adiados-v01-v02.md) e **ET21** — [espaçamento, logotipo único e rolagem entre etapas](ativos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md). A **ET13** (planilha de coleta) e a **ET10** (publicação da v0.1) estão concluídas. ET15 a ET20 continuam planejadas.

**Paralelismo (2026-11-02):** a ET14 e a ET21 correm juntas por pedido do usuário («Pode seguir até completar v0.3»); as etapas que dependem de configuração externa (ET19, credenciais OAuth) ou de decisão do usuário seguem o [plano da v0.3](plano-v0.3.md#4-dependências-do-usuário). Histórico: a ET11 e a ET12 (v0.2) foram executadas com a ET10 ainda aberta, e a ET10 foi concluída em 2026-11-02 com a publicação dos releases e a atualização verificada. Em 2026-11-01 o usuário decidiu **não usar Windows 11** e verificar o aplicativo no **Windows 10 Pro 22H2** da máquina de desenvolvimento ([decisões aprovadas §15](../produto/decisoes-aprovadas.md#15-fechamento-da-v01-2026-11-01)); em 2026-11-02 decidiu que a validação no Windows 11 **não será realizada** ([§17](../produto/decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02)).

O diretório [`ativos/`](ativos/) contém somente os planos em execução. Se este quadro e o diretório divergirem, o diretório prevalece e este índice deve ser corrigido.

## Níveis de planejamento

| Nível | Documento | Pergunta respondida |
|---|---|---|
| Produto | [Roteiro do produto](roteiro-produto.md) | Quais fases (F00–F14) levam ao produto completo? |
| Versão | [Plano da v0.1](plano-v0.1.md), [plano da v0.3](plano-v0.3.md) | O que entra em cada versão, em que ordem e com quais critérios de lançamento? (a v0.2 foi planejada nas próprias ET11 e ET12) |
| Etapa | `ativos/`, `planejados/`, `concluidos/` | Quais tarefas executar agora, como verificar e o que foi feito? |

Cada etapa (ETnn) referencia as fases do roteiro que cobre. Numeração das etapas é global e nunca reutilizada: a v0.2 usou ET11 e ET12 (a ET11 começou pela migração do Node.js 22 para o 26, [DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)); a v0.3 usa ET13 a ET21 ([plano da v0.3](plano-v0.3.md)).

## Situação das etapas

| Etapa | Nome | Versão | Estado | Arquivo |
|---|---|---|---|---|
| ET01 | Fundação técnica e contratos iniciais | v0.1 | **Concluído** (2026-11-01; Windows 10) | [concluidos/et01-fundacao-tecnica.md](concluidos/et01-fundacao-tecnica.md) |
| ET02 | Primeiro percurso ponta a ponta | v0.1 | **Concluído** (2026-11-01; Windows 10) | [concluidos/et02-primeiro-percurso.md](concluidos/et02-primeiro-percurso.md) |
| ET03 | Projeto local, importação e recuperação | v0.1 | **Concluído** (2026-11-01; Windows 10) | [concluidos/et03-projeto-local-importacao.md](concluidos/et03-projeto-local-importacao.md) |
| ET04 | Fundamentos numéricos e modelos lineares | v0.1 | **Concluído** (2026-11-01; Windows 10) | [concluidos/et04-fundamentos-numericos-modelos.md](concluidos/et04-fundamentos-numericos-modelos.md) |
| ET05 | ANOVA, Tukey e letras | v0.1 | **Concluído** (2026-11-01; Windows 10) | [concluidos/et05-anova-tukey-letras.md](concluidos/et05-anova-tukey-letras.md) |
| ET06 | Fatoriais, fracionários e Plackett–Burman | v0.1 | **Concluído** (2026-11-01) | [concluidos/et06-fatoriais-plackett-burman.md](concluidos/et06-fatoriais-plackett-burman.md) |
| ET07 | Superfícies de resposta e planejamento personalizado | v0.1 | **Concluído** (2026-11-01) | [concluidos/et07-superficies-resposta.md](concluidos/et07-superficies-resposta.md) |
| ET08 | Otimização de uma ou várias respostas | v0.1 | **Concluído** (2026-11-01) | [concluidos/et08-otimizacao.md](concluidos/et08-otimizacao.md) |
| ET09 | Gráficos e exportação essenciais | v0.1 | **Concluído** (2026-11-01) | [concluidos/et09-graficos-exportacao.md](concluidos/et09-graficos-exportacao.md) |
| ET10 | Integração, verificação e publicação | v0.1 | **Concluído** (2026-11-02) | [concluidos/et10-integracao-publicacao.md](concluidos/et10-integracao-publicacao.md) |
| ET11 | Seleção e comparação de modelos, navegação por seções e métodos da v0.2 (começa pela migração do Node.js, DT-0015) | v0.2 | **Concluído** (2026-11-02; candidata local, não publicada) | [concluidos/et11-selecao-de-modelos-e-navegacao.md](concluidos/et11-selecao-de-modelos-e-navegacao.md) |
| ET12 | Temas adicionais (Industrial, Organic e Clay) e logo do grupo de pesquisa | v0.2 | **Concluído** (2026-11-02; candidata local, não publicada) | [concluidos/et12-temas-adicionais-e-identidade-do-grupo.md](concluidos/et12-temas-adicionais-e-identidade-do-grupo.md) |
| ET13 | Planilha de coleta: matriz com respostas e importação das respostas | v0.3 | **Concluído** (2026-11-02) | [concluidos/et13-planilha-de-coleta.md](concluidos/et13-planilha-de-coleta.md) |
| ET14 | Itens adiados da v0.1 e da v0.2 | v0.3 | **Ativo** (2026-11-02) | [ativos/et14-itens-adiados-v01-v02.md](ativos/et14-itens-adiados-v01-v02.md) |
| ET15 | Níveis mistos e misturas | v0.3 | **Ativo** (2026-11-02) | [ativos/et15-niveis-mistos-e-misturas.md](ativos/et15-niveis-mistos-e-misturas.md) |
| ET16 | Planejamentos ótimos, restritos e ampliação sequencial | v0.3 | **Ativo** (2026-11-02) | [ativos/et16-planejamentos-otimos-e-restritos.md](ativos/et16-planejamentos-otimos-e-restritos.md) |
| ET17 | Modelos mistos, medidas repetidas e comparações pareadas | v0.3 | Planejado | [planejados/et17-modelos-mistos-e-medidas-repetidas.md](planejados/et17-modelos-mistos-e-medidas-repetidas.md) |
| ET18 | Ajuste não linear (Monod) e potência | v0.3 | Planejado | [planejados/et18-nao-linear-e-potencia.md](planejados/et18-nao-linear-e-potencia.md) |
| ET19 | Google Drive e compartilhamento inicial | v0.3 | Planejado | [planejados/et19-google-drive-e-compartilhamento.md](planejados/et19-google-drive-e-compartilhamento.md) |
| ET20 | DOCX, comentários, Safari, domínio próprio e canais de atualização | v0.3 | Planejado | [planejados/et20-docx-comentarios-e-distribuicao.md](planejados/et20-docx-comentarios-e-distribuicao.md) |
| ET21 | Revisão de espaçamento, tamanho dos controles, logo único e rolagem entre etapas | v0.3 | **Ativo** (2026-11-02) | [ativos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md](ativos/et21-revisao-de-espacamento-e-tamanho-dos-controles.md) |

**Evidência de Windows:** além de `windows-latest` na CI (Windows Server 2025, build 26100), a verificação nativa, os testes Rust, o instalador e a suíte E2E foram executados no Windows 10 Pro 22H2 (build 19045) da máquina de desenvolvimento, com WebView2 156.0.4314.58, Chrome 156.0.8078.74 e Edge 156.0.4314.58 estáveis.

## Ciclo de vida

| Estado | Diretório | Significado |
|---|---|---|
| Planejado | `planejados/` | Escopo e tarefas definidos; execução não iniciada |
| Ativo | `ativos/` | Em execução; recebe registro de progresso |
| Suspenso | `planejados/` | Iniciado e interrompido; motivo registrado no próprio plano |
| Concluído | `concluidos/` | Critérios de conclusão atendidos com evidência |
| Cancelado | `concluidos/` | Encerrado sem conclusão ou substituído; motivo e substituto registrados |

Regras:

1. **Ativar:** mover o arquivo de `planejados/` para `ativos/` com `git mv`, preencher `Ativado em`, mudar o estado no cabeçalho e atualizar as duas tabelas deste índice no mesmo commit.
2. **Executar:** marcar tarefas concluídas, registrar progresso datado, desvios e descobertas no próprio plano. Mudanças de escopo seguem o [controle de mudanças](plano-v0.1.md#8-controle-de-mudanças-de-escopo).
3. **Concluir:** somente com todos os critérios de conclusão atendidos e evidências ligadas (testes, casos de validação, relatórios). Preencher `Concluído em`, mover para `concluidos/`, atualizar este índice, a [matriz de cobertura](../produto/matriz-cobertura.md) e o plano da versão.
4. **Uma etapa ativa por vez**, salvo paralelismo previsto no plano da versão (ET09 a partir da ET05). Paralelismo é registrado no quadro "Plano ativo".
5. Planos concluídos não são apagados nem reescritos; correções posteriores entram como nova etapa ou como nota datada.
6. Novo plano: copiar o [modelo de plano de execução](../modelos/plano-execucao.md), usar o próximo número livre e o nome `etNN-<slug>.md` conforme a [nomenclatura](../convencoes/nomenclatura.md).

## Conteúdo mínimo de um plano de etapa

Cabeçalho com estado, versão-alvo, fases, marco, dependências, módulos e datas; objetivo; escopo incluído e excluído; entradas; decisões técnicas a registrar; tarefas numeradas (`T01`, `T02`…, citadas externamente como `ET01-T01`); entregas; critérios de conclusão verificáveis; verificação; documentação a atualizar; riscos; registro de progresso; desvios e descobertas.
