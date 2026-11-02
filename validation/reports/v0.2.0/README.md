# Relatório de validação — candidata à v0.2.0

**Estado:** candidata **local**, no ramo `feat/v0.2`; pronta para a verificação do usuário antes da publicação · **Data:** 2026-11-02

Este relatório distingue o que **foi executado e tem evidência** do que **permanece pendente ou foi desviado do plano**. Não declara a v0.2 como publicada, não declara verificação em Windows 11 e não declara nenhum dos marcos M1–M3. Complementa o [relatório da v0.1.0](../v0.1.0/README.md), que continua valendo para o que a v0.2 não alterou.

## Resumo

| Pergunta | Resposta |
|---|---|
| O que a v0.2 acrescenta? | Node 26; valor-p de Tukey 81× (40 grupos) e 241× (100 grupos) mais rápido; Games–Howell (Welch), Dunnett, Bonferroni, Holm e Kruskal–Wallis/Dunn; ANOVA multifatorial com blocos, médias marginais e contrastes; DBC aleatorizado; seleção e comparação de modelos com recomendação, **um modelo por resposta**; resultados em seções com barra lateral (seção lembrada) e exportação por último; letras manuais, anotações e personalização gráfica completa; PDF de figuras e de relatórios; seis temas (Industrial, Organic e Clay) e o logotipo do grupo |
| Está pronta localmente? | **Sim**: compila, passa nos testes, roda nos quatro navegadores e no Windows 10 (instalador e verificação nativa) |
| Está publicada? | **Não.** Etiqueta, release e Pages só serão feitos após a verificação do usuário |
| Os planos ET11 e ET12 estão concluídos? | **Sim**, com um item adiado (T09, seleção de modelos para efeitos de planejamentos de dois níveis) e a substituição do exemplo kLa real por um **sintético** (decisão do usuário) |
| Windows 11? | **Não verificado.** A plataforma verificada é o Windows 10 Pro 22H2 ([decisões aprovadas §16](../../../docs/produto/decisoes-aprovadas.md#16-escopo-e-plataforma-da-v02-2026-11-01)) |

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
| `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings` (e o pacote Tauri, com e sem a característica `automation`) | sem avisos |
| `cargo test --workspace --release` | **443 testes aprovados**, 0 falhas, 2 ignorados (medições de desempenho) |
| Pacote Tauri: `cargo test --release` | 8 testes aprovados |
| `npm run check:contracts`, `biome check`, `tsc --noEmit` | sem diferenças nem erros |
| `vitest` (inclui paridade WebAssembly × referências independentes) | **317 aprovados** (35 arquivos) |
| Playwright (motor WebAssembly real): Chromium, Firefox, Chrome e Edge | **392 aprovados** (98 por navegador), 0 falhas |
| Instalador NSIS (Windows 10) | construído e **assinado para o atualizador** com a chave do mantenedor (8,2 MB, `.exe.sig` de 444 bytes); instalado em modo silencioso, executado por 10 s e desinstalado sem resíduos |
| Verificação nativa no Windows 10 (WebView2 por CDP) | aprovada: motor, `.enzitag`, estatísticas, planejamentos, superfície, otimização, XLSX, DIC e, na v0.2, **6 procedimentos de comparação**, **6 casos de ANOVA multifatorial**, **4 casos de DBC**, 5 exemplos reabertos e **PDF de figura e de relatório gerados no aplicativo** |
| `check-versions`, `check-docs-links`, `check-case-collisions` | versão única **0.2.0**; 1 177 links e 829 arquivos conferidos |

## Validação numérica dos métodos novos

Todas as referências são **independentes do código Rust** (Python). Tolerâncias, medidas e métodos estão em cada especificação.

| Método | Referência independente | Casos | Resultado |
|---|---|---:|---|
| [Games–Howell, Welch, Bonferroni, Holm](../../../docs/metodos/procedimentos-comparacao-multipla.md) | statsmodels (`anova_oneway`, `multipletests`), SciPy (`studentized_range`), scikit-posthocs | 3 | dentro das tolerâncias (estatística global 1e-9; p ajustado 1e-6 rel./1e-8 abs.) |
| [Dunnett](../../../docs/metodos/dunnett.md) | integração dupla própria da distribuição de `max|T|` (`dblquad`, ≈ 1e-9) e `scipy.stats.dunnett` (≈ 1e-3) | 1 (desbalanceado) | p ajustado 2e-7, limites 2e-6 |
| [Kruskal–Wallis e Dunn](../../../docs/metodos/kruskal-wallis-dunn.md) | `scipy.stats.kruskal`, scikit-posthocs | 2 (com empates) | dentro das tolerâncias |
| [ANOVA multifatorial com blocos](../../../docs/metodos/anova-multifatorial.md), [médias marginais e contrastes](../../../docs/metodos/medias-marginais-contrastes.md) | statsmodels (`ols` com `C(·, Sum)`, `anova_lm` tipos I–III; covariância dos coeficientes; `t_test`) | 6 (desbalanceado com bloco e balanceado; tipos I, II e III) | SQ, QM, F 1e-9; p 1e-6 |
| [Seleção de modelos](../../../docs/metodos/selecao-de-modelos.md) | statsmodels (`OLS`, AIC, BIC, `resid_press`) e eliminação regressiva em Python | 3 (2, 3 e 4 fatores) + exemplo 06 | métricas dentro das tolerâncias; **sequência de remoções idêntica** |
| [DBC](../../../docs/metodos/delineamento-em-blocos.md) | PCG32 e Fisher–Yates em Python (inteiros arbitrários) | 5 | **ordem idêntica em cada bloco**; WebAssembly e aplicativo nativo nos 4 casos com semente representável em JavaScript |
| Tukey com tabela de `W(w; k)` | quadratura direta (≤ 1e-14 em `W`) e SciPy | 4 casos aplicados + 432 pontos | resultados dentro das tolerâncias da v0.1, sem alteração |
| Exemplo [06 — kLa sintético](../../../examples/06-kla-sintetico/README.md) | regressão NumPy/SciPy a partir do `ensaios.csv` | 2 respostas | coeficientes, erros-padrão, valores-p, `R²` ajustado e predito conferidos |

Paridade **nativo × WebAssembly × Tauri**: os mesmos casos passam no Rust (`cargo test`), no WebAssembly (`v02.parity.test.ts`) e no aplicativo nativo (`native-checks.mjs`).

## Desempenho (Tukey)

Medido de novo, **na mesma máquina e com os mesmos dados**, o código da v0.1 (commit `5261ea8`) e o da v0.2 (nativo, `release`, mediana de 3 execuções):

| ANOVA + Tukey + letras | v0.1 (ms) | v0.2 (ms) | Ganho |
|---|---:|---:|---:|
| 4 grupos × 5 | 177,2 | 42,0 | 4× |
| 12 grupos × 10 | 740,6 | 44,1 | 17× |
| 40 grupos × 30 | 4 975,9 | 61,2 | 81× |
| 100 grupos × 30 | 30 359,0 | 126,2 | 241× |

Detalhes e demais operações em [limites operacionais](../../../docs/arquitetura/limites-operacionais.md). Superfície e otimização não mudaram. As operações novas **não foram medidas no limite**. A grade de dados com 1 000 linhas colou e desenhou em 0,4–0,7 s nos três temas novos (E2E).

## Temas e logotipo (ET12)

- **Contraste:** todos os pares de texto dos seis temas ≥ 4,5:1 e o foco também sobre o painel (`themes.test.ts`); as cores de destaque dos prompts (laranja, acento de arte, rosa) só como fundo ou forma ([DT-0021](../../../docs/decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)).
- **axe** (WCAG 2.0/2.1 A e AA) nos percursos de objetivo, fatores, dados, análise, resultados, comparação, planejamento, superfície e otimização **com os seis temas**, nos quatro navegadores; mais movimento reduzido, `forced-colors` e 375 px com axe nos três temas novos.
- **Logotipo** no cabeçalho e na tela inicial, sem nenhuma requisição externa, em todos os temas e nos dois idiomas; crédito no relatório HTML e no PDF do relatório (desligável). Os **arquivos exportados não mudam** com o tema (E2E compara a figura em quatro temas).
- **Inspeção visual** de capturas dos três temas novos (tela inicial e seção «Modelo»). Não foram arquivadas capturas em inglês nem uma inspeção no WebView2 do Windows (a verificação nativa cobre a execução e os PDFs, não a aparência).

## Figuras e PDF

- **Estilo da figura:** testes de unidade (`figureStyle.test.ts`) e E2E que confere, no SVG exportado, cor, fonte, anotação, ausência do fundo e da grade e a legenda «Letras digitadas manualmente».
- **PDF:** testes de unidade da conversão (`pdfContent.test.ts`), E2E do relatório e das figuras no navegador (contorno e médias) e **verificação no aplicativo nativo** (PDF gerado sob a CSP de produção e gravado pelo comando `export_file`). Os PDFs foram **inspecionados visualmente e por extração de texto** (PyMuPDF): relatório de 6 páginas e figuras com acentos, letras gregas e símbolos corretos, texto selecionável e figuras vetoriais.
- **Achados corrigidos na verificação:** (1) a lista de extensões do comando nativo `export_file` **não incluía `pdf`**; (2) o conversor de SVG não desenha o padrão hachurado, o contorno de texto (`paint-order`) nem o símbolo «→» na Roboto (adaptados); (3) o conversor de SVG usa a **fonte corrente do documento**: sem ela, PDFs só de figura falhavam (achado na verificação nativa; corrigido com um ponto branco invisível e coberto por teste); (4) a Roboto embutida é **OFL-1.1**, não Apache-2.0.
- **Limitações assumidas** (aceitas pelo usuário): a família de fonte da figura (serifa, monoespaçada) não vale no PDF, o texto das figuras sai em Roboto normal e a região de extrapolação aparece como sombreado translúcido. Não foi feita inspeção em outros leitores de PDF.
- **Verificação nativa do PDF:** o diálogo «Salvar como» não é automatizável; o executável de verificação é construído com a característica `automation`, que grava na pasta de `ENZITAG_EXPORT_DIR`. O instalador **não** tem essa característica.

## Desvios e itens não entregues

| Item | Situação |
|---|---|
| Seleção de modelos para efeitos de planejamentos de dois níveis (ET11-T09) | **Adiada** para a v0.2.x |
| Exemplo kLa com dados reais (PD-16) | **Substituído** pelo exemplo sintético [06](../../../examples/06-kla-sintetico/README.md), por decisão do usuário; os dados reais seguem só na máquina dele (`examples/05-kLa/` está no `.gitignore`) |
| Termos dentro da tabela de coeficientes (ET11-T06) | Painel «Modelo: termos e comparação» na seção Modelo (equivalente funcional) |
| Guia de resultados | Não criado; o conteúdo está nas especificações e no guia de exportação |
| Capturas em inglês e inspeção visual no WebView2 (ET12-T10) | Não arquivadas |
| CI do GitHub com Node 26 e a v0.2 | **Ainda não executada** (nada foi enviado antes desta verificação) |
| Atualização ponta a ponta (instalar a v0.1 e atualizar para a v0.2) | **Não verificada** |

## Auditoria de dependências e licenças

| Conjunto | Pacotes | Licenças (resumo) | Observações |
|---|---:|---|---|
| Rust (motor WebAssembly e aplicativo Windows) | inalterado | como no [relatório da v0.1](../v0.1.0/README.md#auditoria-de-dependências-e-licenças) | nenhuma dependência Rust foi acrescentada |
| npm — produção | **59** (eram 15) | MIT, BlueOak-1.0.0, 0BSD, Apache-2.0 (Tauri), OFL-1.1 (7 fontes dos temas) | acréscimo do **pdfmake 0.3.13** e suas dependências (`pdfkit`, `fontkit`, `png-js`, `linebreak`, `brotli`, `sax` e outras); `png-js` não declara a licença no `package.json`, mas seu arquivo `LICENSE` é MIT; fontes `ibm-plex-mono` 5.3.0 e `source-serif-4` 5.3.1 |
| Fonte embutida nos PDFs | 1 | **Roboto 3.014, SIL OFL 1.1** (licença gravada no arquivo da fonte) | aviso incluído em `THIRD_PARTY_NOTICES.txt` |
| Logotipo do grupo | 1 | **marca do grupo; não é coberta pela licença MIT** | nota em `docs/imagens/README.md` |

Nenhuma dependência com copyleft forte (GPL/AGPL) foi encontrada na distribuição. O pdfmake é carregado **sob demanda** (só ao exportar PDF) e não acessa a rede (`setUrlAccessPolicy` recusa URLs).

## Pendências do usuário

1. **Verificar** a candidata e decidir a publicação (etiqueta `v0.2.0`, release e Pages) — nada disso foi feito ainda.
2. A v0.1.0 continua com o **release em rascunho** e a atualização não verificada ([registro de publicação](../../../docs/distribuicao/publicacao.md)).
3. Guardar a chave privada do atualizador em local seguro (cópia em `D:\Arquivos_de_Programas\Rust\tauri`, fora do repositório).
