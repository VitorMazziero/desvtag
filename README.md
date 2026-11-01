# EnziTAG Optima

[Português](README.md) | [English](README.en.md)

**Planejamento experimental, estatística e otimização.**

EnziTAG Optima é um projeto de aplicativo para pesquisadores e estudantes, com fluxo guiado de planejamento e análise de experimentos, comparações de tratamentos e otimização de processos. O desenvolvimento está ligado às atividades do grupo de pesquisa EnziTAG.

**Estado atual:** produto definido e primeira versão (v0.1) planejada em etapas. Etapa ativa: [ET01 — fundação técnica](docs/planos-execucao/ativos/et01-fundacao-tecnica.md). Ainda não há aplicativo executável, métodos implementados ou resultados científicos validados.

## Direção do projeto

- Interface intuitiva para usuários iniciantes, com fatores e respostas definidos pelo usuário.
- Português e inglês desde o início, no Windows e no navegador.
- Temas iniciais Modern Dark, Professional e Soft Light, com paleta EnziTAG neste último.
- Catálogo completo do Protimiza, acrescido dos métodos discutidos para o EnziTAG Optima.
- Planejamento de experimentos e análise de dados já coletados.
- Comparações de tratamentos, incluindo Tukey e letras nos gráficos.
- Superfícies 3D, contornos, efeitos, interações e diagnóstico de resíduos.
- Otimização de uma ou várias respostas.
- Explicações curtas junto aos resultados.
- Uso local com abertura e salvamento de projetos sem login.
- Google Drive opcional, com projetos na conta de cada usuário.

Esses itens descrevem o produto pretendido. A cobertura de métodos será implementada e validada progressivamente.

## Arquitetura aceita

| Parte | Tecnologia e responsabilidade |
|---|---|
| Motor científico | Rust: modelos, planejamentos, testes e otimização |
| Interface compartilhada | TypeScript/React: tabelas, controles e gráficos |
| Windows | Tauri com o motor Rust compilado para o sistema |
| Navegador | Interface web com o mesmo motor compilado para WebAssembly |
| Referências de validação | Python e softwares especializados, fora do motor distribuído |

O aplicativo será organizado em módulos com arquivos, responsabilidades e interfaces definidos para facilitar manutenção. Procedimentos científicos terão fórmulas e validação independente documentadas.

## Estrutura

```text
enzitag-optima/
├── app/                      # Código do aplicativo (áreas reservadas até a ET01)
│   ├── crates/
│   │   ├── optima-core/      # Núcleo científico Rust
│   │   └── optima-wasm/      # Integração com WebAssembly
│   ├── desktop/              # Aplicativo Windows/Tauri
│   └── web/                  # Interface compartilhada
├── docs/                     # Documentação (português)
│   ├── produto/              # Concepção, decisões, catálogo e matriz de cobertura
│   ├── arquitetura/          # Visão geral, mapa de módulos e estrutura do repositório
│   ├── planos-execucao/      # Roteiro, plano da v0.1 e etapas ativas/planejadas/concluídas
│   ├── decisoes-tecnicas/    # Decisões técnicas (DT)
│   ├── convencoes/           # Nomenclatura, documentação e fluxo de trabalho
│   ├── modelos/              # Modelos de documentos
│   ├── modulos/  metodos/    # Fichas de módulos e especificações de métodos
│   └── distribuicao/  temas/ # Repositório e publicação; temas visuais
├── examples/                 # Exemplos reproduzíveis a desenvolver
├── validation/               # Casos de referência e evidências
└── referencias/              # Acervo local, ignorado pelo Git
```

A árvore completa, com o que já existe e a etapa que cria cada parte, está em [estrutura do repositório](docs/arquitetura/estrutura-repositorio.md). As áreas de código contêm, nesta etapa, apenas a descrição de suas responsabilidades. Os arquivos de configuração e comandos de execução serão acrescentados na ET01, depois de executados.

## Documentação

- [Índice da documentação](docs/README.md).
- [Planos de execução e etapa ativa](docs/planos-execucao/README.md).
- [Plano da primeira versão (v0.1)](docs/planos-execucao/plano-v0.1.md).
- [Roteiro do produto (F00–F14)](docs/planos-execucao/roteiro-produto.md).
- [Decisões aprovadas](docs/produto/decisoes-aprovadas.md).
- [Catálogo funcional aprovado](docs/produto/catalogo-funcional.md) e [matriz de cobertura](docs/produto/matriz-cobertura.md).
- [Concepção e requisitos](docs/produto/concepcao.md).
- [Decisões pendentes](docs/produto/decisoes-pendentes.md).
- [Arquitetura e organização modular](docs/arquitetura/visao-geral.md).
- [Mapa de módulos e arquivos](docs/arquitetura/mapa-modulos.md).
- [Estrutura do repositório](docs/arquitetura/estrutura-repositorio.md).
- [Convenções de nomes, documentação e fluxo de trabalho](docs/convencoes/README.md).
- [Organização da implementação](app/README.md).
- [Temas visuais e prompts originais](docs/temas/README.md).
- [Validação dos cálculos](validation/README.md).
- [Como contribuir](CONTRIBUTING.md).
- [Repositório GitHub](docs/distribuicao/repositorio-github.md).

## Distribuição pretendida

O repositório [VitorMazziero/enzitag-optima](https://github.com/VitorMazziero/enzitag-optima) foi criado e está **privado por enquanto**, conforme decisão de 2026-11-01. A branch `main` está vinculada ao remoto `origin`. GitHub Pages e Releases permanecem como destinos previstos para o aplicativo; ainda não há versão web ou instalador publicado. Tornar o código público fica para uma decisão posterior do usuário.

## Licença

Código e documentação própria sob a [licença MIT](LICENSE). Materiais de terceiros preservam suas licenças; referências locais não integram o repositório público.
