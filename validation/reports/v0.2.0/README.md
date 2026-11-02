# Relatório de validação — candidata à v0.2.0

**Estado:** candidata **local**, no ramo `feat/v0.2`; **nada foi publicado** (sem etiqueta, release nem Pages para a v0.2) · **Data:** 2026-11-01

Este relatório distingue o que **foi executado e tem evidência** do que **permanece pendente ou foi desviado do plano**. Não declara a v0.2 como publicada, não declara verificação em Windows 11 e não declara nenhum dos marcos M1–M3. Complementa o [relatório da v0.1.0](../v0.1.0/README.md) (que continua valendo para o que a v0.2 não alterou).

## Resumo

| Pergunta | Resposta |
|---|---|
| O que a v0.2 acrescenta? | Node 26; valor-p de Tukey ≈ 80× (40 grupos) e ≈ 240× (100 grupos) mais rápido; Games–Howell (Welch), Dunnett, Bonferroni, Holm e Kruskal–Wallis/Dunn; ANOVA multifatorial com blocos, médias marginais e contrastes; DBC aleatorizado; seleção e comparação de modelos com recomendação; resultados em seções com barra lateral e exportação por último; letras manuais, anotações e personalização gráfica completa; PDF de figuras e de relatórios |
| Está pronta localmente? | **Sim**: compila, passa nos testes e roda no navegador e no Windows 10 (ver as verificações) |
| Está publicada? | **Não.** Publicar (etiqueta, release, Pages) depende de decisão expressa do usuário |
| O plano da ET11 está concluído? | **Não integralmente.** Ficaram de fora: modelo **por resposta**, seção ativa lembrada ao recarregar e o exemplo kLa (PD-16); ver [desvios](#desvios-em-relação-ao-plano) |
| Windows 11? | **Não verificado.** A plataforma verificada é o Windows 10 Pro 22H2 (decisão do usuário, [§16](../../../docs/produto/decisoes-aprovadas.md#16-escopo-e-plataforma-da-v02-2026-11-01)) |

## Ambiente de verificação

| Item | Versão |
|---|---|
| Sistema | Windows 10 Pro 22H2, build 19045, 64 bits; Intel Core i5-11600K, 15,9 GiB |
| Ferramentas | Rust 1.97.0 (MSVC), **Node 26.13.0**, `wasm-bindgen-cli` 0.2.130, Python 3.12 (PyMuPDF 1.28 para inspecionar PDFs) |
| WebView2 (aplicativo nativo) | 156.0.4314.58 |
| Navegadores do E2E | Chromium e Firefox do Playwright 1.64.1, Google Chrome e Microsoft Edge instalados no sistema |

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings` | sem avisos |
| `cargo test --workspace --release` | **443 testes aprovados**, 0 falhas, 2 ignorados (medições de desempenho) |
| `biome check`, `tsc --noEmit` | sem erros |
| `vitest` (inclui paridade WebAssembly × referências independentes) | **260 aprovados** (34 arquivos) |
| Playwright (motor WebAssembly real) | {{E2E}} |
| Pacote Tauri: `cargo test` | {{TAURI_TEST}} |
| Instalador NSIS (Windows 10) | {{INSTALLER}} |
| Verificação nativa no Windows 10 (WebView2 por CDP) | {{NATIVE}} |
| `scripts/check-versions.mjs` | versão única **0.2.0** (Cargo, `package.json`, pacote Tauri e `tauri.conf.json`) |

## Validação numérica dos métodos novos

Todas as referências são **independentes do código Rust** (Python). Tolerâncias, medidas e métodos estão em cada especificação.

| Método | Referência independente | Casos | Resultado |
|---|---|---:|---|
| [Games–Howell, Welch, Bonferroni, Holm](../../../docs/metodos/procedimentos-comparacao-multipla.md) | statsmodels (`anova_oneway`, `multipletests`), SciPy (`studentized_range`), scikit-posthocs | 3 | dentro das tolerâncias (estatística global 1e-9; p ajustado 1e-6 rel./1e-8 abs.) |
| [Dunnett](../../../docs/metodos/dunnett.md) | integração dupla própria da distribuição de `max|T|` (`dblquad`, ≈ 1e-9) e `scipy.stats.dunnett` (≈ 1e-3) | 1 (desbalanceado) | p ajustado 2e-7, limites 2e-6 |
| [Kruskal–Wallis e Dunn](../../../docs/metodos/kruskal-wallis-dunn.md) | `scipy.stats.kruskal`, scikit-posthocs | 2 (com empates) | dentro das tolerâncias |
| [ANOVA multifatorial com blocos](../../../docs/metodos/anova-multifatorial.md), [médias marginais e contrastes](../../../docs/metodos/medias-marginais-contrastes.md) | statsmodels (`ols` com `C(·, Sum)`, `anova_lm` tipos I–III; covariância dos coeficientes; `t_test`) | 6 (desbalanceado com bloco e balanceado; tipos I, II e III) | SQ, QM, F 1e-9; p 1e-6 |
| [Seleção de modelos](../../../docs/metodos/selecao-de-modelos.md) | statsmodels (`OLS`, AIC, BIC, `resid_press`) e eliminação regressiva em Python | 3 (2, 3 e 4 fatores) | métricas dentro das tolerâncias; **sequência de remoções idêntica** |
| [DBC](../../../docs/metodos/delineamento-em-blocos.md) | PCG32 e Fisher–Yates em Python (inteiros arbitrários) | 5 | **ordem idêntica em cada bloco**; WebAssembly nos casos com semente representável em JavaScript |
| Tukey com tabela de `W(w; k)` | quadratura direta (≤ 1e-14 em `W`) e SciPy | 4 casos aplicados + 432 pontos | resultados dentro das tolerâncias da v0.1, sem alteração |

Paridade **nativo × WebAssembly × Tauri**: os mesmos casos passam no Rust (`cargo test`), no WebAssembly (`v02.parity.test.ts`) e no aplicativo nativo (`native-checks.mjs`, procedimentos, ANOVA multifatorial e DBC).

## Desempenho (Tukey)

Medido de novo, **na mesma máquina e com os mesmos dados**, o código da v0.1 (commit `5261ea8`) e o da v0.2 (nativo, `release`, mediana de 3 execuções):

| ANOVA + Tukey + letras | v0.1 (ms) | v0.2 (ms) | Ganho |
|---|---:|---:|---:|
| 4 grupos × 5 | 177,2 | 42,0 | 4× |
| 12 grupos × 10 | 740,6 | 44,1 | 17× |
| 40 grupos × 30 | 4 975,9 | 61,2 | 81× |
| 100 grupos × 30 | 30 359,0 | 126,2 | 241× |

Detalhes e demais operações em [limites operacionais](../../../docs/arquitetura/limites-operacionais.md). Superfície e otimização não mudaram. As operações novas **não foram medidas no limite**.

## Figuras e PDF

- **Estilo da figura:** testes de unidade (`figureStyle.test.ts`: letras manuais, anotações com escape, cor, fundo, fonte, grade e legenda) e E2E que confere, no SVG exportado, cor, fonte, anotação, ausência do fundo e da grade e a legenda «Letras digitadas manualmente».
- **PDF:** testes de unidade da conversão (`pdfContent.test.ts`), E2E do relatório e da figura no navegador e **verificação no aplicativo nativo** (PDF gerado sob a CSP de produção e entregue ao comando `export_file`). Os PDFs foram **inspecionados visualmente e por extração de texto** (PyMuPDF): relatório de 6 páginas e figuras de contorno e de superfície, com acentos, letras gregas e símbolos corretos, texto selecionável e figuras vetoriais.
- **Achados corrigidos na verificação:** (1) a lista de extensões do comando nativo `export_file` **não incluía `pdf`** (a exportação falharia no aplicativo Windows; corrigido e testado); (2) o conversor de SVG não desenha o padrão hachurado, o contorno de texto (`paint-order`) nem o símbolo «→» na Roboto (adaptados, ver [DT-0020](../../../docs/decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)); (3) no PDF só de figura as fontes precisam ser registradas por um texto invisível, senão o SVG falha no navegador.
- **Limitações assumidas:** a família de fonte da figura (serifa, monoespaçada) não vale no PDF; a região de extrapolação aparece como sombreado translúcido. Não foi feita inspeção em outros leitores de PDF.

## Desvios em relação ao plano

| Item do plano da ET11 | Situação | Motivo e próximo passo |
|---|---|---|
| Um modelo **por resposta** (T05, critério 4) | **Não feito**: um conjunto de termos por análise (uma resposta analisada por vez) | Exigiria o mapa resposta → termos no projeto e um seletor de resposta; v0.2.x |
| Seção ativa lembrada ao recarregar (§4.2, item 5) | **Não feito**: só a preferência «mostrar todas as seções» persiste | Estado de interface; v0.2.x |
| Termos ligáveis **dentro** da tabela de coeficientes (T06) | **Parcial**: painel «Modelo: termos e comparação» na seção Modelo | Equivalente funcional, outra posição |
| Seleção para efeitos de planejamentos de dois níveis (T09) | Adiada | v0.2.x |
| Exemplo kLa e caso de 3 respostas × 27 ensaios (T04, T13) | **Não feito** | A pasta `examples/05-kLa/` está só localmente: **a confirmação de que os dados podem ser distribuídos (PD-16) não foi dada** |
| Teste E2E «mudar termos → otimização desatualizada» (T08) | Não escrito | O aviso de resultado desatualizado já existia; falta o teste específico |
| Fichas U07–U10 e P01, guia de resultados (T14) | Fichas atualizadas (C09, U07–U09–U16, P01); **guia de resultados não criado** | — |
| Axe em todos os temas | Executado nos **três temas atuais**; os temas da ET12 ainda não existem | ET12 |

## Auditoria de dependências e licenças

| Conjunto | Pacotes | Licenças (resumo) | Observações |
|---|---:|---|---|
| Rust (motor WebAssembly e aplicativo Windows) | inalterado | como no [relatório da v0.1](../v0.1.0/README.md#auditoria-de-dependências-e-licenças) | nenhuma dependência Rust foi acrescentada |
| npm — produção | **57** (eram 15) | MIT, BlueOak-1.0.0, 0BSD, Apache-2.0 (Tauri), OFL-1.1 (5 fontes dos temas) | acréscimo do **pdfmake 0.3.13** e suas dependências (`pdfkit`, `fontkit`, `png-js`, `linebreak`, `brotli`, `sax` e outras); `png-js` não declara a licença no `package.json`, mas seu arquivo `LICENSE` é MIT |
| Fonte embutida nos PDFs | 1 | **Roboto 3.014, SIL OFL 1.1** (licença gravada no arquivo da fonte) | aviso incluído em `THIRD_PARTY_NOTICES.txt` |

Nenhuma dependência com copyleft forte (GPL/AGPL) foi encontrada na distribuição. O pdfmake é carregado **sob demanda** (só ao exportar PDF) e não acessa a rede (`setUrlAccessPolicy` recusa URLs).

## Pendências do usuário

1. **Publicar** (ou não) a v0.2.0: etiqueta, release e Pages — nada disso foi feito.
2. **PD-16:** confirmar se os dados do exemplo kLa podem ser distribuídos para que o exemplo seja versionado.
3. A v0.1.0 continua com o **release em rascunho** e a atualização não verificada ([registro de publicação](../../../docs/distribuicao/publicacao.md)).
4. Temas adicionais e logo do grupo: [ET12](../../../docs/planos-execucao/concluidos/et12-temas-adicionais-e-identidade-do-grupo.md) (não iniciada).
