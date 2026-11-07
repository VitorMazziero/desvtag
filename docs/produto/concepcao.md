# Concepção do aplicativo

**Estado:** vigente · **Atualizado em:** 2026-11-01

Registro dos requisitos e da fundamentação do produto. As decisões de produto estão consolidadas em [decisões aprovadas](decisoes-aprovadas.md), após aprovação explícita dos 14 pontos. A execução segue o [roteiro do produto](../planos-execucao/roteiro-produto.md) e o [plano da primeira versão](../planos-execucao/plano-v0.1.md).

## Direção confirmada pelo usuário

- **Nome:** DesvTAG a partir da v0.4. As primeiras versões saíram como EnziTAG Optima. O [plano de migração](../planos-execucao/plano-v0.4.md#10-mudança-de-identidade-para-desvtag--implementação-final-da-v04) registra a identidade e a compatibilidade.
- **Público inicial:** colegas e alunos do laboratório, incluindo pessoas sem experiência em estatística.
- **Experiência desejada:** intuitiva e guiada, mais próxima do Protimiza do que de uma ferramenta generalista como o Minitab.
- **Casos típicos:** planejamento Plackett–Burman (PB) e otimização de parâmetros de cultivos ou reações enzimáticas.
- **Plataformas:** aplicativo desktop e versão no navegador desde o início.
- **Idiomas:** português e inglês desde o início, nas versões Windows e navegador.
- **Temas iniciais:** Modern Dark, Professional e Soft Light, nas versões Windows e navegador. O usuário confirmou que o prompt Software será a base do Soft Light, com substituição do azul elétrico pela paleta do logo EnziTAG. Soft Light é o padrão e a preferência será salva por dispositivo. As referências estão em [docs/temas](../temas/README.md).
- **Catálogo aprovado:** todos os métodos existentes no Protimiza e as famílias de planejamentos, análises, comparações, modelos, gráficos e otimização discutidas no projeto. O inventário consolidado está no [catálogo funcional](catalogo-funcional.md); o detalhamento e a implementação serão progressivos.
- **Referência de fluxo:** preservar o pipeline do Protimiza, acrescentando interpretação dos resultados e mais recursos gráficos.
- **Além de DoE:** incluir Tukey e outros testes de comparação utilizados fora de um planejamento experimental.
- **Abrangência desejada:** aplicativo completo e extensível, sem restringir a concepção a um único experimento ou conjunto fixo de fatores.
- **Definição dos fatores:** permitir que o usuário cadastre fatores e respostas, como no Protimiza. As condições de validade de cada planejamento precisam ser respeitadas.
- **Situações iniciais de comparação:** grupos independentes, comparações contra controle, combinações de fatores, dados pareados e acompanhamento das mesmas unidades ao longo do tempo podem servir como base inicial. Os procedimentos específicos ainda precisam ser definidos.
- **Gráficos desejados:** superfícies 3D, contornos, efeitos e interações, diagnóstico de resíduos, comparação de médias com letras e otimização simultânea de respostas.
- **Tukey:** gerar as letras de comparação e incorporá-las ao gráfico.
- **Interpretações:** explicações curtas junto aos resultados.
- **Distribuição pretendida:** código disponível publicamente no GitHub e acesso à versão web por um endereço. GitHub Pages, Releases e licença MIT foram aprovados. O repositório remoto foi criado e, por decisão posterior do usuário, está privado por enquanto; aplicativo ainda não publicado.
- **Arquitetura aceita:** motor de cálculo em Rust, interface web compartilhada em TypeScript/React, aplicativo Windows com Tauri e compilação do motor para WebAssembly no navegador.
- **Organização modular e transparência:** cada módulo deve ter arquivos e interfaces definidos para facilitar compreensão e manutenção. Fórmulas, cálculos intermediários e exemplos são documentação de apoio. A complexidade de desenvolvimento não é um impedimento para o usuário.
- **Procedimentos próprios:** implementar os métodos estatísticos de forma compreensível em módulos do projeto, preservando o controle sobre o raciocínio e a sequência dos cálculos. Bibliotecas auxiliares não devem ocultar decisões estatísticas.
- **Validação independente:** comparar os cálculos com Python e softwares especializados. A recomendação é fazer essa comparação ao concluir cada módulo, além das verificações do fluxo completo.
- **Uso local sem login:** criar, abrir, analisar e salvar projetos locais deve ser possível sem conectar uma conta. A integração com nuvem será opcional.

## Contexto anterior

O registro histórico local `plans/conversa_rust_doe_estatistica.md` (mantido fora do Git no computador do usuário) documenta a preferência por cálculos em Rust, organização modular e aprendizagem durante o desenvolvimento. Esse registro fica fora do repositório público. Os requisitos e escolhas necessários à continuidade do projeto estão sintetizados neste documento e no mapa de arquitetura.

## Referências visuais preservadas

As 13 capturas fornecidas pelo usuário estão no diretório local `referencias/protimiza/`, sem edição e com verificação de integridade. Há 12 imagens distintas. Esse acervo de consulta permanece fora do repositório público, junto à literatura local.

O fluxo visível nessas capturas é:

1. Variáveis e respostas.
2. Escolha da metodologia.
3. Matriz experimental e preenchimento de resultados.
4. Análise dos resultados.

As instruções e recomendações nas telas pertencem ao produto de referência. Não se tornam requisitos nem regras estatísticas do novo aplicativo automaticamente.

## Fluxo, arquivos e políticas aprovados

- Tela inicial com projetos recentes, abrir e três caminhos: planejar experimento, analisar dados existentes e comparar tratamentos.
- Fluxo guiado de objetivo, fatores/respostas, planejamento/dados, análise e resultados, com opções avançadas e explicações curtas.
- Digitação, colagem, CSV, XLSX e matrizes externas; papéis das colunas, réplicas, unidades experimentais, blocos e tempos explícitos.
- Vários experimentos no mesmo arquivo de projeto, com dados originais, revisões, análises, modelos, gráficos e observações preservados.
- Recuperação após dois segundos de pausa e versões em operações relevantes; estados distintos de recuperação, arquivo e Drive.
- Google Drive opcional, pasta visível e preservação de versões em conflitos; uso local sem login permanece completo.
- Compartilhamento inicial por arquivo/Drive, leitura e cópia; comentários posteriores, edição simultânea a especificar.
- Exportações SVG/PDF/PNG, CSV/XLSX e HTML/PDF; DOCX posterior. Idioma e estilo de exportação independentes da interface.
- Otimização com alvos, faixas, restrições, desejabilidade, pesos e vários candidatos, seguida de confirmação experimental.

Detalhes e prioridades estão no [registro aprovado](decisoes-aprovadas.md). As perguntas anteriores de produto foram resolvidas por essa aprovação; os detalhes técnicos remanescentes estão em [decisões pendentes](decisoes-pendentes.md).

## Português e inglês desde o início

A interface deve oferecer os dois idiomas nas mesmas funcionalidades, tanto no Windows quanto no navegador. Isso inclui navegação, campos, ajuda, mensagens de validação, diagnósticos, explicações curtas e textos gerados para tabelas e gráficos.

Como organização inicial, serão usados português do Brasil (`pt-BR`) e inglês (`en`). Os textos da interface devem ser separados da lógica de cálculo e identificados por chaves estáveis. O idioma de apresentação não altera o método, as opções numéricas ou o resultado científico.

Nomes de fatores, respostas, projetos e observações digitados pelo usuário devem ser preservados. A apresentação de números e os rótulos gerados pelo aplicativo acompanharão o idioma selecionado; o suporte aos formatos aprovados e os detalhes de interpretação dos arquivos serão implementados em seus módulos.

O README público também possui uma apresentação inicial em inglês. A tradução da documentação detalhada de desenvolvimento poderá ser ampliada progressivamente; a exigência de dois idiomas desde o início se aplica ao produto.

## Avaliação da linguagem — arquitetura aceita

Consulta à documentação oficial realizada em 2026-11-01. Após discutir vantagens, limitações e alternativas, o usuário aceitou a recomendação e esclareceu que deseja aprender o funcionamento de cada módulo, mesmo com maior complexidade.

A arquitetura aceita mantém o **motor científico em Rust**, reutilizável entre o executável desktop e uma compilação WebAssembly para o navegador, e uma **interface web compartilhada em TypeScript/React**, com Tauri no desktop. Tauri incorpora uma interface web ao aplicativo; não transforma automaticamente seus recursos de sistema em funcionalidades disponíveis no navegador.

Essa organização preserva uma única linguagem nos módulos de cálculo. Importação de arquivos, persistência e integrações com o sistema ficam em camadas específicas de cada plataforma. Bibliotecas e resultados precisam ser verificados nos dois destinos.

O principal custo previsto é o trabalho para compor e validar uma cobertura estatística ampla. O usuário aceitou esse custo em favor da aprendizagem e da transparência dos procedimentos. Rust dispõe de bibliotecas de álgebra linear, distribuições e otimização; seu uso eventual precisa ter função explícita. Python e softwares especializados serão referências externas de validação, sem serem necessários para executar os cálculos no aplicativo distribuído.

Dioxus e Python foram alternativas avaliadas durante a discussão; a arquitetura atual segue Rust no motor e TypeScript/React na interface. As referências abaixo preservam a fundamentação dessa comparação.

Fontes primárias consultadas:

- [Rust e WebAssembly](https://rust-lang.org/what/wasm/).
- [Suporte e limitações de wasm32-unknown-unknown](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html).
- [Arquitetura do Tauri](https://tauri.app/concept/architecture/).
- [Dioxus: plataformas](https://dioxuslabs.com/learn/0.7/guides/platforms/).
- [nalgebra](https://nalgebra.rs/), [statrs](https://docs.rs/statrs/latest/statrs/) e [argmin](https://argmin-rs.org/book/).
- [Guia do SciPy](https://docs.scipy.org/doc/scipy/tutorial/index.html) e [guia do statsmodels](https://www.statsmodels.org/stable/user-guide.html).
- [Pacotes disponíveis no Pyodide](https://pyodide.org/en/stable/usage/packages-in-pyodide.html).
- [Letras de comparação: emmeans](https://rvlenth.github.io/emmeans/reference/CLD.emmGrid.html). A legenda tradicional deve explicar que compartilhar uma letra indica ausência de diferença detectada pelo procedimento, sem afirmar equivalência.

## Hospedagem e distribuição — direção aprovada

A distribuição aprovada reúne três entregas complementares:

1. **Repositório de código:** código-fonte, documentação dos métodos, exemplos e testes de referência. O remoto foi criado e está privado por enquanto; a intenção inicial de publicação pública foi adiada por decisão do usuário.
2. **GitHub Pages:** endereço público para abrir a interface web e carregar o motor Rust compilado para WebAssembly. Nesse desenho, os cálculos acontecem no navegador; os dados experimentais podem ser processados localmente.
3. **GitHub Releases:** versões identificadas do instalador ou pacote Windows e respectivas notas de versão.

GitHub Pages hospeda arquivos estáticos; não executa um servidor Rust ou Python nem fornece um banco de dados de usuários. A integração direta com o Google Drive pode fornecer armazenamento de arquivos por usuário, mantendo a hospedagem no Pages e os cálculos locais. Autorização de acesso, sincronização e eventual colaboração precisam ser implementadas no app; edição simultânea com mesclagem não é fornecida automaticamente pelo armazenamento de um arquivo no Drive.

A hospedagem no Pages está disponível gratuitamente para repositórios públicos no GitHub Free, dentro dos limites do serviço. É possível usar o endereço padrão do GitHub Pages ou configurar domínio próprio. A licença MIT foi aprovada e está em `LICENSE` na raiz do repositório.

Fontes oficiais consultadas em 2026-11-01:

- [O que é GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Limites do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
- [Licenciamento de repositórios](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Projetos locais e Google Drive opcional

### Requisito confirmado

O aplicativo deve oferecer uso local sem login, com abertura e salvamento de projetos. Conectar ao Google Drive será uma opção de armazenamento; não deve controlar o acesso às análises ou aos gráficos.

### Experiência aprovada

- Acesso inicial com **Novo projeto**, **Abrir do computador** e **Abrir do Google Drive**. A autorização Google é solicitada quando o usuário escolhe utilizar o Drive.
- O navegador, o Windows e o Drive usam arquivos `.desvtag` e abrem arquivos legados `.enzitag`. Cada projeto guarda experimentos, dados, revisões, configurações, resultados e opções de apresentação.
- Pasta «EnziTAG Optima» visível no Drive de cada usuário. O DesvTAG reutiliza essa pasta e a cria no primeiro salvamento autorizado se ainda estiver ausente. Um arquivo representa um projeto, podendo reunir vários experimentos.
- Ações explícitas **Salvar no computador**, **Salvar no Drive** e **Salvar uma cópia**. No navegador, o salvamento em arquivo pode ser oferecido como download.
- Salvamento automático no Drive como opção para projetos vinculados, com indicação de alterações locais, sincronização pendente e salvamento concluído.
- Preservar o trabalho local quando faltar conexão ou autorização. Se houver alterações concorrentes, preservar as versões e oferecer uma escolha; a estratégia de detecção e resolução ainda será definida.

### Integração com o Google

O acesso a arquivos exige autorização específica, além da identificação da conta. A integração aprovada utiliza `drive.file`, permitindo trabalhar com arquivos criados pelo app ou escolhidos explicitamente pelo usuário. Esse escopo é por arquivo; escolher uma pasta não deve ser tratado como concessão irrestrita a todos os seus descendentes. A integração deve ter configuração e consentimento próprios no projeto Google Cloud. [Escopos da API](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

A API permite [criar pastas visíveis](https://developers.google.com/workspace/drive/api/guides/folder). A área especial `appDataFolder` fica oculta e não permite compartilhar seu conteúdo, portanto não é o destino escolhido para os projetos que o usuário quer enxergar e organizar. [Pasta de dados da aplicação](https://developers.google.com/workspace/drive/api/guides/appdata).

Na versão web, o modelo de autorização com token permite chamadas diretas do navegador ao Drive, sem servidor próprio para essa operação. O acesso expira e uma ação do usuário pode ser necessária para renová-lo; o salvamento deve apresentar esse estado e preservar as alterações locais. [Modelo com token](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

O modelo web com troca de código e armazenamento de tokens de renovação no servidor é uma alternativa para requisitos de acesso prolongado. Não faz parte da arquitetura inicial de hospedagem exclusivamente estática. [Modelo com código](https://developers.google.com/identity/oauth2/web/guides/use-code-model).

No Windows, a autorização deve seguir o fluxo para aplicativo instalado, abrindo o navegador do sistema e utilizando PKCE; a integração Tauri é separada da usada na página web. Dados de autorização não fazem parte do arquivo de projeto. [Autorização de aplicativos desktop](https://developers.google.com/identity/protocols/oauth2/native-app).

Arquivos e pastas podem ser compartilhados segundo as [permissões do Drive](https://developers.google.com/workspace/drive/api/guides/manage-sharing). Compartilhamento inicial contempla leitura e cópia; comentários vêm depois. Colaboração simultânea no conteúdo do projeto é uma funcionalidade posterior a especificar.

A integração fica sujeita ao espaço disponível na conta e às [cotas e condições da API](https://developers.google.com/workspace/drive/api/guides/limits); não foi assumido uso ilimitado. Nenhuma conta foi conectada nem arquivo enviado ao Google nesta etapa.

## Situação atual

Os 14 pontos de produto foram aprovados, a organização modular foi esclarecida, o roteiro do produto foi detalhado e a primeira versão foi dividida em etapas de execução. Ainda não há implementação executável. Consulte o [índice dos planos de execução](../planos-execucao/README.md), o [mapa de arquivos](../arquitetura/mapa-modulos.md) e os [detalhes técnicos pendentes](decisoes-pendentes.md).
