# EnziTAG Optima

**Planejamento experimental, estatística e otimização.**

EnziTAG Optima é um projeto de aplicativo para pesquisadores e estudantes, com fluxo guiado de planejamento e análise de experimentos, comparações de tratamentos e otimização de processos. O desenvolvimento está ligado às atividades do grupo de pesquisa EnziTAG.

**Estado atual:** organização inicial do repositório e definição do produto. Ainda não há aplicativo executável, métodos implementados ou resultados científicos validados.

## Direção do projeto

- Interface intuitiva para usuários iniciantes, com fatores e respostas definidos pelo usuário.
- Planejamento de experimentos e análise de dados já coletados.
- Comparações de tratamentos, incluindo Tukey e letras nos gráficos.
- Superfícies 3D, contornos, efeitos, interações e diagnóstico de resíduos.
- Otimização de uma ou várias respostas.
- Explicações curtas junto aos resultados.
- Uso local com abertura e salvamento de projetos sem login.
- Google Drive como integração opcional em avaliação.

Esses itens descrevem o produto pretendido. A cobertura de métodos será implementada e validada progressivamente.

## Arquitetura aceita

| Parte | Tecnologia e responsabilidade |
|---|---|
| Motor científico | Rust: modelos, planejamentos, testes e otimização |
| Interface compartilhada | TypeScript/React: tabelas, controles e gráficos |
| Windows | Tauri com o motor Rust compilado para o sistema |
| Navegador | Interface web com o mesmo motor compilado para WebAssembly |
| Referências de validação | Python e softwares especializados, fora do motor distribuído |

Os procedimentos serão desenvolvidos em módulos compreensíveis, com fórmulas, exemplos, resultados intermediários e comparação com implementações independentes.

## Estrutura

```text
EnziTAG Optima/
├── app/                  # Áreas reservadas à implementação
│   ├── crates/
│   │   ├── optima-core/  # Núcleo científico Rust
│   │   └── optima-wasm/  # Integração com WebAssembly
│   ├── desktop/          # Aplicativo Windows/Tauri
│   └── web/              # Interface compartilhada
├── docs/                 # Documentação dos métodos e aprendizagem
├── examples/             # Exemplos reproduzíveis a desenvolver
├── plans/                # Concepção, arquitetura e decisões
├── validation/           # Casos de referência e evidências
└── referencias/          # Acervo local, ignorado pelo Git
```

As áreas de código contêm, nesta etapa, apenas a descrição de suas responsabilidades. Os arquivos de configuração e comandos de execução serão acrescentados quando a implementação começar.

## Documentação

- [Concepção e requisitos](plans/CONCEPCAO_APP.md).
- [Arquitetura e sequência de aprendizagem](plans/ARQUITETURA_E_APRENDIZADO.md).
- [Decisões pendentes](plans/DECISOES_PENDENTES.md).
- [Organização da implementação](app/README.md).
- [Guia da documentação](docs/README.md).
- [Validação dos cálculos](validation/README.md).
- [Como contribuir](CONTRIBUTING.md).
- [Preparação do GitHub](docs/GITHUB.md).

## Distribuição pretendida

O nome escolhido para o repositório é `enzitag-optima`, na conta `VitorMazziero`. A proposta é usar GitHub Pages para a versão web e GitHub Releases para os pacotes Windows. A publicação remota ainda não foi realizada.

## Licença

A licença ainda será escolhida. Nenhuma licença de software foi aplicada nesta etapa.
