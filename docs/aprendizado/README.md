# Organização dos módulos para compreensão e manutenção

A prioridade definida pelo usuário é conhecer o aplicativo pela separação clara dos módulos e de seus arquivos. Esta pasta apoia a leitura e manutenção do código; não define um curso obrigatório nem etapas adicionais antes de implementar o produto.

O índice principal é o [mapa de módulos e arquivos](../MAPA_MODULOS.md). A execução segue o [plano de implementação](../../plans/PLANO_IMPLEMENTACAO.md).

Para cada módulo, documentar em `docs/modulos/<id>.md`:

1. Responsabilidade e arquivos de entrada/implementação.
2. Entradas, saídas e funções públicas.
3. Módulos dos quais depende e módulos que o consomem.
4. Fluxo dos dados até a interface, arquivo ou cálculo seguinte.
5. Erros, limitações e verificações relevantes.
6. Exemplo pequeno e referências matemáticas quando houver cálculo científico.
7. Onde alterar o comportamento e quais testes executar após a mudança.

Fórmulas detalhadas ficam na documentação de métodos. As explicações na interface permanecem curtas. Os arquivos de código e as fichas de módulos serão criados na fase correspondente; ainda não há módulos implementados.
