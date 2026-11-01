# Estrutura do repositório

**Estado:** vigente · **Atualizado em:** 2026-11-01

Base da estrutura do projeto: onde cada tipo de arquivo fica, o que já existe e qual etapa cria o restante. Os nomes seguem a [convenção de nomenclatura](../convencoes/nomenclatura.md); os arquivos internos de cada módulo estão no [mapa de módulos](mapa-modulos.md).

Marcação usada abaixo: **existe** — presente no repositório; **ETnn** — criado na etapa indicada do [plano da v0.1](../planos-execucao/plano-v0.1.md). Não criar pastas ou arquivos vazios antes da etapa correspondente.

## Árvore de referência

```text
enzitag-optima/
├── .github/
│   ├── workflows/                    # ET01 verificações; ET10 publicação web e Releases
│   └── pull_request_template.md      # ET01
├── app/                              # Código do aplicativo
│   ├── README.md                     # existe
│   ├── Cargo.toml                    # ET01 workspace Rust
│   ├── Cargo.lock                    # ET01
│   ├── crates/
│   │   ├── optima-core/              # existe (README); ET01 pacote
│   │   │   ├── Cargo.toml
│   │   │   ├── README.md
│   │   │   ├── src/lib.rs            # API pública pequena
│   │   │   ├── src/<módulo>/mod.rs   # um diretório por módulo C01–C19
│   │   │   └── tests/<módulo>_tests.rs
│   │   ├── optima-project/           # ET01 pacote; ET03 conteúdo (P01–P03)
│   │   ├── optima-engine/            # ET01 (E01–E02)
│   │   └── optima-wasm/              # existe (README); ET01 pacote (E03)
│   ├── desktop/                      # existe (README)
│   │   └── src-tauri/                # ET01 (E04)
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       ├── capabilities/
│   │       ├── icons/
│   │       └── src/{main,lib,commands,jobs,files,updater}.rs
│   └── web/                          # existe (README); ET01 projeto
│       ├── package.json              # ET01 (local conforme DT de workspace JS)
│       ├── index.html
│       ├── tsconfig.json
│       ├── public/
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
│       └── tests/e2e/                # ET02
├── docs/                             # Documentação em português (ver seção seguinte)
├── examples/                         # existe (README); exemplos a partir da ET03
│   └── <nn>-<slug>/                  # README.md, dados e projeto .enzitag
├── validation/                       # existe (README)
│   ├── cases/<method_id>/<nnn>-<slug>/   # ET02 em diante
│   ├── tools/                        # ET02 ambiente Python de referência
│   └── reports/v<versão>/            # ET10
├── referencias/                      # Acervo local; ignorado pelo Git
├── .editorconfig                     # existe
├── .gitattributes                    # existe
├── .gitignore                        # existe
├── rust-toolchain.toml               # ET01
├── .nvmrc                            # ET01 (ou campo engines, conforme DT)
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
│   ├── dependencias.md               # ET01
│   ├── formato-enzitag.md            # ET03
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
├── guias/                            # ET01: ambiente; ET09: exportação; uso
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
