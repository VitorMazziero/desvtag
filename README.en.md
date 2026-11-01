# EnziTAG Optima

[Português](README.md) | [English](README.en.md)

**Experimental design, statistics and optimization.**

EnziTAG Optima is a planned application for researchers and students, with a guided workflow for experimental design, data analysis, treatment comparisons and process optimization. Its development is connected to the activities of the EnziTAG research group.

**Current status:** product defined and first version (v0.1) planned in stages. Active stage: [ET01 — technical foundation](docs/planos-execucao/ativos/et01-fundacao-tecnica.md). There is no executable application, implemented statistical method or validated scientific result yet.

## Project direction

- An intuitive interface for beginners, with user-defined factors and responses.
- Portuguese and English from the start, on Windows and in the browser.
- Initial Modern Dark, Professional and Soft Light themes, with the EnziTAG palette for Soft Light.
- The full Protimiza method catalogue, extended with the methods discussed for EnziTAG Optima.
- Experimental design and analysis of previously collected data.
- Treatment comparisons, including Tukey and compact letter displays in charts.
- 3D response surfaces, contour plots, effects, interactions and residual diagnostics.
- Single-response and multiple-response optimization.
- Short explanations alongside results.
- Local project opening and saving without signing in.
- Optional Google Drive integration, with projects stored in each user’s account.

These items describe the intended product. Methods will be implemented and validated progressively.

## Accepted architecture

| Component | Technology and responsibility |
|---|---|
| Scientific engine | Rust: models, designs, tests and optimization |
| Shared interface | TypeScript/React: tables, controls and charts |
| Windows | Tauri with the Rust engine compiled for the operating system |
| Browser | Web interface with the same engine compiled to WebAssembly |
| Validation references | Python and specialized software, outside the distributed calculation engine |

The application will use clearly separated modules with defined files, responsibilities and interfaces for maintainability. Scientific procedures will include documented formulas and independent validation.

## Repository layout

| Directory | Purpose |
|---|---|
| [app](app/README.md) | Reserved areas for the Rust engine, WebAssembly integration, web interface and Windows application |
| [docs](docs/README.md) | All documentation: product (`produto`), architecture (`arquitetura`), execution plans (`planos-execucao`), technical decisions (`decisoes-tecnicas`), conventions (`convencoes`), templates (`modelos`), modules, methods and themes |
| [examples](examples/README.md) | Reproducible examples to be developed |
| [validation](validation/README.md) | Reference cases and validation evidence |

The full tree, including what exists today and which stage creates each part, is in the [repository structure](docs/arquitetura/estrutura-repositorio.md) document. Code areas currently contain responsibility descriptions only. Build configuration and execution commands will be added in stage ET01, after they have been run. Planning and development documents are currently written in Portuguese; the product itself is required to support both languages from the start.

## Documentation

- [Documentation index](docs/README.md).
- [Execution plans and active stage](docs/planos-execucao/README.md).
- [First version (v0.1) plan](docs/planos-execucao/plano-v0.1.md): scope, ten stages (ET01–ET10), milestones and release criteria.
- [Product roadmap (F00–F14)](docs/planos-execucao/roteiro-produto.md).
- [Approved decisions](docs/produto/decisoes-aprovadas.md).
- [Approved functional catalogue](docs/produto/catalogo-funcional.md) and [coverage matrix](docs/produto/matriz-cobertura.md).
- [Product definition and requirements](docs/produto/concepcao.md).
- [Pending decisions](docs/produto/decisoes-pendentes.md).
- [Architecture and module organization](docs/arquitetura/visao-geral.md).
- [Module and file map](docs/arquitetura/mapa-modulos.md).
- [Repository structure](docs/arquitetura/estrutura-repositorio.md).
- [Naming, documentation and workflow conventions](docs/convencoes/README.md).
- [Visual themes and original prompts](docs/temas/README.md).
- [Contributing](CONTRIBUTING.md).
- [GitHub repository](docs/distribuicao/repositorio-github.md).

## Intended distribution

The [VitorMazziero/enzitag-optima](https://github.com/VitorMazziero/enzitag-optima) repository has been created and is **private for now**, as requested on 2026-11-01. The `main` branch tracks `origin/main`. GitHub Pages and Releases remain the planned application distribution targets; no web application or Windows installer has been published. Making the source public is deferred to a later user decision.

## License

Original code and documentation are available under the [MIT License](LICENSE). Third-party materials retain their respective licenses; local reference materials are excluded from the public repository.
