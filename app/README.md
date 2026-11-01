# Implementação do EnziTAG Optima

Nesta etapa, as pastas abaixo reservam as responsabilidades da arquitetura aceita. Não há código executável nem configuração de compilação.

| Pasta | Responsabilidade |
|---|---|
| [crates/optima-core](crates/optima-core/README.md) | Dados e procedimentos científicos em Rust |
| [crates/optima-wasm](crates/optima-wasm/README.md) | Integração do núcleo com o navegador |
| [web](web/README.md) | Interface compartilhada TypeScript/React |
| [desktop](desktop/README.md) | Integração Windows/Tauri |

O núcleo recebe dados e configurações e devolve resultados estruturados. Windows e navegador utilizam o mesmo procedimento científico por integrações próprias. A interface transforma esses resultados em tabelas, gráficos e explicações curtas.

O primeiro percurso é cadastrar dados, calcular média e variância e apresentar o resultado nos dois ambientes. O [roteiro do produto](../docs/planos-execucao/roteiro-produto.md) define F00–F14 e o [plano da v0.1](../docs/planos-execucao/plano-v0.1.md) organiza a primeira versão em etapas. O [mapa de módulos e arquivos](../docs/arquitetura/mapa-modulos.md) identifica cada responsabilidade e prevê os pacotes adicionais `optima-project` (documento) e `optima-engine` (operações comuns), ainda não criados. A árvore de arquivos prevista para esta pasta está na [estrutura do repositório](../docs/arquitetura/estrutura-repositorio.md).

Os manifests de Rust, dependências da interface e configurações do Tauri serão criados na [ET01 — fundação técnica](../docs/planos-execucao/ativos/et01-fundacao-tecnica.md), incluindo as respectivas instruções de execução.
