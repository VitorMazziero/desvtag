# EnziTAG Optima

[Português](README.md) | [English](README.en.md)

**Experimental design, statistics and optimization.**

EnziTAG Optima is a planned application for researchers and students, with a guided workflow for experimental design, data analysis, treatment comparisons and process optimization. Its development is connected to the activities of the EnziTAG research group.

**Current status:** repository organization and product definition. There is no executable application, implemented statistical method or validated scientific result yet.

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
| [docs](docs/README.md) | Method documentation and learning materials |
| [examples](examples/README.md) | Reproducible examples to be developed |
| [plans](plans/CONCEPCAO_APP.md) | Product definition, architecture and pending decisions |
| [validation](validation/README.md) | Reference cases and validation evidence |

Code areas currently contain responsibility descriptions only. Build configuration and execution commands will be added when implementation starts. Planning and development documents are currently written in Portuguese; the product itself is required to support both languages from the start.

## Documentation

- [Detailed implementation plan](plans/PLANO_IMPLEMENTACAO.md).
- [Approved decisions](plans/DECISOES_APROVADAS.md).
- [Module and file map](docs/MAPA_MODULOS.md).
- [Product definition and requirements](plans/CONCEPCAO_APP.md).
- [Approved functional catalogue](plans/CATALOGO_FUNCIONAL.md).
- [Architecture and module organization](plans/ARQUITETURA_E_APRENDIZADO.md).
- [Pending decisions](plans/DECISOES_PENDENTES.md).
- [Visual themes and original prompts](docs/temas/README.md).
- [Contributing](CONTRIBUTING.md).
- [GitHub preparation](docs/GITHUB.md).

## Intended distribution

The repository name selected is `enzitag-optima`, under the `VitorMazziero` account. The approved distribution plan uses GitHub Pages for the browser version and GitHub Releases for Windows packages. Remote publication has not taken place yet.

## License

Original code and documentation are available under the [MIT License](LICENSE). Third-party materials retain their respective licenses; local reference materials are excluded from the public repository.
