# Planos de execução

**Estado:** vigente · **Atualizado em:** 2026-11-01

Diretório exclusivo dos planos de execução do EnziTAG Optima. Requisitos de produto ficam em [`docs/produto/`](../produto/README.md); decisões técnicas, em [`docs/decisoes-tecnicas/`](../decisoes-tecnicas/README.md).

Para iniciar ou retomar a implementação, use o [prompt de execução passo a passo da v0.1](prompt-execucao-v0.1.md). A [análise da base recebida do GitHub](analise-github-v0.1.md) registra a origem dos planos e as verificações realizadas antes de preparar o prompt. Esses documentos não alteram o estado das etapas.

## Plano ativo

> **ET10 — Integração, verificação e publicação** · [ativos/et10-integracao-publicacao.md](ativos/et10-integracao-publicacao.md)
>
> Versão-alvo: v0.1.0 · Fase do roteiro: F12–F13 · Candidata pronta localmente; **publicação (etiqueta, release e Pages) e verificação da atualização dependem do mantenedor** · Marcos M1–M3 não declarados

**Exceção ao "uma etapa ativa por vez" (2026-11-01):** durante a implementação, as etapas ET01–ET05 ficaram abertas apenas pela evidência no Windows 11 e as seguintes avançaram em paralelo. Em 2026-11-01 o usuário decidiu **não usar Windows 11** e verificar o aplicativo no **Windows 10 Pro 22H2** da máquina de desenvolvimento ([decisões aprovadas §15](../produto/decisoes-aprovadas.md#15-fechamento-da-v01-2026-11-01)); com essa evidência, ET01–ET09 foram concluídas. O Windows 11 permanece **não verificado** e consta das notas de versão.

O diretório [`ativos/`](ativos/) contém somente os planos em execução. Se este quadro e o diretório divergirem, o diretório prevalece e este índice deve ser corrigido.

## Níveis de planejamento

| Nível | Documento | Pergunta respondida |
|---|---|---|
| Produto | [Roteiro do produto](roteiro-produto.md) | Quais fases (F00–F14) levam ao produto completo? |
| Versão | [Plano da v0.1](plano-v0.1.md) | O que entra na primeira versão, em que ordem e com quais critérios de lançamento? |
| Etapa | `ativos/`, `planejados/`, `concluidos/` | Quais tarefas executar agora, como verificar e o que foi feito? |

Cada etapa (ETnn) referencia as fases do roteiro que cobre. Numeração das etapas é global e nunca reutilizada: a v0.2 continuará em ET11, que começa pela migração do Node.js 22 para o 26 ([DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)).

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
| ET10 | Integração, verificação e publicação | v0.1 | **Ativo** (publicação pendente) | [ativos/et10-integracao-publicacao.md](ativos/et10-integracao-publicacao.md) |
| ET11 | Seleção e comparação de modelos e navegação por seções dos resultados (v0.2; começa pela migração do Node.js, DT-0015) | v0.2 | Planejado | [planejados/et11-selecao-de-modelos-e-navegacao.md](planejados/et11-selecao-de-modelos-e-navegacao.md) |

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
