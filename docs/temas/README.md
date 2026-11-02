# Temas visuais

**Estado:** vigente · **Atualizado em:** 2026-11-01

Decisão registrada em 2026-11-01: disponibilizar **Modern Dark**, **Professional** e **Soft Light** desde o início, no Windows e no navegador.

Decisão registrada em 2026-11-01 (v0.2): acrescentar três temas, **Industrial**, **Organic** e **Clay**, mantendo o Soft Light como padrão. Eles foram **implementados** na ET12 ([DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)).

## Prompts originais

| Tema no produto | Título do prompt original | Arquivo preservado |
|---|---|---|
| Modern Dark | Modern Dark | [prompts/modern-dark.txt](prompts/modern-dark.txt) |
| Professional | Professional | [prompts/professional.txt](prompts/professional.txt) |
| Soft Light | Software | [prompts/software.txt](prompts/software.txt) |
| Industrial (v0.2) | Industrial | [prompts/industrial.txt](prompts/industrial.txt) |
| Organic (v0.2) | Organic | [prompts/organic.txt](prompts/organic.txt) |
| Clay (v0.2) | Claymorphism | [prompts/claymorphism.txt](prompts/claymorphism.txt) |

Os seis arquivos foram copiados dos anexos sem edição. O arquivo [manifesto-prompts.json](manifesto-prompts.json) registra os tamanhos e hashes SHA-256 para verificar a integridade. A regra correspondente em `.gitattributes` preserva as quebras de linha originais no Git.

O usuário confirmou que o prompt **Software** será a base do tema chamado **Soft Light** no aplicativo. A adaptação solicitada é substituir o azul elétrico da referência pela paleta do logo EnziTAG. Essa alteração está documentada separadamente em [adaptação do Soft Light](adaptacao-soft-light.md), preservando o texto original do anexo.

## Direção de cada tema

- **Modern Dark:** fundo quase preto, superfícies grafite, contraste claro e sinalização pontual em menta; Geist e Geist Mono como referências tipográficas.
- **Professional:** superfícies claras em marfim, texto escuro quente, detalhes dourados e composição com EB Garamond e Instrument Sans.
- **Soft Light:** estrutura clara do prompt Software, com superfícies neutras e a paleta EnziTAG no lugar do azul elétrico original; Host Grotesk e Instrument Sans como referências tipográficas.
- **Industrial (v0.2):** um chassi contínuo em cinza frio, com painéis rebaixados escuros, teclas em relevo, rótulos que lembram gravação e pequenos indicadores laranja. A profundidade vem de luz e sombra consistentes (luz no canto superior esquerdo); o conteúdo continua sendo texto e controles comuns. Navegação em teclas, ação principal que pode ter formato de botão circular (continua sendo um botão), módulos de comparação como teclas pressionadas. Host Grotesk para títulos e leitura e IBM Plex Mono para rótulos e metadados curtos. Limites do prompt: sem cromado brilhante, ferrugem, listras de alerta em excesso, telemetria falsa animada nem chaves sem rótulo; indicadores decorativos não podem sugerir estado real do sistema.
- **Organic (v0.2):** uma mesa de trabalho de papel cor de areia, formas irregulares, texto marrom-escuro, musgo e argila queimada. Composição de folhas amplas e objetos reunidos, com cantos de curvas diferentes, leve granulação de papel e inclinações discretas; ações em musgo com contorno ou texto como alternativa; listas abertas, números grandes e separadores simples. Source Serif 4 para títulos e Instrument Sans para leitura e controles. Limites do prompt: sem gradientes brilhantes, vidro, verdes sintéticos, excesso de folhas nem sombras flutuantes profundas; bordas irregulares não podem comprometer alinhamento nem áreas de clique, e as cores terrosas não sugerem credenciais ambientais.
- **Clay (prompt Claymorphism, v0.2):** formas macias e infladas, com luz ampla vinda do canto superior esquerdo: texto ameixa-acinzentado sobre almofadas rosa, bandejas creme e objetos em menta, lavanda, amarelo-manteiga e azul-claro. Bordas arredondadas e sombras internas dão a sensação de moldado, mas o texto permanece nítido e plano. Botões em pílula grossa; seleção com ponto rebaixado e semântica de pressionado; foco visível separado do sombreado. Instrument Sans em todo o tema. Limites do prompt: formas opacas e legíveis, sem vidro, bordas metálicas, retângulos pastel sem relevo nem sombras que turvem texto pequeno; sem planos, provas sociais ou métricas inventados.

Os tokens autoritativos (cores, tipografia, espaçamentos, raios e tempos) de cada tema novo estão no próprio prompt preservado, e o mapeamento deles para os tokens semânticos do aplicativo será decidido na ET12.

## Observações para a implementação dos três temas novos

Calculadas em 2026-11-01 a partir dos tokens dos prompts (razão de contraste WCAG 2.x; texto exige ≥ 4,5:1 e elementos gráficos e anel de foco ≥ 3:1):

| Tema | Pares adequados a texto | Pares que **não** servem para texto nem para foco |
|---|---|---|
| Industrial | tinta `#181e22` sobre chassi `#cbd0d2` 10,8; rótulo `#414b52` sobre chassi 5,7, sobre elevado `#e7eaeb` 7,4 e sobre rebaixado `#b6bec2` 4,7; `#f2f4f4` sobre campo `#20272b` 13,7 | laranja `#f15b22` sobre chassi 2,2 e sobre elevado 2,8 (só indicador decorativo); sobre o campo escuro 4,5 |
| Organic | tinta `#29251d` sobre chão `#eee6d6` 12,3 e sobre papel `#f5eddf` 13,1; tinta secundária `#443b2f` 8,9 e 7,5 sobre papel mais escuro; papel sobre musgo `#35422d` 9,2 e sobre argila `#694737` 7,1 | acento de arte `#ad7d62` sobre o chão 2,9 (somente formas) |
| Clay | tinta `#383139` sobre chão `#f1f2fa` 11,3; tinta secundária `#48404b` 8,9 no chão e 6,9 a 8,1 sobre lavanda, amarelo, azul e menta; tinta sobre rosa `#f6a3ca` 6,6 | rosa como cor de texto ou de anel de foco (o anel de 3 px deve usar a tinta) |

Portanto, nos três temas novos o laranja do Industrial, o acento de arte do Organic e o rosa do Clay são **fundos ou formas**, nunca cor de texto de ação nem de foco. Esses números orientam a ET12; a verificação de verdade ocorre no teste de contraste e no axe de cada tema.

## Logo do grupo de pesquisa

O aplicativo exibe o logo do grupo de pesquisa do usuário (requisito de 2026-11-01), o arquivo [`docs/imagens/logo.png`](../imagens/logo.png) (marca EnziTAG), no cabeçalho, na tela inicial e como crédito nos relatórios HTML e PDF (desligável); ver [DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md). O logo **não é coberto pela licença MIT** ([nota](../imagens/README.md)).

## Aplicação ao produto

Os prompts descrevem estilos de referência. A aplicação deve seguir o fluxo funcional do EnziTAG Optima, utilizando as mesmas análises, dados e ações nos três temas. Os exemplos de páginas e seções dos anexos serão adaptados às necessidades do aplicativo.

Os temas devem atender português e inglês, controles por teclado, foco visível, legibilidade e preferência por movimento reduzido. Soft Light foi aprovado como tema inicial; a preferência será persistida por dispositivo. Exportações terão estilo próprio, com fundo branco como padrão para artigos, independente do tema da interface.

**Situação:** os seis temas (Soft Light, Modern Dark, Professional, Industrial, Organic e Clay) estão implementados, com tokens, fontes e testes de contraste e de acessibilidade ([DT-0021](../decisoes-tecnicas/dt-0021-temas-adicionais-fontes-e-logo.md)). O logo do grupo é exibido no cabeçalho, na tela inicial e nos relatórios.
