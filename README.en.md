# EnziTAG Optima

[Português](README.md) | [English](README.en.md)

**Experimental design, statistics and optimization.**

EnziTAG Optima is a planned application for researchers and students, with a guided workflow for experimental design, data analysis, treatment comparisons and process optimization. Its development is connected to the activities of the EnziTAG research group.

**Current status:** local release candidate of **v0.2.0** (experimental, branch `feat/v0.2`, **not published**). **v0.1.0** has the web version published (https://vitormazziero.github.io/enzitag-optima/) and the Windows installer in a draft release, not yet published. Implemented and validated against independent references: descriptive statistics, randomized CRD and RCBD, one-way and multifactor ANOVA (with blocks, marginal means and contrasts), treatment comparisons (Tukey/Tukey–Kramer, Games–Howell, Dunnett, Bonferroni, Holm, Kruskal–Wallis/Dunn) with compact letters, two-level designs (factorial, fractional, Plackett–Burman), central composite and Box–Behnken designs, response surfaces with model selection and comparison, contour and 3D views, desirability optimization with confirmation runs, `.enzitag` projects and export (SVG/PNG/PDF, CSV/XLSX, HTML and PDF reports) with full per-figure customization; results in sections with a side bar, six themes and the group logo. Verified in the browser (Chromium, Firefox, Chrome and Edge) and on **Windows 10** and `windows-latest` (see the [v0.2 validation report](validation/reports/v0.2.0/README.md)); **Windows 11 was not verified**. Pending, as the maintainer's own steps: publishing (or not) v0.2.0, publishing the v0.1.0 installer release and verifying the update ([coverage matrix](docs/produto/matriz-cobertura.md), [publication](docs/distribuicao/publicacao.md)); the documentation is in Portuguese. Active stages: [ET10](docs/planos-execucao/concluidos/et10-integracao-publicacao.md) and [ET11](docs/planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md).

## Run locally (browser)

Requires Rust (via `rustup`), `wasm-bindgen-cli` and Node 26 ([environment guide](docs/guias/ambiente-desenvolvimento.md)). In `app/web`:

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run preview
```

Open `http://localhost:4173`. Reproducible examples are in [`examples/`](examples/) (open them with the *Open…* button).

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
| [examples](examples/README.md) | Reproducible examples (four `.enzitag` projects) |
| [validation](validation/README.md) | Reference cases and validation evidence |

The full tree, including what exists today and which stage creates each part, is in the [repository structure](docs/arquitetura/estrutura-repositorio.md) document. Development, verification and build commands are in the [development environment guide](docs/guias/ambiente-desenvolvimento.md) (Portuguese). Planning and development documents are currently written in Portuguese; the product itself is required to support both languages from the start.

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

The [VitorMazziero/enzitag-optima](https://github.com/VitorMazziero/enzitag-optima) repository has been **public** since 2026-11-01 (user decision PD-15), under the MIT licence. GitHub Pages and Releases are the planned distribution targets; the publishing workflows exist, but **no web application or installer has been published yet** ([procedure](docs/distribuicao/publicacao.md)).

## License

Original code and documentation are available under the [MIT License](LICENSE). Third-party materials retain their respective licenses; local reference materials are excluded from the public repository.
