# Instruções para agentes de código

EnziTAG Optima: aplicativo de planejamento experimental, estatística e otimização. Motor científico em Rust (nativo no Windows via Tauri e WebAssembly no navegador) e interface compartilhada em TypeScript/React.

## Antes de trabalhar

1. Ler o [índice dos planos de execução](docs/planos-execucao/README.md) e o plano em `docs/planos-execucao/ativos/`. Trabalhar apenas nas tarefas da etapa ativa, salvo pedido explícito.
2. Consultar o [mapa de módulos](docs/arquitetura/mapa-modulos.md) e a [estrutura do repositório](docs/arquitetura/estrutura-repositorio.md) para saber onde cada responsabilidade fica.
3. Seguir as [convenções](docs/convencoes/README.md): nomenclatura, documentação e fluxo de trabalho.

## Regras de arquitetura

- Cálculos científicos somente em `app/crates/optima-core`; nunca em TypeScript nem nos adaptadores.
- O core não acessa rede, sistema de arquivos, idioma ou tema.
- Dependências direcionais: core ← project ← engine ← adaptadores (WASM, Tauri) ← interface.
- Resultados indefinidos são estados explícitos; não usar `NaN`, infinito ou zero como substituto.
- Cada módulo tem arquivo de entrada pequeno e arquivos por responsabilidade; sem arquivos monolíticos nem `utils.rs` científico.
- Português e inglês, três temas e as duas plataformas são requisitos desde a primeira tela.

## Documentação e evidências

- Documentação em português; código, arquivos lidos por código e mensagens de commit em inglês.
- Atualizar no mesmo pull request: plano da etapa (tarefas e registro de progresso), mapa de módulos, fichas, especificações de métodos e [matriz de cobertura](docs/produto/matriz-cobertura.md).
- Escolha técnica nova → decisão técnica em `docs/decisoes-tecnicas/` a partir do [modelo](docs/modelos/decisao-tecnica.md).
- Nunca declarar método implementado ou validado sem teste e caso de validação ligados. Comandos entram no README apenas depois de executados.
- Requisitos de produto só mudam por decisão do usuário registrada em [decisões aprovadas](docs/produto/decisoes-aprovadas.md).

## Limites

- Não versionar `referencias/`, credenciais, chaves de assinatura ou tokens.
- O repositório é privado; não alterar a visibilidade nem publicar sem decisão do usuário.
- Commits no padrão `tipo(escopo): descrição` (Conventional Commits).
