# Decisões aprovadas

**Estado:** vigente · **Atualizado em:** 2026-11-01

Requisitos aprovados pelo usuário; implementação ainda não iniciada.

Este registro consolida as escolhas anteriores e a aprovação explícita do usuário dos 14 itens enviados no anexo desta conversa. Substitui o estado de proposta desses itens nos documentos anteriores. A correção sobre aprendizagem permanece válida: a prioridade é separar o aplicativo em módulos com arquivos, responsabilidades e interfaces definidos, facilitando compreensão e manutenção. Os exemplos e cálculos documentados são apoio, não um curso obrigatório nem uma etapa adicional de aprovação.

## 1. Identidade

- Produto: **EnziTAG Optima**; repositório: **enzitag-optima**, conta **VitorMazziero**.
- Três temas desde o início: **Soft Light** (padrão), **Modern Dark** e **Professional**.
- Soft Light usa o prompt Software como base, adaptado à paleta do logo EnziTAG. Preservar os [prompts originais](../temas/README.md).
- **v0.2 (decisão de 2026-11-01):** três temas adicionais, **Industrial**, **Organic** e **Clay** (prompt *Claymorphism*), mantendo o Soft Light como padrão e a preferência por dispositivo; descrições e prompts originais preservados em [temas](../temas/README.md); plano na [ET12](../planos-execucao/concluidos/et12-temas-adicionais-e-identidade-do-grupo.md). Os temas novos só mudam a aparência: nenhum cálculo, texto científico nem exportação é alterado.
- **Logo do grupo de pesquisa (decisão de 2026-11-01):** o aplicativo exibe o logo do grupo de pesquisa do usuário, o arquivo [`docs/imagens/logo.png`](../imagens/logo.png) (marca EnziTAG), no **cabeçalho**, na **tela inicial** e como **crédito no relatório HTML** (com opção de desligar). As figuras exportadas não levam o logo por padrão e o ícone do aplicativo não muda ([PD-17](decisoes-pendentes.md), resolvida).
- Preferência visual por dispositivo. Gráficos exportados têm configuração independente, com fundo branco como padrão para artigos.

## 2. Idiomas

Português e inglês desde o início, no Windows e navegador. Detectar o idioma do sistema no primeiro acesso, permitir troca e preservar a preferência. Idioma das exportações independente da interface. Não traduzir automaticamente nomes, unidades livres ou observações digitadas pelo usuário. Idioma e tema não alteram os cálculos.

## 3. Catálogo e desenvolvimento

Manter o [catálogo completo aprovado](catalogo-funcional.md), incluindo a cobertura do Protimiza e os métodos discutidos. O usuário define os fatores e respostas; condições matemáticas e limites de recursos são explicitados, sem restringir o produto aos exemplos.

A tabela da resposta anterior não veio reproduzida no anexo; a ordem de referência daquela resposta é preservada aqui: fundamentos → comparação de tratamentos → triagem → superfícies e otimização → ampliação das análises → estruturas avançadas. O [roteiro do produto](../planos-execucao/roteiro-produto.md) detalha essa sequência e suas dependências; o [plano da primeira versão](../planos-execucao/plano-v0.1.md) define o recorte da v0.1. A ordem não reduz o escopo final.

## 4. Entrada e navegação

Tela inicial com projetos recentes, Abrir projeto e três entradas: **Planejar experimento**, **Analisar dados existentes** e **Comparar tratamentos**. Estrutura de projeto compartilhada entre os caminhos. Fluxo guiado: **Objetivo → Fatores e respostas → Planejamento/dados → Análise → Resultados**; etapas já satisfeitas podem ser acessadas diretamente.

## 5. Orientação

Experiência guiada por padrão e opções avançadas por etapa. Recomendações consideram objetivo, fatores, orçamento de ensaios, blocos e dependência entre observações; apresentam justificativa curta e permitem escolha manual compatível. Resultados mostram conclusão breve, evidência e próximo passo. Incompatibilidades impedem o cálculo; limitações interpretativas são apresentadas sem selo genérico de validade baseado em valor-p ou R².

## 6. Dados

Digitação, colagem do Excel, CSV, XLSX e matrizes externas. Prévia de importação com separadores, decimais, ausências, unidades e papéis das colunas. Identificação de observação e unidade experimental; fatores, respostas, réplicas, blocos e tempos representados explicitamente. Distinguir réplicas experimentais de repetições de medição; não deduzir independência pelo número de linhas.

## 7. Projetos

Vários experimentos por projeto e arquivo **`.enzitag`** com formato aberto e documentado. Preservar dados importados, alterações, planejamento, análises, modelos alternativos, configurações gráficas, observações e versões do aplicativo/motor. Cada resultado aponta para a revisão dos dados e configurações que o geraram. Reabrir não recalcula silenciosamente; recalcular cria nova análise identificada. Projetos e experimentos têm identificadores estáveis.

## 8. Salvamento

Recuperação automática após **dois segundos de pausa na edição**, inicialmente. Versões recuperáveis em importações, alterações dos dados, análises e salvamentos manuais. Windows: substituição segura e cópia anterior. Navegador: recuperação local e salvar/baixar arquivo. Distinguir recuperação do navegador, arquivo salvo e sincronização no Drive. Recuperação local não é apresentada como backup externo.

## 9. Google Drive opcional

Integração incluída, depois de consolidado o salvamento local. Pasta visível **EnziTAG Optima**; mesmo formato de projeto. Autorização limitada com `drive.file`, para arquivos criados ou selecionados para o app. Selecionar pasta não autoriza automaticamente todos os descendentes. Trabalho local continua sem conexão; reconexão verifica revisões remotas. Conflitos preservam ambas as versões e oferecem escolha ou cópia. Login nunca condiciona a análise local.

## 10. Compartilhamento

Primeiro: troca de arquivos e abertura de projetos compartilhados no Drive, com visualização e criação de cópia. Depois: comentários ligados a análises e gráficos. Edição simultânea fica para etapa posterior de especificação; não faz parte da primeira entrega de compartilhamento.

## 11. Resultados e exportação

- Editar cores, símbolos, fontes, títulos, eixos, unidades, legendas, casas decimais e posição das letras.
- Barras de incerteza adequadas ao resultado: desvio-padrão, erro-padrão ou intervalo de confiança, sempre identificadas.
- Letras calculadas permanecem vinculadas às comparações; mudanças manuais de conteúdo são anotações identificadas.
- Figuras: **SVG, PDF e PNG**; tabelas: **CSV e XLSX**; relatórios: **HTML e PDF**. **DOCX** em etapa posterior.
- Exportações identificam método, configurações e versão da análise; idioma e aparência independentes da interface.

## 12. Otimização

Objetivos por resposta: maximizar, minimizar, atingir alvo ou permanecer em faixa. Separar restrições obrigatórias de preferências. Desejabilidade como abordagem inicial para combinar respostas; controles simples e pesos avançados. Apresentar várias soluções, previsões, incerteza quando estimável e compromissos entre respostas. Região experimental como domínio padrão de busca, com proposta de ensaios de confirmação.

## 13. Organização e validação

**Organização modular orientada à manutenção:** cada módulo tem arquivo de entrada identificado, subarquivos por responsabilidade, contratos de entrada/saída, dependências e testes próprios. Não concentrar um método em um arquivo gigantesco nem duplicar a matemática entre telas e plataformas.

Documentar problema, fórmulas, cálculo pequeno, implementação Rust, integração e validação quando pertinentes. Primeiro exemplo integrado: quatro condições de reação enzimática, com réplicas experimentais independentes; depois PB → superfície de resposta → confirmação. Dados sintéticos identificados, dados reais autorizados, referências NIST, Python e softwares especializados. Tolerâncias e algoritmos definidos por módulo.

## 14. Publicação e suporte

- **MIT** como licença escolhida; a menção à GPLv3 no texto aprovado era uma alternativa condicional, não uma segunda licença selecionada.
- Repositório remoto `VitorMazziero/enzitag-optima`: privado por solicitação do usuário em 2026-11-01 e **tornado público em 2026-11-01** por decisão posterior do usuário (PD-15, ver [fechamento da v0.1](#15-fechamento-da-v01-2026-11-01)). A licença MIT permanece.
- GitHub Pages para web; endereço previsto `https://vitormazziero.github.io/enzitag-optima/`; instaladores no GitHub Releases. Domínio próprio posterior.
- Prioridade: Windows 11 de 64 bits e versões atuais de Chrome, Edge e Firefox. Windows 10 e Safari dependem de testes de compatibilidade posteriores.
- Canais experimental e estável; instalação de atualizações em momento escolhido pelo usuário; pacotes de atualização assinados.
- Validação identificada por método, versão e casos cobertos, além da classificação geral da versão.

## Estado e limites deste registro

A aprovação define o produto e orienta a implementação. Não significa que os métodos estejam implementados, que serviços Google estejam configurados ou que exista aplicativo publicado. O repositório remoto já foi criado, recebeu a documentação e está privado. Escolhas de algoritmos, bibliotecas auxiliares, formatos internos e limites operacionais seguem o plano; somente os detalhes ainda não resolvidos estão em [decisões pendentes](decisoes-pendentes.md).

## 15. Fechamento da v0.1 (2026-11-01)

Decisões do usuário ao finalizar a v0.1.0 (canal experimental):

1. **PD-15 — repositório público.** O repositório passa a ser público; a versão web usa o GitHub Pages (publicação por disparo manual do mantenedor).
2. **Escopo da v0.1.0 ampliado:** implementar a geração aleatorizada de DIC com fator categórico e a personalização gráfica por figura salva no projeto ([DT-0016](../decisoes-tecnicas/dt-0016-dic-aleatorizado-e-estilo-por-figura.md)). O que continua fora: letras manuais e anotações livres, símbolos e posição das letras.
3. **PD-11 — instalador sem assinatura de código** nesta versão; o **atualizador** usa chave própria de assinatura, **cuja geração o usuário autorizou** (chave privada em segredo do GitHub, fora do repositório; [DT-0017](../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)).
4. **Ambiente de verificação do Windows:** não haverá teste em Windows 11 limpo para a v0.1.0; a verificação do aplicativo Windows é feita no **Windows 10 Pro (build 19045)** da máquina de desenvolvimento do usuário, além de `windows-latest` na CI. Windows 11 fica registrado como **não verificado** nas notas de versão.
5. Pendências que continuam do usuário: conferência da opção CCD e do rótulo no Protimiza; publicação efetiva (etiqueta, release e Pages).

## 16. Escopo e plataforma da v0.2 (2026-11-01)

Decisões do usuário ao pedir a Fase 2 («implemente a Fase 2 por completo — v0.2 / ET11»):

1. **Escopo da v0.2:** migração do Node.js 22 para o 26 como primeira tarefa ([DT-0015](../decisoes-tecnicas/dt-0015-migracao-node-26-na-v0-2.md)); acelerar o valor-p de Tukey; letras manuais e anotações livres nas figuras; delineamento em blocos (DBC) e ANOVA multifatorial; médias marginais e contrastes; Welch/Games–Howell, Dunnett, Bonferroni/Holm e Kruskal–Wallis/Dunn; PDF de figuras e de relatórios e personalização gráfica completa; seleção e comparação de modelos e resultados em seções com barra lateral e a exportação ao final ([plano da ET11](../planos-execucao/concluidos/et11-selecao-de-modelos-e-navegacao.md)). Registros técnicos: [DT-0018](../decisoes-tecnicas/dt-0018-selecao-de-modelos-e-resultados-em-secoes.md), [DT-0019](../decisoes-tecnicas/dt-0019-procedimentos-de-comparacao-anova-multifatorial-e-dbc.md) e [DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md).
2. **Plataforma: Windows 10.** O aplicativo Windows da v0.2 é verificado no **Windows 10 Pro (build 19045)** e em `windows-latest`; passa a ser plataforma verificada (não mais «posterior»). **Windows 11 continua não verificado**; Safari e domínio próprio seguem como adições posteriores (PD-13; o endereço atual é o do GitHub Pages).
3. **Publicação:** a v0.2 só é publicada (etiqueta, release, Pages) por decisão expressa do usuário.
4. **Respostas do usuário aos itens abertos (2026-11-01/02):** (a) rodar o E2E nos quatro navegadores com a máquina livre; (b) a chave privada do atualizador foi movida para `D:\Arquivos_de_Programas\Rust\tauri` (fora do repositório); (c) o usuário autorizou commitar os arquivos do fluxo de temas e logo; (d) **implementar na v0.2** o modelo por resposta e a seção ativa lembrada; (e) o exemplo kLa entra como **exemplo sintético equivalente** ([06](../../examples/06-kla-sintetico/README.md)); (f) a **ET12 (temas e logo) entra na v0.2** e foi implementada; (g) após a verificação final, fazer commit, envio, pull request, fusão, etiqueta e publicação, **avisando o usuário antes de publicar** para que ele verifique; (h) manter o Windows 10 como plataforma verificada e aceitar as duas limitações do PDF (família de fonte e hachurado). Dúvidas restantes: seguir as recomendações e registrar as decisões críticas.

## 17. Escopo da v0.3 (2026-11-02)

Decisões do usuário em 2026-11-02:

1. **Planilha de coleta.** A matriz de ensaios exportada passa a trazer as colunas de resposta a preencher, e o mesmo arquivo pode ser importado de volta para preencher as respostas («assim o usuário pode usar o mesmo arquivo que usou para exportar a matriz para importar os valores de respostas»). Etapa [ET13](../planos-execucao/concluidos/et13-planilha-de-coleta.md).
2. **Escopo da v0.3: tudo o que ficou pendente** («escreva o plano v0.3 com tudo que ficou pendente»). O [plano da v0.3](../planos-execucao/plano-v0.3.md) reúne os itens adiados da v0.1 e da v0.2, as famílias F09a–F09g, o Google Drive (F11) e as extensões F14, antecipando os destinos indicativos do [plano da v0.1 §3](../planos-execucao/plano-v0.1.md#3-fora-da-v01). A v0.3 continua no canal experimental; a v1.0.0 mantém os critérios do roteiro.
3. **Windows 11:** a validação **não será realizada**. A plataforma Windows verificada continua sendo o Windows 10 Pro (build 19045) e o `windows-latest` da CI; as notas de versão continuam informando que o Windows 11 não foi verificado.
4. **Publicação da v0.2.0** autorizada pelo usuário («Sim, publicar»), condicionada à CI verde.
5. **Verificação da v0.2.0 instalada (2026-11-02).** O usuário publicou os releases v0.1.0 e v0.2.0 e relatou que a atualização funcionou. Pediu, **somente para o plano por enquanto** (sem alterar a interface agora): (a) **notas de versão formatadas** no aviso de atualização ([ET14-T09](../planos-execucao/planejados/et14-itens-adiados-v01-v02.md)); (b) **auditoria de distância, preenchimento e tamanho** dos botões da interface ([ET21](../planos-execucao/planejados/et21-revisao-de-espacamento-e-tamanho-dos-controles.md)); (c) **um único logotipo**, o do cabeçalho: o da tela inicial sai (ET21-T08), o que **revisa** a decisão de PD-17, que previa cabeçalho e tela inicial; (d) ao avançar de etapa no fluxo guiado, a interface **volta ao topo de forma orgânica** (rolagem suave, foco no título; ET21-T09).
