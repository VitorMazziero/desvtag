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
