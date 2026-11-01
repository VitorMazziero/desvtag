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

| Módulo | Ficha | Estado |
|---|---|---|
| E01 — contratos e despacho | [e01-contratos-despacho.md](e01-contratos-despacho.md) | implementado (sem método científico) |
| E03 — adaptador WebAssembly | [e03-adaptador-wasm.md](e03-adaptador-wasm.md) | implementado |
| E04 — adaptador Tauri | [e04-adaptador-tauri.md](e04-adaptador-tauri.md) | comando do motor implementado |
| U12 — cliente do motor | [u12-cliente-motor.md](u12-cliente-motor.md) | implementado |
