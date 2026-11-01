# Validação dos cálculos

Área reservada aos casos de referência e evidências de validação do EnziTAG Optima. Ainda não há métodos ou casos numericamente validados.

Para cada caso, preservar:

1. Dados de entrada distribuíveis e identificação da pergunta estatística.
2. Método, modelo e configurações utilizados.
3. Software ou implementação independente de referência, incluindo versão.
4. Resultados esperados, tolerâncias justificadas e explicação das diferenças admitidas.
5. Resultado obtido pelo módulo Rust.
6. Verificação no Windows e no navegador, quando aplicável.

As referências podem utilizar Python e softwares especializados. Elas não integram o motor de cálculo distribuído, que permanece em Rust.

Ao acrescentar módulos, preservar os casos aprovados para verificar que resultados anteriores continuam corretos. A validação de um caso não representa aprovação de todos os métodos, entradas ou ambientes.
