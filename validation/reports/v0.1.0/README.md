# Relatório de validação — candidata à v0.1.0

**Estado:** candidata **local**, não publicada · **Data:** 2026-11-01 · **Ramo:** `claude/epic-keller-3ad7jc` (PR aberto contra `main`)

Este relatório distingue o que **foi executado e tem evidência** do que **permanece pendente**. Não declara a versão como publicada nem verificada em Windows 11, e nenhum dos marcos M1, M2 ou M3 foi declarado.

## Resumo

| Pergunta | Resposta |
|---|---|
| A candidata está pronta localmente? | **Sim**, para o que foi implementado: compila, passa nos testes e roda no navegador e (CI) no Windows Server 2025 |
| A v0.1.0 está publicada e verificada? | **Não.** Nada foi publicado; o repositório segue privado |
| Os critérios de lançamento estão atendidos? | **Não** — ver a tabela abaixo |
| Windows 11 de 64 bits verificado? | **Não.** Apenas `windows-latest` (Windows Server 2025, build 26100) na CI |

## Critérios de lançamento ([plano da v0.1, §6](../../../docs/planos-execucao/plano-v0.1.md#6-critérios-de-lançamento-da-v010))

| # | Critério | Situação | Evidência / lacuna |
|---|---|---|---|
| 1 | ET01–ET10 concluídas com evidências | **Não atendido** | ET06, ET07 e ET08 concluídas; ET01–ET05 abertas apenas pela evidência no Windows 11; ET09 com lacunas registradas; ET10 depende do usuário |
| 2 | Todo item `v0.1` validado ou reclassificado | **Parcial** | [Matriz](../../../docs/produto/matriz-cobertura.md): métodos validados numericamente; ver [lacunas](#lacunas-e-reclassificações) |
| 3 | Dois percursos no Windows 11 e em Chrome, Edge e Firefox | **Parcial** | Percursos por E2E em Chromium e Firefox com o motor WASM real; native em Linux e `windows-latest`; **sem** Windows 11, Chrome e Edge estáveis |
| 4 | PT/EN, três temas, teclado, foco e contraste | **Atendido nos percursos testados** | Paridade de chaves PT/EN testada; axe (WCAG 2.x A/AA) nos três temas em cada percurso; teclado testado na tela inicial e no fluxo; verificação manual com leitor de tela **não** feita |
| 5 | `.enzitag` reabre entre plataformas; recuperação, falha de escrita e arquivo inválido não perdem dados | **Parcial** | Reabertura de arquivo escrito em Python (Rust, WASM, IPC nativo); recuperação, descarte, arquivo inválido, esquema futuro, gravação segura (testes); **reabertura Windows ↔ navegador não verificada** |
| 6 | Formatos de exportação abertos e inspecionados | **Atendido com limites** | SVG/PNG/CSV lidos byte a byte; XLSX aberto no LibreOffice e lido com openpyxl; relatório HTML visto em PT e EN; **Excel e editor vetorial não testados** |
| 7 | Notas de versão com métodos, validação e limitações | **Atendido (rascunho)** | [`CHANGELOG.md`](../../../CHANGELOG.md) |
| 8 | PD-15 decidida; artefatos publicados abertos e testados; atualização verificada | **Não atendido** | Depende do usuário; nada publicado; atualizador não iniciado |

## Verificações executadas nesta candidata

| Verificação | Resultado |
|---|---|
| `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` | sem avisos |
| `cargo test --workspace` (nativo) | 387 testes aprovados, 0 falhas, 2 ignorados (medições de desempenho) |
| `npm run check:contracts` | contratos TypeScript atualizados |
| `biome check`, `tsc --noEmit` | sem erros |
| `vitest` (inclui paridade WASM × referências) | 227 aprovados |
| Playwright (motor WASM real, Chromium e Firefox) | 126 testes aprovados (63 em cada navegador), 0 falhas |
| Verificação nativa Linux (WebDriver sob Xvfb, IPC do Tauri) | aprovada, inclusive `exportXlsx` |
| CI (GitHub Actions): Rust, Web, Tauri Linux, Tauri **Windows (`windows-latest`)**, documentação | execução 41339828071 (commit `5e5a375`) aprovada nos cinco jobs; execução do commit `bfab182`: ver [CI](#ci) |
| Build estática sob `/enzitag-optima/` (Chromium e Firefox) | motor WASM e Worker carregam; sem erros no console |

### E2E

63 testes por navegador (importação, projeto e recuperação, descritiva, comparação, planejamentos, superfície, otimização, exportação e acessibilidade com axe nos três temas), todos aprovados em Chromium e Firefox com o motor WebAssembly real. **Edge e Chrome estáveis não foram executados.**

### CI

O fluxo `CI` roda Rust, Web (E2E), Tauri em Linux, Tauri em `windows-latest` e documentação. O commit `bfab182` (ET09) foi disparado; o resultado do job do Windows com a verificação nativa de `exportXlsx` é registrado no plano da [ET09](../../../docs/planos-execucao/ativos/et09-graficos-exportacao.md) quando concluir.

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

Todos executados em Rust nativo e em WebAssembly; os testes da ET05–ET08 também têm verificação nativa em Linux e em `windows-latest`. **Nenhuma comparação bit a bit entre plataformas é afirmada**; as tolerâncias estão em cada caso.

## Lacunas e reclassificações

Itens `v0.1` que **não** estão completos, com o registro exigido pelo critério 2:

| Item | Situação | Decisão necessária |
|---|---|---|
| DIC aleatorizado com fator categórico (geração da matriz) | Não implementado; a **análise** do DIC está pronta e validada | Usuário: aceitar na v0.1.0 ou implementar antes |
| Personalização gráfica por figura (título, eixos, letras); configuração gráfica salva no projeto | Parcial (paleta, fonte, algarismos e idioma como preferências do dispositivo) | Usuário: idem |
| Conferência da opção CCD e do rótulo no serviço de referência (Protimiza) | Sem acesso ao serviço | Usuário: confirmar a matriz |
| Windows 11 de 64 bits (ET01–ET05) | Só `windows-latest` | Equipamento |
| Chrome e Edge estáveis (PD-12) | Só Chromium e Firefox | Equipamento ou ajuste da CI |
| Publicação web (PD-15), instalador em Releases, atualizador (PD-11 e chaves) | Não iniciados por dependerem do usuário | Usuário |
| Desempenho da comparação com ≥ 40 tratamentos | Funciona, mas leva segundos | Melhoria (v0.2) |

## Auditoria de dependências e licenças

| Conjunto | Pacotes | Licenças (resumo) | Observações |
|---|---:|---|---|
| Rust — motor WebAssembly (`app/Cargo.lock`) | 70 | MIT, Apache-2.0, Unlicense, Zlib, BSD-3-Clause, Unicode-3.0 (combinações permissivas) | Um crate oferece MIT **ou** Apache-2.0 **ou** LGPL-2.1+ (usa-se MIT/Apache) |
| Rust — aplicativo Windows (`desktop/src-tauri/Cargo.lock`) | 438 | Predominam MIT/Apache-2.0; 5 crates MPL-2.0 (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`) | MPL-2.0 é copyleft por arquivo e se aplica a modificações dos próprios arquivos; os crates são usados sem modificação |
| npm — produção (`app/web/package-lock.json`) | 14 | MIT, Apache-2.0, OFL-1.1 (5 fontes) | OFL-1.1: aviso preservado em `THIRD_PARTY_NOTICES.txt` (na build) |
| npm — desenvolvimento | — | Inclui MPL-2.0 (`axe-core`, `lightningcss`), CC0, BlueOak | Não distribuído |

Nenhuma dependência com copyleft forte (GPL/AGPL) foi encontrada na distribuição. `THIRD_PARTY_NOTICES.txt` é gerado por `app/web/scripts/make-third-party-notices.mjs` e vai na build web e no instalador.

**Credenciais e materiais locais:** varredura dos arquivos versionados por padrões de chaves privadas e *tokens* (RSA/EC/OpenSSH/PGP, `ghp_`, `github_pat_`, `AKIA…`, `sk-…`, `xox…`, `TAURI_SIGNING_PRIVATE_KEY=`) e por extensões `.pem/.key/.p12/.pfx/.env`: **nada encontrado**. `referencias/` não está versionada (`git ls-files` vazio) e consta do `.gitignore`.

## Desempenho

[Limites operacionais](../../../docs/arquitetura/limites-operacionais.md): superfície e otimização em dezenas de milissegundos até 5 fatores; ANOVA + Tukey cresce com o número de pares (≈ 0,2 s com 4 grupos, ≈ 3,4 s com 40, ≈ 16 s com 100); pico de memória de 48 MiB.

## Próximos passos (v0.2 e antes da publicação)

1. Decisões do usuário: PD-15, PD-11, aceitar ou implementar as lacunas de escopo da v0.1.0.
2. Evidência em Windows 11 limpo e em Chrome/Edge estáveis; reabertura entre Windows e navegador.
3. Atualizador assinado com chaves fora do repositório.
4. Acelerar o valor-p de Tukey; medir o WebAssembly com os conjuntos sintéticos.
