# DT-0001 — Estrutura da documentação, nomenclatura e planos de execução

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | Solicitação do usuário: padronizar nomes, definir a base da estrutura e criar diretório exclusivo para planos de execução |
| Pendências relacionadas | — |
| Substitui / substituída por | — |

## Contexto

Antes desta decisão, a documentação misturava padrões:

- `plans/` reunia concepção, decisões, catálogo, arquitetura e plano de implementação, apesar do nome sugerir apenas planos.
- Nomes em `MAIÚSCULAS_COM_SUBLINHADO` (`DECISOES_APROVADAS.md`) coexistiam com `kebab-case` previsto para documentos futuros (`decisoes-tecnicas/`, `formato-projeto.md`) e com `snake_case` (`manifesto_prompts.json`).
- O nome `ARQUITETURA_E_APRENDIZADO.md` havia sido mantido apenas para preservar links.
- `docs/aprendizado/` descrevia as fichas de módulo que ficariam em `docs/modulos/`.
- Não havia lugar para registrar quais planos estavam em execução.

## Decisão

1. Toda a documentação fica em `docs/`, agrupada por finalidade: `produto/`, `arquitetura/`, `planos-execucao/`, `decisoes-tecnicas/`, `convencoes/`, `modelos/`, `modulos/`, `metodos/`, `guias/`, `distribuicao/`, `temas/` e `imagens/`.
2. `docs/planos-execucao/` é exclusivo para planos de execução, com os estados representados por pastas: `ativos/`, `planejados/` e `concluidos/`. O índice `README.md` indica o plano ativo.
3. Nomes de documentos em `kebab-case`, português, sem acentos; arquivos de comunidade na raiz em maiúsculas; índices como `README.md`. Regras completas em [nomenclatura](../convencoes/nomenclatura.md).
4. Pastas de topo e código em inglês; pastas de documentação em português.
5. Cabeçalho padrão com estado e data ISO em todos os documentos, conforme a [convenção de documentação](../convencoes/documentacao.md).

### Correspondência de nomes

| Antes | Depois |
|---|---|
| `plans/CONCEPCAO_APP.md` | `docs/produto/concepcao.md` |
| `plans/DECISOES_APROVADAS.md` | `docs/produto/decisoes-aprovadas.md` |
| `plans/DECISOES_PENDENTES.md` | `docs/produto/decisoes-pendentes.md` |
| `plans/CATALOGO_FUNCIONAL.md` | `docs/produto/catalogo-funcional.md` |
| `plans/ARQUITETURA_E_APRENDIZADO.md` | `docs/arquitetura/visao-geral.md` |
| `docs/MAPA_MODULOS.md` | `docs/arquitetura/mapa-modulos.md` |
| `plans/PLANO_IMPLEMENTACAO.md` | `docs/planos-execucao/roteiro-produto.md` |
| `docs/GITHUB.md` | `docs/distribuicao/repositorio-github.md` |
| `docs/aprendizado/README.md` | `docs/modulos/README.md` |
| `docs/temas/ADAPTACAO_SOFT_LIGHT.md` | `docs/temas/adaptacao-soft-light.md` |
| `docs/temas/manifesto_prompts.json` | `docs/temas/manifesto-prompts.json` |
| `docs/COBERTURA.md` (previsto) | `docs/produto/matriz-cobertura.md` |
| `docs/formato-projeto.md` (previsto) | `docs/arquitetura/formato-enzitag.md` |
| `docs/modulos/<id>.md` (previsto) | `docs/modulos/<id>-<slug>.md` |

Os prompts em `docs/temas/prompts/` mantiveram nomes e bytes; os hashes do manifesto continuam válidos.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Manter `plans/` na raiz como pasta exclusiva de planos | Duas raízes de documentação (`plans/` e `docs/`) e nome em inglês com conteúdo e subpastas em português |
| Nomes de documentos em inglês | Documentação é escrita e lida em português |
| Manter `MAIÚSCULAS_COM_SUBLINHADO` | Inconsistente com os nomes já previstos em `kebab-case` e menos legível em links |
| Estado do plano apenas como campo no cabeçalho | Pastas tornam o plano ativo visível sem abrir arquivos |

## Consequências

- Links internos foram atualizados e passam a ser verificados automaticamente a partir da ET01.
- O arquivo local `plans/conversa_rust_doe_estatistica.md` continua ignorado pelo Git; a pasta `plans/` deixa de existir no repositório.
- `docs/aprendizado/` foi incorporada a `docs/modulos/`, preservando a orientação de aprendizagem pela organização dos módulos.
- Novos documentos seguem os [modelos](../modelos/README.md) e a [nomenclatura](../convencoes/nomenclatura.md).
