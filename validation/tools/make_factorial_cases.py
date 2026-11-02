"""Gera os casos de validação de `factorial_anova` (ET11): ANOVA multifatorial com blocos,
médias marginais e contrastes.

Referências independentes: statsmodels (`ols` com `C(·, Sum)` e `anova_lm` tipos I, II e III);
médias marginais por definição (média das predições do modelo sobre os demais fatores, pesos
iguais) com a covariância dos coeficientes do statsmodels; contrastes por `t_test`; Tukey–Kramer
por `scipy.stats.studentized_range`.
"""
import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from patsy import build_design_matrices
from scipy import stats
from statsmodels.stats.multitest import multipletests

ROOT = Path(__file__).resolve().parents[1] / "cases" / "factorial_anova"


def make_unbalanced():
    rng = np.random.default_rng(7001)
    rows = []
    a_eff = {"a1": 0.0, "a2": 2.0}
    b_eff = {"b1": 0.0, "b2": 1.5, "b3": 3.5}
    blocks = {"B1": 0.0, "B2": 1.0, "B3": -0.8, "B4": 0.4}
    for blk, be in blocks.items():
        for a, ae in a_eff.items():
            for b, bve in b_eff.items():
                inter = 1.2 if (a == "a2" and b == "b3") else 0.0
                rows.append({"A": a, "B": b, "Bloco": blk, "y": round(10 + ae + bve + be + inter + rng.normal(0, 0.6), 3)})
    drop = {5, 11, 17, 20}  # tira quatro observações: delineamento desbalanceado, sem células vazias
    return pd.DataFrame([r for i, r in enumerate(rows) if i not in drop])


def make_balanced():
    rng = np.random.default_rng(7002)
    rows = []
    for a, ae in {"x": 0.0, "y": 3.0}.items():
        for b, be in {"p": 0.0, "q": -1.0, "r": 2.0}.items():
            for _ in range(4):
                rows.append({"A": a, "B": b, "Bloco": "u", "y": round(8 + ae + be + rng.normal(0, 0.7), 3)})
    return pd.DataFrame(rows)


def anova_table(df, formula, typ):
    model = smf.ols(formula, data=df).fit()
    table = sm.stats.anova_lm(model, typ=typ)
    return model, table


def emm(model, df, factors, levels):
    """Médias marginais: média das predições sobre as combinações dos demais fatores."""
    info = model.model.data.model_spec
    all_factors = [f for f in ("A", "B", "Bloco") if f in levels]
    others = [f for f in all_factors if f not in factors]
    rows, cov = [], model.cov_params().values
    for combo in itertools.product(*[levels[f] for f in factors]):
        acc = None
        for oc in itertools.product(*[levels[f] for f in others]):
            cell = dict(zip(factors, combo))
            cell.update(dict(zip(others, oc)))
            frame = pd.DataFrame([{**cell, "y": 0.0}])
            x = np.asarray(build_design_matrices([info], frame)[0])[0]
            acc = x if acc is None else acc + x
        rows.append(acc / max(1, int(np.prod([len(levels[f]) for f in others]))))
    return np.array(rows), model.params.values, cov


def run_case(case_id, df, formula, term_names, typ, with_block, marginals, contrasts, alpha=0.05):
    model, table = anova_table(df, formula, typ)
    levels = {f: list(dict.fromkeys(df[f])) for f in ("A", "B", "Bloco")}
    df_res = int(model.df_resid)
    mse = float(model.mse_resid)
    terms = []
    for name in term_names:
        key = [k for k in table.index if k.replace("C(", "").replace(", Sum)", "").replace(":", " × ") == name or k == name]
        row = table.loc[key[0]]
        terms.append({"term": name, "df": int(row["df"]), "ss": float(row["sum_sq"]), "f": float(row["F"]), "p": float(row["PR(>F)"])})
    out = {"id": case_id, "ss_type": {1: "typeI", 2: "typeII", 3: "typeIII"}[typ], "with_block": with_block, "alpha": alpha,
           "rows": df.to_dict(orient="records"), "levels": levels,
           "expected": {"terms": terms, "residual": {"df": df_res, "ss": float(model.ssr), "ms": mse},
                        "r2": float(model.rsquared), "adj_r2": float(model.rsquared_adj), "n": int(model.nobs)}}
    out["marginals"] = []
    for factors, adjustment in marginals:
        L, beta, cov = emm(model, df, factors, levels)
        est = L @ beta
        se = np.sqrt(np.einsum("ij,jk,ik->i", L, cov, L))
        k = len(est)
        pairs = []
        raw = []
        for a, b in itertools.combinations(range(k), 2):
            d = L[a] - L[b]
            diff = float(d @ beta)
            sed = float(np.sqrt(d @ cov @ d))
            t = diff / sed
            p = float(2 * stats.t.sf(abs(t), df_res))
            raw.append(p)
            pairs.append({"a": a, "b": b, "difference": diff, "std_error": sed, "t": t, "p_raw": p})
        if adjustment == "tukey":
            adj = [float(stats.studentized_range.sf(abs(p["t"]) * np.sqrt(2), k, df_res)) for p in pairs]
        elif adjustment == "none":
            adj = raw
        else:
            adj = list(multipletests(raw, method="bonferroni" if adjustment == "bonferroni" else "holm")[1])
        for p, a in zip(pairs, adj):
            p["p_adjusted"] = float(a)
        out["marginals"].append({"factors": factors, "adjustment": adjustment,
                                 "cells": [{"estimate": float(e), "std_error": float(s)} for e, s in zip(est, se)], "pairs": pairs})
    out["contrasts"] = []
    raw_c = []
    for name, factors, coefficients in contrasts:
        L, beta, cov = emm(model, df, factors, levels)
        c = np.array(coefficients) @ L
        est = float(c @ beta)
        se = float(np.sqrt(c @ cov @ c))
        t = est / se
        p = float(2 * stats.t.sf(abs(t), df_res))
        raw_c.append(p)
        half = float(stats.t.isf(alpha / 2, df_res) * se)
        out["contrasts"].append({"name": name, "factors": factors, "coefficients": coefficients, "estimate": est, "std_error": se, "t": t,
                                 "p_raw": p, "ci": [est - half, est + half]})
    for c, a in zip(out["contrasts"], multipletests(raw_c, method="bonferroni")[1] if raw_c else []):
        c["p_adjusted"] = float(a)
    return out


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    un, bal = make_unbalanced(), make_balanced()
    f_block = "y ~ C(Bloco, Sum) + C(A, Sum) * C(B, Sum)"
    names_block = ["Bloco", "A", "B", "A × B"]
    marg = [(["A"], "tukey"), (["B"], "tukey"), (["A", "B"], "holm"), (["B"], "bonferroni")]
    contr = [("B1 vs média de B2,B3", ["B"], [1.0, -0.5, -0.5]), ("A: a1 − a2", ["A"], [1.0, -1.0])]
    cases = []
    for typ in (1, 2, 3):
        cases.append(run_case(f"desbalanceado-bloco-tipo{typ}", un, f_block, names_block, typ, True, marg if typ == 3 else marg[:2], contr if typ == 3 else []))
    f_plain = "y ~ C(A, Sum) * C(B, Sum)"
    cases.append(run_case("balanceado-tipo3", bal, f_plain, ["A", "B", "A × B"], 3, False, [(["A"], "none"), (["B"], "tukey")], [("p vs q", ["B"], [1.0, -1.0, 0.0])]))
    # em delineamento balanceado, os três tipos coincidem
    for typ in (1, 2):
        ref = run_case(f"balanceado-tipo{typ}", bal, f_plain, ["A", "B", "A × B"], typ, False, [], [])
        for a, b in zip(ref["expected"]["terms"], cases[-1]["expected"]["terms"]):
            assert abs(a["ss"] - b["ss"]) < 1e-9
        cases.append(ref)
    (ROOT / "factorial.json").write_text(json.dumps({"id": "factorial_anova", "cases": cases}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("casos:", [c["id"] for c in cases])


if __name__ == "__main__":
    main()
