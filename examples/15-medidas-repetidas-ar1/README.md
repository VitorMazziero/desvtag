# Exemplo 15 — Perfis temporais e AR(1)

Dados **sintéticos**, gerados com NumPy (`default_rng`, semente 20261103) no conjunto `ar1_positive` dos [casos independentes](../../validation/cases/repeated_covariance/reml.json). 18 unidades, quatro ocasiões inteiras (0, 1, 2, 3), 72 observações. Não representam um ensaio biológico real nem têm unidade física presumida.

Arquivos: [CSV](ensaios.csv) e [projeto com resultados](projeto.enzitag), criado pelo aplicativo real via [`save-example-repeated.mjs`](../../app/web/scripts/save-example-repeated.mjs). Abrir não recalcula.

## Como reproduzir

Abra o projeto e consulte resumo, testes conjuntos, médias marginais, diagnóstico e perfis. Para refazer do zero: Analisar dados existentes → importar CSV (unit_id = unidade, time = tempo, Resposta = resposta) → Análise → medidas repetidas → modelo misto → configuração avançada → AR(1), tempo categórico, primeiro nível como referência e comparação entre ocasiões. Confiança de 95%, Bonferroni por família (seis diferenças).

## Referência independente esperada

| Resultado | Valor aproximado |
|---|---|
| Log-verossimilhança restrita, incluindo constante e codificação por tratamento | -102.62175456 |
| Média no tempo 0 | 10.539065 |
| Média no tempo 3 | 12.619947 |
| Teste conjunto das ocasiões: F (3 gl no numerador) | 20.613679 |
| gl no denominador, Fai–Cornelius | 28.936616 |
| Valor-p do teste conjunto | 2.4142433e-07 |

Covariância residual AR(1) acrescida de intercepto aleatório; unidades distintas independentes. EMM têm pesos iguais e vêm do modelo. O perfil médio usa as condições observadas; as barras são IC da média, sem imputar ocasiões. Consultar a [especificação](../../docs/metodos/modelos-mistos.md#12-extensão-v2--covariância-testes-conjuntos-emm-e-perfis) e as tolerâncias do JSON. Os números foram conferidos por NumPy/SciPy densa, Rust e WASM; a [verificação da aplicação nativa](../../validation/reports/et23/README.md) registra seu estado e limites.
