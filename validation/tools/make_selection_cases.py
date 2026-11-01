"""Gera os casos de validação de `surface_model_selection` (ET11).

Referências independentes: statsmodels (`OLS`, `aic`, `bic`, `rsquared_adj`, `OLSInfluence.resid_press`),
falta de ajuste por definição (erro puro dos pontos centrais) e a eliminação regressiva com
hierarquia escrita em Python (principal só sai se nenhum quadrático/interação do fator permanecer).
"""
import itertools
import json
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from scipy import stats
from statsmodels.stats.outliers_influence import OLSInfluence

ROOT = Path(__file__).resolve().parents[1] / "cases" / "surface_model_selection"


def ccd_face_centered(k, centers, rng, truth):
    pts = [list(p) for p in itertools.product([-1.0, 1.0], repeat=k)]
    for i in range(k):
        for s in (-1.0, 1.0):
            p = [0.0] * k
            p[i] = s
            pts.append(p)
    pts += [[0.0] * k for _ in range(centers)]
    rows = []
    for p in pts:
        y = truth(p) + rng.normal(0, 0.5)
        rows.append((p, round(float(y), 3)))
    return rows


def terms_of(k):
    out = [("main", i) for i in range(k)] + [("square", i) for i in range(k)]
    out += [("cross", i, j) for i in range(k) for j in range(i + 1, k)]
    return out


def column(term, x):
    if term[0] == "main":
        return x[:, term[1]]
    if term[0] == "square":
        return x[:, term[1]] ** 2
    return x[:, term[1]] * x[:, term[2]]


def removable(terms, idx):
    t = terms[idx]
    if t[0] != "main":
        return True
    i = t[1]
    return not any((u[0] == "square" and u[1] == i) or (u[0] == "cross" and i in u[1:]) for u in terms)


def fit(terms, x, y, centers_mask):
    X = np.column_stack([np.ones(len(y))] + [column(t, x) for t in terms])
    model = sm.OLS(y, X).fit()
    n, k = len(y), X.shape[1]
    rss = float(model.ssr)
    press = float((OLSInfluence(model).resid_press ** 2).sum())
    sst = float(((y - y.mean()) ** 2).sum())
    aic, bic = float(model.aic), float(model.bic)
    aicc = aic + 2 * k * (k + 1) / (n - k - 1) if n - k - 1 > 0 else None
    ypc = y[centers_mask]
    ss_pe = float(((ypc - ypc.mean()) ** 2).sum())
    df_pe = int(centers_mask.sum() - 1)
    df_res = int(model.df_resid)
    df_lof = df_res - df_pe
    lof_p = None
    if df_pe > 0 and df_lof > 0 and ss_pe > 0:
        f = ((rss - ss_pe) / df_lof) / (ss_pe / df_pe)
        lof_p = float(stats.f.sf(f, df_lof, df_pe))
    return model, {
        "parameters": k, "df_error": df_res, "r2": float(model.rsquared), "adj_r2": float(model.rsquared_adj),
        "pred_r2": 1 - press / sst, "press": press, "rmse": float(np.sqrt(rss / df_res)), "model_p": float(model.f_pvalue),
        "lof_p": lof_p, "aic": aic, "aicc": aicc, "bic": bic,
    }


def run(k, centers, seed, truth, alpha):
    rng = np.random.default_rng(seed)
    rows = ccd_face_centered(k, centers, rng, truth)
    x = np.array([r[0] for r in rows])
    y = np.array([r[1] for r in rows])
    centers_mask = np.all(x == 0.0, axis=1)
    low, high = [10.0 * (i + 1) for i in range(k)], [10.0 * (i + 1) + 20.0 for i in range(k)]
    terms = terms_of(k)
    steps = []
    model, m = fit(terms, x, y, centers_mask)
    full = m
    steps.append({"removed": None, "metrics": m, "terms": [list(t) for t in terms]})
    stopped = "no_candidate"
    while True:
        pvals = model.pvalues[1:]
        best = None
        blocked = False
        for i, p in enumerate(pvals):
            if p <= alpha:
                continue
            if not removable(terms, i):
                blocked = True
                continue
            if best is None or p > best[1]:
                best = (i, float(p))
        if best is None:
            stopped = "hierarchy" if blocked else "no_candidate"
            break
        if model.df_resid < 2:
            stopped = "no_degrees_of_freedom"
            break
        removed = terms[best[0]]
        terms = terms[: best[0]] + terms[best[0] + 1 :]
        if not terms:
            break
        model, m = fit(terms, x, y, centers_mask)
        steps.append({"removed": list(removed), "removed_p": best[1], "metrics": m, "terms": [list(t) for t in terms]})
    real = [[low[i] + (x[r, i] + 1.0) / 2.0 * (high[i] - low[i]) for i in range(k)] for r in range(len(y))]
    return {"k": k, "alpha": alpha, "low": low, "high": high, "real": real, "y": [float(v) for v in y], "full": full, "steps": steps, "stopped": stopped}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    cases = [
        {"id": "ccf-3-fatores-quadratico-so-em-x2", **run(3, 4, 11, lambda p: 5 + 2.0 * p[0] + 1.5 * p[2] - 2.5 * p[1] ** 2, 0.05)},
        {"id": "ccf-4-fatores-modelo-quase-linear", **run(4, 6, 12, lambda p: 3 + 1.8 * p[0] - 1.2 * p[3] + 0.9 * p[1] * p[2], 0.05)},
        {"id": "ccf-2-fatores-modelo-completo-significativo", **run(2, 5, 13, lambda p: 4 + 3 * p[0] + 2 * p[1] - 3 * p[0] ** 2 - 2 * p[1] ** 2 + 2 * p[0] * p[1], 0.05)},
    ]
    (ROOT / "selection.json").write_text(json.dumps({"id": "surface_model_selection", "cases": cases}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print({c["id"]: len(c["steps"]) for c in cases})


if __name__ == "__main__":
    main()
