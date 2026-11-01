# Validação dos cálculos

Casos de referência e evidências de validação do EnziTAG Optima. Situação atual: `descriptive_summary` (9 conjuntos NIST StRD), `linear_model` (11 conjuntos NIST StRD de regressão linear e 6 casos do construtor de modelos) as distribuições Normal, t, qui-quadrado e F (531 pontos mpmath), a amplitude studentizada (432 pontos SciPy, 10 conferidos com mpmath) `one_way_comparison` (11 conjuntos NIST de ANOVA e 4 casos aplicados), `two_level_design` (permutações PCG32, matrizes por enumeração independente, fracionários por força bruta e Plackett–Burman de 8 tamanhos) e `two_level_design_analysis` (5 casos contra NumPy/SciPy, Lenth e falta de ajuste pela definição), `surface_design` (12 matrizes de composto central e Box–Behnken por enumeração independente, com rotacionalidade) e `response_surface` (6 casos contra NumPy/SciPy, incluindo equação em unidades reais, falta de ajuste, malha e extrapolação), e `desirability_optimization` (6 casos contra busca exaustiva independente em NumPy, com sondagens de previsões, intervalos e desejabilidades), todos validados numericamente em Rust nativo e WebAssembly; nenhum outro método.

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

Ambiente de referência: `python -m venv .venv && .venv/bin/pip install -r validation/tools/requirements.txt` (a pasta `.venv/` é ignorada pelo Git). Os casos são gerados por `validation/tools/make_descriptive_cases.py` e `make_regression_cases.py` (`<pasta com os .dat do NIST>`), `make_model_cases.py`, `make_distribution_cases.py`, `make_studentized_range_cases.py`, `make_comparison_cases.py`, `make_import_cases.py` e `make_project_case.py`.

`method_id` é o identificador do método no registro do motor (por exemplo, `tukey_hsd`). Nomes de arquivos lidos por código ficam em inglês; o `README.md` de cada caso segue o [modelo de caso de validação](../docs/modelos/caso-validacao.md). A situação de cada método está na [matriz de cobertura](../docs/produto/matriz-cobertura.md).

Ao acrescentar módulos, preservar os casos aprovados para verificar que resultados anteriores continuam corretos. A validação de um caso não representa aprovação de todos os métodos, entradas ou ambientes.
