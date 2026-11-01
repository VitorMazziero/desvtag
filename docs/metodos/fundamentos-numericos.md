# Fundamentos numéricos: matrizes, QR, SVD, soma compensada e busca de raízes

**Estado:** implementado; validado numericamente por meio dos métodos que os consomem (regressão linear, distribuições) · **Atualizado em:** 2026-11-01

| Campo | Valor |
|---|---|
| ID no registro do motor | — (rotinas internas) |
| Módulos | C03 `numeric/{matrix,qr,svd,summation,root_finding,special_functions}` |
| Etapa | ET02 (soma), [ET04](../planos-execucao/concluidos/et04-fundamentos-numericos-modelos.md) (demais) |
| Decisão | [DT-0009](../decisoes-tecnicas/dt-0009-fundamentos-numericos-modelos-lineares.md) |
| Casos de validação | [`validation/cases/linear_model/`](../../validation/cases/linear_model/README.md), [`distributions/`](../../validation/cases/distributions/001-normal/README.md) |

## 1. Pergunta

Quais rotinas numéricas estáveis sustentam todos os métodos, e que garantias dão?

## 2. Pressupostos

Entradas finitas em `f64`. Erros de programação (índice fora da matriz) provocam `panic` apenas nos acessores de índice; as rotinas públicas validam dimensões.

## 3. Entradas e opções

- Tolerância de posto: `max(m, n)·ε` relativa ao primeiro pivô (QR).
- Limite de varreduras do Jacobi: 60; limite de iterações de Brent: 500.

## 4. Fórmulas e algoritmos

- **Soma compensada de Neumaier** (`summation.rs`): erro típico igual a um único arredondamento do valor exato.
- **QR de Householder com pivoteamento de colunas** (`qr.rs`): `A·P = Q·R`. Colunas normalizadas antes da fatoração; pivô = coluna restante de maior norma; posto = passos com pivô > `tol·pivô₁`. `Qᵀy` e `Qz` aplicados pelas reflexões (sem formar `Q`). `R₁₁⁻¹` por substituição regressiva; `(RᵀR)⁻¹ = R⁻¹R⁻ᵀ`. **Não há inversão de `AᵀA`.**
- **Valores singulares por Jacobi unilateral (Hestenes)** (`svd.rs`): rotações até a ortogonalidade relativa `|γ| ≤ 1e-15·√(αβ)`; precisão relativa alta nos menores valores singulares. Usado apenas para o **número de condição** `σ_max/σ_min`.
- **Brent** (`root_finding.rs`): bisseção, secante e interpolação quadrática inversa com intervalo que contém a raiz.
- **Funções especiais:** [funcoes-especiais](funcoes-especiais.md).
- **Matriz** (`matrix.rs`): densa, ordem de linha; produtos com soma compensada.

## 5. Saídas

`QrDecomposition { r, perm, column_norms, rank, tol }` e operações; `singular_values`, `condition_number`.

## 6. Casos sem resultado válido

Matriz irregular → `None`; coluna nula → posto não conta; `σ_min = 0` → número de condição infinito (o ajuste o traduz em estado explícito); sem raiz no intervalo ou `NaN` → `RootError`.

## 7. Exemplo

Colunas `(1,1,1)` e `(1,2,4)`: `(XᵀX)⁻¹` obtido de `R` coincide com a forma fechada (teste `xtx_inverse_matches_the_closed_form_for_a_small_case`). Valores singulares de uma matriz diagonal `diag(3,4)`: `4, 3`; de uma matriz de posto 1: `σ₂ = 0` (valores independentes obtidos com mpmath/NumPy nos testes).

## 8. Interpretação ao usuário

Não aplicável.

## 9. Validação

- Testes unitários: ortogonalidade de `Q`, reprodução de `A`, solução exata de mínimos quadrados, dependência linear detectada, **posto independente da escala das colunas**, coluna nula, SVD de matrizes diagonais, de posto 1 e largas.
- Validação indireta de ponta a ponta: 11 conjuntos NIST de regressão (Filip, cond ≈ 5,2e9, atinge 7 dígitos) e 6 casos contra NumPy/SciPy ([regressão linear](regressao-linear.md#10-validação)).
- Soma compensada: nove casos NIST univariados ([descritiva](estatistica-descritiva.md)).

## 10. Referências

- Golub, G. H.; Van Loan, C. F. *Matrix Computations*, 4ª ed., caps. 5 (QR com pivoteamento) e 8 (SVD).
- Hestenes, M. R. (1958). Inversion of matrices by biorthogonalization. *J. SIAM* 6, 51–90.
- Higham, N. J. *Accuracy and Stability of Numerical Algorithms*, caps. 4 (somas) e 20 (mínimos quadrados).
- Neumaier (1974); Brent (1973).
