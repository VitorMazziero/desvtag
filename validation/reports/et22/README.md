# ET22 — Famílias guardadas, consultáveis e exportáveis

Estado: concluída em 2026-11-03 (T01–T10). `feat/v0.4`, `0.4.0-dev`; sem publicação. A ET27 foi encerrada antes da ativação dos métodos avançados. [Decisão DT-0030](../../../docs/decisoes-tecnicas/dt-0030-resultados-persistidos-das-familias.md).

## Conferência por requisito

| Tarefa | Entrega | Evidência |
|---|---|---|
| T01 | Extensão aditiva do esquema 1; registros imutáveis separados da configuração em edição; revisão/assinatura | DT-0030 anterior ao código; contratos gerados e conferidos |
| T02 | Quatro campos opcionais, referências históricas, identidades únicas e finitude; arquivo antigo compatível; instante inicial real | 8 testes Rust de armazenamento; estado/época/resposta tardia; seis arquivos nativos com SHA-256 idêntico no WASM; `et22-storage.spec.ts` |
| T03 | Mistura guardada com resposta/modelo/α, componentes, pontos e unidades originais; erro conserva o anterior | Salvar/reabrir sem operação científica, renomear fator e conservar SVG idêntico, aviso de desatualização; CSV/XLSX com valor numérico completo |
| T04 | Pareado e misto conservam registros distintos; unidade, fixos, resposta, α e diagnóstico de pareamento | Exemplo 11, troca entre registros, comentário ligado ao pareado original; coeficientes, variâncias e BLUPs exportáveis |
| T05 | Saturação com configuração, solicitação e resultado; rótulos/faixa/pontos históricos | Mesmo SVG após salvar/reabrir, coexistência com potência; opções iniciais/limites reservadas no contrato para ET24 |
| T06 | Hipóteses brutas em edição separadas da solicitação validada; potência independe da tabela | α=2 permanece em edição, registro válido conserva α=0,05/n=37; editar observações não o torna obsoleto |
| T07 | Famílias, consulta histórica transitória, resumo de cálculo novo, seções comuns, três relatórios e comentários | 3 motores; relatório do pareado anterior identifica `paired_comparison`; todas as seções exportadas mesmo com só Exportar visível; PT/EN |
| T08 | Valores completos, metadados de configuração e indefinição; exemplos 07/08/11/12 atualizados pelo app | Gerador `save-example-families.mjs`; CSV e XML numérico XLSX conferidos; 12 arquivos de exemplo reabertos no nativo |
| T09 | Matriz visual e axe, entradas inválidas/obsoletas, salvar/reabrir, resposta tardia e recuperação, paridade e WebView2 | Registros abaixo; capturas/relatórios renderizados e hashes |
| T10 | Guias, métodos, fichas, mapa, cobertura, CHANGELOG e plano atualizados | Conferência de links e versões; plano movido para concluídos |

## Execuções e correções

- **448 testes unitários em 52 arquivos** da interface aprovados; contratos conferidos e TypeScript aprovado. Lint sem erros; **143 avisos** e quatro informações existentes/permitidos, principalmente regras de especificidade CSS e asserções não nulas; não se declara ausência de avisos.
- **583 testes Rust aprovados, três ignorados, 34 suítes**; `clippy --workspace --all-targets -- -D warnings` aprovado. Nenhum cálculo científico foi acrescentado ao TypeScript. Os testes ignorados continuam identificados como manuais/performance.
- Armazenamento inicial: **18/18** Chromium/Firefox/WebKit. Consulta histórica: três falhas iniciais por rótulo incorreto no teste (`Adicionar comentário` em vez de `Comentar`), corrigidas; **3/3** na reconferência.
- Matriz inicial: **36/36** nos três motores, seis temas × PT/EN × quatro famílias. Geometria nas quatro larguras, fonte 0,85/1/1,2/2 e axe.
- Regressão pertinente: primeiro **114/115**, com teste que procurava figura antes de abrir Gráficos; percurso corrigido. A execução ampliada seguinte passou **381/381** nos três motores. Essa execução precede os últimos ajustes de apresentação dos relatórios e a correção de recuperação.
- Delta de relatórios: **45/51** inicialmente. Encontrou metadados antigos no botão dos coeficientes de mistura e dois seletores/esperas inadequados nos testes. Após correções, **51/54**; os três restantes aguardavam uma operação IndexedDB assíncrona com uma espera que retornava antes da gravação. A espera passou a conferir explicitamente o resultado persistido. **6/6** na reconferência de recuperação/resposta tardia, **3/3** com resumo ativo após novo cálculo e **18/18 no aceite final das famílias**. A matriz visual do delta permaneceu aprovada nos 36 casos. Os logs preservam as falhas, sem apresentar uma única execução inexistente como integralmente verde.
- A inspeção dos PDFs revelou resumo de saturação repetido após a figura, título de variâncias sem tabela e proveniência repartida; corrigidos. PDFs PT/EN das quatro famílias e pareado histórico foram renderizados e inspecionados. A captura aguarda fontes e dois quadros, evitando registrar texto ainda não pintado após a variação de zoom.
- A investigação nativa revelou também que o autosalvamento inicial limpo podia apagar a recuperação anterior antes de oferecer Restaurar. Agora só a transição de sessão alterada para salva limpa essa recuperação; ações explícitas de abrir/novo/salvar/descartar continuam responsáveis pela limpeza apropriada. Um teste novo preserva o snapshot anterior na inicialização.

## Windows 10 / WebView2

Build final release com perfil isolado: **5m38s**, `native-build-et22-complete.log`. `native-check-et22-complete.log` aprovado: paridade exata dos seis arquivos de famílias, casos científicos, 12 exemplos, confirmação, PDF/Word e edição de comentário; inglês, seis temas, prévia neutra e fonte Serif incorporada. No percurso próprio da ET22, Monod e potência foram calculados do zero, recuperados juntos após recarregar e exportados em HTML/PDF/Word; o SVG da curva permaneceu idêntico. Os primeiros ensaios de recuperação falharam e foram preservados; a execução final usa espera efetiva do autosalvamento e aceita o aviso de saída com alterações no perfil de teste.

O diálogo de exportação usa o destino de automação somente no executável de teste; não é uma certificação do instalador ou do diálogo de distribuição. O atualizador respondeu com indisponibilidade, sem instalar versão publicada. Leitor de tela, Safari real e paginação no Microsoft Word real não foram certificados. PDFs foram renderizados; Word foi gerado e inspecionado estruturalmente.

## Limites e continuidade

A ET22 entrega persistência/apresentação das famílias existentes. AR(1), não estruturada, testes F multivariados e médias marginais ficam na ET23; perfil de verossimilhança, controles iniciais/limites e potência avançada na ET24; mistura/ótimo avançados na ET25. Drive/contas reais e itens de integração continuam nas ET26/ET28. **A v0.4 não está concluída nem publicada.**

[Evidências e hashes](../../../docs/imagens/evidencias-v0.4-et22/README.md), [arquivos de paridade](../../cases/project_file/families/README.md), [ET27](../et27/README.md).
