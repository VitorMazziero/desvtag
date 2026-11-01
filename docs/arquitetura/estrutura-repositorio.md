# Estrutura do repositório

**Estado:** vigente · **Atualizado em:** 2026-11-01

Base da estrutura do projeto: onde cada tipo de arquivo fica, o que já existe e qual etapa cria o restante. Os nomes seguem a [convenção de nomenclatura](../convencoes/nomenclatura.md); os arquivos internos de cada módulo estão no [mapa de módulos](mapa-modulos.md).

Marcação usada abaixo: **existe** — presente no repositório; **ETnn** — criado na etapa indicada do [plano da v0.1](../planos-execucao/plano-v0.1.md). Não criar pastas ou arquivos vazios antes da etapa correspondente.

## Árvore de referência

```text
enzitag-optima/
├── .github/
│   ├── workflows/ci.yml              # existe (ET01); ET10 acrescenta publicação web e Releases
│   └── pull_request_template.md      # existe (ET01)
├── app/                              # Código do aplicativo
│   ├── README.md                     # existe
│   ├── Cargo.toml                    # existe (ET01) workspace Rust
│   ├── Cargo.lock                    # existe (ET01)
│   ├── .cargo/config.toml            # existe (ET01) destino dos tipos gerados pelo ts-rs
│   ├── crates/
│   │   ├── optima-core/              # existe (ET01: ids, issues, registro; ET02: dados, descritiva, soma, fatos; ET04: numeric, distributions, models, inference, diagnostics; ET05: comparisons, visualization)
│   │   │   ├── Cargo.toml
│   │   │   ├── README.md
│   │   │   ├── src/lib.rs            # API pública pequena
│   │   │   ├── src/<módulo>/mod.rs   # um diretório por módulo C01–C19
│   │   │   └── tests/<módulo>_tests.rs
│   │   ├── optima-project/           # existe (ET01 documento mínimo); ET03 conteúdo (P01–P03)
│   │   ├── optima-engine/            # existe (ET01: E01); E02 na ET08
│   │   └── optima-wasm/              # existe (ET01: E03)
│   ├── desktop/                      # existe (README)
│   │   ├── tests/native-smoke.mjs    # existe (ET01) verificação nativa via WebDriver
│   │   └── src-tauri/                # existe (ET01: E04), workspace Cargo próprio
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       ├── capabilities/
│   │       ├── icons/
│   │       └── src/{main,lib,commands,jobs}.rs   # files (ET03) e updater (ET10)
│   └── web/                          # existe (ET01)
│       ├── package.json              # único pacote JS (DT-0003)
│       ├── scripts/{gen-contracts,build-wasm}.mjs
│       ├── index.html
│       ├── tsconfig.json  biome.json  vite.config.ts  playwright.config.ts
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app/                  # U01
│       │   ├── features/<funcionalidade>/   # U02–U11, U14–U16
│       │   ├── services/{engine,storage,import,charts,export,errors,logging}/
│       │   ├── state/
│       │   ├── workers/engine.worker.ts
│       │   ├── i18n/locales/{pt-BR,en}/<namespace>.json
│       │   ├── themes/{tokens,soft-light,modern-dark,professional}.css
│       │   └── assets/               # logo e fontes locais
│       └── tests/e2e/                # existe (ET01)
├── docs/                             # Documentação em português (ver seção seguinte)
├── examples/                         # existe (README); 01-enzimas-quatro-condicoes (ET05), 02-triagem-meio-cultivo (ET06), 03-superficie-meio-cultivo (ET07), 04-otimizacao-e-confirmacao (ET08)
│   └── <nn>-<slug>/                  # README.md, dados e projeto .enzitag
├── validation/                       # existe (README)
│   ├── cases/<method_id>/<nnn>-<slug>/   # existe (descriptive_summary, import_xlsx, project_file, distributions, linear_model)
│   ├── tools/                        # existe (requirements.txt e geradores de casos em Python)
│   └── reports/v<versão>/            # ET10
├── referencias/                      # Acervo local; ignorado pelo Git
├── .editorconfig                     # existe
├── .gitattributes                    # existe
├── .gitignore                        # existe
├── rust-toolchain.toml               # existe (ET01)
├── .nvmrc                            # existe (ET01)
├── scripts/                          # existe (ET01) verificação de links da documentação e de versões
├── CHANGELOG.md                      # ET10
├── CLAUDE.md                         # existe — instruções para agentes de código
├── CONTRIBUTING.md                   # existe
├── LICENSE                           # existe (MIT)
├── README.md                         # existe (português)
└── README.en.md                      # existe (inglês)
```

## Documentação

```text
docs/
├── README.md                         # Índice geral
├── produto/                          # Requisitos: o quê e por quê
│   ├── concepcao.md
│   ├── decisoes-aprovadas.md
│   ├── catalogo-funcional.md
│   ├── matriz-cobertura.md
│   └── decisoes-pendentes.md
├── arquitetura/                      # Como o sistema se organiza
│   ├── visao-geral.md
│   ├── mapa-modulos.md
│   ├── estrutura-repositorio.md
│   ├── dependencias.md               # existe (ET01)
│   ├── formato-enzitag.md            # existe (ET03)
│   └── limites-operacionais.md       # ET10
├── planos-execucao/                  # Exclusivo para planos de execução
│   ├── README.md                     # Índice e plano ativo
│   ├── roteiro-produto.md            # Fases F00–F14
│   ├── plano-v0.1.md                 # Escopo e etapas da primeira versão
│   ├── ativos/                       # Etapas em execução
│   ├── planejados/                   # Etapas futuras ou suspensas
│   └── concluidos/                   # Etapas concluídas ou canceladas
├── decisoes-tecnicas/                # DT-0001…: escolhas técnicas com alternativas
├── convencoes/                       # Nomenclatura, documentação e fluxo de trabalho
├── modelos/                          # Modelos de plano, DT, ficha, método e caso
├── modulos/                          # Fichas por módulo: <id>-<slug>.md
├── metodos/                          # Especificações científicas: <slug>.md
├── guias/                            # existe (ET01: ambiente; ET09: exportação); uso
├── distribuicao/                     # Repositório, publicação e atualizações
├── temas/                            # Prompts originais e adaptação do Soft Light
│   ├── prompts/                      # Arquivos originais preservados byte a byte
│   └── manifesto-prompts.json        # Tamanhos e hashes dos prompts
└── imagens/                          # Logo e imagens da documentação
```

## Regras de localização

| Conteúdo | Local | Não colocar em |
|---|---|---|
| Cálculo científico | `app/crates/optima-core` | Interface, adaptadores, scripts |
| Documento do projeto e formato `.enzitag` | `app/crates/optima-project` | Serviços da interface |
| Contratos e despacho comuns | `app/crates/optima-engine` | Adaptadores WASM/Tauri |
| Transporte navegador | `app/crates/optima-wasm`, `app/web/src/workers` | Core |
| Transporte e recursos Windows | `app/desktop/src-tauri` | Core |
| Telas, gráficos, idiomas e temas | `app/web/src` | Rust |
| Requisitos e escopo | `docs/produto` | Planos de etapa |
| Tarefas e progresso | `docs/planos-execucao` | READMEs de código |
| Escolha técnica com alternativas | `docs/decisoes-tecnicas` | Comentários de código |
| Fórmulas e referências | `docs/metodos` | Fichas de módulo |
| Dados de validação e referências independentes | `validation/` | `examples/`, testes unitários |
| Exemplos distribuíveis para usuários | `examples/` | `validation/` |
| Material de terceiros sem autorização de distribuição | `referencias/` (local) | Qualquer pasta versionada |

## Materiais locais fora do Git

- `referencias/`: capturas do Protimiza e literatura de consulta.
- `plans/conversa_rust_doe_estatistica.md`: registro histórico da conversa anterior, no computador do usuário. A pasta `plans/` deixou de existir no repositório; a regra do `.gitignore` foi mantida para que esse arquivo local continue fora do Git. Ele pode ser movido para `referencias/`.
- `.local/`, credenciais, variáveis de ambiente, dependências instaladas e arquivos gerados.
