# EnziTAG Optima — arquitetura e organização modular

Atualizado em 1º de novembro de 2026. O nome deste arquivo foi preservado para manter os links existentes.

A aprendizagem solicitada está ligada à **distinção organizada dos módulos do aplicativo**, cada um com arquivos, responsabilidades e interfaces definidos para facilitar compreensão e manutenção. O plano não é um curso sequencial de programação. Exemplos e fórmulas são documentação de apoio aos módulos.

## Arquitetura aceita

- Rust: núcleo científico, cálculos explícitos, planejamentos, modelos, comparações e otimização.
- TypeScript/React: interface compartilhada com português/inglês e os três temas desde o início.
- Windows/Tauri: motor Rust nativo e integração com o sistema.
- Navegador/WebAssembly: o mesmo motor científico, com transporte próprio.
- Projetos locais sem login e Google Drive opcional como destino adicional.
- Código público sob MIT, web no GitHub Pages e Windows no GitHub Releases; publicação ainda não realizada.

O catálogo completo está em [CATALOGO_FUNCIONAL.md](CATALOGO_FUNCIONAL.md), e as políticas aprovadas em [DECISOES_APROVADAS.md](DECISOES_APROVADAS.md).

## Separação das responsabilidades

| Camada | Pacote/pasta planejado | Responsabilidade |
|---|---|---|
| Ciência | `app/crates/optima-core` | Dados experimentais, validação científica, matemática, modelos e procedimentos |
| Documento | `app/crates/optima-project` | Projeto, revisões, análises, formato e migrações em memória |
| Operações comuns | `app/crates/optima-engine` | Contratos de execução, despacho e resultados estruturados |
| Navegador | `app/crates/optima-wasm` | Transporte WASM sem duplicar algoritmos |
| Windows | `app/desktop/src-tauri` | Transporte Tauri, arquivos, tarefas nativas e integração Windows |
| Interface | `app/web` | Telas, tabelas, gráficos, idiomas, temas e serviços de armazenamento |

Os dois novos pacotes project/engine são a decomposição técnica prevista no plano, não código já criado. O core não acessa interface, disco ou rede; project depende dos tipos do core; engine coordena ambos; adaptadores chamam engine.

## Onde encontrar cada módulo

O [mapa de módulos e arquivos](../docs/MAPA_MODULOS.md) é o índice de manutenção. Identifica o arquivo de entrada e os subarquivos de cada responsabilidade, incluindo Tukey, letras, ANOVA, PB, modelos, gráficos e salvamento.

Cada módulo terá:

1. Propósito e caminhos dos arquivos responsáveis.
2. Entradas, saídas, erros e dependências.
3. API pública pequena e detalhes internos separados.
4. Fórmulas e referências quando houver cálculo científico.
5. Testes e casos independentes adequados ao seu comportamento.
6. Relação com interface, persistência e demais módulos.

Uma família pode ter vários arquivos especializados. Não é necessário reunir todo o Tukey, sua tela, seu gráfico e seu salvamento em um arquivo único. Também não criar um arquivo por operação trivial apenas para aumentar a separação.

## Bibliotecas e transparência

Procedimentos estatísticos ficam em módulos próprios e documentados. Bibliotecas auxiliares de interface, arquivos, gráficos e comunicação podem ser utilizadas. Para dependências numéricas, registrar algoritmo, finalidade, limitações e fronteira de responsabilidade antes de adotá-las.

Python e softwares especializados são referências independentes de validação; não são o motor distribuído. Valores intermediários úteis poderão ser inspecionados sem gerar rastros enormes por padrão. O arredondamento é de apresentação, não altera o cálculo.

## Execução e verificação

O [plano de implementação](PLANO_IMPLEMENTACAO.md) substitui a antiga sequência de aprendizagem como roteiro de execução. Define F00–F14, dependências, entregas e critérios de conclusão. Começa por um percurso executável nas duas plataformas, seguido de projetos locais, fundamentos, ANOVA/Tukey e planejamentos.

A validação acompanha cada módulo, com configurações estatísticas equivalentes, tolerâncias justificadas e evidência de integração nativa/WASM. A validação de um método/caso não valida todo o produto.

A interface mantém explicações curtas e opções avançadas. A documentação de manutenção pode ser detalhada sem transferir sua complexidade para o usuário iniciante.
