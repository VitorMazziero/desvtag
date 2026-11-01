# Plackett–Burman (PB)

**Estado:** implementado; validado numericamente (nativo e WebAssembly); Windows pendente · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | `two_level_design` (tipo `plackettBurman`) e `two_level_design_analysis` |
| Módulos | C11 `designs/plackett_burman` |
| Etapa | [ET06](../planos-execucao/concluidos/et06-fatoriais-plackett-burman.md) |
| Casos de validação | [`two_level_design/plackett-burman.json`](../../validation/cases/two_level_design/plackett-burman.json), [`two_level_design_analysis/003`](../../validation/cases/two_level_design_analysis/003-plackett-burman-12-fatores-oito/README.md) e [`004`](../../validation/cases/two_level_design_analysis/004-saturado-lenth/README.md) |
| Decisão | [DT-0011](../decisoes-tecnicas/dt-0011-planejamentos-dois-niveis.md) |

## 1. Pergunta

Quais, entre muitos fatores, merecem estudo posterior, usando o menor número possível de ensaios (`N` ensaios para até `N − 1` fatores)?

## 2. Pressupostos

Efeitos principais dominam; interações são pequenas (resolução III). Efeitos principais ficam **parcialmente** confundidos com interações de dois fatores (correlação máxima informada no resultado: ±1/3 para `N = 12`, por exemplo), diferente dos fracionários regulares, em que o confundimento é total.

## 3. Entradas e opções

Fatores (de 2 a `N − 1`) e `runs` ∈ {8, 12, 16, 20, 24, 32, 44, 48}. Os tamanhos 28, 36, 40 e maiores **não** são suportados na v0.1 (recusa `design.unsupported_runs`). Pontos centrais e réplicas como nos demais planejamentos. A recomendação oferece os **dois menores** tamanhos que comportam os fatores; o maior dá mais graus de liberdade ao erro.

## 4. Fórmulas

Matriz de Hadamard `H` (`N × N`, entradas ±1, `H·Hᵀ = N·I`) normalizada com a primeira coluna só de `+1`; as `N − 1` colunas restantes são contrastes ortogonais. Fatores usam as primeiras colunas; as restantes são **colunas fictícias** (`dummyColumns = N − 1 − k`), que não são fatores, mas estimam apenas ruído (e interações) e fornecem graus de liberdade ao erro quando incluídas no modelo.

## 5. Algoritmo numérico

- **Paley** para `N = q + 1`, `q` primo e `q ≡ 3 (mod 4)`: `N` = 8 (q=7), 12 (q=11), 20 (q=19), 24 (q=23), 44 (q=43) e 48 (q=47). Define `H = I + S` com `S = [[0, 1ᵀ], [−1, Q]]` e `Q[i][j] = χ(i − j)` (símbolo de Legendre por exponenciação modular).
- **Sylvester** para `N = 2ᵐ` (16 e 32), por produto de Kronecker.

Os planejamentos originais de 12, 20 e 24 ensaios (Plackett e Burman, 1946) são cíclicos e coincidem com a construção de Paley a menos de permutação e sinais de linhas e colunas. Toda matriz é **verificada** (`H·Hᵀ = N·I`) antes do uso. O nível alto/baixo atribuído ao fator segue a coluna; pontos centrais são acrescentados ao final.

## 6. Saídas

Como nos demais planejamentos, mais `dummyColumns`, `resolution = 3` e `maxMainVsTwoFactorCorrelation`.

## 7. Casos sem resultado válido

Tamanho não suportado; mais fatores que `N − 1`. Um PB com `k = N − 1` fatores e sem centrais nem réplicas é **saturado**: sem erro estimável, a análise recorre a Lenth e rotula o resultado como indicativo (`design.saturated`, `design.lenth_only`). Com colunas fictícias ou centrais, o erro é estimável e os testes ficam disponíveis.

## 8. Exemplo

[Exemplo 02](../../examples/02-triagem-meio-cultivo/README.md): seis componentes de meio de cultivo, PB de 12 ensaios + 4 pontos centrais; glicose (efeito 4,2833, p = 0,0073) e curvatura (5,5; p = 0,0018) detectadas; NaCl com p = 0,056.

## 9. Interpretação apresentada ao usuário

Fato `design.screening_pb`: resultado de triagem, adequado para escolher fatores a estudar em seguida, não para otimizar nem concluir sobre interações.

## 10. Validação

Os 8 tamanhos geram matrizes ortogonais (`H·Hᵀ = N·I` conferido com NumPy). Análises: caso 003 (PB 12, oito fatores, curvatura, `gl` do erro = 6) e caso 004 (saturado com Lenth) contra NumPy/SciPy. Exemplo 02 reproduzido com NumPy fora do código. Windows 11: pendente.

## 11. Referências

- Plackett, R. L.; Burman, J. P. (1946). The design of optimum multifactorial experiments. *Biometrika* 33(4), 305–325.
- Paley, R. E. A. C. (1933). On orthogonal matrices. *Journal of Mathematics and Physics* 12, 311–320.
- Hedayat, A. S.; Sloane, N. J. A.; Stufken, J. (1999). *Orthogonal Arrays*. Springer.
