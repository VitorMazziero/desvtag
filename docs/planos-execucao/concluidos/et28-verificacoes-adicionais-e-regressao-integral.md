# ET28 — Verificações adicionais e regressão integral

| Campo | Valor |
|---|---|
| Estado | Concluída localmente; pendências externas discriminadas (T08) |
| Versão-alvo | v0.4.0 experimental |
| Fases do roteiro | Fechamento da v0.4 |
| Marco | Candidata de distribuição |
| Depende de | ET22–ET26, blocos 01–09 e, em parte, decisões do usuário (edição simultânea, Protimiza, publicação) |
| Módulos | Transversal (núcleo, projeto, interface, exportação, Windows) |
| Ativado em | 2026-11-05 |
| Concluído em | 2026-11-06 (local) |

## 1. Objetivo

Conferir individualmente os achados abertos da auditoria (AU-B10–B22, AU-P05, AU-U09–U11, AU-Q01–Q03 e os 25 originais), fechar o que falta, executar a regressão científica e visual integral e preparar a candidata de distribuição. Pendências externas ficam discriminadas, sem aprovação presumida.

## 2. Escopo

Verificação dos achados; seleção de modelos de dois níveis em fracionários e Plackett–Burman; orçamento integrado de tempo e memória (AU-P05); interface com conteúdo grande (AU-U09); regressão das etapas antigas, compatibilidade de arquivos, CI e verificação nativa; instalador e testes dos canais de atualização; decisão da edição simultânea e inventário do Protimiza (dependem do usuário).

## 3. Entradas e referências

[Plano da versão, §9](../plano-v0.4.md), [ET26](../ativos/et26-google-drive-completo-e-verificado.md) (T08 depende de contas reais), [edição simultânea](../../arquitetura/edicao-simultanea.md), evidências em `docs/imagens/evidencias-v0.4-*`.

## 4. Decisões técnicas

Aceites dos achados seguem a coluna «Aceite» da §9 do plano da versão. Cada correção local registra a referência independente usada; históricos não são recalculados ao abrir.

## 5. Tarefas

- [x] **T01 — Matriz de verificação dos achados.** Para cada achado aberto: correção, teste/referência, evidência no app e estado (fechado, local conferido, aberto, externo).
- [x] **T02 — AU-B19.** Identidade de réplica exata no erro puro (superfície e dois níveis), sem arredondamento oculto; teste do helper, agrupamento independente e API pública.
- [x] **T03 — Seleção de modelos em fracionários e Plackett–Burman.** Casos independentes (statsmodels) e conferência no app.
- [x] **T04 — Orçamento integrado (AU-P05).** Medir WASM e Windows em conjuntos pequeno/típico/limite; registrar ambiente, mediana/p95, memória, cancelamento, salvar/reabrir e exportar.
- [x] **T05 — Interface com conteúdo grande (AU-U09).** Projeto vazio e preenchido, lateral aberta/recolhida, importação e resultados longos; seis temas.
- [x] **T06 — Regressão integral e qualidade da evidência (AU-Q01–Q03).** Matriz de navegadores, verificação nativa, identidade fonte/dist/WASM/executável, adversos e invariantes científicos.
- [x] **T07 — Instalador e canais de atualização.** Preparar o instalador e os testes; a publicação necessária ao teste real exige autorização expressa.
- [~] **T08 — Itens do usuário.** Caminho da edição simultânea (PD-14) e inventário do Protimiza (PD-05).
- [x] **T09 — Aceite.** Todos os achados com estado registrado e pendências externas discriminadas.

## 6. Entregas e critérios de conclusão

Nenhum achado fica sem estado; as correções locais têm referência independente e evidência no app; a regressão integral passa nas duas plataformas ou as exceções estão registradas. Publicação, contas reais e decisões do usuário ficam explicitamente pendentes.

## 7. Verificação e documentação

Rust, web, matriz Playwright em três navegadores, verificação nativa no Windows; atualizar §9 do plano da versão, matriz de cobertura e métodos afetados.

## 8. Riscos

Regressões entre etapas, tempo de execução da matriz completa, identidade entre dist, WASM e executável, dependências externas (contas, publicação).

## 9. Registro de progresso

2026-11-05. ET28 ativada. AU-B17 e AU-B18 já tinham correções locais commitadas. T02 aceita: a chave de réplica usa as coordenadas codificadas bit a bit (−0 = +0) em `surface/model.rs` e `designs/analysis.rs`, em vez de nove casas decimais. Rust com 761 testes passados, Clippy sem avisos. Próximo: T01 (matriz dos achados) e T03.

2026-11-05. **T01, matriz dos achados (estado em 2026-11-05).** «Local conferido» = correção commitada com teste e conferência no app registrados nos blocos anteriores (§9.13 do plano da versão); a regressão transversal desses itens é executada na T06 e só então fecham.

| Achado | Estado | Evidência / o que falta |
|---|---|---|
| AU-B01–B09, AU-P01–P04, AU-U01–U08 | Fechado | Caixas marcadas nos blocos 02–07; evidências em §9.7–§9.12. Regressão na T06 |
| AU-B10 | Regressão conferida | Testes de mistura limitada (previsões estimáveis, linhas externas), figuras sem preenchimento de ausentes. Regressão: T06 |
| AU-B11 | Regressão conferida | Referência independente de Cox com componente fixo. Regressão: T06 |
| AU-B12 | Regressão conferida | Textos sem «região inteira», RSM nos três motores. Regressão: T06 |
| AU-B13–B16 | Regressão conferida | `calculationSource.test.ts`, E2E `et25-blocks`, `et25-optimal-integrity`; malha vinculada ao resultado. Regressão: T06 |
| AU-B17, AU-B18 | Regressão conferida | Commits `011fd85`, `5dcfeb6`, `06b4c4c`, com testes Rust e E2E e aviso para históricos afetados. Regressão: T06 |
| AU-B19 | Fechado | `b643dab` |
| AU-B20–B22 | Regressão conferida | `estimability_validation.rs` (13 referências SVD, `adjust_p`), E2E `et25-estimability` em três navegadores, seis temas, PT/EN e Windows 10. Orçamento de AU-B21 entra na T04 |
| AU-U10 | Regressão conferida | PDFs sem página residual; Word com nota no rodapé. Regressão: T06 |
| AU-U11 | Regressão conferida (Word: ocupação registrada) | Paginação e proveniência corrigidas na T11; ocupação de páginas de figura no Word segue aberta |
| AU-P05 | Local conferido | T04: medições WASM e Windows nos limites aceitos e orçamento operacional abaixo; fecha na T09 |
| AU-U09 | Local conferido | T05: três defeitos reais corrigidos e `et28-large-content.spec.ts` nos três navegadores; fecha na T09 (falta conferência no Windows nativo, T06) |
| AU-Q01 | Local conferido (contínuo) | Identidade registrada para a candidata `c565dd5` (T06); repetir na candidata final e após a migração DesvTAG |
| AU-Q02 | Parcial | Matriz de cobertura do Drive atualizada nesta data; revisar métodos e planos antigos na T09 |
| AU-Q03 | Local conferido | `scientific_invariants.rs` (4 invariantes) somado aos adversos já existentes (T06); fecha na T09 |
| 25 achados originais | Fechados nas ET27/ET29 | Evidência própria; regressão visual integral na T06 |

2026-11-05. T03 aceita localmente. Cinco casos novos de seleção de modelos (fracionários 2^(4−1), 2^(5−1), 2^(5−2) e Plackett–Burman de 12 ensaios, em duas configurações) contra o statsmodels; métricas, sequência de eliminação e motivo da parada conferidos. A conferência revelou um defeito real: com alavanca ≈ 1 o PRESS e o R² predito saíam como ruído de arredondamento; agora são indefinidos (helper `press_of`, superfície e dois níveis, com testes). E2E novo do fracionário 2^(4−1) com repetições em Chromium, Firefox e WebKit; captura inspecionada. Limites registrados em `selecao-de-modelos.md` (hierarquia com interações aliasadas; convenção do pivô em colinearidade parcial). Rust: 763 testes, Clippy limpo. Não verificado: Windows nativo desta tarefa (entra na regressão da T06).

2026-11-05. **T04 aceita localmente (AU-P05).** Medição na revisão `574a352` (fonte sem alterações não commitadas relevantes), Windows 10.0.19045, i5-11600K, 15 GiB, dois aquecimentos e 20 repetições, mediana/p95 por ordem, JSON de transporte incluído; WASM no worker real do Chromium e Windows no IPC Tauri do executável de automação (sem segredo do Drive). Casos gerados por `validation/tools/make_et28_budget_cases.mjs` (determinísticos; só a construção dos dados). Evidências `docs/imagens/evidencias-v0.4-et28/t04` (`web`, `native`, `web-limits`, `native-limits`).

| Operação (carga) | WASM mediana / p95 (ms) | Windows mediana / p95 (ms) |
|---|---:|---:|
| ANOVA 2×3 (pequeno) | 1,6 / 1,9 | 3,8 / 4,8 |
| ANOVA 4×3×3, ordem 2, famílias e pares (típico) | 105 / 106 | 143 / 151 |
| ANOVA 6 fatores×3 níveis, 1.458 linhas, 6+15 famílias (limite de fatores) | 235 / 238 | 327 / 337 |
| ANOVA 6 fatores×12 níveis (grade dos demais fatores ≈ 3 milhões), 600 linhas | 270 / 275 | 351 / 363 |
| ANOVA 20×20 com interação, 400 colunas, 640 linhas (limite de colunas e células) | 919 / 978 | 1.032 / 1.069 |
| ANOVA acima do orçamento de pares (recusa `anova.resource_limit`) | 2,9 / 4,4 | 7,6 / 11,7 |
| Mistura q=2 com traço de Cox / q=3 com otimização | 1,4 / 5,3 | 3,9 / 10,4 |
| Mistura q=5 quadrática, 60 pontos | 3,9 / 4,3 | 7,4 / 7,8 |
| Mistura q=8 quadrática, 120 pontos / com otimização (40 inícios) | 10 / 17 | 16 / 27 |
| Variância de predição, 5 fatores, 8 blocos (perto do limite) | 88 / 95 | 188 / 207 |
| Seleção de modelos 2^(5−1) / Plackett–Burman 12 | 2,7 / 1,5 | 4,7 / 3,5 |
| Potência 4.096×32 com 10³ / 10⁶ simulações | 21 / 97 | 43 / 97 |
| Misto UN, 40 unidades, 6 / 8 ocasiões | 310 / 1.360 | 345 / 1.407 |
| Histórico de 100 / 1.000 registros (codificar projeto) | 8 / 68 | 15 / 153 |

Paridade: as respostas dos dois alvos têm a mesma estrutura em todos os casos e diferença relativa máxima de 3,1·10⁻¹⁵ (libm do WASM e do Windows); os hashes bit a bit coincidem em 5 de 14 casos, o que não é critério de aceite. A memória do processo (instantâneo fora do intervalo cronometrado) chegou a ~590 MiB de conjunto de trabalho no Windows (~386 MiB privados) ao fim da série, com crescimento de poucas dezenas de MiB por caso mais pesado; não há pico de alocação medido.

**Orçamento operacional definido a partir das medidas.** (1) O limite é a carga aceita pelo núcleo (`MAX_FACTORS` 6, `MAX_COLUMNS` 400, `MAX_MATRIX_CELLS` 262.144, `MAX_PAIRS` 20.000, trabalho de álgebra 3·10⁹; 2^k D/I e UN conforme DT-0031/0033). (2) Nesses limites, as operações novas desta tabela terminam com p95 ≤ 1,1 s nos dois alvos (o misto UN com 8 ocasiões, da ET24, leva ≈ 1,4–1,5 s); o pedido recusado por orçamento responde em ≤ 12 ms sem alocar a grade, e a média uniforme dos demais fatores é fatorada (grade de 3 milhões de combinações em ≈ 0,3 s, sem enumeração). (3) Casos mais lentos já medidos na ET24 (Hill com 256 linhas ≈ 6 s, relatórios PDF/Word de matrizes de 131 mil células ≈ 7–12 s) mantêm indicação de ocupado e cancelamento (bloco 03). (4) Regra de manutenção: uma carga aceita pelos limites cujo p95 ultrapasse ~10 s sem cancelamento deve ter o limite reduzido, não a medição relaxada. Não há SLA nem garantia de memória global.

Limites desta medição: o tempo até o feedback na interface, salvar/reabrir e exportar HTML/PDF/Word dos casos de 4.096×32 e do histórico de 1.000 registros foram medidos na ET24 em revisões anteriores (`performance-real-paste-full`, `performance-ui-after-native`, §9.10) e não foram repetidos nesta revisão; as operações novas (ANOVA com estimabilidade, misturas, variância) foram medidas aqui no motor, sem a camada de apresentação e sem p95 de exportação. Máquina única; sem repetição em outro hardware.

2026-11-06. **T05 aceita localmente (AU-U09).** Novo `app/web/tests/e2e/et28-large-content.spec.ts` (12 execuções por navegador na bateria rápida mais a grade de 2.000 linhas): projeto vazio com barra aberta/recolhida e blocos guiados/todos; grade de 2.000 linhas (7 colunas) com barra aberta/recolhida; 40 colunas de resposta em 1064, 800 e 375 px; importação de CSV com 3.000 linhas e 10 colunas; resultados de 2.000 linhas; barra do projeto em três larguras; seis temas em todas as situações a 1064×892; capturas inspecionadas (`importacao-*`, `grade-*`, `resultados-*`, `vazio-*`, `colunas-*`).

Defeitos reais encontrados e corrigidos (todos em CSS): (1) **cabeçalho da grade de dados não ficava fixo** — só a primeira coluna era `sticky`, e sem altura limitada o cabeçalho saía da tela (a 2.000 linhas ficava a ~97.000 px acima); agora o quadro rola dentro de `max-height: min(75vh, 48rem)` com o cabeçalho fixo no topo e a célula «Obs.» fixa também à esquerda; (2) **a pré-visualização da importação alargava a página** (57 px de rolagem horizontal a 1064 px) porque o assistente era item de uma linha flexível sem `min-width: 0`; a rolagem agora fica só na tabela; (3) **o campo «Nome do projeto» ficava espremido** (rótulo em três linhas, campo com ~55 px) com a barra de ações ao lado; o campo agora mantém no mínimo 14 rem e as ações passam para a linha de baixo. Os comentários originais do usuário (afastamento do recolher ≥ 12 px, centros dos botões do experimento a ≤ 2 px do seletor, largura da grade > 90% do corpo) foram reaplicados e conferidos nos seis temas, com a barra aberta e recolhida.

Medidas (Chromium e Firefox, 4.000 campos): trocar o tema leva ~1–2 s dentro da página. Os 28–70 s observados no início vinham do `selectOption` do Playwright (verificações de acionabilidade que forçam layout), não do aplicativo; o teste usa a troca dentro da página e seletor CSS por `aria-label` (`getByLabel` leva minutos com ~14 mil campos). A colagem sintética de uma coluna de 2.000 valores na grade levou 20 s (Chromium), 29 s (Firefox) e 4 s (WebKit). A medição de ~0,6 s da ET24 inseriu 131.072 valores no campo de texto da calculadora de potência, sem montar a grade de observações. Os tempos são de componentes e cargas distintos. Uma comparação do custo dos dois tipos de evento requer usar a mesma grade e o mesmo volume. A grade de 2.000 linhas não é virtualizada (página de ~98.000 px antes do limite de altura; o quadro agora a contém, mas o DOM mantém todas as linhas).

Regressão: 242 execuções das suítes de layout, seções, acessibilidade e relatórios nos três navegadores passaram; uma falha de timeout de `fill` em axe/Firefox sob carga passou duas vezes isolada. Não verificado: Windows nativo (T06), Safari real.

2026-11-06. **Conferência individual de AU-B10–B22, AU-U10 e AU-U11 e regressão transversal.** Rust 763 testes, web 533, e as 135 execuções das suítes ET25 (blocos, categorias, Cox, estimabilidade, região de mistura, integridade do ótimo, simplex, variância), dos exemplos ET25, de otimização e de planejamento nos três navegadores passaram na revisão `5744068` mais as correções abaixo. A conferência dos relatórios usa `validation/tools/check_et25_report_layout.py` (PyMuPDF e XML do Word) e `render_docx_with_word.ps1` (Word 16 real por COM): nota no rodapé real de todas as páginas, campos de página no Word, sem texto exclusivo da tela, sem página final residual, sem título solto no fim da página. O verificador acusa o defeito antigo (confirmado nos 3 PDFs de blocos anteriores) e passa nos 18 relatórios novos (PDF e Word, 9 relatórios).

Defeito real encontrado e corrigido (AU-U11): o título «Sequência sugerida de remoções» ficava sozinho no fim da página 1 do relatório de superfície com blocos, com a lista na página 2, porque o `pageBreakBefore` do PDF não vê o primeiro item de uma lista que vai para a página seguinte. O título agora é amarrado ao primeiro parágrafo/item (`headingLead` em `pdfContent.ts`, numeração da lista preservada, 2 testes novos). Word 16: 9 relatórios, sem página vazia; ocupação mínima de página não final 0,46 (figuras indivisíveis seguem um por página, ocupação 0,53–0,68 nas páginas de figura), registrada como limite estético, não como defeito. Evidências: `docs/imagens/evidencias-v0.4-et28/t05-word`. Não verificado: Windows nativo desta revisão (T06) e relatórios em inglês nesta rodada.

2026-11-06. **T06 aceita localmente — regressão integral e qualidade da evidência (AU-Q01–Q03).**

*Identidade da candidata local.* Commit `c565dd5`; os artefatos abaixo foram construídos em sequência controlada (web e WASM → dist → executável) sem suíte ativa, às 02:08–02:13 de 2026-11-06, a partir dessa árvore (depois deles só mudaram testes, sem código de produto). dist `3a72e141dae027d4…`, WASM `b72ea865337bea6b…` (igual ao da T04), executável de automação `633449ccb9dfa795…` (identificador isolado `com.enzitag.optima.et25qa`, sem o segredo do Drive). Hashes completos e logs de compilação em `docs/imagens/evidencias-v0.4-et28/t06-*`.

*Rust:* `cargo fmt --check` e `clippy --workspace --all-targets` sem avisos; 767 testes passados, 3 ignorados (preexistentes). *Web:* 533 unitários, contratos atuais, tipos, `biome` sem erros (172 avisos preexistentes de CSS), build.

*Matriz Playwright completa* (Chromium, Firefox, WebKit; 1.548 execuções em 59 arquivos, 1,3 h, com carga concorrente): 1.531 passaram na primeira rodada e 17 falharam. Classificação, sem apagar o diagnóstico: (1) **6 execuções, expectativas obsoletas dos testes ET29** (UX25 e UX20/T19): desde a ET25 T09 o ótimo inclui fatores categóricos e a «Unidade» não é oferecida como efeito fixo; testes atualizados para o comportamento aceito e verdes nos três navegadores. (2) **3 execuções de `AU-P05: unfinished 4096-row profile`** estouraram o limite sob a carga da matriz e passaram isoladas (Chromium 2,6 min, Firefox 2,5, WebKit 1,6). (3) **5 execuções do Firefox** (UN com 12 ocasiões, arquivo misto grande, ampliação mista, teclado do bloco guiado, grade de 1.000 linhas) passaram isoladas. (4) **3 execuções do `et28-large-content`**: o teste da barra do projeto corria antes de a tela renderizar no WebKit (corrigido) e o de 2.000 linhas passou isolado no WebKit (1,9 min) e no Firefox (13,3 min; limite do teste elevado para 30 min). Falhas de `EBUSY` ao gravar *traces* dentro do OneDrive são do ambiente; as reexecuções usaram saída fora da pasta sincronizada.

*Windows 10 nativo* (executável acima, WebView2): roteiro geral com 31 verificações «OK» (motor nativo contra as referências independentes, incluindo fracionários e Plackett–Burman; 17 projetos de exemplo históricos reabertos com análises guardadas; PDF e Word do relatório; comentário no Word; comando de atualização); ET25 completo (misturas, Cox, superfície com bloco, D/I misto, estimabilidade, relatórios, seis temas PT/EN, reabertura sem cálculo); painel do Drive (estado «indisponível» sem credencial, sem requisições externas, 12 combinações de tema/idioma no axe). O roteiro nativo de seleção de modelos foi atualizado para os casos novos.

*Invariantes científicos (AU-Q03)*, `tests/scientific_invariants.rs`, pela API pública a partir das requisições das referências validadas: a ordem das linhas não altera ANOVA nem médias marginais; a mudança afim da resposta (×1000 + 37,5) escala estimativas e contrastes e mantém F, p e R²; ajuste exato serializa sem valores não finitos e com p em [0, 1]; a reescala das unidades dos fatores da superfície não altera o ajuste codificado. Somam-se os adversos já cobertos (ajuste exato e quase singular, saturado, limites de parâmetro, resultados indefinidos, arquivos contraditórios: ET24 bloco 02, estimabilidade e orçamento da ET25).

*Não verificado:* Windows 11 e Safari real; CI do GitHub (nenhum push); instalador (T07); repetição em outra máquina; contas reais do Drive (ET26 T08).

2026-11-06. **T07 preparada localmente (sem publicação).** Instalador NSIS gerado e inspecionado (19.177.722 bytes; metadados e identificador de produção conferidos; sem automação embutida; sem assinatura Authenticode, como esperado); testes das regras dos canais (4) e de versão única passam. **Defeito de distribuição encontrado e corrigido:** o `release.yml` não injetava `GOOGLE_DESKTOP_CLIENT_SECRET`, deixando o Drive do Windows indisponível no instalador publicado; agora injeta o segredo do GitHub e avisa quando falta. O roteiro de publicação e de teste dos canais experimental e estável, com responsável por passo, está em `docs/distribuicao/publicacao.md` («Preparação da publicação da v0.4.0»). **Não verificado:** instalação/desinstalação (o instalador não foi executado nesta máquina para preservar o aplicativo instalado), assinatura minisign, `channels.yml` e a atualização real 0.3.0 → 0.4.0 nos dois canais, SmartScreen e Windows 11; tudo isso depende de publicação autorizada.

2026-11-06. **T08, itens do usuário (apresentados; sem resposta presumida).** Edição simultânea (PD-14), perguntas da §9 da especificação: (1) qual caminho — A (mesclagem de três vias no arquivo do Drive, sem tempo real; recomendado), A depois B (registro de operações em arquivo compartilhado) ou direto C (tempo real com retransmissor); (2) haverá infraestrutura própria de sinalização e quem arca com o custo (sem isso o caminho C não existe); (3) é aceitável a mudança de esquema (revisão com vários pais, `schemaVersion` 2) na versão que trouxer a colaboração; (4) nas observações, «última gravação vence» com aviso basta ou é preciso edição colaborativa de texto; (5) prioridade frente às demais evoluções. Protimiza (PD-05): o rótulo CCD já foi conferido; falta o inventário das funções internas, que só pode ser feito com capturas das telas ainda não vistas, se houver interesse em cobertura integral. Nenhuma implementação do caminho A foi iniciada.

2026-11-06. **T09, aceite local da ET28.** Todo achado tem estado registrado na matriz (fechados: AU-B10–B22, AU-P05, AU-U09–U11; abertos de propósito por serem controles contínuos: AU-Q01–Q03; os 25 originais, fechados nas ET27/ET29 e cobertos pela regressão visual). Pendências externas: T08, ET26 T08 (contas reais), publicação e atualização real nos dois canais, Windows 11 e Safari. Plano movido para `concluidos/`; índice atualizado.
