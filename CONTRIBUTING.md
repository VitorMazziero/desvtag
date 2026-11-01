# Contribuindo com EnziTAG Optima

O projeto está no início da implementação da primeira versão. Antes de contribuir, consulte o [plano ativo](docs/planos-execucao/README.md), o [plano da v0.1](docs/planos-execucao/plano-v0.1.md), as [decisões aprovadas](docs/produto/decisoes-aprovadas.md), o [mapa de módulos e arquivos](docs/arquitetura/mapa-modulos.md) e os [detalhes pendentes](docs/produto/decisoes-pendentes.md).

## Convenções

- [Nomenclatura](docs/convencoes/nomenclatura.md): nomes de documentos, pastas, identificadores, código, branches e commits.
- [Documentação](docs/convencoes/documentacao.md): cabeçalho, estados, precedência e atualização junto com o código.
- [Fluxo de trabalho](docs/convencoes/fluxo-trabalho.md): ciclo de uma etapa, definição de pronto e pull requests.
- [Modelos](docs/modelos/README.md) para planos, decisões técnicas, fichas de módulo, métodos e casos de validação.

## Desenvolvimento dos módulos

Para cada procedimento, apresentar a pergunta estatística, pressupostos, fórmulas, entradas e saídas. A implementação deve explicitar o algoritmo e disponibilizar os valores intermediários úteis para aprendizagem e verificação.

Os cálculos científicos pertencem ao núcleo Rust. A interface apresenta os resultados e permite configurar a análise. As integrações de arquivos, Windows, navegador e eventual Google Drive devem preservar essa separação.

Documentar o papel de qualquer dependência numérica e as situações em que o procedimento não pode produzir um resultado válido.

## Verificação

Usar casos pequenos acompanháveis manualmente e referências independentes. Registrar dados, versões, opções do método e tolerâncias na área [validation](validation/README.md).

Ao relatar um resultado, distinguir implementação existente, comparação numérica aprovada e funcionamento verificado no Windows e no navegador. Não apresentar um método ou destino ainda não verificado como validado.

## Dados e materiais

Utilizar exemplos sintéticos ou dados cuja distribuição esteja autorizada. O diretório local `referencias/` e o registro histórico da conversa não fazem parte dos arquivos destinados ao GitHub.

## Licença e publicação

O código e a documentação própria adotam a [licença MIT](LICENSE). Os comandos de desenvolvimento e as verificações automatizadas serão documentados na [ET01](docs/planos-execucao/ativos/et01-fundacao-tecnica.md); o fluxo de publicação, na [ET10](docs/planos-execucao/ativos/et10-integracao-publicacao.md), somente depois de executados.
