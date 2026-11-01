# Contribuindo com EnziTAG Optima

O projeto está na etapa de organização e concepção. O escopo está em [plans/CONCEPCAO_APP.md](plans/CONCEPCAO_APP.md), e as escolhas em aberto estão em [plans/DECISOES_PENDENTES.md](plans/DECISOES_PENDENTES.md).

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

A licença do projeto ainda está em definição. Os comandos de desenvolvimento, verificações automatizadas e fluxo de publicação serão documentados à medida que a implementação correspondente existir.
