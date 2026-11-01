# Convenção de nomenclatura

**Estado:** vigente · **Atualizado em:** 2026-11-01

Regras de nomes para documentos, pastas, identificadores, código e Git. Adotada pela [DT-0001](../decisoes-tecnicas/dt-0001-estrutura-documentacao-nomenclatura.md), que também registra a correspondência entre nomes antigos e novos.

## 1. Princípio de idioma

| Item | Idioma | Motivo |
|---|---|---|
| Documentação e nomes de documentos | Português do Brasil, sem acentos no nome do arquivo | Idioma de trabalho do projeto |
| Pastas de topo (`app`, `docs`, `examples`, `validation`) e todo o código | Inglês | Convenções do ecossistema Rust, TypeScript e GitHub |
| Pastas dentro de `docs/` | Português | Conteúdo lido por pessoas |
| Arquivos consumidos por código (dados de teste, configurações, contratos) | Inglês | Lidos pelo código e por ferramentas |
| Textos da interface | Chaves em inglês; valores em `pt-BR` e `en` | Separação entre lógica e idioma |

Exceção mantida: `referencias/` (acervo local fora do Git), para não alterar a pasta já existente no computador do usuário.

## 2. Arquivos Markdown

| Tipo | Padrão | Exemplos |
|---|---|---|
| Arquivos de comunidade na raiz | MAIÚSCULAS, nome reconhecido pelo GitHub | `README.md`, `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, `CLAUDE.md` |
| Índice de pasta | `README.md` | `docs/produto/README.md` |
| Tradução para inglês | `<nome>.en.md` ao lado do original | `README.en.md` |
| Documento comum | `kebab-case`, minúsculas, ASCII, substantivo descritivo | `decisoes-aprovadas.md`, `mapa-modulos.md` |
| Documento com versão | `<nome>-v<maior>.<menor>.md` | `plano-v0.1.md` |
| Plano de etapa | `et<nn>-<slug>.md` | `et01-fundacao-tecnica.md` |
| Decisão técnica | `dt-<nnnn>-<slug>.md` | `dt-0001-estrutura-documentacao-nomenclatura.md` |
| Ficha de módulo | `<id-do-módulo>-<slug>.md` em minúsculas | `c09-comparacoes.md`, `u12-cliente-motor.md` |
| Especificação de método | `<slug>.md` | `tukey.md`, `anova-um-fator.md` |
| Modelo de documento | `<tipo>.md` em `docs/modelos/` | `plano-execucao.md` |

Regras gerais: sem espaços, sem acentos, sem `_` em documentos; ponto apenas antes da extensão, em sufixo de idioma ou em número de versão. Slugs curtos (até cinco palavras), sem artigos quando possível.

## 3. Pastas

- Pastas de documentação: `kebab-case` em português (`planos-execucao`, `decisoes-tecnicas`).
- Pastas de estado dos planos: `ativos/`, `planejados/`, `concluidos/`.
- Pastas de código: conforme a linguagem (seção 5).
- Toda pasta de categoria em `docs/` tem `README.md` como índice. Pastas de estado dos planos são indexadas por `docs/planos-execucao/README.md`; pastas de recursos (`imagens/`, `prompts/`) não precisam de índice. Pasta vazia que precise existir usa `.gitkeep`.

## 4. Identificadores

| Identificador | Formato | Exemplo | Onde é definido |
|---|---|---|---|
| Fase do roteiro | `F<nn>`, subentregas com letra | `F05`, `F09c` | [Roteiro do produto](../planos-execucao/roteiro-produto.md) |
| Marco | `M<n>` | `M2` | Roteiro do produto |
| Versão | `v<maior>.<menor>.<correção>` | `v0.1.0` | [DT-0002](../decisoes-tecnicas/dt-0002-versionamento-primeira-versao.md) |
| Etapa de execução | `ET<nn>`, global e nunca reutilizado | `ET03` | [Planos de execução](../planos-execucao/README.md) |
| Tarefa | `T<nn>` no plano; `ET<nn>-T<nn>` fora dele | `ET03-T08` | Plano da etapa |
| Decisão técnica | `DT-<nnnn>` | `DT-0002` | [Decisões técnicas](../decisoes-tecnicas/README.md) |
| Pendência | `PD-<nn>` | `PD-15` | [Decisões pendentes](../produto/decisoes-pendentes.md) |
| Módulo | `C`, `P`, `E` ou `U` + dois dígitos | `C09`, `U12` | [Mapa de módulos](../arquitetura/mapa-modulos.md) |
| Método no registro do motor | `snake_case` em inglês | `one_way_anova`, `tukey_hsd` | Registro C19 |
| Caso de validação | `validation/cases/<method_id>/<nnn>-<slug>/` | `validation/cases/tukey_hsd/001-quatro-condicoes/` | [Validação](../../validation/README.md) |
| Exemplo | `examples/<nn>-<slug>/` | `examples/01-quatro-condicoes-enzimaticas/` | [Exemplos](../../examples/README.md) |

Prefixos `E` (módulos de execução) e `ET` (etapas) são distintos: `E03` é o adaptador WASM; `ET03` é a etapa de projeto local.

## 5. Código

### Rust

- Pacotes: `optima-<nome>` (`kebab-case`); a biblioteca correspondente é `optima_<nome>`.
- Módulos e arquivos: `snake_case` em inglês, nomeando a responsabilidade (`studentized_range.rs`, `letters.rs`). Não usar `utils.rs` para responsabilidades científicas diferentes.
- Tipos e traits: `PascalCase`; funções e variáveis: `snake_case`; constantes: `SCREAMING_SNAKE_CASE`.
- Testes de integração: `tests/<módulo>_tests.rs`.

### TypeScript e React

- Componentes: `PascalCase.tsx` (`DataGrid.tsx`).
- Lógica, serviços e contratos: `camelCase.ts` (`columnRoles.ts`); `index.ts` exporta a API pública da funcionalidade.
- Pastas de funcionalidade: minúsculas (`features/data`, `features/optimization`).
- Arquivos gerados: sufixo `.generated.ts`; nunca editados à mão.
- Testes: `<nome>.test.ts` ou `<nome>.test.tsx` ao lado do arquivo; E2E em `tests/e2e/<percurso>.spec.ts`.
- Temas: `kebab-case.css` (`soft-light.css`).
- Idiomas: `i18n/locales/<locale>/<namespace>.json`, com `locale` em BCP 47 (`pt-BR`, `en`) e namespace em minúsculas.
- Chaves de tradução: segmentos `camelCase` em inglês separados por ponto (`results.anova.title`).

### Dados e configuração

- JSON, CSV e demais arquivos lidos por código: `kebab-case` em inglês (`expected.json`, `input.csv`), exceto quando a ferramenta exige outro nome (`package.json`, `Cargo.toml`).
- Dados lidos por pessoas em `docs/`: `kebab-case` em português (`manifesto-prompts.json`).

## 6. Git

- Branch principal: `main`.
- Branches de trabalho: `<tipo>/<etapa>-<slug>`, por exemplo `feat/et02-primeiro-percurso` ou `docs/et01-guia-ambiente`. Branches criadas por ferramentas (como `claude/...`) são aceitas.
- Commits no padrão Conventional Commits: `<tipo>(<escopo>): <descrição>`, em inglês e no imperativo, mantendo o histórico existente. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`. Escopo: etapa, módulo ou área (`et03`, `c09`, `web`, `desktop`).
- Etiquetas de versão: `v<maior>.<menor>.<correção>`; candidatas: `v0.1.0-rc.<n>`.
