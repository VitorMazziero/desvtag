# ET24 — Ajuste não linear e potência avançados

Estado: concluída localmente em 2026-11-04. Versão-alvo v0.4.0. A ET24 depende da ET22.

## Tarefas e aceite

- [x] **T01 — Decisões e contratos.** Perfil, limites/domínio, inferência de potência e simulação reprodutível; contratos aditivos e proveniência distinta. DT antes do código dependente.
- [x] **T02 — Perfil no Rust.** Otimização dos parâmetros de perturbação, razão de verossimilhança, extremos e diagnóstico de perfil não unimodal/inconclusivo; não inventar limites finitos. Limites/inícios validados, estados de não convergência corretos. Manter resultados antigos.
- [x] **T03 — Referências não lineares.** NIST StRD compatível com o catálogo, inícios publicados, estimativas/erros/SQR certificados, transformação documentada; SciPy independente para perfis Monod/Haldane/Hill e casos adversos.
- [x] **T04 — Configuração e resultado.** Inícios e limites editáveis com nomes/unidades e validação junto dos campos; escolha Wald/perfil, tabela/figura de perfil e diagnóstico do intervalo. Persistir opções/resultado/assinatura; relatórios, CSV/XLSX. Avaliação no navegador após incremento.
- [x] **T05 — Potência avançada.** Regressão, contrastes e efeitos de dois níveis com desenho e hipótese explícitos; fórmulas não centrais conferidas independentemente; tamanho/precisão quando definidos, não confundir réplicas e observações.
- [x] **T06 — Simulação.** Semente, número de repetições, gerador determinista e teste usado registrados; erros de Monte Carlo/IC binomial, limites de execução e cancelamento no worker; referência independente e calibração sob H0.
- [x] **T07 — Integração da potência.** Interface PT/EN, validação prévia, método/hipótese/suposições, resultados históricos, relatórios e exports completos; criar experimentos do zero no app real.
- [x] **T08 — Matriz e nativo.** WASM×nativo, salvar/reabrir sem recalcular, seis temas/PT/EN, 375/800/1200/1920, fontes, teclado/axe, figuras e PDFs renderizados, Windows 10/WebView2.
- [x] **T09 — Fechamento.** Conferência requisito por requisito, exemplos novos, fichas/mapa/especificação/cobertura/CHANGELOG, logs e capturas com hashes. Não concluir com critérios em aberto.

## Decisões

[DT-0033](../../decisoes-tecnicas/dt-0033-perfil-de-verossimilhanca-e-dominio-nao-linear.md) define T02–T04. [DT-0034](../../decisoes-tecnicas/dt-0034-potencia-linear-e-simulacao-gaussiana.md) define T05–T08 antes do código dependente.

## Inventário inicial (antes da implementação)

`models/nonlinear.rs` contém contratos, Jacobiana, LM projetado e Wald; o core já recebe inícios/limites, mas a interface sempre envia nulos. Os limites não são plenamente validados antes de `clamp`, e o contador de inícios soma os melhores repetidamente. O perfil não existe. A família é persistida desde ET22. `power` oferece ANOVA e testes t exatos, sem simulação/regressão/contrastes/efeitos de dois níveis. Fonte Misra1d obtida antes da ativação; isso não prova validação. Download público autorizado no escopo da execução integral.

## Progresso — perfil (2026-11-03)

T02–T04 implementadas e exercitadas localmente: três testes públicos de perfil/NIST/adversos, delta de persistência, quatro referências pelo WASM, 15 percursos funcionais nos três navegadores e matriz 144/144. Avaliação visual corrigiu fieldsets/espaçamento e diferenciou Wald/LR/faixa. Nativo/UI, cancelamento/desempenho, exemplo e conferência final da etapa continuam abertos. [Relatório por bloco, evidências e limites](../../../validation/reports/et24/README.md). DT-0034 e dez referências de potência preparadas antes do código dependente; não declaram potência avançada entregue.

Achado anterior à ampliação de potência: a F não central tinha laço sem orçamento e a série t podia zerar pesos para efeitos extremos. [DT-0035](../../decisoes-tecnicas/dt-0035-caudas-nao-centrais-com-orcamento-numerico.md) registra correção e validação independentes antes do código.

Correção do achado numérico implementada: 174 pontos extremos + casos legados; 3/3 percursos reais do erro/potência e 18/18 após ajuste de espaço de Extras. Potência avançada continua pendente.

## Bloco de integridade da auditoria

AU-B02/B03/B04 concluídos localmente; reconferência e evidências na §9.7 do plano v0.4. Regressão atual: 618 testes Rust aprovados e um ignorado preexistente; reforços dos contratos/limite superior Monte Carlo aprovados em 8 testes públicos de potência e 17 de armazenamento; 23 testes WASM, 9 percursos reais nos três navegadores e nova conferência Windows/WebView2 aprovados. Potência avançada/simulação já têm código, referências, persistência e percursos reais; as frases anteriores descrevem o estado nos respectivos incrementos, não o estado atual. Os demais blocos e o aceite final da ET24 continuam independentes deste fechamento.

## Bloco 03 — aceito localmente

AU-B07/B08/U08 implementados e verificados conforme §9.8 do plano v0.4. Cálculo e arquivos usam filas independentes; cancelamento por canal, falhas visíveis/focadas e proteção da identidade do destino. Windows mantém no máximo uma execução científica real, inclusive após descartar resposta cancelada. Testes/roteiros e limites no relatório ET24 existente. Custo integrado permanece para o bloco 05; UI/documentos para o bloco 04; T06/T08 inteiras não são fechadas apenas por este incremento.

## Bloco 04 — aceito localmente

AU-U01–U07 e bloco 04 concluídos conforme §9.9 do plano v0.4: início responsivo, prosa/números, plurais, resumo e perfis inconclusivos; matriz completa em HTML/PDF/Word/CSV/XLSX, tabelas em partes sem perda de referência e cabeçalhos/legendas vinculados. 495 unitários, tipos/lint e documentos reais nos três motores e Windows aprovados. Medição integrada e aceite integral da ET24 continuam abertos.

## Bloco 05 — desempenho e limites aceitos localmente

As comparações preservaram 30 respostas completas por alvo e qualificaram os limites de ajuste e inferência. O caso UN de 12 ocasiões passou com inferência completa e parcial no aplicativo e no IPC nativo. Os arquivos antigos acima dos limites preservaram seus registros. A legenda do perfil parcial foi corrigida e reconferida no navegador e no SVG. [Critérios e evidências](../../planos-execucao/plano-v0.4.md#910-execução-do-bloco-05--custo-2026-11-04).

O bloco 06 confere o conjunto da ET24 por tarefa, os exemplos e a identidade dos artefatos. A última alteração da legenda requer a repetição de apresentação no executável de consolidação.

## Bloco 06 — conferência da ET24

A candidata foi compilada a partir de `e542196`. O registro de identidade vincula o ativo web servido, o WASM e o executável exercitado no Windows. [Hashes e inspeção](../plano-v0.4.md#117-acervo-final-das-evidências-v04) (acervo: `docs/imagens/evidencias-v0.4-et24/closure-verification`).

| Tarefa | Evidência conferida |
|---|---|
| T01 | DT-0033 e DT-0034 registram hipóteses, contratos e decisões. A extensão do resultado mantém a proveniência v2. Os tipos gerados foram comparados com o Rust. |
| T02 | Multistart e perfil preservam os pontos realmente examinados. Os testes públicos cobrem os cortes, o domínio, a convergência e a ausência explícita de intervalo quando o perfil é inconclusivo. |
| T03 | Misra1d usa dados e valores certificados NIST com transformação documentada. Monod, Haldane e Hill têm referências independentes em SciPy. O exemplo 16 reproduz o caso NIST no aplicativo. |
| T04 | Inícios, limites e perfil são editáveis e validados. Tabela, figura e fontes distinguem Wald e perfil. O histórico preserva as entradas e o resultado consultado. |
| T05 | Regressão, contraste e efeitos de dois níveis conferidos contra dez referências. A precisão admite uma réplica-base quando há gl residual e preserva a semiamplitude nos casos de potência indisponível. |
| T06 | Semente, contagem, erro-padrão de Monte Carlo e Wilson são registrados. A calibração sob a hipótese nula, os limites e os fluxos de cancelamento têm testes próprios. |
| T07 | Configuração PT/EN, validação, hipóteses, exportações e reabertura exercitadas no app real. O exemplo 17 reproduz o contraste planejado e a simulação. |
| T08 | Matriz de seis temas, PT/EN, larguras, teclado e axe aceita nos incrementos. A candidata passou em 69 percursos nos três navegadores e no WebView2. A UN parcial mostrou a legenda corrigida nos dois idiomas. |
| T09 | Dois exemplos produzidos pela interface e reabertos sem recálculo. O IPC nativo leu e regravou ambos com os mesmos hashes. Os 66 PDFs tiveram texto extraído e os 66 documentos Word foram conferidos pelo XML. |

[Relatório da ET24](../../../validation/reports/et24/README.md), [exemplo 16](../../../examples/16-perfil-de-saturacao/README.md) e [exemplo 17](../../../examples/17-potencia-de-contraste/README.md).
