# EnziTAG Optima

[Português](README.md) | [English](README.en.md)

**Planejamento experimental, estatística e otimização.**

EnziTAG Optima é um projeto de aplicativo para pesquisadores e estudantes, com fluxo guiado de planejamento e análise de experimentos, comparações de tratamentos e otimização de processos. O desenvolvimento está ligado às atividades do grupo de pesquisa EnziTAG.

**Estado atual:** candidata à primeira versão (v0.1.0, experimental), **com a versão web publicada** (https://vitormazziero.github.io/enzitag-optima/) **e o instalador do Windows em rascunho de release, ainda não publicado**. Implementados e validados contra referências independentes: estatística descritiva, DIC aleatorizado, ANOVA de um fator com Tukey/Tukey–Kramer e letras, planejamentos de dois níveis (fatorial, fracionário, Plackett–Burman), compostos centrais e Box–Behnken, superfície de resposta com contornos e 3D, otimização por desejabilidade com ensaios de confirmação, projetos `.enzitag` e exportação (SVG/PNG, CSV/XLSX, relatório HTML) com personalização por figura. Verificada no navegador (Chromium, Firefox, Chrome e Edge) e no Windows 10 e em `windows-latest`; **Windows 11 não foi verificado**. Pendentes, por ato do mantenedor: publicar o release do instalador e verificar a atualização ([plano da v0.1](docs/planos-execucao/plano-v0.1.md), [matriz de cobertura](docs/produto/matriz-cobertura.md), [publicação](docs/distribuicao/publicacao.md)). Etapa ativa: [ET10](docs/planos-execucao/ativos/et10-integracao-publicacao.md).

## Executar localmente (navegador)

Requer Rust (via `rustup`), `wasm-bindgen-cli` e Node 22 ([guia do ambiente](docs/guias/ambiente-desenvolvimento.md)). Em `app/web`:

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run preview
```

Abra `http://localhost:4173`. Os exemplos reproduzíveis estão em [`examples/`](examples/) (abrir pelo botão *Abrir…*).

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
├── examples/                 # Exemplos reproduzíveis (quatro projetos .enzitag)
├── validation/               # Casos de referência e evidências
└── referencias/              # Acervo local, ignorado pelo Git
```

A árvore completa, com o que já existe e a etapa que cria cada parte, está em [estrutura do repositório](docs/arquitetura/estrutura-repositorio.md). Comandos de desenvolvimento, verificação e build estão no [guia do ambiente](docs/guias/ambiente-desenvolvimento.md).

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
- [Guia do ambiente de desenvolvimento](docs/guias/ambiente-desenvolvimento.md).
- [Guia de exportação](docs/guias/exportacao.md).
- [Dependências](docs/arquitetura/dependencias.md) e [decisões técnicas](docs/decisoes-tecnicas/README.md).
- [Organização da implementação](app/README.md).
- [Temas visuais e prompts originais](docs/temas/README.md).
- [Validação dos cálculos](validation/README.md).
- [Como contribuir](CONTRIBUTING.md).
- [Repositório GitHub](docs/distribuicao/repositorio-github.md).

## Distribuição pretendida

O repositório [VitorMazziero/enzitag-optima](https://github.com/VitorMazziero/enzitag-optima) é **público** desde 2026-11-01 (decisão PD-15 do usuário), sob licença MIT. GitHub Pages e Releases são os destinos previstos para o aplicativo; os fluxos de publicação existem, mas **nenhuma versão web ou instalador foi publicado ainda** ([procedimento](docs/distribuicao/publicacao.md)).

## Licença

Código e documentação própria sob a [licença MIT](LICENSE). Materiais de terceiros preservam suas licenças; referências locais não integram o repositório público.
