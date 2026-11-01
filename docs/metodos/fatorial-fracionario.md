# Fatorial fracionário regular 2^(k−p)

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `two_level_design` (tipo `fractional`) e `two_level_design_analysis` |
| Módulos | C11 `designs/{fractional,alias}` |
| Etapa | [ET06](../planos-execucao/concluidos/et06-fatoriais-plackett-burman.md) |
| Casos de validação | [`two_level_design/fractional.json`](../../validation/cases/two_level_design/fractional.json), [`two_level_design_analysis/002`](../../validation/cases/two_level_design_analysis/002-fracionario-resolucao-iv/README.md) |
| Decisão | [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) |

## 1. Pergunta

Como estudar `k` fatores com apenas `2^(k−p)` ensaios, sabendo exatamente quais efeitos ficam confundidos entre si?

## 2. Pressupostos

Fracionário **regular** (geradores independentes). Interações de ordem alta são frequentemente desprezíveis, o que justifica atribuir o efeito estimado ao termo de menor ordem; a estrutura de confundimento é mostrada para que o usuário avalie essa hipótese.

## 3. Entradas e opções

`k` fatores (2 a 26 letras `A…Z`; ≥ 2 fatores básicos) e `p` geradores, um por fator adicional, na forma `D=ABC` ou `D=-ABC` (também aceitos minúsculas, espaços e o sinal “−”). Os `k − p` primeiros fatores formam o fatorial completo básico; cada gerador define o fator seguinte como produto de fatores anteriores. Os fracionários recomendados vêm de um catálogo (seção 5); geradores digitados são aceitos e verificados.

## 4. Fórmulas

**Relação definidora.** Cada gerador `D=ABC` contribui com a palavra `I = ABCD` (sinal do gerador). As demais palavras são os produtos de todos os subconjuntos de palavras (`2ᵖ − 1` palavras), multiplicados no corpo `GF(2)` (máscaras de bits; o sinal é o produto dos sinais).

**Resolução.** Comprimento da menor palavra da relação definidora (III: principais confundidos com interações de dois fatores; IV: principais livres, interações de dois fatores confundidas entre si; V: principais e interações de dois fatores livres entre si).

**Confundimento.** O efeito `E` é confundido com `E · palavra` para cada palavra; o sinal resulta do produto dos sinais. A tabela é gerada para efeitos principais e interações de dois fatores.

## 5. Algoritmo numérico

Álgebra em `GF(2)` sobre inteiros (sem ponto flutuante). Catálogo de referência (aberração mínima, conforme as tabelas de Box, Hunter e Hunter e de Montgomery; a resolução é recalculada e conferida em teste) para `k = 3…8`:

| k | p | Ensaios | Resolução | Geradores |
|---|---|---|---|---|
| 3 | 1 | 4 | III | C=AB |
| 4 | 1 | 8 | IV | D=ABC |
| 5 | 1 | 16 | V | E=ABCD |
| 5 | 2 | 8 | III | D=AB, E=AC |
| 6 | 1 | 32 | VI | F=ABCDE |
| 6 | 2 | 16 | IV | E=ABC, F=BCD |
| 6 | 3 | 8 | III | D=AB, E=AC, F=BC |
| 7 | 1 | 64 | VII | G=ABCDEF |
| 7 | 2 | 32 | IV | F=ABCD, G=ABDE |
| 7 | 3 | 16 | IV | E=ABC, F=BCD, G=ACD |
| 7 | 4 | 8 | III | D=AB, E=AC, F=BC, G=ABC |
| 8 | 2 | 64 | V | G=ABCD, H=ABEF |
| 8 | 3 | 32 | IV | F=ABC, G=ABD, H=BCDE |
| 8 | 4 | 16 | IV | E=BCD, F=ACD, G=ABC, H=ABD |

A resolução declarada de cada entrada é **recalculada** pelo código e conferida em teste (não é apenas copiada).

## 6. Saídas

Matriz em ordem padrão ou aleatória, `definingRelation`, `resolution`, tabela `aliases` (efeito → confundidos com sinal) e, na análise, `aliasedWith` por termo.

## 7. Casos sem resultado válido

Gerador inválido (`design.generator_count`, `generator_syntax`, `generator_target`, `generator_letters`), `p` ≥ `k` ou menos de 2 fatores básicos. Na análise, dois termos aliasados no mesmo modelo: apenas o primeiro é estimável e o outro aparece como `não estimável` (`design.not_estimable_terms`), com o confundimento visível.

## 8. Exemplo

`2^(4−1)` com `D=ABC`: 8 ensaios, `I = ABCD`, resolução IV; `A` confundido com `BCD`, `AB` com `CD`, `AC` com `BD`, `AD` com `BC`. Com `D=-ABC`, `I = −ABCD` e os sinais de confundimento invertem.

## 9. Interpretação apresentada ao usuário

Tabela de confundimento junto à matriz; fato `design.aliased_active` quando um efeito ativo é confundido com outro termo candidato; aviso de que a atribuição ao termo de menor ordem é uma hipótese.

## 10. Validação

Resolução e confundimento comparados com a **enumeração por força bruta** em Python (todas as palavras da relação), para todas as entradas do catálogo e para geradores digitados, inclusive com sinal negativo; matrizes comparadas com a enumeração independente; ortogonalidade das colunas. Análise: caso 002 (resolução IV) contra NumPy/SciPy. Windows 11: pendente.

## 11. Referências

- Box, G. E. P.; Hunter, J. S.; Hunter, W. G. (2005). *Statistics for Experimenters*, 2ª ed., cap. 6. Wiley.
- Montgomery, D. C. (2019). *Design and Analysis of Experiments*, 10ª ed., cap. 8. Wiley.
- Fries, A.; Hunter, W. G. (1980). Minimum aberration 2^(k−p) designs. *Technometrics* 22, 601–608.
