# Exemplo 07 — Misturas: simplex-lattice e modelo de Scheffé

**Dados sintéticos**, criados para este exemplo. Três componentes de uma mistura — **Água**, **Etanol** e **Glicerol** (proporções que somam 1) — e uma resposta, **Rendimento**. O planejamento é um **simplex-lattice {3, 2}** (3 vértices e 3 pontos médios das arestas) com **2 repetições** e **1 ponto central extra**: 13 ensaios, na ordem do planejamento (sem aleatorização, para que o arquivo seja reproduzível).

A resposta verdadeira é `Rendimento = 10·Água + 20·Etanol + 30·Glicerol + 25·Água·Etanol` mais uma perturbação fixa e pequena (`app/web/scripts/make-example-v03.mjs`).

Arquivos: [`projeto.enzitag`](projeto.enzitag) (planejamento e dados) e [`ensaios.csv`](ensaios.csv). A análise de misturas é calculada ao pedir e **não é guardada no projeto**.

## Como reproduzir

1. Abra `projeto.enzitag`.
2. Na análise de misturas, escolha o modelo **quadrático** e use **Ajustar modelo**.

## Resultado esperado

Conferido contra uma regressão independente (NumPy e SciPy a partir de `ensaios.csv`): modelo de Scheffé quadrático, sem intercepto, 7 graus de liberdade do resíduo.

| Termo | Estimativa | Erro-padrão | t | Valor-p |
|---|---|---|---|---|
| Água | 10,0055 | 0,0207 | 484,3 | < 0,0001 |
| Etanol | 19,9855 | 0,0207 | 967,5 | < 0,0001 |
| Glicerol | 30,0055 | 0,0207 | 1452,5 | < 0,0001 |
| Água·Etanol | 25,0302 | 0,0974 | 257,0 | < 0,0001 |
| Água·Glicerol | 0,0702 | 0,0974 | 0,72 | 0,495 |
| Etanol·Glicerol | −0,0098 | 0,0974 | −0,10 | 0,923 |

As duas interações que não existem na função verdadeira (Água·Glicerol e Etanol·Glicerol) não são significativas, e a interação Água·Etanol recupera o valor 25. O gráfico ternário mostra as curvas de nível do modelo ajustado.

## Limites

Só limites inferiores nos componentes; sem otimização no simplex ([método](../../docs/metodos/misturas.md)).
