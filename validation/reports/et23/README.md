# ET23 — Modelos mistos e medidas repetidas avançados

Estado: implementação e verificação local concluídas em 2026-11-03. Versão 0.4.0-dev, sem publicação. A CI da candidata final e os critérios de lançamento da v0.4 continuam separados.

## Aceite por tarefa

| Tarefa | Entrega e evidência verificável |
|---|---|
| T01 — decisões/contratos | [DT-0031](../../../docs/decisoes-tecnicas/dt-0031-covariancias-e-inferencia-das-medidas-repetidas.md) antes do código, [DT-0032](../../../docs/decisoes-tecnicas/dt-0032-limite-explicito-da-grade-de-medias-marginais.md), contratos gerados e método v2; solicitações antigas mantêm estimador/proveniência v1. |
| T02 — unidade/tempo | Texto temporal opcional integra revisão/arquivo, grade, importação e CSV/XLSX; fontes por coluna/fator, ordem categórica explícita, identidades injetivas com rótulos históricos. Tempos ausentes têm causa; duplicação unidade×tempo e índices inadequados são recusados. `et23-columns`, `et23-configuration`, testes públicos Rust e `family_storage`. |
| T03 — covariâncias | REML CS, AR(1) residual com intercepto aleatório, UN marginal positiva definida, observações incompletas sem imputação; fronteira e não identificação explícitas. Cinco referências densas independentes e caso de fronteira OLS. |
| T04 — testes conjuntos | Satterthwaite/Fai–Cornelius, hipótese das colunas codificadas e gl/valor-p explícitos; interação de quatro gl, desbalanceamento e termo de posto zero. Nenhum substituto n−p para inferência indefinida na v2. |
| T05 — EMM/comparações | Pesos iguais nos fatores, referências numéricas registradas, famílias por fator, Holm ou Bonferroni nos valores-p e IC simultâneos Bonferroni. Dois casos fatoriais independentes com três níveis/interação/covariável. |
| T06 — perfis | Pontos/linhas individuais, média modelada com IC e tabela fonte produzidos no Rust, unidades/n/exclusões, revisão histórica, menu/exportação comuns. Matriz visual 126/126 e verificação nativa. |
| T07 — apresentação/persistência | Efeitos fixos e covariância distintos; resumo mostra termos efetivos, codificação, confiança e inferência aproximada. Opções em edição separadas dos resultados; salvar/reabrir sem ajuste; históricos e relatórios HTML/PDF/Word, tabelas CSV/XLSX. 10/10 testes de persistência, incluindo recusa de dimensões incoerentes. |
| T08 — referência/paridade | Sete conjuntos NumPy/SciPy, sementes e tolerâncias nos [casos](../../cases/repeated_covariance/); mesmos coeficientes, covariâncias, testes conjuntos, EMM/comparações no Rust nativo e WASM. Arquivo avançado codifica/decodifica com SHA-256 idêntico. |
| T09 — uso real | Cinco modelos criados do zero, configurações por fator/interação/referência/Holm, entradas inválidas preservando resultado anterior, recuperação e relatórios. Chromium/Firefox/WebKit; seis temas/PT/EN; larguras 375/800/1200/1920, escala da interface 0,85/1/1,2/2 e da figura 0,85/1/1,2; axe e limites de texto. Windows 10/WebView2 real, perfil isolado. |
| T10 — documentação | [Especificação](../../../docs/metodos/modelos-mistos.md), [ficha C14](../../../docs/modulos/c14-medidas-repetidas-avancadas.md), mapa, cobertura, CHANGELOG, planos, [exemplo 15](../../../examples/15-medidas-repetidas-ar1/README.md), fontes e evidências com hashes. |

## Validação científica e limites

A implementação independente usa V densa em NumPy/SciPy, distinta do estimador Rust por blocos. Há cinco casos CS/AR1/UN, correlação positiva e negativa/lacunas, heterogeneidade e ausências, e dois fatoriais CS/AR1 com codificação soma zero, interação de quatro gl, covariável em 2,25 e Holm. Os geradores registram sementes 20261103/20261104, versões, inícios e tentativas de otimização. Tolerâncias: objetivo absoluto 2e−7, coeficientes 2e−5, covariâncias 3e−5, parâmetros transformados 2e−4, inferência relativa 0,003. Os testes também cobrem permutação, termo de posto zero, grade máxima, AR1 não identificável e fronteira CS equivalente a OLS. A fronteira tem gl obtidos da informação observada; não é um fallback.

R não foi executado: `Rscript` não estava no PATH nem nas raízes usuais verificadas. Não se declara Kenward–Roger ou ANOVA tipo III invariante à codificação. UN não separa intercepto aleatório/ICC/BLUP não identificáveis. Não há inclinações aleatórias ou vários fatores aleatórios cruzados. AR1 requer diferenças inteiras dos índices; ordem categórica implica espaçamento unitário escolhido pelo usuário. A grade marginal limita-se explicitamente a 100.000 células. Leitor novo abre arquivos antigos; arquivos com campos temporais novos podem ser recusados por versões antigas. Comparações definidas não substituem o exame dos pressupostos do modelo.

## Comandos e resultados

Logs completos em [logs](logs/), inclusive falhas iniciais; os números abaixo identificam rodadas, não somam execuções repetidas como cobertura distinta.

| Verificação | Resultado/log |
|---|---|
| `cargo test --workspace` | 618 aprovados, 3 ignorados, 35 suítes: `rust-et23-final.log`. Caso adicional de fronteira posterior aprovado: `mixed-et23-boundary.log`. |
| `cargo clippy --workspace --all-targets -- -D warnings`, `cargo fmt --all -- --check` | Aprovados; `clippy-et23-ci.log` e conferência final. |
| `npm test`, lint e tipos | 461/461 em 56 arquivos; lint sem erros (152 avisos, 4 informações) e tipos aprovados: `unit-et23-close.log`, `lint-et23-close.log`, `typecheck-et23-close.log`. |
| Contratos/build WASM+web | `contracts-et23-final.log`, `build-et23-configuration.log`; último build de apresentação `build-et23-model-summary.log`. |
| Matriz modelos/figuras | 42/42 Chromium e 84/84 Firefox/WebKit: `e2e-et23-matrix.log`, `e2e-et23-matrix-fx-wk.log`. |
| Última revisão resumo/configuração | 21/21 nos três navegadores: `e2e-et23-model-summary.log`. |
| Regressões | 12/12 unidade/tempo (`e2e-et23-regression-final.log`); 18/18 famílias (`e2e-et23-storage-regression.log`); 21/21 configuração/comentários/ET22 (`e2e-et23-comments-final.log`). |
| Avisos PT/EN/axe | 6/6: `e2e-et23-warning-coverage.log`. |
| Aplicativo Windows 10 | `native-check-et23-final.log`: base científica, arquivos legados, 13 exemplos, PDF/Word/comentários, ET27, ET22 e ET23. Última apresentação embutida: `native-build-et23-summary.log`, `native-check-et23-summary.log`, aprovados. |

O build nativo usa `cargo build --release --features tauri/custom-protocol,automation`, `TAURI_CONFIG` com identificador/diretório de dados exclusivos para validação, seguido de `node tests/native-cdp.mjs <executável>`. A última conferência dirigida usa `NATIVE_ET23_ONLY=1` e `NATIVE_ET23_EVIDENCE`. Os avisos de stdout do linker MSVC permanecem nos logs. Não equivalem a falha do clippy.

## Avaliação da interface e correções observadas

| Bloco | Problema encontrado no uso real | Correção e reconferência |
|---|---|---|
| Grade/importação | Tempo sumia ao criar revisão; trocar idioma reiniciava o mapeamento. | Preservar texto no snapshot e mapear pela identidade da fonte. Percursos nos três navegadores e exports. |
| Unidade experimental | Sanitização podia fundir rótulos diferentes. | Mapeamento injetivo, identificadores reservados e nomes originais no histórico/relatório. Testes com Unicode/pontuação. |
| Configuração | Campo da ordem sem estilo; dependências ocultas de fatores removidos; texto sugeria excluir tempo já usado como efeito fixo. | Campo consistente, poda de interações/EMM/referências e controle “efeito fixo adicional”; ajuda explica fator já selecionado. Captura final por navegador. |
| Resumo e tabelas | Estrutura de covariância aparecia depois das tabelas; títulos duplicados no PDF; termos efetivos não estavam claros. | Estrutura/modelo/confiança/inferência no resumo, caption único e modelo histórico explícito. Relatórios renderizados novamente. |
| Comentários | Identificadores internos e nomes atuais confundiam a origem histórica. | Nomes reconhecíveis PT/EN compartilhados entre tela/relatório, variáveis históricas preservadas. Export verificado. |
| Avisos | A cobertura antiga ignorava chamadas Rust quebradas em várias linhas; sete mensagens faltavam; alguns painéis não exibiam avisos. | Busca cobre espaços/quebras, sete traduções PT/EN e avisos do planejamento misto/ótimo; mistura usa tradutor central. Testes unitários e navegador PT/EN/axe. |

Inspeção visual da configuração final: campos de 40 px, rótulos próximos aos controles, separação entre grupos, ordem temporal e ajuste explicados junto da decisão; sem cortes na captura. Inspeção do PDF nativo final: resumo UN coerente, termos/confiança/inferência legíveis antes das tabelas, coeficientes com IC, F conjunto e matriz dentro das margens; páginas seguintes mantêm cabeçalhos e figura/legenda. Word teve estrutura e imagens verificadas, sem certificar paginação no Microsoft Word.

As primeiras falhas não foram apagadas: build nativo sem `tauri/custom-protocol` abriu `about:blank` e não validou o app; o primeiro seletor de aviso encontrava bloco oculto; o seletor nativo de unidade também precisava localizar o grupo fechado antes de abri-lo. Os builds e percursos posteriores comprovam as correções. [Evidências organizadas](../../../docs/imagens/evidencias-v0.4-et23/README.md).

## Limites da qualificação

Os testes desta etapa não comprovam Safari real, Windows 11, instalador/atualização da v0.4 publicada ou contas reais do Drive. A CI final, publicação e verificações externas mantêm seus próprios critérios nas ET26/ET28 e no plano da versão. Nenhuma release, etiqueta ou publicação Pages foi feita nesta etapa.
