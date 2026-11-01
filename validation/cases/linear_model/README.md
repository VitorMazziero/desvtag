# linear_model — casos de validação

**Estado:** aprovado · **Atualizado em:** 2026-11-01

Dois grupos, executados por `app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly):

| Grupo | Casos | Referência independente | Exigência |
|---|---|---|---|
| NIST StRD de regressão linear | `001`–`011` (Norris, Pontius, NoInt1, NoInt2, Longley, Filip, Wampler1–5) | Mínimos quadrados exatos em racionais sobre os binários de 64 bits lidos de `input.csv`; valores certificados do NIST em `expected.json` | Dígitos corretos (LRE) mínimos por grandeza em `tolerances.minLre` |
| Construtor de modelos | `101`–`106` (fatorial com interação nos dois contrastes, ausentes e desbalanceado, quadrático com categórico, aliasing, saturado) | NumPy `lstsq` e SciPy `stats` | Erro relativo ≤ 1e-9 + 1e-12 × escala |

Regeneração (ambiente de `validation/tools/requirements.txt`):

```bash
python validation/tools/make_regression_cases.py <pasta com os .dat do NIST>
python validation/tools/make_model_cases.py
```

Os arquivos `.dat` do NIST (domínio público) estão em <https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/>. Valores medidos e discussão (Filip, Wampler5): [especificação](../../../docs/metodos/regressao-linear.md#10-validação).
