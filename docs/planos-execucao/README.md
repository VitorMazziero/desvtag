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
> Versão-alvo: v0.1.0 · Fase do roteiro: F01 · Ativado em 2026-11-01

**Exceção ao "uma etapa ativa por vez" (2026-11-01):** a única pendência da ET01 é a execução no Windows 11, que depende de equipamento ou de ajuste da CI e não de código da ET02. ET02 avança em paralelo; a ET01 só é movida para `concluidos/` quando T01 e T22 tiverem evidência, e nenhuma etapa posterior à ET02 começa antes disso.

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
| ET03 | Projeto local, importação e recuperação | v0.1 | Planejado | [planejados/et03-projeto-local-importacao.md](planejados/et03-projeto-local-importacao.md) |
| ET04 | Fundamentos numéricos e modelos lineares | v0.1 | Planejado | [planejados/et04-fundamentos-numericos-modelos.md](planejados/et04-fundamentos-numericos-modelos.md) |
| ET05 | ANOVA, Tukey e letras | v0.1 | Planejado | [planejados/et05-anova-tukey-letras.md](planejados/et05-anova-tukey-letras.md) |
| ET06 | Fatoriais, fracionários e Plackett–Burman | v0.1 | Planejado | [planejados/et06-fatoriais-plackett-burman.md](planejados/et06-fatoriais-plackett-burman.md) |
| ET07 | Superfícies de resposta e planejamento personalizado | v0.1 | Planejado | [planejados/et07-superficies-resposta.md](planejados/et07-superficies-resposta.md) |
| ET08 | Otimização de uma ou várias respostas | v0.1 | Planejado | [planejados/et08-otimizacao.md](planejados/et08-otimizacao.md) |
| ET09 | Gráficos e exportação essenciais | v0.1 | Planejado | [planejados/et09-graficos-exportacao.md](planejados/et09-graficos-exportacao.md) |
| ET10 | Integração, verificação e publicação | v0.1 | Planejado | [planejados/et10-integracao-publicacao.md](planejados/et10-integracao-publicacao.md) |

Concluídos: nenhum.

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
