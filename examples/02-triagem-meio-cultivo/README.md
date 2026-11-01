# Exemplo 02 — Triagem de componentes de meio de cultivo (Plackett–Burman)

**Dados sintéticos**, criados para este exemplo (não são medições reais): seis componentes de um meio de cultivo testados em um planejamento **Plackett–Burman de 12 ensaios com 4 pontos centrais** (16 ensaios), com a atividade enzimática (U/mL) como resposta. As respostas foram geradas a partir de efeitos verdadeiros conhecidos, uma curvatura e ruído normal de uma sequência pseudoaleatória com semente fixa (`app/web/scripts/make-example-screening.mjs`).

| Fator | Unidade | Nível baixo | Nível alto | Efeito verdadeiro (por unidade codificada ×2) |
|---|---|---|---|---|
| Glicose | g/L | 10 | 30 | 4,0 |
| Extrato de levedura | g/L | 2 | 6 | 0,5 |
| Peptona | g/L | 2 | 6 | 2,5 |
| NaCl | g/L | 1 | 5 | −1,5 |
| MgSO4 | g/L | 0,1 | 0,5 | 0 |
| KH2PO4 | g/L | 0,5 | 1,5 | 0,3 |

Curvatura verdadeira nos pontos centrais: +6 U/mL. Semente da aleatorização: **20261101**.

Arquivos: [`projeto.enzitag`](projeto.enzitag) (planejamento gerado, respostas preenchidas e análise calculada) e [`respostas.csv`](respostas.csv) (respostas na ordem de execução).

## Como reproduzir

1. **Planejar experimento** → cadastre os seis fatores quantitativos e a resposta *Atividade enzimática* (U/mL).
2. Na etapa de dados, informe os níveis, orçamento de 12 ensaios, 4 pontos centrais e a semente 20261101; o motor recomenda Plackett–Burman de 12 ensaios. Gere o planejamento.
3. Cole `respostas.csv` (coluna `atividade_U_mL`) na coluna da resposta, na ordem da grade. Em **Análise**, escolha *Somente efeitos principais* com curvatura.

Ou abra `projeto.enzitag`: o resultado guardado aparece sem recálculo.

## Resultado esperado

Conferido contra uma regressão independente (NumPy/SciPy, matriz Plackett–Burman reconstruída em Python com o mesmo PCG32 e Fisher–Yates) e por um teste de ponta a ponta:

| Termo | Coeficiente (codificado) | Efeito (2 × coef.) | t | Valor-p |
|---|---|---|---|---|
| Glicose | 2,1417 | 4,2833 | 3,567 | 0,0073 |
| Extrato de levedura | 1,0917 | 2,1833 | 1,818 | 0,107 |
| Peptona | 0,9750 | 1,9500 | 1,624 | 0,143 |
| NaCl | −1,3417 | −2,6833 | −2,235 | 0,056 |
| MgSO4 | 0,2417 | 0,4833 | 0,403 | 0,698 |
| KH2PO4 | 0,3417 | 0,6833 | 0,569 | 0,585 |
| Curvatura | 5,5000 | 11,0000 | 4,581 | 0,0018 |

8 graus de liberdade do erro (5 colunas fictícias do Plackett–Burman + 3 dos pontos centrais); desvio-padrão residual 2,08 U/mL. **Leitura:** a glicose é o único fator ativo ao nível de 5 %, o NaCl está no limite e **há curvatura** — o modelo linear não basta na região e uma etapa seguinte (superfície de resposta) é indicada. Como Plackett–Burman é de resolução III, os efeitos principais podem estar confundidos com interações de dois fatores; isso é triagem, não otimização.
