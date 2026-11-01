# Validação dos cálculos

Casos de referência e evidências de validação do EnziTAG Optima. Situação atual: `descriptive_summary` validado numericamente (9 conjuntos NIST StRD; nativo e WebAssembly); nenhum outro método.

Para cada caso, preservar:

1. Dados de entrada distribuíveis e identificação da pergunta estatística.
2. Método, modelo e configurações utilizados.
3. Software ou implementação independente de referência, incluindo versão.
4. Resultados esperados, tolerâncias justificadas e explicação das diferenças admitidas.
5. Resultado obtido pelo módulo Rust.
6. Verificação no Windows e no navegador, quando aplicável.

As referências podem utilizar Python e softwares especializados. Elas não integram o motor de cálculo distribuído, que permanece em Rust.

## Organização

```text
validation/
├── cases/<method_id>/<nnn>-<slug>/   # um caso por pasta (ET02 em diante)
│   ├── README.md                     # pergunta, origem, referência e tolerâncias
│   ├── input.csv                     # dados de entrada distribuíveis
│   ├── config.json                   # método, modelo, opções e semente
│   ├── reference.py                  # referência independente, quando em Python
│   └── expected.json                 # resultados esperados e tolerâncias
├── tools/                            # ambiente Python de referência (ET02)
└── reports/v<versão>/                # evidências por versão e plataforma (ET10)
```

Ambiente de referência: `python -m venv .venv && .venv/bin/pip install -r validation/tools/requirements.txt` (a pasta `.venv/` é ignorada pelo Git). Os casos de `descriptive_summary` são gerados por `validation/tools/make_descriptive_cases.py <pasta com os .dat do NIST>`.

`method_id` é o identificador do método no registro do motor (por exemplo, `tukey_hsd`). Nomes de arquivos lidos por código ficam em inglês; o `README.md` de cada caso segue o [modelo de caso de validação](../docs/modelos/caso-validacao.md). A situação de cada método está na [matriz de cobertura](../docs/produto/matriz-cobertura.md).

Ao acrescentar módulos, preservar os casos aprovados para verificar que resultados anteriores continuam corretos. A validação de um caso não representa aprovação de todos os métodos, entradas ou ambientes.
