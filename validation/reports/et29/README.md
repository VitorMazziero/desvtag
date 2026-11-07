# ET29 — Implementação e avaliação da interface

Data: 2026-11-02. Ramificação: `feat/v0.4`. Interface e motor: `0.4.0-dev`. Build local em `http://127.0.0.1:4173/`, com o motor WASM real. Esta entrega não publica versão, instalador ou Pages.

A ET29 foi concluída após a avaliação e correção por tarefa. O pedido inclui executar T15–T22, completar os blocos da T08 e as decisões/documentação da T03/T13, preservando a T14 entregue nos commits `1e72dd8` e `8153e13`. A [auditoria original](../../../docs/planos-execucao/auditoria-ux-v0.4-2026-11-02.md) permanece como registro anterior; as fichas destinadas às ET27 e ET22–ET25 não são declaradas resolvidas pela ET29.

## Avaliação por tarefa

| Tarefa | O que foi exercitado no aplicativo | Resultado e decisão |
|---|---|---|
| T14 | Potência: calcular, trocar α, tentar α=2; saturação Monod→Hill; métodos já presentes | O resultado anterior é identificado; erro fica junto do campo. A verificação adicional achou perda de contraste por opacidade no Industrial: o resultado passou a usar borda e aviso sem esmaecer o conteúdo. Mensagens e cálculos da T14 foram preservados. |
| T15 | Q–Q e Pareto com fonte 1,2; PNG/PDF; sete famílias nas escalas 0,85/1/1,2; interações | Reta intersectada e marcas recortadas; notas e títulos ganham altura. A inspeção visual achou o nome «Extrato de levedura» invadindo as barras: a margem esquerda do Pareto passou a ser dimensionada pelo nome. Interações usam legenda com amostra de linha, níveis reais, linhas e espaço próprios. |
| T16 | Planejamento do zero, sequência níveis→objetivo→gerar→matriz→grade; retornar às etapas; cálculo novo e seção ativa | Uma única navegação por etapa, com estado de formulário preservado; passo lembrado na sessão. Resultado novo abre Resumo. Mistura temporária pode ser vista em Análise e Resultados, com aviso de que não será reaberta do arquivo antes da ET22. |
| T17 | Cada intenção inicial; Arquivo/computador/Drive; exemplo empacotado; selecionar confirmação; salvar e reabrir | Ação própria por cartão, sem Avançar genérico; destino e horário no estado do arquivo; seletor com busca para mais de cinco experimentos. A seleção ativa é opcional no documento e arquivos antigos continuam aceitos. Drive foi exercitado com serviço simulado. |
| T18 | Fatores numéricos e categóricos; níveis discretos; DIC/DBC/mistos/misturas/ótimo; superfície e faixas reais | Tipo inicial segue a intenção; família informa requisitos/compatibilidade. Faixas vêm da prévia do motor. Semente em Reprodutibilidade; matriz conduz à grade. Os cálculos não foram reimplementados em TypeScript. |
| T19 | Preencher respostas; editar/proteger condição; erro e foco; remoção por menu; importar já em Variáveis | Condições geradas protegidas e respostas destacadas; erro localizável. Menu de linha compacto «⋯», com nome acessível. Importação não exige criar resposta provisória e aceita o papel Unidade. |
| T20 | Procedimentos, modelos/blocos, contraste A versus média(B,C), medidas repetidas e revisão final | Pesos por nível, soma zero e pelo menos um não nulo; expressão legível. Unidade identificadora sai dos efeitos fixos por padrão. Revisão informa resposta, método, modelo e α antes de calcular. |
| T21 | Exemplo 14; relatório com barra ativa; HTML/PDF/Word; comentários; Sobre | Ajuda de uso excluída; método e termos finais/retirados ficam no relatório; títulos protegidos de quebra órfã. Exportação resume conteúdo/idioma/aparência; comentários identificam análise e revisão. Sobre identifica interface, motor e commit. |
| T22 | 1920/1200/800/375 px; modais, teclado, rolagem e tabelas | Seletor de etapa em telas pequenas; Arquivo recolhido; primeira coluna fixa e rolagem na tabela. Modais isolam rolagem do fundo, ocupam telas pequenas e limitam campos à largura disponível. |

## Comentários recebidos durante a execução

O usuário marcou quatro pontos no navegador a 1064×892. Eles foram incorporados à ET29, sem aguardar o acabamento da ET27:

1. **Botão de recolher junto da lista:** navegação ganhou separação mínima de 16 px entre controle e etapas.
2. **Ações desalinhadas com o experimento:** seletor e botões usam 40 px; centros verticais são medidos com tolerância de 2 px.
3. **Introdução encostada nos blocos:** título, texto e conteúdo usam espaço explícito; a medição exige pelo menos 20 px entre introdução e blocos.
4. **Grade estreita e textos quebrados:** a navegação de blocos foi para cima do conteúdo, a lista redundante de um bloco único foi retirada e o menu da linha virou «⋯». A grade usa mais de 90% da largura útil e o controle de ações não passa de 44×44 px.

A revisão também separa **espaço entre seções** de **espaço dentro do formulário**, reduzindo intervalos excessivos antes da grade. Esses pontos são medidos nos seis temas em `et29-review.spec.ts`; capturas anteriores não são apagadas.

## Decisão de composição

A [DT-0027](../../../docs/decisoes-tecnicas/dt-0027-percurso-unificado-e-composicao-das-figuras.md) foi criada antes da implementação dependente. Em vez de mover todos os estados locais para um único hook, os painéis declaram blocos e registram apenas seus metadados no coordenador. O resultado é uma única lista/ações, sem uma segunda navegação e sem remontar formulários ao avançar. Essa variação em relação ao exemplo de hook do plano mantém o requisito observável e evita um cadastro de ReactNodes que provocaria atualizações em ciclo.

## Verificação

- **E2E geral:** 945 execuções (189 casos × Chromium, Firefox, WebKit, Chrome e Edge): 929 passaram na primeira rodada. Os 16 casos restantes foram investigados; a repetição focal passou em 61/65 e a rodada final do delta em **115/115**, nos cinco navegadores, incluindo 90 execuções de casos novos. Não se apresenta a primeira rodada como integralmente verde. Logs: [geral](logs/e2e-final-et29.log), [investigação](logs/e2e-retry-et29.log), [delta final](logs/e2e-delta-et29.log).
- **Descobertas do fechamento:** carregamento do motor retirava um aviso de disponibilidade durante o clique no Firefox e deslocava a ação inicial; agora indisponibilidade só é mostrada depois de conhecida. WebKit expôs contraste do botão «Ir à célula» sem cor explícita; passou a usar a tinta de ação do tema. A medição SVG foi corrigida para coordenadas de tela consistentes entre navegadores; o preparo do teste de rolagem aguarda o conteúdo e usa posição inicial imediata.
- **Unitários de interface:** [421 testes em 49 arquivos](logs/unit-et29-final.log), todos aprovados. TypeScript, contratos gerados, versões e formatação Rust aprovados; lint sem erros (75 avisos de estilo existentes/registrados, sem bloqueio).
- **Motor:** [542 testes Rust, 33 suítes](logs/rust-tests-et29.log), sem falhas.
- **Windows 10 Pro 22H2 / WebView2:** [verificação nativa](logs/native-check-et29-final.log) aprovada: paridade com WASM/referências, 11 exemplos reabertos, figura e relatório PDF, Word com cinco figuras e comentário. A compilação de teste usa perfil de dados isolado e não substitui o instalador do usuário. A consulta de atualização respondeu com indisponibilidade; isso verifica a resposta do comando, não uma atualização publicada.
- **Documentação:** links relativos conferidos depois da consolidação. Capturas de 800/1920 px nos seis temas complementam as de 375/1200 px e as medições específicas de 1064×892.

Os testes usam navegadores reais do Playwright e o servidor de produção local; não há simulação do motor científico. A integração interativa do navegador do Work estava desativada ao tentar acessá-la; por isso a avaliação por tarefa foi registrada por cenários executáveis, screenshots do navegador e inspeção visual das imagens. Os testes de conta Google real, Safari real e leitor de tela não são inferidos desses resultados.

## Evidências

Capturas e figuras selecionadas: [docs/imagens/evidencias-v0.4-et29](../../../docs/imagens/evidencias-v0.4-et29/README.md). A comparação usa as [capturas da auditoria](../../../docs/imagens/auditoria-ux-v0.4-2026-11-02/README.md).

## Limites preservados

Persistência de misturas, pareados/mistos, saturação e potência continua na ET22. Métodos avançados permanecem nas ET23–ET25. O ótimo continua numérico, com exclusões explícitas; cruzar níveis categóricos não é prometido. Refinamentos dos seis temas, família de figura, otimização e confirmação continuam na ET27. A revisão de espaço solicitada durante esta execução já foi aplicada nesta etapa.
