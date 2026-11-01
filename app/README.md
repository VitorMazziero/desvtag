# Implementação do EnziTAG Optima

Nesta etapa, as pastas abaixo reservam as responsabilidades da arquitetura aceita. Não há código executável nem configuração de compilação.

| Pasta | Responsabilidade |
|---|---|
| [crates/optima-core](crates/optima-core/README.md) | Dados e procedimentos científicos em Rust |
| [crates/optima-wasm](crates/optima-wasm/README.md) | Integração do núcleo com o navegador |
| [web](web/README.md) | Interface compartilhada TypeScript/React |
| [desktop](desktop/README.md) | Integração Windows/Tauri |

O núcleo recebe dados e configurações e devolve resultados estruturados. Windows e navegador utilizam o mesmo procedimento científico por integrações próprias. A interface transforma esses resultados em tabelas, gráficos e explicações curtas.

O primeiro percurso é cadastrar dados, calcular média e variância e apresentar o resultado nos dois ambientes. O [plano detalhado](../plans/PLANO_IMPLEMENTACAO.md) define F00–F14. O [mapa de módulos e arquivos](../docs/MAPA_MODULOS.md) identifica cada responsabilidade e prevê os pacotes adicionais `optima-project` (documento) e `optima-engine` (operações comuns), ainda não criados.

Os manifests de Rust, dependências da interface e configurações do Tauri serão criados com o início da implementação, incluindo as respectivas instruções de execução.
