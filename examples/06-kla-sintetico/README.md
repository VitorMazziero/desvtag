# Exemplo 06 — kLa sintético: um modelo por resposta

**Dados sintéticos**, criados para este exemplo (não são as medições reais do grupo). Um **composto central de face centrada** com dois fatores — **RPM** e **aeração** — e **duas respostas**: o coeficiente volumétrico de transferência de oxigênio **kLa** (1/h) e a **potência específica** (W/m³). São 13 ensaios (4 fatoriais, 4 axiais na face e 5 pontos centrais). As respostas vêm de superfícies quadráticas conhecidas mais ruído normal de uma sequência pseudoaleatória com semente fixa (`app/web/scripts/make-example-kla.mjs`).

| Fator | Unidade | Nível baixo (−1) | Nível alto (+1) |
|---|---|---|---|
| RPM | rpm | 300 | 500 |
| Aeração | vvm | 0,5 | 1,5 |

Semente da aleatorização: **20261101**. Superfícies verdadeiras (escala codificada): `kLa = 40 + 18·R + 6·A − 9·R² + 0,2·A² + 0,4·R·A` e `Potência = 150 + 80·R + 6·A + 25·R² + 0,5·A²`.

Arquivos: [`projeto.enzitag`](projeto.enzitag) (planejamento, respostas, análises calculadas e o modelo escolhido de cada resposta) e [`ensaios.csv`](ensaios.csv) (ordem de execução, níveis reais e as duas respostas).

## O que o exemplo mostra

1. **Modelo completo × recomendado.** Para o kLa, o aplicativo recomenda retirar a **aeração²** e a **interação RPM × aeração** (nenhuma é significativa). O modelo reduzido tem menos parâmetros, `R²` ajustado praticamente igual e `R²` predito maior.
2. **Um modelo por resposta.** O modelo reduzido fica guardado para o kLa; a potência continua com o modelo completo. Trocar a resposta no painel «Modelo» traz o modelo que ela tinha, e a otimização usa o modelo escolhido de cada resposta.
3. **Resultados em seções.** Abra `projeto.enzitag` e navegue pela barra lateral (resumo, tabelas, modelo, figuras, otimização, exportar).

## Resultado esperado

Conferido contra uma regressão independente (NumPy/SciPy a partir de `ensaios.csv`). Escala codificada; erro-padrão e valor-p do modelo linear.

**kLa — modelo completo** (`R²` 0,9974; `R²` ajustado 0,9956; `R²` predito 0,9866; 7 g.l. do resíduo)

| Termo | Estimativa | Erro-padrão | t | Valor-p |
|---|---|---|---|---|
| Intercepto | 39,7655 | 0,3814 | 104,26 | < 0,0001 |
| RPM | 17,8333 | 0,3750 | 47,56 | < 0,0001 |
| Aeração | 5,0500 | 0,3750 | 13,47 | < 0,0001 |
| RPM² | −8,3793 | 0,5527 | −15,16 | < 0,0001 |
| Aeração² | −0,7293 | 0,5527 | −1,319 | 0,2285 |
| RPM:Aeração | 0,4000 | 0,4593 | 0,871 | 0,4127 |

**kLa — modelo recomendado** (RPM, aeração e RPM²; `R²` 0,9965; `R²` ajustado 0,9954; `R²` predito 0,9929; 9 g.l. do resíduo)

| Termo | Estimativa | Erro-padrão | t | Valor-p |
|---|---|---|---|---|
| Intercepto | 39,5571 | 0,3567 | 110,90 | < 0,0001 |
| RPM | 17,8333 | 0,3853 | 46,29 | < 0,0001 |
| Aeração | 5,0500 | 0,3853 | 13,11 | < 0,0001 |
| RPM² | −8,6571 | 0,5250 | −16,49 | < 0,0001 |

**Potência — modelo completo** (`R²` 0,9979; `R²` ajustado 0,9965; `R²` predito 0,9851): RPM 81,17 (p < 0,0001), RPM² 30,29 (p < 0,0001), aeração 5,50 (p = 0,0067); aeração² (p = 0,0627) e a interação (p = 0,7856) não são significativas.

## Como reproduzir

1. **Planejar experimento** → dois fatores quantitativos (RPM, aeração) e duas respostas (kLa, Potência).
2. Superfície de resposta → composto central **face centrada**, 5 pontos centrais, semente 20261101 (13 ensaios).
3. Cole as colunas `kLa` e `Potência` de `ensaios.csv`, na ordem da grade, e calcule a superfície.
4. Na seção **Modelo**, aplique a recomendação para o kLa; troque a resposta para a potência e volte ao kLa.

Ou abra `projeto.enzitag`: os resultados guardados aparecem sem recálculo.
