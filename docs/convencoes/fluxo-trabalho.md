# Fluxo de trabalho

**Estado:** vigente · **Atualizado em:** 2026-11-01

Sequência para executar uma etapa, do plano ao merge. Nomes de branches, commits e etiquetas seguem a [nomenclatura](nomenclatura.md#6-git).

## 1. Ciclo de uma etapa

1. **Ativar** o próximo plano conforme o [ciclo de vida](../planos-execucao/README.md#ciclo-de-vida): mover de `planejados/` para `ativos/` e atualizar o índice.
2. **Registrar decisões técnicas** da seção 4 do plano antes do código que depende delas, usando o [modelo de DT](../modelos/decisao-tecnica.md).
3. **Criar branch** `<tipo>/et<nn>-<slug>` a partir de `main`.
4. **Executar as tarefas** em incrementos pequenos; cada commit compila e mantém os testes passando.
5. **Atualizar a documentação** no mesmo pull request (ver [convenção de documentação](documentacao.md#6-atualização-junto-com-o-código)).
6. **Abrir pull request** citando a etapa, as tarefas concluídas e a evidência de cada critério atendido.
7. **Concluir a etapa** apenas quando todos os critérios tiverem evidência; mover o plano para `concluidos/`.

Uma etapa pode ser entregue em vários pull requests. O plano registra cada um no registro de progresso.

## 2. Definição de pronto

### Tarefa

- Código e testes do comportamento alterado.
- Verificações locais e da CI passando.
- Plano atualizado (caixa marcada e, se relevante, registro de progresso).

### Módulo

Os oito itens da [definição de pronto por módulo](../planos-execucao/roteiro-produto.md#6-validação-e-definição-de-pronto-por-módulo) do roteiro, resumidos:

1. Responsabilidade e arquivos registrados no mapa; API tipada; dependências sem ciclos.
2. Especificação de entradas, saídas, fórmulas e erros.
3. Testes de comportamento e invariantes.
4. Referências independentes para cálculos.
5. Tolerâncias explícitas por grandeza.
6. Integração nativa e WASM testada.
7. Interface PT/EN, três temas e estados de carregamento, erro e cancelamento.
8. Persistência, proveniência e matriz de cobertura atualizadas.

### Etapa

Todos os critérios de conclusão do plano com evidência ligada, documentação da seção 9 do plano atualizada e índice dos planos corrigido.

## 3. Pull requests

O modelo `.github/pull_request_template.md` (criado na ET01) pede:

- Etapa e tarefas (`ET03-T08`, …).
- Resumo da mudança e módulos afetados.
- Evidências: testes, casos de validação, capturas de tela da interface quando aplicável.
- Documentos atualizados.
- Itens da matriz de cobertura que mudaram de situação.

Revisões focam correção científica, fronteiras entre módulos e clareza para manutenção.

## 4. Verificações automatizadas

Configuradas na ET01 e ampliadas a cada etapa. Previstas:

| Verificação | Quando |
|---|---|
| Formatação e lint (Rust e TypeScript) | Todo push e pull request |
| Testes Rust e build WASM | Todo push e pull request |
| Verificação de tipos, testes e build web | Todo push e pull request |
| Tipos TypeScript gerados atualizados | Todo push e pull request |
| Links da documentação | Todo push e pull request |
| Casos de validação | Todo push e pull request, a partir da ET02 |
| Build Windows (Tauri) | `main`, etiquetas e disparo manual |
| E2E do navegador | Pull request, a partir da ET02 |

Execuções em Windows consomem a cota de minutos de repositórios privados mais rapidamente do que em Linux; por isso ficam fora do fluxo de cada push.

## 5. Dados e segurança

- Usar dados sintéticos identificados ou dados com distribuição autorizada.
- Nunca versionar credenciais, chaves de assinatura, tokens OAuth ou conteúdo de `referencias/`.
- Segredos de publicação e assinatura ficam nos segredos do GitHub ou fora do repositório.
- Não tornar o repositório público sem decisão explícita do usuário.
