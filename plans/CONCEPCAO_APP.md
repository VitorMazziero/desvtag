# EnziTAG Optima — concepção do aplicativo

Documento de trabalho iniciado em 1º de novembro de 2026. Reúne decisões do usuário e propostas ainda em discussão; não constitui especificação final nem solicitação de publicação.

## Direção confirmada pelo usuário

- **Nome escolhido:** EnziTAG Optima.
- **Público inicial:** colegas e alunos do laboratório, incluindo pessoas sem experiência em estatística.
- **Experiência desejada:** intuitiva e guiada, mais próxima do Protimiza do que de uma ferramenta generalista como o Minitab.
- **Casos típicos:** planejamento Plackett–Burman (PB) e otimização de parâmetros de cultivos ou reações enzimáticas.
- **Plataformas:** aplicativo desktop e versão no navegador desde o início.
- **Referência de fluxo:** preservar o pipeline do Protimiza, acrescentando interpretação dos resultados e mais recursos gráficos.
- **Além de DoE:** incluir Tukey e outros testes de comparação utilizados fora de um planejamento experimental.
- **Abrangência desejada:** aplicativo completo e extensível, sem restringir a concepção a um único experimento ou conjunto fixo de fatores.
- **Definição dos fatores:** permitir que o usuário cadastre fatores e respostas, como no Protimiza. As condições de validade de cada planejamento precisam ser respeitadas.
- **Situações iniciais de comparação:** grupos independentes, comparações contra controle, combinações de fatores, dados pareados e acompanhamento das mesmas unidades ao longo do tempo podem servir como base inicial. Os procedimentos específicos ainda precisam ser definidos.
- **Gráficos desejados:** superfícies 3D, contornos, efeitos e interações, diagnóstico de resíduos, comparação de médias com letras e otimização simultânea de respostas.
- **Tukey:** gerar as letras de comparação e incorporá-las ao gráfico.
- **Interpretações:** explicações curtas junto aos resultados.
- **Distribuição pretendida:** código disponível publicamente no GitHub e acesso à versão web por um endereço. A hospedagem específica e a licença ainda estão em discussão; não houve solicitação de publicação nesta etapa.
- **Arquitetura aceita:** motor de cálculo em Rust, interface web compartilhada em TypeScript/React, aplicativo Windows com Tauri e compilação do motor para WebAssembly no navegador.
- **Aprendizagem e transparência:** desenvolver e estudar módulo por módulo, explicitando a matemática, os cálculos intermediários e as interações com o restante do aplicativo. A complexidade de desenvolvimento não é um impedimento para o usuário.
- **Procedimentos próprios:** implementar os métodos estatísticos de forma compreensível em módulos do projeto, preservando o controle sobre o raciocínio e a sequência dos cálculos. Bibliotecas auxiliares não devem ocultar decisões estatísticas.
- **Validação independente:** comparar os cálculos com Python e softwares especializados. A recomendação é fazer essa comparação ao concluir cada módulo, além das verificações do fluxo completo.
- **Uso local sem login:** criar, abrir, analisar e salvar projetos locais deve ser possível sem conectar uma conta. A integração com nuvem será opcional.

## Contexto anterior

O registro histórico local `plans/conversa_rust_doe_estatistica.md` documenta a preferência por cálculos em Rust, organização modular e aprendizagem durante o desenvolvimento. Esse registro fica fora do repositório público. Os requisitos e escolhas necessários à continuidade do projeto estão sintetizados neste documento e no mapa de arquitetura.

## Referências visuais preservadas

As 13 capturas fornecidas pelo usuário estão no diretório local `referencias/protimiza/`, sem edição e com verificação de integridade. Há 12 imagens distintas. Esse acervo de consulta permanece fora do repositório público, junto à literatura local.

O fluxo visível nessas capturas é:

1. Variáveis e respostas.
2. Escolha da metodologia.
3. Matriz experimental e preenchimento de resultados.
4. Análise dos resultados.

As instruções e recomendações nas telas pertencem ao produto de referência. Não se tornam requisitos nem regras estatísticas do novo aplicativo automaticamente.

## Propostas para discussão — ainda não confirmadas

- Oferecer duas entradas claras: **planejar/analisar um experimento** e **comparar tratamentos com dados já coletados**.
- Preservar a navegação em etapas e adaptar os campos ao objetivo escolhido.
- Apresentar resultados com explicações curtas, gráficos e tabelas; oferecer detalhes técnicos consultáveis sem alongar a interpretação principal.
- Explicar as sugestões do aplicativo e permitir que o usuário revise suas escolhas.
- Distinguir resultados calculados, limitações da análise e próximos passos sugeridos.
- Usar situações de cultivos e reações enzimáticas nos exemplos e na ajuda contextual.
- Organizar a base por estrutura dos dados, modelos estatísticos, comparações e apresentação dos resultados, permitindo acrescentar métodos sem redesenhar todo o fluxo. Algumas extensões também exigirão modelos novos.
- Oferecer Google Drive como armazenamento opcional na conta de cada usuário, com uma pasta visível de projetos. O usuário solicitou a avaliação dessa possibilidade; os detalhes de sincronização permanecem propostas.

## Perguntas em aberto

### Planejamento e análises

- Quais famílias de planejamentos e modelos comporão a cobertura completa pretendida, e em que sequência serão implementadas e validadas?
- Quais tamanhos de projeto serão usados para avaliar desempenho, sem transformar um exemplo em limite arbitrário para o cadastro de fatores?
- Quais testes de comparação, além de Tukey, serão oferecidos para as estruturas experimentais já aceitas como base?
- O aplicativo também precisará analisar matrizes experimentais criadas em outros programas?

### Orientação e apresentação

- Como apresentar recomendações, escolhas manuais e explicações para iniciantes?
- Quais idiomas e formas de exportação serão necessários?
- Como permitir a edição e exportação dos gráficos, incluindo letras, eixos, cores e medidas de incerteza?

### Dados e uso em duas plataformas

- Como os usuários receberão ou digitarão os dados: planilhas, colagem, arquivos ou tabela no aplicativo?
- Quais políticas de salvamento automático e resolução de conflitos serão adotadas para a integração opcional com Google Drive?
- Será necessário compartilhar projetos entre alunos e orientadores ou apenas transferir arquivos entre desktop e navegador?
- Qual licença será utilizada para o código público?

### Escopo e aprendizagem

- Qual caso real será usado como primeiro exemplo completo e critério de utilidade?
- Como organizar a implementação e a validação progressivas para alcançar o aplicativo completo desejado?
- Quais rotinas numéricas auxiliares também terão implementação própria, e quais dependências de apoio terão algoritmo, papel e limitações documentados?

## Avaliação da linguagem — arquitetura aceita

Consulta à documentação oficial realizada em 1º de novembro de 2026. Após discutir vantagens, limitações e alternativas, o usuário aceitou a recomendação e esclareceu que deseja aprender o funcionamento de cada módulo, mesmo com maior complexidade.

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

## Hospedagem e distribuição — proposta em discussão

O GitHub pode reunir três entregas complementares:

1. **Repositório público:** código-fonte, documentação dos métodos, exemplos e testes de referência.
2. **GitHub Pages:** endereço público para abrir a interface web e carregar o motor Rust compilado para WebAssembly. Nesse desenho, os cálculos acontecem no navegador; os dados experimentais podem ser processados localmente.
3. **GitHub Releases:** versões identificadas do instalador ou pacote Windows e respectivas notas de versão.

GitHub Pages hospeda arquivos estáticos; não executa um servidor Rust ou Python nem fornece um banco de dados de usuários. A integração direta com o Google Drive pode fornecer armazenamento de arquivos por usuário, mantendo a hospedagem no Pages e os cálculos locais. Autorização de acesso, sincronização e eventual colaboração precisam ser implementadas no app; edição simultânea com mesclagem não é fornecida automaticamente pelo armazenamento de um arquivo no Drive.

A hospedagem no Pages está disponível gratuitamente para repositórios públicos no GitHub Free, dentro dos limites do serviço. É possível usar o endereço padrão do GitHub Pages ou configurar domínio próprio. A definição de uma licença de software acompanha a intenção de permitir que outras pessoas utilizem, modifiquem ou distribuam o código.

Fontes oficiais consultadas em 1º de novembro de 2026:

- [O que é GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Limites do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
- [Licenciamento de repositórios](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Projetos locais e Google Drive opcional

### Requisito confirmado

O aplicativo deve oferecer uso local sem login, com abertura e salvamento de projetos. Conectar ao Google Drive será uma opção de armazenamento; não deve controlar o acesso às análises ou aos gráficos.

### Proposta de experiência

- Acesso inicial com **Novo projeto**, **Abrir do computador** e **Abrir do Google Drive**. A autorização Google é solicitada quando o usuário escolhe utilizar o Drive.
- Um mesmo formato de projeto para arquivos locais, navegador, Windows e Drive, contendo dados, configurações de análise e opções de apresentação.
- Pasta visível com o nome do aplicativo no Drive de cada usuário, criada no primeiro salvamento autorizado na nuvem. Um arquivo por projeto é a proposta inicial.
- Ações explícitas **Salvar no computador**, **Salvar no Drive** e **Salvar uma cópia**. No navegador, o salvamento em arquivo pode ser oferecido como download.
- Salvamento automático no Drive como opção para projetos vinculados, com indicação de alterações locais, sincronização pendente e salvamento concluído.
- Preservar o trabalho local quando faltar conexão ou autorização. Se houver alterações concorrentes, preservar as versões e oferecer uma escolha; a estratégia de detecção e resolução ainda será definida.

### Integração com o Google

O acesso a arquivos exige autorização específica, além da identificação da conta. A proposta utiliza `drive.file`, permitindo trabalhar com arquivos criados pelo app ou escolhidos explicitamente pelo usuário. Esse escopo é por arquivo; escolher uma pasta não deve ser tratado como concessão irrestrita a todos os seus descendentes. A integração deve ter configuração e consentimento próprios no projeto Google Cloud. [Escopos da API](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

A API permite [criar pastas visíveis](https://developers.google.com/workspace/drive/api/guides/folder). A área especial `appDataFolder` fica oculta e não permite compartilhar seu conteúdo, portanto não é a proposta para os projetos que o usuário quer enxergar e organizar. [Pasta de dados da aplicação](https://developers.google.com/workspace/drive/api/guides/appdata).

Na versão web, o modelo de autorização com token permite chamadas diretas do navegador ao Drive, sem servidor próprio para essa operação. O acesso expira e uma ação do usuário pode ser necessária para renová-lo; o salvamento deve apresentar esse estado e preservar as alterações locais. [Modelo com token](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

O modelo web com troca de código e armazenamento de tokens de renovação no servidor é uma alternativa para requisitos de acesso prolongado. Não faz parte da proposta inicial de hospedagem exclusivamente estática. [Modelo com código](https://developers.google.com/identity/oauth2/web/guides/use-code-model).

No Windows, a autorização deve seguir o fluxo para aplicativo instalado, abrindo o navegador do sistema e utilizando PKCE; a integração Tauri é separada da usada na página web. Dados de autorização não fazem parte do arquivo de projeto. [Autorização de aplicativos desktop](https://developers.google.com/identity/protocols/oauth2/native-app).

Arquivos e pastas podem ser compartilhados segundo as [permissões do Drive](https://developers.google.com/workspace/drive/api/guides/manage-sharing). Colaboração simultânea no conteúdo do projeto continua sendo uma funcionalidade própria a projetar.

A integração fica sujeita ao espaço disponível na conta e às [cotas e condições da API](https://developers.google.com/workspace/drive/api/guides/limits); não foi assumido uso ilimitado. Nenhuma conta foi conectada nem arquivo enviado ao Google nesta etapa.

## Situação atual

Nome, arquitetura e abordagem de aprendizagem aceitos. A pasta foi organizada para o repositório `enzitag-optima`, com apresentação, documentação e áreas reservadas ao código. A definição funcional continua em andamento e ainda não há implementação executável. O mapa de responsabilidades está em [ARQUITETURA_E_APRENDIZADO.md](ARQUITETURA_E_APRENDIZADO.md), e as escolhas em aberto estão em [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md).
