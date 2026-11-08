# ET24 — Verificação e aceite local

Estado: concluída localmente em 2026-11-04. [Plano e aceite](../../../docs/planos-execucao/concluidos/et24-ajuste-nao-linear-e-potencia-avancados.md).

O estado vigente corresponde ao fechamento local no fim deste relatório, registrado no commit `a86d055`, com a candidata compilada de `e542196`. As seções anteriores preservam o histórico de cada incremento, incluindo falhas, pendências e limitações existentes naquela rodada. As pendências globais da versão seguem a [ordem de execução da v0.4](../../../docs/planos-execucao/plano-v0.4.md#96-ordem-de-execução-e-regra-de-conclusão).

## Incremento não linear

Extensão opcional v2 com perfil LR gaussiano assintótico, inícios/limites editáveis, domínio validado, estados dos extremos e pontos/figuras. O core foi separado por responsabilidade; contador de inícios corrigido e ausência de redução não significa convergência quando o gradiente projetado é grande. Sem recálculo ao reabrir; estrutura dos perfis validada no projeto. A [DT-0033](../../../docs/decisoes-tecnicas/dt-0033-perfil-de-verossimilhanca-e-dominio-nao-linear.md) antecedeu o código.

Referências: [quatro casos](../../cases/nonlinear_profile/profile.json), três sintéticos com semente 20261103 e NIST Misra1d, ambos os inícios publicados, transformação exata do modelo e SE por delta. Três testes públicos Rust aprovados: comparação de todos os extremos dos perfis/estimativas/SQR/SE NIST, limites impostos/SQR zero e inícios/limites inválidos sem panic. Três testes legados científicos continuam aprovados. Delta de persistência aprovado; dois testes de parsing e um teste WASM que percorre as quatro referências aprovados. Clippy core/project com todos os alvos e -D warnings aprovado depois de ajustar iteração sobre matriz; tipos aprovados.

## Avaliação da interface por bloco

| Bloco | Observação | Alteração/reconferência |
|---|---|---|
| Configuração | Primeira captura tinha bordas cinza e controles/grupos sem o espaço comum do app. | Usar `editor-card` e `check`, texto separado do checkbox, campos de 40 px e grupos com os tokens de cada tema. 15/15 percursos finais nos três navegadores. |
| Entradas | Valores inválidos não devem chegar como falha genérica do motor. | Validação junto de cada campo, vínculo acessível, botão indisponível até corrigir; teste confirma nenhuma chamada científica. Trocar modelo limpa inícios/limites dependentes. |
| IC/figuras | IC de Wald, perfil LR e faixa da curva poderiam ser confundidos. | Rótulos distintos, método/corte/nível, causa em cada extremo; explicitar faixa delta/Wald e domínio examinado. PDF renderizado mostra tabela e figuras dentro das margens. |
| Relatório/histórico | Opções e nomes precisam pertencer ao ajuste consultado. | Tabela de inícios/limites históricos e unidades; arquivo salvo e reaberto sem chamar ajuste, HTML/PDF/Word com perfis. |

Primeira rodada Chromium: 5/5; depois do ajuste visual, 15/15 Chromium/Firefox/WebKit com quatro modelos do zero (incluindo NIST), inválidos, desatualização e relatórios. Axe sem violações nos estados exercitados. Capturas anteriores preservadas em [profiles-first](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/profiles-first`); [capturas finais](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/profiles-final`) e [matriz](../../../docs/imagens/evidencias-v0.4-et24/README.md). Inspeção visual do PDF inicial Monod confirmou IC distintos e figuras sem corte; essa leitura não certifica a paginação do Microsoft Word.

## O que falta

**Registro histórico do primeiro incremento.** Naquela rodada faltavam exemplo, cancelamento/custo, Windows/UI, revisão adversa e potência avançada/simulação com persistência e relatórios. Esses itens da ET24 foram implementados e conferidos nos blocos seguintes, até o fechamento local descrito ao fim deste relatório. A regressão/CI da versão completa e os demais aceites transversais continuam na ET28, conforme o plano da v0.4.

Os perfis só verificam numericamente a forma na região finita amostrada. Nenhuma prova de unimodalidade global; nenhum IC por perfil certificado pelo NIST; apenas Misra1d corresponde ao modelo do catálogo. R não foi executado. Não houve publicação.

## Conferência do incremento de perfil

Matriz completa: **144/144** (48 Chromium, 96 Firefox/WebKit), quatro modelos × seis temas × PT/EN; cada cenário confere larguras 375/800/1200/1920 e escalas de fonte 0,85/1/1,2/2, fontes de figuras 0,85/1/1,2 e limites dos textos, além de axe. Inspeção Clay/PT final confirmou espaçamento entre grupos e rótulos; PDF Monod final distingue Wald/LR/faixa e preserva tabelas/figuras. Registros em `e2e-et24-profile-matrix*.log` e `e2e-et24-profiles-visual.log`.

Última revisão científica removeu qualquer corte de 95% substituto se a inversão do quantil falhar: o erro é explícito e traduzido. Três testes públicos de perfil passaram novamente (`nonlinear-et24-profile-no-fallback.log`); seis científicos de perfil/legado passaram juntos antes desse delta. Contagem de inícios representa todas as tentativas, inclusive não finitas. O módulo legado da potência foi separado em `types`/`legacy`/testes, sem entregar as variantes novas por essa separação.

[DT-0034](../../../docs/decisoes-tecnicas/dt-0034-potencia-linear-e-simulacao-gaussiana.md) e dez referências NumPy/SciPy com simulação independente de observações gaussianas/OLS foram preparadas para potência; ainda não são validação do código Rust das variantes, que não foi implementado neste incremento.

## Achado numérico anterior à ampliação de potência

54 pontos de F e 120 de t não central em efeitos extremos/não triviais passaram contra SciPy, mais o caso de potência com n=2, δ=40 e α=0,01 (bilateral), que não pode virar certeza. Três testes públicos novos e os três científicos legados passaram; clippy sem avisos após corrigir o padrão irrefutável de um teste. Falha fora do orçamento propaga diagnóstico numérico próprio na execução direta e na busca de tamanho, sem valor substituto. [DT-0035](../../../docs/decisoes-tecnicas/dt-0035-caudas-nao-centrais-com-orcamento-numerico.md), [referência](../../cases/noncentral_extreme/tails.json), `power-et24-extreme*.log`.

Navegador: 3/3 para potência correta e diagnóstico mantendo o registro anterior, Chromium/Firefox/WebKit, axe. A inspeção desse percurso identificou botão Calcular encostado no último campo e pouco espaço antes dos avisos. As duas ferramentas de Extras agora têm fluxo em grid com espaçamento entre grupos e ações, sem esticar o botão principal. **18/18** perfis/potência nos três motores passaram após esse ajuste (`e2e-et24-tool-spacing.log`). [Capturas finais](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/tool-spacing`). O build WASM completo precede a última reformulação algébrica dos quocientes em logaritmos na F; os testes nativos dessa última forma passaram. A paridade final e o build unificado serão repetidos na conclusão da ET24, sem declarar este delta como qualificação final da etapa.

A inspeção da captura após o ajuste de espaço encontrou um segundo problema: erro novo podia ficar abaixo da área visível do modal. Um hook compartilhado das duas ferramentas agora foca o aviso e rola o contêiner interno até exibi-lo. **3/3** percursos finais verificam foco e retângulo inteiro do aviso dentro da janela, além de axe, erro reconhecível e preservação do resultado. [Capturas do erro visível](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/error-focus`), `e2e-et24-error-focus.log`. O foco programático foi conferido; o cabeçalho/Fechar permanece acessível. Esta correção é de apresentação, sem alterar a referência científica.


## Auditoria — bloco 02 de integridade (2026-11-03)

Base: feat/v0.4, HEAD 466b45e com alterações locais preservadas; cópia recuperável antes deste bloco em `%TEMP%/enzitag-integrity-before-20261103.zip`. Nenhum release publicado. AU-B02/B03/B04 têm código e testes; aceite do último delta de apresentação em andamento na §9.7 do plano v0.4.

- Não linear: SQR zero ou não convergência preservam estimativas/curva e invalidam explicitamente inferência/faixa; correlação vazia serializável. Testes adicionais para posto deficiente e parâmetro no limite; não mudou a validade assintótica dos IC em fronteiras.
- Potência: razões antes de quadrados; escalas de resposta/pesos recíprocos sem transbordamento intermediário desnecessário. Dez referências e objetivos, incluindo precisão e menor inteiro; oito testes públicos de potência avançada aprovados após o delta de produtos.
- Projeto: graus de liberdade e resumo Monte Carlo coerentes com estrutura/contagem; mutações isoladas recusadas, arquivos históricos íntegros preservados sem análise na abertura. Outras famílias já conferem revisão, referências, finitude e estruturas específicas; isso não demonstra autenticidade científica nem detecta toda alteração numérica possível.

Regressão Rust core/project: 617 aprovados, um ignorado já existente; esse comando antecede o último caso de produtos recíprocos, reconferido na suíte pública de oito testes. Último ajuste do aviso não linear: 14 testes direcionados aprovados e clippy sem avisos. WASM real: 23 testes de paridade/perfis/projeto aprovados; contratos e tipos conferidos. A suíte web inteira continua com a pendência conhecida de pluralização AU-U03, fora deste bloco.

Primeira matriz de integridade identificou foco ausente em tabela com rolagem horizontal: corrigido no componente compartilhado, com região nomeada. A asserção CSV foi corrigida para examinar células, permitindo null nos metadados das opções não informadas. Rodada seguinte: 41/42 percursos aprovados; a falha restante foi EBUSY ao copiar download na pasta OneDrive, a repetir fora da sincronização. Ajuste exato passou nos três motores e exportou HTML/PDF/Word/CSV/XLSX; XLSX aberto com openpyxl confirmou estimativas e quatro colunas inferenciais vazias. PDF de três páginas renderizado: tabelas e curva legíveis, sem faixa inventada. A inspeção identificou aviso secundário de baixa precisão inadequado para inferência indisponível; condição corrigida e novo build em conferência.

Windows/WebView2 real: executável de automação recompilado em 5 min 30 s; quatro perfis independentes, dez casos de potência/simulação e hashes dos arquivos históricos aprovados. UI do ajuste exato, round trip nativo e escalas 10^±160 aprovados; três desenhos de potência construídos do zero, quatro registros recuperados, seis temas/PT–EN e HTML/PDF/Word. Esse executável antecede apenas o último ajuste do aviso e o foco da tabela; não equivale à candidata final da ET24. Logs `native-integrity-verified.log`, `e2e-integrity-final.log`, `wasm-integrity-verified.log`; capturas nas pastas integrity existentes. Erros iniciais do roteiro nativo (texto com codificação incorreta e discriminante de transporte type na comparação) foram corrigidos no teste, sem alterar o cálculo.

Continua aberto: bloco 03 de execução/cancelamento, bloco 04 de interface/documentos, medição e fechamento completo da ET24. Recomendações visuais observadas neste bloco foram incorporadas ao AU-U04 no plano existente.


Fechamento local do bloco 02: **9/9** percursos de integridade Chromium/Firefox/WebKit aprovados após recompilar o último delta e executar fora do OneDrive; **23/23** testes WASM repetidos no artefato final e tipos aprovados. Capturas/arquivos em `integrity-verified`; bloco 02 e AU-B02/B03/B04 marcados no plano v0.4. ET24 continua aberta. A correção do aviso secundário elimina a frase de baixa precisão quando o erro-padrão não é estimável. A conferência Windows anterior prova os cálculos/arquivos, mas o executável final da etapa ainda será reconstruído com esse último delta e com as próximas correções.

### Reconferência do bloco de integridade solicitado

Base `466b45e`, alterações locais preservadas. Nova regressão core/project: **618 aprovados e um ignorado preexistente**. Os reforços finais acrescentam desserialização tipada dos dez resultados analíticos de referência e adulteração isolada do limite superior de Monte Carlo; **8/8** testes públicos de potência e **17/17** de armazenamento aprovados depois desse delta, formatação Rust aprovada. **23/23** testes WASM (22 potência/projeto + um com os quatro perfis) e **9/9** percursos reais de integridade nos três motores aprovados novamente. Nenhum cálculo ao reabrir, axe sem violações nos estados exercitados, HTML/PDF/Word/CSV/XLSX produzidos.

Windows/WebView2: executável recompilado, ajuste exato e escalas extremas aprovados, quatro perfis/dez potências e arquivos históricos conferidos; três desenhos do zero, quatro registros recuperados, seis temas/PT–EN e relatórios. O aviso secundário corrigido e a ausência de gráfico vazio já fazem parte desta rodada. PDF nativo do ajuste exato (duas páginas) renderizado/inspecionado, com estimativas preservadas e inferência indisponível explícita. [Reconferência web](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/integrity-recheck-browser`) e [nativa](../../../docs/planos-execucao/plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/integrity-recheck-native`), com logs/identidades de artefatos. AU-B02/B03/B04 encerrados no bloco 02; as ressalvas de executável antigo acima descrevem rodadas anteriores, não esta reconferência. ET24/v0.4 permanecem abertas.

## Bloco 03 — execução e coordenação (em conferência)

Complemento da DT-0034 precedeu o código. Duas filas de até 64 pendências, uma operação ativa por classe (científica/serviço); workers reutilizados sob demanda e cancelamento dirigido. A fila Windows conserva a vaga de invoke cancelado até o término real e o Rust limita a concorrência global por classe. Limite de fila não reduz o orçamento do método. Memória de dois contextos WASM e latência integrada serão medidos no bloco 05.

Potência/saturação cancelam ao fechar/trocar identidade, descartam gerações antigas antes de gravar/alterar UI, mostram estado ocupado e erro de transporte traduzido/focado. A explicação nativa informa que o cálculo já iniciado termina antes do próximo. Testes de hook conferem troca de experimento/projeto/epoch e preservação de solicitação durante edição. Restauração de arquivo não recalcula.

Evidência até agora: 15 testes de coordenação/ciclo de vida e dois jobs Rust aprovados; clippy nativo sem avisos. Suíte web completa: 483 aprovados/uma falha de pluralização AU-U03 (já conhecida, bloco 04), total 484. Regressão real: 51/51 nos três motores, incluindo integridade, perfis, potência, relatórios, arquivo pendente durante cancelamento, falha de worker e tentativa posterior. Outra rodada 9/9 confere retângulo do aviso na área visível e que o salvamento estava efetivamente pendente antes de cancelar. Capturas iniciais da janela isolada tinham composição inadequada pelo recorte automático do Playwright; evidência posterior usa captura da janela do navegador e confere geometria. Sem mudança de CSS por esse problema de captura. Windows/cancelamento real sob carga em execução; não fechar AU-B08 apenas pelo build.

### Aceite local do bloco 03

AU-B07/B08/U08 e bloco 03 marcados no plano v0.4 §9.8. Grupo atualizado de coordenação: 16/16; 51/51 funcionais, 9/9 adicionais de falha/salvamento, 3/3 cancelamentos depois do envio real ao worker e 3/3 falhas/recuperação da saturação. UI da falha inspecionada na captura de viewport; aviso inteiramente visível. A asserção de salvamento pendente foi conferida antes do cancelamento, e o arquivo resultante conserva o registro anterior.

Windows real: `native-execution-accepted.log`, executável recompilado em 7 min 42 s. Uma simulação de 10^6 estudos concluída de quatro concorrentes, três recusadas pelo limite, engineInfo independente; nove tentativas canceladas pela UI, nenhum registro adicional, cálculo seguinte concluído. Evidência `execution-native-accepted/native-execution.json` e captura. A fila nativa continua ocupada até o término real; não há promessa de cancelamento cooperativo da fórmula.

Rodadas de teste anteriores foram preservadas: CDP atrasava a UI, não o worker; round trip de clique perdia a janela nos motores rápidos; `__TAURI_INTERNALS__.invoke` é imutável. A rodada aceita não o substitui. Controles reais são acionados assim que disponíveis; o teste web só cancela depois de observar o envio da solicitação ao worker. Isso confere cancelamento e preservação, sem declarar p95/memória nem afirmar que uma fórmula nativa foi interrompida. Fonte/dist/WASM/executável com hashes nos logs; os próximos deltas exigem nova conferência da candidata. Bloco 04 é o próximo; AU-U03 continua sendo a única falha conhecida da última suíte unitária completa.

## Bloco 04 — interface e documentos aceitos localmente

Aceite em 2026-11-04, §9.9 do plano v0.4: 495/495 unitários, tipos e lint sem erros (170 avisos/4 informes remanescentes); 42/42 início/extremos, matriz 116/117 mais uma repetição isolada aprovada após falha de contexto Firefox anterior ao app. Documentos finais 21/21: três motores, PT/EN, 3/8/33 colunas e referência repetida de modelos mistos. 21 PDFs/18 XLSX conferidos independentemente; valores fonte preservados. PDF mantém títulos/legendas e cabeçalho com a primeira linha, fonte mínima 9 pt, referências compactas e termos longos legíveis.

Windows: build em 4 min 07 s, CS/AR(1)/UN, sete referências, três registros recuperados; tela inicial seis temas/PT–EN a 200%, seis conjuntos de matrizes completos e famílias ET24. Sete PDFs/Word e seis XLSX nativos conferidos. Capturas e logs nas pastas `ui-paper-header-final`, `ui-native-tables-final`, `ui-native-mixed-final` e `ui-native-families-final`. Rodadas anteriores preservam o diagnóstico de legenda órfã e o contexto Firefox. XML Word foi conferido, sem afirmar inspeção de paginação no Microsoft Word. Próximo bloco: medir antes/depois e otimizar somente com correção e benefício demonstrados; ET24 continua aberta.

## Bloco 05 — comparação e qualificação dos limites

Duas bases de 28 cenários (worker real e IPC Windows), dois aquecimentos/20 repetições, resultados determinísticos e RSS/privada observada; mais históricos de 100/1000 registros. Sem build concorrente. `performance-before-*` preserva respostas e hashes dos artefatos. Hill de 256 linhas: ~6030 ms mediana WASM/~3052 ms nativo; UN de oito ocasiões: ~1364/~1533 ms; 4096×32/B=10^6: ~93/~89 ms. A diferença entre plataformas não é ganho de otimização.

O fluxo Chromium no tamanho máximo passou em todos os formatos e reabertura. A base mediu cerca de 14 s em HTML/PDF e 20 s em Word. A apresentação revisada monta tabelas extensas em partes e gera PDF/Word no worker, com cancelamento e proteção da identidade do relatório. A comparação do fluxo integrado e a distinção entre entrada por CDP e colagem real constam da §9.10 do plano v0.4. Os arquivos completos de 4096×32 foram conferidos por célula.

Os artefatos protegidos em `performance-guarded-web` e `performance-guarded-native` repetiram 30 casos por alvo com dois aquecimentos e 20 repetições. As respostas completas ficaram idênticas à base e à candidata anterior. Os registros preservam amostras, memória e hashes dos artefatos. A redução de trabalho é medida separadamente com a feature opcional `validation-metrics`, desligada nas aplicações avaliadas.

Os testes de fronteira preservam um ajuste completo quando somente o perfil excede o orçamento, recusam ajustes incompletos e abrem arquivos antigos maiores. O Windows refez o Hill pela interface, conferiu os seis temas e PT/EN e recuperou um registro parcial. O IPC conferiu UN de 12 ocasiões contra referência de solução fechada e retornou os mesmos bytes para os dois arquivos antigos após decodificação e codificação. Os PDFs do perfil parcial tiveram suas páginas renderizadas. A conferência de Word foi feita pelo XML do documento. [Evidências e critérios da versão](../../../docs/planos-execucao/plano-v0.4.md#910-execução-do-bloco-05--custo-2026-11-04).

Aceite local do bloco 05. As medições de fronteira completaram oito cenários por alvo. A conferência cruzada encontrou os mesmos diagnósticos de recusa e os mesmos documentos históricos decodificados. O caso real de inferência REML parcial foi verificado nos três navegadores e no IPC nativo. A legenda da figura foi ajustada após inspeção e passou em seis novos percursos, incluindo SVG exportado. Regressão final do motor com 666 aprovações e três medições ignoradas. Web com 500 unitários e contratos atualizados. O bloco 06 reúne a candidata e a revisão dos critérios T01–T09.

## Fechamento local da ET24

Candidata de `e542196`. A rodada final aprovou 69 percursos nos três navegadores. O Windows repetiu as referências, a criação de experimentos, a recuperação, os limites, a legenda sem IC e a leitura dos novos exemplos. A entrada web incorporada e os hashes da fonte, do WASM e do executável estão no registro de identidade. A conferência final abrangeu 66 PDFs com texto extraído e 66 documentos Word por XML. [Aceite T01–T09](../../../docs/planos-execucao/concluidos/et24-ajuste-nao-linear-e-potencia-avancados.md).
