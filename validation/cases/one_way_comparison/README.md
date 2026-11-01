# one_way_comparison — casos de validação

**Estado:** aprovado · **Atualizado em:** 2026-11-01

Executados por `app/crates/optima-core/tests/comparison_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).

| Grupo | Casos | Referência independente | Exigência |
|---|---|---|---|
| NIST StRD de ANOVA | `001`–`011` (SiRstv, SmLs01–09, AtmWtAg) | Somas de quadrados exatas em racionais sobre os binários de 64 bits; valores certificados do NIST em `expected.json` | LRE ≥ 13 em SQ entre, SQ dentro, F, R² e σ (medido: 15,0) |
| Aplicados | `101` quatro condições enzimáticas (exemplo 01), `102` desbalanceado com sobreposição (Tukey–Kramer), `103` sete grupos com ponto distante, `104` ausentes e grupo unitário | SciPy (`f_oneway`, `tukey_hsd`, `levene`, `norm.ppf`), NumPy (percentis) e letras por cliques maximais | Relativo 1e-9 + 1e-12 × escala; p ajustado 1e-10 (absoluto); letras idênticas |

Regeneração (ambiente de `validation/tools/requirements.txt`):

```bash
python validation/tools/make_comparison_cases.py <pasta com os .dat de ANOVA do NIST>
```

Os `.dat` (domínio público) estão em <https://www.itl.nist.gov/div898/strd/anova/>. As exigências por conjunto vêm de `validation/tools/anova_min_lre.json` (piso do medido menos 1 dígito, no máximo 13). Discussão (valores certificados × binários de 64 bits): [ANOVA de um fator](../../../docs/metodos/anova-um-fator.md#10-validação).
