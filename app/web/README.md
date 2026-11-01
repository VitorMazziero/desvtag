# Interface compartilhada

Área reservada à interface TypeScript/React do EnziTAG Optima, utilizada no navegador e no aplicativo Windows.

Responsabilidades previstas: navegação guiada, cadastro de fatores e respostas, edição e importação de dados, configuração das análises, tabelas, gráficos e explicações curtas.

Português e inglês são requisitos desde o início, no navegador e no Windows. Os textos de navegação, validação, explicação e apresentação de resultados devem ser organizados separadamente da lógica, com cobertura equivalente nos dois idiomas. Preservar os nomes e observações digitados pelo usuário.

Os temas iniciais serão Modern Dark, Professional e Soft Light. Seus [prompts e orientações](../../docs/temas/README.md) ficam na documentação. Soft Light utiliza a base Software, com cores adaptadas ao logo EnziTAG. Soft Light é o padrão, com preferência por dispositivo. O seletor de tema deve preservar a análise, os dados e o idioma escolhidos. Idioma e aparência de exportação são independentes da interface.

A interface chama o núcleo científico pela integração correspondente ao ambiente. Os cálculos estatísticos permanecem em Rust.

O uso local deve funcionar sem login. Google Drive é uma integração opcional aprovada. O fluxo guiado, importação por digitação/colagem/CSV/XLSX e formatos de exportação estão nas [decisões aprovadas](../../plans/DECISOES_APROVADAS.md). Bibliotecas e detalhes internos serão definidos nas fases do [plano](../../plans/PLANO_IMPLEMENTACAO.md).

Ainda não há projeto frontend inicializado nesta pasta.
