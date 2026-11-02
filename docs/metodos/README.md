# Especificações de métodos

**Estado:** vigente · **Atualizado em:** 2026-11-01

Para cada procedimento implementado, registrar em `<slug>.md` (por exemplo, `tukey.md`), a partir do [modelo de especificação](../modelos/especificacao-metodo.md):

- Finalidade, pressupostos e estruturas experimentais compatíveis.
- Referências, fórmulas e algoritmo numérico.
- Entradas, saídas, unidades e casos em que o resultado não pode ser calculado.
- Configurações que afetam o resultado e papel das dependências utilizadas.
- Exemplos e resultados intermediários.
- Situação da validação e ligação com os respectivos casos de referência.

O [catálogo funcional](../produto/catalogo-funcional.md) está aprovado como escopo e abrange o Protimiza e os métodos discutidos. A sequência está no [roteiro do produto](../planos-execucao/roteiro-produto.md) e no [plano da v0.1](../planos-execucao/plano-v0.1.md); a versão-alvo de cada método está na [matriz de cobertura](../produto/matriz-cobertura.md).

## Especificações

| Método | Situação |
|---|---|
| [Estatística descritiva](estatistica-descritiva.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Fundamentos numéricos](fundamentos-numericos.md) | implementado; validado por meio dos métodos que os consomem |
| [Funções especiais](funcoes-especiais.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Distribuições Normal, t, qui-quadrado e F](distribuicoes.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Regressão linear](regressao-linear.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Amplitude studentizada](amplitude-studentizada.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [ANOVA de um fator](anova-um-fator.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Tukey e Tukey–Kramer](tukey.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Letras de comparação](letras-comparacao.md) | implementado; validado semanticamente e contra referência independente |
| [Fatorial de dois níveis](fatorial-dois-niveis.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Fatorial fracionário](fatorial-fracionario.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Plackett–Burman](plackett-burman.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Aleatorização reprodutível](aleatorizacao.md) | implementado; validado contra implementação independente |
| [Delineamento inteiramente casualizado (DIC) aleatorizado](delineamento-inteiramente-casualizado.md) | implementado; validado contra implementação independente (nativo e WebAssembly) |
| [Procedimentos de comparação múltipla: Games–Howell (Welch), Bonferroni e Holm](procedimentos-comparacao-multipla.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Dunnett](dunnett.md) | implementado; validado numericamente contra integração dupla independente (nativo e WebAssembly) |
| [Kruskal–Wallis e Dunn](kruskal-wallis-dunn.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [ANOVA multifatorial com blocos](anova-multifatorial.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Médias marginais e contrastes](medias-marginais-contrastes.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Delineamento em blocos completos casualizados (DBC)](delineamento-em-blocos.md) | implementado; validado contra implementação independente (nativo e WebAssembly) |
| [Fatorial completo de níveis mistos](niveis-mistos.md) | implementado; validado contra implementação independente (nativo e WebAssembly) |
| [Misturas e modelos de Scheffé](misturas.md) | implementado; validado contra implementação independente e statsmodels (nativo e WebAssembly) |
| [Planejamentos D e I-ótimos](planejamentos-otimos.md) | implementado; validado contra NumPy e busca exaustiva (nativo e WebAssembly) |
| [Seleção e comparação de modelos de superfície](selecao-de-modelos.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Composto central](composto-central.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Box–Behnken](box-behnken.md) | implementado (3 a 5 fatores); validado numericamente |
| [Superfície de resposta de segunda ordem](superficie-resposta.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Planejamento personalizado ou matriz importada](planejamento-personalizado.md) | implementado; validado numericamente |
| [Desejabilidade (Derringer e Suich)](desejabilidade.md) | implementado; validado numericamente (nativo e WebAssembly) |
| [Busca de condições ótimas e confirmação](busca-otimizacao.md) | implementado; validado contra busca exaustiva independente |
