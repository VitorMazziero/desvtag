# Relatório de validação — candidata à v0.1.0

**Estado:** versão web **publicada** (Pages); instalador em **rascunho** de release (não publicado) · **Data:** 2026-11-01 · **Ramo:** `claude/epic-keller-3ad7jc` (PR 1 aberto contra `main`)

Este relatório distingue o que **foi executado e tem evidência** do que **permanece pendente**. Declara como publicada apenas a versão web; não declara o instalador como publicado, não declara verificação em Windows 11 e nenhum dos marcos M1, M2 ou M3 foi declarado.

## Resumo

| Pergunta | Resposta |
|---|---|
| A candidata está pronta localmente? | **Sim**: compila, passa nos testes e roda no navegador (Chromium, Firefox, Chrome e Edge) e no Windows 10 e em `windows-latest` |
| A v0.1.0 está publicada e verificada? | **Em parte.** A versão web está publicada no Pages e a etiqueta `v0.1.0` existe ([registro](../../../docs/distribuicao/publicacao.md#registro-do-que-foi-executado)); o instalador está em **rascunho** (não publicado) e a atualização não foi verificada |
| Os critérios de lançamento estão atendidos? | **Todos, exceto o 8** (publicação e verificação da atualização, ato do mantenedor) — ver a tabela abaixo |
| Windows 11 de 64 bits verificado? | **Não** (decisão do usuário). Verificado no **Windows 10 Pro 22H2** (build 19045) da máquina de desenvolvimento e em `windows-latest` (Windows Server 2025, build 26100) |

## Ambiente de verificação (Windows 10, 2026-11-01)

| Item | Versão |
|---|---|
| Sistema | Windows 10 Pro 22H2, build 19045, 64 bits |
| Ferramentas | Rust 1.97.0 (MSVC, Visual Studio Community 2026 18.10.3), Node 22.23.4, `wasm-bindgen-cli` 0.2.130, Git 2.55.0, Python 3.12 |
| WebView2 (aplicativo nativo) | 156.0.4314.58 |
| Navegadores do E2E | Chromium 156.0.8078.4 (Playwright 1.64.1), Firefox 157.0, **Google Chrome 156.0.8078.74** e **Microsoft Edge 156.0.4314.58** (instalados no sistema) |

## Critérios de lançamento ([plano da v0.1, §6](../../../docs/planos-execucao/plano-v0.1.md#6-critérios-de-lançamento-da-v010))

| # | Critério | Situação | Evidência / lacuna |
|---|---|---|---|
| 1 | ET01–ET10 concluídas com evidências | **Parcial** | ET01–ET09 concluídas (Windows 10 no lugar do Windows 11, decisão do usuário); ET10 aberta apenas pela publicação |
| 2 | Todo item `v0.1` validado ou reclassificado | **Atendido** | [Matriz](../../../docs/produto/matriz-cobertura.md); o DIC aleatorizado e a personalização por figura foram implementados; ver [lacunas restantes](#lacunas-e-reclassificações) |
| 3 | Dois percursos no Windows e em Chrome, Edge e Firefox | **Atendido (Windows 10)** | E2E de 65 testes em Chromium, Firefox, Chrome e Edge (260 aprovados) com o motor WASM real; verificação nativa no Windows 10 e em `windows-latest`. O percurso 2 é verificado como encadeamento de especificações. **Windows 11 não verificado** |
| 4 | PT/EN, três temas, teclado, foco e contraste | **Atendido nos percursos testados** | Paridade de chaves PT/EN testada; axe (WCAG 2.x A/AA) nos três temas em cada percurso; teclado na tela inicial e no fluxo; leitor de tela **não** testado |
| 5 | `.enzitag` reabre entre plataformas; recuperação, falha de escrita e arquivo inválido não perdem dados | **Atendido** | Arquivo escrito em Python lido por Rust, WASM e IPC nativo; os 4 exemplos escritos pelo WebAssembly são reabertos pelo motor nativo no Windows 10; um projeto com DIC e estilos de figura tem **SHA-256 idêntico** ao ser codificado no WebAssembly e no nativo; recuperação, descarte, arquivo inválido, esquema futuro e gravação segura (testes) |
| 6 | Formatos de exportação abertos e inspecionados | **Atendido com limites** | SVG/PNG/CSV lidos byte a byte; XLSX aberto no LibreOffice e lido com openpyxl; relatório HTML visto em PT e EN; **Excel e editor vetorial não testados** |
| 7 | Notas de versão com métodos, validação e limitações | **Atendido** | [`CHANGELOG.md`](../../../CHANGELOG.md) |
| 8 | PD-15 decidida; artefatos publicados abertos e testados; atualização verificada | **Parcial** | PD-15 decidida (repositório público); instalador local instalado/executado/desinstalado; **nada publicado** e **atualização não verificada** (exigem a etiqueta e o release, ato do mantenedor) |

## Verificações executadas nesta candidata

| Verificação | Resultado |
|---|---|
| `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` (Windows 10) | sem avisos |
| `cargo test --workspace` (nativo, Windows 10) | 401 testes aprovados, 0 falhas, 2 ignorados (medições de desempenho) |
| `npm run check:contracts` | contratos TypeScript atualizados |
| `biome check`, `tsc --noEmit` | sem erros |
| `vitest` (inclui paridade WASM × referências) | 246 aprovados |
| Playwright (motor WASM real): Chromium, Firefox, Chrome e Edge | **260 aprovados** (65 por navegador), 0 falhas |
| Pacote Tauri no Windows 10: `clippy -D warnings`, `cargo test` | sem avisos; 8 testes aprovados (gravação segura de arquivos) |
| Instalador NSIS (Windows 10) | construído e assinado para o atualizador (5,72 MiB, `.exe.sig`); instalado em modo silencioso, executado por 10 s e desinstalado sem resíduos |
| Verificação nativa no Windows 10 (WebView2 por CDP) | aprovada: `engine.info`, descritiva, `.enzitag` (Python e exemplos do WebAssembly), regressão, distribuição, ANOVA/Tukey/letras, planejamentos, superfície, otimização, XLSX, **DIC aleatorizado** e **projeto com DIC e estilos de figura** (bytes idênticos aos do WebAssembly) |
| Verificação nativa Linux (WebDriver sob Xvfb) e CI (`windows-latest`, Windows Server 2025) | execução 41339828071 (commit `5e5a375`) e [execução 41341992701](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41341992701) (commit `bfab182`, com `exportXlsx`) aprovadas em todos os jobs; a CI do commit de fechamento está registrada abaixo |
| Build estática sob `/enzitag-optima/` (Chromium e Firefox) | motor WASM e Worker carregam; sem erros no console |

### E2E

65 testes por navegador (importação, projeto e recuperação, descritiva, comparação, **DIC aleatorizado e personalização por figura**, planejamentos, superfície, otimização, exportação e acessibilidade com axe nos três temas), todos aprovados em Chromium, Firefox, Chrome e Edge. Defeitos de portabilidade dos próprios testes foram encontrados e corrigidos ao rodá-los no Windows (caminhos por `URL.pathname`; seletor ambíguo de eixos).

### CI

O fluxo `CI` roda Rust, Web (E2E), Tauri em Linux, Tauri em `windows-latest` (agora em todo push, com o repositório público) e documentação. A [execução 41341992701](https://github.com/VitorMazziero/enzitag-optima/actions/runs/41341992701) (commit `bfab182`, ET09) foi aprovada em todos os jobs, inclusive o do Windows com a verificação nativa de `exportXlsx`. O resultado da execução do commit de fechamento é registrado no [plano da ET10](../../../docs/planos-execucao/concluidos/et10-integracao-publicacao.md) quando concluir.

## Validação numérica (referências independentes)

| Área | Referência | Casos |
|---|---|---|
| Estatística descritiva | NIST StRD | 9 |
| Modelo linear | NIST StRD; NumPy/SciPy | 11 + 6 |
| Distribuições | mpmath | 531 pontos |
| Amplitude studentizada | SciPy; mpmath | 432 + 10 |
| ANOVA de um fator, Tukey, letras | NIST StRD; SciPy; cliques maximais | 11 + 4 |
| Planejamentos de dois níveis | enumeração independente; PCG32 reimplementado | 4 conjuntos de matrizes |
| Análise de dois níveis | NumPy/SciPy | 5 |
| Compostos centrais e Box–Behnken | enumeração independente | 12 matrizes |
| Superfície de resposta | NumPy/SciPy | 6 |
| Otimização por desejabilidade | busca exaustiva (NumPy) | 6 |
| Arquivo `.enzitag` | escrito por Python (zipfile/hashlib) | 8 |
| Importação XLSX | openpyxl | 1 |
| DIC aleatorizado (ordem de execução) | enumeração independente; PCG32/Fisher–Yates em Python | 6 |

Todos executados em Rust nativo e em WebAssembly; os testes da ET05–ET08 também têm verificação nativa em Linux e em `windows-latest`. **Nenhuma comparação bit a bit entre plataformas é afirmada**; as tolerâncias estão em cada caso.

## Lacunas e reclassificações

Itens `v0.1` que **não** estão completos, com o registro exigido pelo critério 2. Os dois itens de escopo pendentes na primeira versão do relatório (DIC aleatorizado e personalização por figura) foram **implementados** por decisão do usuário ([DT-0016](../../../docs/decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)).

| Item | Situação | Decisão ou ação necessária |
|---|---|---|
| Letras manuais, anotações livres, símbolos e posição das letras nas figuras | Fora da v0.1 (a personalização cobre título, rótulos, exibição das letras e fonte) | v0.2 |
| Conferência da opção CCD e do rótulo no serviço de referência (Protimiza) | Sem acesso ao serviço | Usuário: confirmar a matriz |
| Windows 11 de 64 bits | **Não verificado** (decisão do usuário); verificado no Windows 10 e em `windows-latest` | Registrar nas notas de versão |
| Publicação web (Pages), release do instalador e verificação da atualização | Fluxos prontos (`pages.yml`, `release.yml`); **nada publicado** | Mantenedor: etiqueta `v0.1.0`, rascunho de release, disparo do Pages |
| Instalador sem assinatura de código (PD-11) | Decisão do usuário; o Windows pode mostrar aviso na primeira execução | Explicado nas notas do release |
| Microsoft Excel e editor vetorial | Não testados (LibreOffice e openpyxl, sim) | Verificação manual futura |
| Desempenho da comparação com ≥ 40 tratamentos | Funciona, mas leva segundos | Melhoria (v0.2) |

## Auditoria de dependências e licenças

| Conjunto | Pacotes | Licenças (resumo) | Observações |
|---|---:|---|---|
| Rust — motor WebAssembly (`app/Cargo.lock`) | 70 | MIT, Apache-2.0, Unlicense, Zlib, BSD-3-Clause, Unicode-3.0 (combinações permissivas) | Um crate oferece MIT **ou** Apache-2.0 **ou** LGPL-2.1+ (usa-se MIT/Apache) |
| Rust — aplicativo Windows (`desktop/src-tauri/Cargo.lock`) | 480 | Predominam MIT/Apache-2.0; 5 crates MPL-2.0 (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`) | MPL-2.0 é copyleft por arquivo e se aplica a modificações dos próprios arquivos; os crates são usados sem modificação. Reauditado em 2026-11-01 após incluir o plugin de atualização (`tauri-plugin-updater`, MIT ou Apache-2.0): mesmos 5 crates MPL-2.0; `r-efi` oferece MIT ou Apache-2.0 ou LGPL-2.1+ (usa-se MIT/Apache) |
| npm — produção (`app/web/package-lock.json`) | 15 | MIT, Apache-2.0, OFL-1.1 (5 fontes) | OFL-1.1: aviso preservado em `THIRD_PARTY_NOTICES.txt` (na build) |
| npm — desenvolvimento | — | Inclui MPL-2.0 (`axe-core`, `lightningcss`), CC0, BlueOak | Não distribuído |

Nenhuma dependência com copyleft forte (GPL/AGPL) foi encontrada na distribuição. `THIRD_PARTY_NOTICES.txt` é gerado por `app/web/scripts/make-third-party-notices.mjs` e vai na build web e no instalador.

**Credenciais e materiais locais:** em 2026-11-01, antes de tornar o repositório público, a varredura foi refeita sobre **todo o histórico do Git** (todos os ramos, linhas adicionadas): nenhum padrão de chave privada ou *token* (inclusive o marcador de chave secreta do atualizador e o início da chave gerada), nenhum e-mail pessoal e nenhum caminho local de usuário; `referencias/` e o registro local da conversa nunca estiveram versionados (autores dos commits: `noreply`). Varredura anterior dos arquivos versionados por padrões de chaves privadas e *tokens* (RSA/EC/OpenSSH/PGP, `ghp_`, `github_pat_`, `AKIA…`, `sk-…`, `xox…`, `TAURI_SIGNING_PRIVATE_KEY=`) e por extensões `.pem/.key/.p12/.pfx/.env`: **nada encontrado**. `referencias/` não está versionada (`git ls-files` vazio) e consta do `.gitignore`.

## Desempenho

[Limites operacionais](../../../docs/arquitetura/limites-operacionais.md): superfície e otimização em dezenas de milissegundos até 5 fatores; ANOVA + Tukey cresce com o número de pares (≈ 0,2 s com 4 grupos, ≈ 3,4 s com 40, ≈ 16 s com 100); pico de memória de 48 MiB.

## Próximos passos (publicação e v0.2)

1. Mantenedor: criar a etiqueta `v0.1.0` (dispara `release.yml` e cria um **rascunho** assinado), conferir e publicar o release; disparar `pages.yml` e abrir a URL publicada em Chrome, Edge e Firefox atuais.
2. Verificar a atualização: instalar a candidata, publicar a versão seguinte e atualizar sem perda de projetos.
3. v0.2 (ET11): migrar o Node.js para o 26 ([DT-0015](../../../docs/decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)), acelerar o valor-p de Tukey, letras manuais e anotações, Windows 11 se houver equipamento.
