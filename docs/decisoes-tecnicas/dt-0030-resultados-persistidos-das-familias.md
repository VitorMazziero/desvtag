# DT-0030 — Resultados persistidos das novas famílias

Estado: aceita para execução da ET22. Data: 2026-11-03.

## Contexto

Mistura, medidas repetidas/modelo misto, saturação e potência usam resultados locais dos painéis. Fechar a ferramenta ou reabrir o projeto perde o cálculo. A ET29 identifica resultados desatualizados e a ET27 padroniza a apresentação; é necessário guardar essas famílias sem recalcular ao abrir e sem trocar os rótulos históricos pelos dados em edição.

## Decisão

1. Preservar o esquema 1. Acrescentar ao experimento os campos opcionais `mixtureResult`, `mixedModelResult`, `nonlinearResult` e `powerResult`. Cada família conserva a configuração em edição e os registros imutáveis de cada cálculo, quando houver. Assim salvar depois de editar uma opção mantém o aviso de desatualização após reabrir. Campos ausentes são o estado inicial.
2. O registro contém identificador estável, instante, revisão de dados, assinatura, entradas/configuração que produziram o resultado e o resultado tipado do Rust, incluindo proveniência. A conferência pareada integra a família de medidas repetidas com discriminante próprio. Não inserir variantes novas na lista legada `analyses`: leitores anteriores ignoram os campos adicionais, em vez de recusarem um discriminante desconhecido.
3. Os contratos e a validação estrutural pertencem ao `optima-project`. Validar as referências contra a revisão histórica do cálculo, não contra a tabela atual (que pode ter excluído uma variável). Verificar identidade, método/família, valores finitos e limites de tamanho dos campos. Não recalcular nem substituir silenciosamente resultados durante a abertura.
4. A assinatura é versionada por família e inclui dados relevantes, configuração e metadados necessários à apresentação. Entradas de potência são hipóteses, independentes da tabela de observações: editar dados não torna uma análise de potência obsoleta. A interface guarda o texto das hipóteses em edição para não perder vírgulas, vazios ou valores ainda inválidos; o registro do cálculo mantém a solicitação numérica validada.
5. Mostrar cada resultado na etapa Resultados com as seções comuns; controles ficam na etapa Análise ou na ferramenta de Extras correspondente. O resultado pode ser inspecionado sem abrir novamente a ferramenta. HTML, PDF e Word usam os mesmos componentes puros de resultado, com o idioma escolhido; CSV/XLSX recebem valores completos, com indefinições explícitas nos metadados.
6. Rótulos, unidades, pontos e opções dos gráficos provêm da revisão/entrada do cálculo. Alterar o experimento atual só altera o estado de desatualização. A atualização exige ação explícita do usuário. Trocar de experimento ou receber uma resposta tardia não pode gravar resultado em outro experimento.
7. A consulta permite escolher registros anteriores da família sem alterar a configuração em edição. A escolha do registro é transitória: ao reabrir, selecionar o mais recente. Um novo cálculo abre seu resumo. Figuras, tabelas, comentários e relatórios usam sempre o registro consultado, inclusive durante exportação fora da tela.
8. A família ativa é uma escolha de apresentação opcional; manter disponíveis as demais famílias calculadas. Comentários e proveniência podem referenciar o identificador do registro salvo. A existência desse identificador é validada junto das análises legadas.

## Verificação

Ida e volta Rust dos quatro campos, arquivos anteriores sem campos, referências históricas válidas/inválidas e configuração alterada; hash dos resultados nativo×WASM; salvar/reabrir sem chamada de cálculo; experimentos 07, 08, 11 e 12; duas famílias no mesmo experimento; resposta tardia e troca de experimento; tabelas e três relatórios; PT/EN, seis temas e larguras da ET27. Métodos novos permanecem nas ET23–ET25.

Referências: [plano da v0.4](../planos-execucao/plano-v0.4.md), [DT-0028](dt-0028-papeis-visuais-e-figuras-cientificas.md), [DT-0029](dt-0029-conferencia-de-confirmacao-no-motor.md).
