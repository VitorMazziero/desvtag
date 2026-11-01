# Exemplo 03 — Superfície de resposta do meio de cultivo (DCCR)

**Dados sintéticos**, criados para este exemplo (não são medições reais). Continua o [exemplo 02](../02-triagem-meio-cultivo/README.md): da triagem seguem os três componentes com maior efeito — **glicose**, **peptona** e **NaCl** —, agora estudados em uma região menor com um **composto central rotacional (DCCR/CCRD) de três fatores**: 8 pontos fatoriais, 6 axiais (α = 1,682) e 5 pontos centrais, **19 ensaios**. A resposta é a atividade enzimática (U/mL). As respostas foram geradas por uma superfície quadrática conhecida mais ruído normal (desvio-padrão 1,0) de uma sequência pseudoaleatória com semente fixa (`app/web/scripts/make-example-surface.mjs`).

| Fator | Unidade | Nível baixo (−1) | Nível alto (+1) | Pontos axiais (±α) |
|---|---|---|---|---|
| Glicose | g/L | 20 | 40 | 13,2 a 46,8 |
| Peptona | g/L | 3 | 7 | 1,6 a 8,4 |
| NaCl | g/L | 1 | 2 | 0,66 a 2,34 |

Semente da aleatorização: **20261101**. Superfície verdadeira (escala codificada): `120 + 5·G + 3·P − 1·N − 6·G² − 4·P² − 3·N² + 1,2·G·P − 0,8·P·N`.

Arquivos: [`projeto.enzitag`](projeto.enzitag) (planejamento, respostas e análise calculada) e [`ensaios.csv`](ensaios.csv) (ordem de execução, níveis reais e resposta; também serve de exemplo de matriz importada).

## Como reproduzir

1. **Planejar experimento** → cadastre os três fatores quantitativos e a resposta *Atividade enzimática* (U/mL).
2. Na etapa de dados, informe os níveis, escolha *Superfície de resposta (segunda ordem)* → *Composto central rotacional*, 5 pontos centrais e a semente 20261101: o motor informa 19 ensaios e α = 1,682. Gere o planejamento.
3. Cole a coluna `atividade_U_mL` de `ensaios.csv` na coluna da resposta, na ordem da grade, e calcule a superfície (modelo completo de segunda ordem).

Ou abra `projeto.enzitag`: o resultado guardado aparece sem recálculo.

**Matriz personalizada:** importe `ensaios.csv` pelo caminho *Analisar dados existentes*, marque *Ajustar superfície de resposta* e o mesmo ajuste é obtido (a escala codificada usa então o menor e o maior valor de cada fator ensaiado, não os níveis do planejamento; os coeficientes codificados diferem, a predição é a mesma).

## Resultado esperado

Conferido contra uma regressão independente (NumPy/SciPy a partir de `ensaios.csv`) e por um teste de ponta a ponta:

| Termo | Estimativa (codificada) | Erro-padrão | t | Valor-p |
|---|---|---|---|---|
| Intercepto | 119,40 | 0,5485 | 217,7 | < 0,0001 |
| Glicose | 5,0158 | 0,3323 | 15,09 | < 0,0001 |
| Peptona | 2,8224 | 0,3323 | 8,494 | < 0,0001 |
| NaCl | −0,6946 | 0,3323 | −2,090 | 0,0661 |
| Glicose² | −5,7833 | 0,3324 | −17,40 | < 0,0001 |
| Peptona² | −3,8387 | 0,3324 | −11,55 | < 0,0001 |
| NaCl² | −2,8311 | 0,3324 | −8,518 | < 0,0001 |
| Glicose:Peptona | 1,2375 | 0,4342 | 2,850 | 0,0191 |
| Glicose:NaCl | 0,1875 | 0,4342 | 0,4319 | 0,676 |
| Peptona:NaCl | −0,8875 | 0,4342 | −2,044 | 0,0713 |

ANOVA da regressão: 9 gl do erro, F = 80,70 (p = 1,6e-7), R² = 0,9878, R² ajustado = 0,9755, desvio-padrão residual 1,228 U/mL. **Falta de ajuste** (4 gl de erro puro nos 5 pontos centrais): F = 0,629, p = 0,692 — não detectada.

**Leitura:** a curvatura é forte nos três fatores (quadráticos significativos) e o modelo descreve a região sem falta de ajuste detectada. Pelo modelo, o máximo está dentro da região (estacionário em cerca de glicose 34,8 g/L, peptona 5,9 g/L e NaCl 1,4 g/L, com resposta predita ≈ 121 U/mL; cálculo feito fora do aplicativo para conferência — a busca do ótimo e a confirmação experimental são da etapa de otimização). Predições fora da região ensaiada (hachuradas nos gráficos) são extrapolação.
