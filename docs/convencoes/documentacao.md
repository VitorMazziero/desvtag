# Convenção de documentação

**Estado:** vigente · **Atualizado em:** 2026-11-01

Como escrever, organizar e manter os documentos `.md` do projeto.

## 1. Cabeçalho padrão

Todo documento de `docs/` (exceto prompts e modelos) começa com o título e uma linha de estado:

```markdown
# Título do documento

**Estado:** vigente · **Atualizado em:** 2026-11-01
```

- O título não repete o nome do produto; o repositório já o identifica.
- Datas no formato ISO `AAAA-MM-DD`, também no texto corrido e nas tabelas de registro.
- Planos de etapa e decisões técnicas usam a tabela de cabeçalho dos respectivos [modelos](../modelos/README.md).

| Tipo de documento | Estados possíveis |
|---|---|
| Documento de referência | `vigente`, `rascunho`, `substituído` (com link para o substituto), `histórico` |
| Plano de etapa | `Planejado`, `Ativo`, `Suspenso`, `Concluído`, `Cancelado` |
| Decisão técnica | `Proposta`, `Aceita`, `Substituída`, `Obsoleta` |
| Ficha de módulo e especificação de método | Situação do item na [matriz de cobertura](../produto/matriz-cobertura.md) |

## 2. Precedência

Em caso de conflito, prevalece o documento de nível superior e o inferior é corrigido:

1. [Decisões aprovadas](../produto/decisoes-aprovadas.md) — requisitos do usuário.
2. [Catálogo funcional](../produto/catalogo-funcional.md) — escopo científico final.
3. [Roteiro do produto](../planos-execucao/roteiro-produto.md) — fases e regras de arquitetura.
4. Plano de versão (por exemplo, [plano da v0.1](../planos-execucao/plano-v0.1.md)).
5. Planos de etapa.
6. Decisões técnicas, fichas de módulo e especificações de método, dentro do que os níveis acima permitem.

## 3. Responsabilidade de cada documento

| Pergunta | Documento |
|---|---|
| O que o produto deve fazer? | `docs/produto/` |
| Em que versão e em que situação está cada item? | [Matriz de cobertura](../produto/matriz-cobertura.md) |
| Onde fica cada arquivo e responsabilidade? | [Estrutura do repositório](../arquitetura/estrutura-repositorio.md) e [mapa de módulos](../arquitetura/mapa-modulos.md) |
| O que fazer agora e como verificar? | Plano ativo em [`docs/planos-execucao/ativos/`](../planos-execucao/README.md) |
| Por que uma escolha técnica foi feita? | [Decisões técnicas](../decisoes-tecnicas/README.md) |
| Como um módulo funciona e onde alterá-lo? | `docs/modulos/` |
| Qual é a fórmula e a referência de um método? | `docs/metodos/` |
| Como instalar, executar ou exportar? | `docs/guias/` (criado na ET01) |

Cada informação tem um único documento responsável; os demais apontam para ele por link em vez de repetir o conteúdo.

## 4. Escrita

- Português do Brasil, frases diretas, termos estatísticos consistentes com o [catálogo](../produto/catalogo-funcional.md).
- Distinguir sempre **requisito aprovado**, **proposta técnica**, **implementado** e **validado**. Não afirmar que algo existe, funciona ou foi validado sem evidência ligada.
- Comandos de execução entram em README e guias somente depois de executados com sucesso.
- Tabelas para dados comparáveis; listas numeradas para sequências; diagramas Mermaid quando a relação entre partes não couber em uma frase.
- Referências bibliográficas completas nas especificações de métodos; links para fontes primárias quando houver.
- Materiais de `referencias/` podem fundamentar o texto, mas não são copiados nem anexados.

## 5. Links

- Links relativos entre documentos do repositório; links absolutos apenas para fontes externas.
- O texto do link descreve o destino (`[decisões aprovadas](...)`), não o nome do arquivo.
- Renomear ou mover um documento exige atualizar todos os links no mesmo commit. A verificação automática de links entra na CI na ET01.

## 6. Atualização junto com o código

Um pull request que altera comportamento atualiza, no mesmo conjunto de mudanças:

- O plano da etapa (tarefas, progresso, desvios).
- O [mapa de módulos](../arquitetura/mapa-modulos.md) e a [estrutura do repositório](../arquitetura/estrutura-repositorio.md), se nomes ou caminhos mudarem.
- A ficha do módulo e a especificação do método afetados.
- A [matriz de cobertura](../produto/matriz-cobertura.md), se a situação de um item mudar.
- README e guias, se comandos mudarem.

## 7. Idiomas da documentação

A documentação de desenvolvimento é escrita em português. O README possui versão em inglês (`README.en.md`), mantida em paridade de conteúdo essencial. Outras traduções usam o sufixo `.en.md` e são acrescentadas quando necessárias. A exigência de dois idiomas desde o início se aplica ao produto.
