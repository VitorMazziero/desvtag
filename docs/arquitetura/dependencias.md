# Dependências

**Estado:** vigente · **Atualizado em:** 2026-11-01

Inventário das dependências **diretas**, com versão, papel, licença e compatibilidade com WebAssembly. Versões vêm dos manifestos e dos arquivos de trava (`app/Cargo.lock`, `app/desktop/src-tauri/Cargo.lock`, `app/web/package-lock.json`). Nenhuma dependência implementa procedimento estatístico: as regras científicas permanecem em `optima-core` ([regras de arquitetura](../planos-execucao/roteiro-produto.md#2-arquitetura-e-fronteiras)). Escolhas em [DT-0003](../decisoes-tecnicas/dt-0003-toolchain-ferramentas-web-wasm.md), [DT-0005](../decisoes-tecnicas/dt-0005-contrato-serializacao-tipos.md) e [DT-0006](../decisoes-tecnicas/dt-0006-idiomas-temas-fontes.md). A auditoria completa de licenças transitivas ocorre na [ET10](../planos-execucao/concluidos/et10-integracao-publicacao.md).

## Rust

| Crate | Versão (lock) | Papel | Licença | Compatível com WASM | Consumidor |
|---|---|---|---|---|---|
| `serde` | 1.0.229 | Serialização dos contratos e do documento | MIT OR Apache-2.0 | Sim | core, project, engine |
| `serde_json` | 1.0.154 | Texto JSON do protocolo | MIT OR Apache-2.0 | Sim | engine (e testes) |
| `ts-rs` | 12.0.1 | Geração dos tipos TypeScript (sem efeito em execução) | MIT | Sim | core, project, engine |
| `wasm-bindgen` | 0.2.130 (`=`) | Ligação Rust↔JavaScript no navegador | MIT OR Apache-2.0 | É o alvo | wasm |
| `zip` | 9.2.1 (`deflate`) | Contêiner ZIP do `.enzitag` (leitura e escrita) | MIT | Sim (compila para `wasm32-unknown-unknown`) | project |
| `sha2` | 0.11.1 | SHA-256 de integridade (arquivo e revisões) | MIT OR Apache-2.0 | Sim | project |
| `base64` | 0.23.1 | Bytes em texto JSON no protocolo | MIT OR Apache-2.0 | Sim | project, engine, desktop |
| `calamine` | 0.37.0 | Leitura de valores armazenados de XLSX | MIT | Sim | project |
| `tauri-plugin-dialog` | 2.x | Diálogos nativos de abrir/salvar (Windows) | MIT OR Apache-2.0 | Não se aplica | desktop |
| `tauri` | 2.12.5 | Aplicativo desktop (WebView e comandos) | Apache-2.0 OR MIT | Não se aplica (nativo) | desktop |
| `tauri-build` | 2.7.4 | Geração de recursos no build | Apache-2.0 OR MIT | Não se aplica | desktop |

Ferramentas de linha de comando (não entram no aplicativo): `wasm-bindgen-cli` 0.2.130 (deve coincidir com a crate), `tauri-driver` 2.1.0 (verificação nativa).

## JavaScript e TypeScript

| Pacote | Versão | Papel | Licença |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | Interface | MIT |
| `i18next` | 26.6.0 | Idiomas, interpolação e plural | MIT |
| `react-i18next` | 17.1.10 | Integração do i18next com React | MIT |
| `@tauri-apps/api` | 2.12.4 | Chamada de comandos Tauri | Apache-2.0 OR MIT |
| `pdfmake` | 0.3.13 | PDF de figuras e de relatórios (carregado sob demanda, só na exportação; traz `pdfkit`, `fontkit`, `png-js` e outras, todas MIT/BlueOak-1.0.0/0BSD; [DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)); inclui a fonte Roboto (OFL-1.1) embutida nos PDFs | MIT |
| `@fontsource/host-grotesk`, `instrument-sans`, `geist-sans`, `geist-mono`, `eb-garamond`, `ibm-plex-mono` | 5.3.0 | Fontes locais dos temas (subconjunto latin; `ibm-plex-mono` no Industrial, v0.2) | OFL-1.1 |
| `@fontsource/source-serif-4` | 5.3.1 | Fonte dos títulos do tema Organic (v0.2; [DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)) | OFL-1.1 |
| `vite` | 8.3.5 | Bundler e servidor de desenvolvimento | MIT |
| `@vitejs/plugin-react` | 6.1.2 | Plugin React do Vite | MIT |
| `typescript` | 7.0.2 | Verificação de tipos | Apache-2.0 |
| `vitest` | 5.0.5 | Testes unitários e de componente | MIT |
| `jsdom` | 30.1.3 | DOM nos testes | MIT |
| `@testing-library/react` 16.3.3, `dom` 10.4.2, `user-event` 14.6.8, `jest-dom` 6.9.1 | — | Testes de componentes | MIT |
| `@playwright/test` | 1.64.1 | Testes E2E em navegadores reais | Apache-2.0 |
| `fake-indexeddb` | 6.x | IndexedDB simulado nos testes de recuperação (somente desenvolvimento) | Apache-2.0 |
| `@axe-core/playwright` | 4.14.0 | Varredura automática de acessibilidade nos E2E (somente desenvolvimento) | MPL-2.0 |
| `@biomejs/biome` | 2.6.4 | Lint e formatação | MIT OR Apache-2.0 |
| `@tauri-apps/cli` | 2.12.4 | Build e ícones do aplicativo Windows | Apache-2.0 OR MIT |
| `@types/node` 26.6.6, `@types/react` 19.3.0, `@types/react-dom` 19.3.0 | — | Tipos (`@types/node` acompanha o Node 26 da v0.2, [DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)) | MIT |

## Observações

- A licença do projeto é MIT; as licenças acima são compatíveis. As fontes OFL-1.1 exigem preservar o aviso de licença quando distribuídas: incluir nas notas de terceiros do instalador e do site (ET10).
- Acrescentar dependência exige nova linha nesta tabela com finalidade, licença e compatibilidade WASM no mesmo pull request.
- Bibliotecas numéricas: **nenhuma** foi adotada na ET04. Álgebra linear (QR, SVD de Jacobi), funções especiais e distribuições são implementação própria no `optima-core` ([DT-0009](../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md)). A única mudança de dependência é a característica `float_roundtrip` de `serde_json`, que garante a leitura exata de decimais.
- Ambiente Python de referência (fora do aplicativo): `numpy`, `scipy`, `mpmath`, `openpyxl` em `validation/tools/requirements.txt`.
