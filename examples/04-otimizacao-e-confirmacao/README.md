# Exemplo 04 — Otimização de duas respostas e ensaios de confirmação

**Dados sintéticos**, criados para este exemplo (não são medições reais). Fecha o percurso triagem → superfície → otimização → confirmação com o meio de cultivo dos [exemplos 02](../02-triagem-meio-cultivo/README.md) e [03](../03-superficie-meio-cultivo/README.md): o mesmo DCCR de 3 fatores (glicose, peptona e NaCl; 19 ensaios; semente 20261101), agora com **duas respostas** — *Atividade enzimática* (U/mL, a maximizar) e *Subproduto* (mg/L, a minimizar) — geradas por superfícies quadráticas conhecidas mais ruído normal (desvio-padrão 1,0 e 0,6) de uma sequência pseudoaleatória com semente fixa (`app/web/scripts/make-example-optimization.mjs`).

Arquivos: [`projeto.enzitag`](projeto.enzitag) (dois experimentos: o DCCR com a superfície e a otimização calculadas, e o experimento de confirmação vinculado), [`ensaios.csv`](ensaios.csv) (os 19 ensaios) e [`confirmacao.csv`](confirmacao.csv) (as condições propostas, com valores observados também sintéticos).

## Objetivos usados

| Resposta | Objetivo | Limites da desejabilidade | Importância | Limite obrigatório |
|---|---|---|---|---|
| Atividade enzimática | Maximizar | `L = 100`, `T = 122`, expoente 1 | 2 | previsto ≥ 105 |
| Subproduto | Minimizar | `T = 14`, `U = 30`, expoente 1 | 1 | — |

Domínio: região experimental (padrão). Busca: 40 inícios, semente 20261101.

## Como reproduzir

1. Abra `projeto.enzitag` e vá a **Resultados** do primeiro experimento; ou refaça: *Planejar experimento* → DCCR → preencha as duas respostas com `ensaios.csv` → *Calcular superfície*.
2. Em **Otimização por desejabilidade**, inclua *Subproduto*, escolha *Minimizar* e informe os limites da tabela; *Buscar condições ótimas*.
3. Em **Ensaios de confirmação**, mantenha o candidato 1, escolha 2 repetições e *Propor ensaios de confirmação*: surge o experimento de confirmação, vinculado, com as previsões gravadas. Preencha os valores observados (`confirmacao.csv`) e confira a tabela de conferência.

## Resultado esperado

Conferido contra uma **busca exaustiva independente** (NumPy, malha de 101³ pontos dentro da região e da alavancagem permitida; fórmulas de Derringer e Suich implementadas à parte) e por um teste de ponta a ponta:

| Item | Busca do aplicativo | Busca exaustiva (NumPy) |
|---|---|---|
| Desejabilidade global `D` | 0,9255 | 0,9254 (resolução da malha) |
| Glicose / peptona / NaCl (reais, g/L) | 31,45 / 6,20 / 1,27 | 31,35 / 6,21 / 1,26 |
| Atividade prevista | 121,47 U/mL (IP 95 %: 119,0–123,9), `d = 0,976` | 121,41 |
| Subproduto previsto | 16,68 mg/L (IP 95 %: 15,4–18,0), `d = 0,833` | 16,61 |

Os 40 inícios chegaram à mesma solução. **Compromisso:** cada resposta sozinha alcançaria `d = 1`; juntas, a atividade cede 0,024 e o subproduto 0,17 — o subproduto "paga" mais por causa do limite obrigatório da atividade e do maior peso dela. Os ensaios de confirmação (119,4 e 121,8 U/mL; 16,6 e 16,1 mg/L) ficaram **dentro** dos intervalos de predição gravados. Isso é compatível com o modelo, mas, com duas repetições, não prova que o ponto seja o ótimo.
