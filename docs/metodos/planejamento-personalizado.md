# Planejamento personalizado ou matriz importada

**Estado:** implementado (análise); validado numericamente com matriz irregular; Windows 11 pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `response_surface` (a análise é a mesma da [superfície de resposta](superficie-resposta.md)) |
| Módulos | C16 `surface/model`, U03/U04/U05 (cadastro, grade, importação), U07 |
| Etapa | [ET07](../planos-execucao/ativos/et07-superficies-resposta.md) |
| Casos de validação | [`response_surface/004`](../../validation/cases/response_surface/004-personalizado-3-fatores/README.md) |
| Decisão | [DT-0012](../decisoes-tecnicas/dt-0012-superficie-de-resposta.md) |

## 1. Pergunta

Os dados de uma matriz própria (digitada, colada ou importada de CSV/XLSX), com pontos irregulares ou repetições, permitem ajustar o modelo escolhido, e o que dessa matriz não é estimável?

## 2. Pressupostos

Os fatores são quantitativos; a matriz não precisa seguir um planejamento clássico. O aplicativo não presume ortogonalidade nem simetria.

## 3. Entradas e opções

Caminho **Analisar dados existentes** → *Ajustar superfície de resposta (modelo de segunda ordem)*. Os níveis que definem a codificação são o **menor e o maior valor ensaiado** de cada fator (apenas uma escala; nenhuma estatística), o que muda os coeficientes codificados mas não as predições nem a equação em unidades reais. Os termos do modelo são escolhidos pelo usuário (completo por padrão).

## 4. Fórmulas

As da [superfície de resposta](superficie-resposta.md). Verificação de **posto e estimabilidade**: a QR com pivoteamento declara as colunas dependentes; os termos correspondentes ficam `não estimáveis` e a análise informa quantos (`surface.not_estimable_terms`), sem escolher quais remover.

## 5. Algoritmo numérico

Idêntico ao da superfície de resposta. A alavancagem de cada ensaio e a região experimental (intervalos observados) permitem identificar pontos influentes e extrapolação.

## 6. Saídas

Como na superfície de resposta.

## 7. Casos sem resultado válido

Fatores não quantitativos; menos de dois fatores; dados ausentes (as linhas incompletas são excluídas e o aviso informa quantas); posto insuficiente (termos não estimáveis); sem erro puro (falta de ajuste indisponível, com explicação).

## 8. Exemplo

[`ensaios.csv`](../../examples/03-superficie-meio-cultivo/ensaios.csv) do exemplo 03 pode ser importado como matriz personalizada; o caso de validação 004 usa 16 pontos aleatórios mais 2 repetições.

## 9. Interpretação apresentada ao usuário

A tela mostra a região experimental e a nota de extrapolação; `surface.hierarchy_gaps` e `surface.not_estimable` explicam termos sem hierarquia ou não estimáveis.

## 10. Validação

Caso 004 (matriz irregular, 18 ensaios, 8 graus de liberdade do erro, 2 de erro puro) contra NumPy/SciPy, mais os testes de E2E do caminho de dados existentes. Windows 11: pendente.

## 11. Referências

- Montgomery, D. C.; Peck, E. A.; Vining, G. G. (2012). *Introduction to Linear Regression Analysis*, 5ª ed. Wiley.
