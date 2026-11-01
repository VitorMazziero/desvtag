# Planos de execução

**Estado:** vigente · **Atualizado em:** 2026-11-01

Diretório exclusivo dos planos de execução do EnziTAG Optima. Requisitos de produto ficam em [`docs/produto/`](../produto/README.md); decisões técnicas, em [`docs/decisoes-tecnicas/`](../decisoes-tecnicas/README.md).

## Plano ativo

> **ET01 — Fundação técnica e contratos iniciais** · [ativos/et01-fundacao-tecnica.md](ativos/et01-fundacao-tecnica.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F00 · Ativado em 2026-11-01 · Aberta apenas pela evidência no Windows (T01, T22)
>
> **ET02 — Primeiro percurso ponta a ponta** · [ativos/et02-primeiro-percurso.md](ativos/et02-primeiro-percurso.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F01 · Ativado em 2026-11-01 · Aberta apenas pela evidência no Windows (T14)
>
> **ET03 — Projeto local, importação e recuperação** · [ativos/et03-projeto-local-importacao.md](ativos/et03-projeto-local-importacao.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F02 · Ativado em 2026-11-01 · Aberta apenas pelo Windows e pela reabertura cruzada (T15)
>
> **ET04 — Fundamentos numéricos e modelos lineares** · [ativos/et04-fundamentos-numericos-modelos.md](ativos/et04-fundamentos-numericos-modelos.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F03 · Ativado em 2026-11-01 · Tarefas T01–T12 concluídas; aberta apenas pela evidência no Windows (critério 6)

> **ET05 — ANOVA, Tukey e letras** · [ativos/et05-anova-tukey-letras.md](ativos/et05-anova-tukey-letras.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F04 · Ativado em 2026-11-01 · Tarefas T01–T15 concluídas; aberta apenas pela evidência no Windows (critério 6) · Marco M2 não declarado

**Exceção ao "uma etapa ativa por vez" (2026-11-01):** a única pendência das ET01–ET03 é a execução no Windows 11 (e a reabertura de projetos entre Windows e navegador), que depende de equipamento ou de ajuste da CI e não do código das etapas seguintes. As etapas seguintes avançam em paralelo **como código**; ET01, ET02 e ET03 só são movidas para `concluidos/` quando essa evidência existir, e **nenhum marco (M1, M2…) é declarado** antes disso. **Decisão de 2026-11-01 (extensão):** a exceção passa a valer até a ET10. Motivo: a instrução de implementação da v0.1 pede a execução sequencial ET01→ET10 sem bloquear em equipamento indisponível, e a única pendência de ET01–ET04 é a evidência no Windows 11, que não depende do código das etapas seguintes. Condições mantidas: nenhuma etapa é movida para `concluidos/` sem evidência de todos os critérios; nenhum marco é declarado antes; a ET10 não publica nada sem a decisão do usuário sobre a PD-15.

O diretório [`ativos/`](ativos/) contém somente os planos em execução. Se este quadro e o diretório divergirem, o diretório prevalece e este índice deve ser corrigido.

## Níveis de planejamento

| Nível | Documento | Pergunta respondida |
|---|---|---|
| Produto | [Roteiro do produto](roteiro-produto.md) | Quais fases (F00–F14) levam ao produto completo? |
| Versão | [Plano da v0.1](plano-v0.1.md) | O que entra na primeira versão, em que ordem e com quais critérios de lançamento? |
| Etapa | `ativos/`, `planejados/`, `concluidos/` | Quais tarefas executar agora, como verificar e o que foi feito? |

Cada etapa (ETnn) referencia as fases do roteiro que cobre. Numeração das etapas é global e nunca reutilizada: a v0.2 continuará em ET11.

## Situação das etapas

| Etapa | Nome | Versão | Estado | Arquivo |
|---|---|---|---|---|
| ET01 | Fundação técnica e contratos iniciais | v0.1 | **Ativo** (só evidência Windows pendente) | [ativos/et01-fundacao-tecnica.md](ativos/et01-fundacao-tecnica.md) |
| ET02 | Primeiro percurso ponta a ponta | v0.1 | **Ativo** | [ativos/et02-primeiro-percurso.md](ativos/et02-primeiro-percurso.md) |
| ET03 | Projeto local, importação e recuperação | v0.1 | **Ativo** (só evidência Windows e reabertura cruzada pendentes) | [ativos/et03-projeto-local-importacao.md](ativos/et03-projeto-local-importacao.md) |
| ET04 | Fundamentos numéricos e modelos lineares | v0.1 | **Ativo** (só evidência Windows pendente) | [ativos/et04-fundamentos-numericos-modelos.md](ativos/et04-fundamentos-numericos-modelos.md) |
| ET05 | ANOVA, Tukey e letras | v0.1 | **Ativo** (só evidência Windows pendente) | [ativos/et05-anova-tukey-letras.md](ativos/et05-anova-tukey-letras.md) |
| ET06 | Fatoriais, fracionários e Plackett–Burman | v0.1 | **Concluído** (2026-11-01) | [concluidos/et06-fatoriais-plackett-burman.md](concluidos/et06-fatoriais-plackett-burman.md) |
| ET07 | Superfícies de resposta e planejamento personalizado | v0.1 | Planejado | [planejados/et07-superficies-resposta.md](planejados/et07-superficies-resposta.md) |
| ET08 | Otimização de uma ou várias respostas | v0.1 | Planejado | [planejados/et08-otimizacao.md](planejados/et08-otimizacao.md) |
| ET09 | Gráficos e exportação essenciais | v0.1 | Planejado | [planejados/et09-graficos-exportacao.md](planejados/et09-graficos-exportacao.md) |
| ET10 | Integração, verificação e publicação | v0.1 | Planejado | [planejados/et10-integracao-publicacao.md](planejados/et10-integracao-publicacao.md) |

Concluídos: [ET06](concluidos/et06-fatoriais-plackett-burman.md) (critério do Windows atendido em `windows-latest`; ver ressalvas no plano).

**Evidência de Windows na CI (2026-11-01):** a [execução 41334658975](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41334658975) passou integralmente em `windows-latest` (Windows Server 2025, build 26100), incluindo a verificação nativa por WebView2. Isso **não substitui** o Windows 11 de usuário (diálogos nativos, clone limpo pelo guia, reabertura cruzada): ET01–ET05 seguem abertas nesse ponto e nenhum marco é declarado.

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
