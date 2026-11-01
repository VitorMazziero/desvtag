# Fichas de módulos

**Estado:** vigente · **Atualizado em:** 2026-11-01

A aprendizagem definida pelo usuário é conhecer o aplicativo pela separação clara dos módulos e de seus arquivos. Esta pasta apoia a leitura e a manutenção do código; não define um curso obrigatório nem etapas adicionais antes de implementar o produto. Incorpora a antiga pasta `docs/aprendizado/` ([DT-0001](../decisoes-tecnicas/dt-0001-estrutura-documentacao-nomenclatura.md)).

O índice principal é o [mapa de módulos e arquivos](../arquitetura/mapa-modulos.md). A etapa que cria cada módulo está nos [planos de execução](../planos-execucao/README.md).

Cada módulo recebe uma ficha `<id>-<slug>.md` (por exemplo, `c09-comparacoes.md`), criada a partir do [modelo de ficha](../modelos/ficha-modulo.md), com:

1. Responsabilidade e arquivos de entrada/implementação.
2. Entradas, saídas e funções públicas.
3. Módulos dos quais depende e módulos que o consomem.
4. Fluxo dos dados até a interface, arquivo ou cálculo seguinte.
5. Erros, limitações e verificações relevantes.
6. Exemplo pequeno e referências matemáticas quando houver cálculo científico.
7. Onde alterar o comportamento e quais testes executar após a mudança.

Fórmulas detalhadas ficam nas [especificações de métodos](../metodos/README.md). As explicações na interface permanecem curtas.

## Fichas

Nenhuma ficha criada ainda; as primeiras são previstas na [ET01](../planos-execucao/ativos/et01-fundacao-tecnica.md) (E01, E03, E04 e U12).
