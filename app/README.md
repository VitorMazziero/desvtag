# Implementação do EnziTAG Optima

Código da implementação, criado por etapas ([plano da v0.1](../docs/planos-execucao/plano-v0.1.md)). Existem o workspace Rust (`optima-core`, `optima-project`, `optima-engine`, `optima-wasm`), a interface React/TypeScript e o pacote Tauri, com os métodos da v0.1 implementados nas ET02–ET09 (ver a [matriz de cobertura](../docs/produto/matriz-cobertura.md)). Comandos: [guia do ambiente](../docs/guias/ambiente-desenvolvimento.md).

| Pasta | Responsabilidade |
|---|---|
| [crates/optima-core](crates/optima-core/README.md) | Dados e procedimentos científicos em Rust |
| [crates/optima-wasm](crates/optima-wasm/README.md) | Integração do núcleo com o navegador |
| [web](web/README.md) | Interface compartilhada TypeScript/React |
| [desktop](desktop/README.md) | Integração Windows/Tauri |

O núcleo recebe dados e configurações e devolve resultados estruturados. Windows e navegador utilizam o mesmo procedimento científico por integrações próprias. A interface transforma esses resultados em tabelas, gráficos e explicações curtas.

O [roteiro do produto](../docs/planos-execucao/roteiro-produto.md) define F00–F14 e o [plano da v0.1](../docs/planos-execucao/plano-v0.1.md) organiza a primeira versão em etapas. O [mapa de módulos e arquivos](../docs/arquitetura/mapa-modulos.md) identifica cada responsabilidade e prevê os pacotes adicionais `optima-project` (documento) e `optima-engine` (operações comuns), ainda não criados. A árvore de arquivos prevista para esta pasta está na [estrutura do repositório](../docs/arquitetura/estrutura-repositorio.md).

Os pacotes `optima-project` e `optima-engine`, previstos no mapa, já existem em `crates/`.
