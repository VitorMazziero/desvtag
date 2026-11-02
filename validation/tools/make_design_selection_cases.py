"""Gera os casos de validação de `two_level_model_selection` (ET14-T03).

Referências independentes: statsmodels (`OLS`, `aic`, `bic`, `rsquared_adj`, `f_pvalue`,
`OLSInfluence.resid_press`), falta de ajuste por definição (erro puro das linhas idênticas) e a
eliminação regressiva com hierarquia escrita em Python (efeito principal só sai se nenhuma interação
com o fator permanecer). O modelo completo tem os efeitos principais e todas as interações de dois
fatores; a curvatura (pontos centrais), quando incluída, é uma coluna fixa 0/1.
"""
import itertools
import json
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from scipy import stats
from statsmodels.stats.outliers_influence import OLSInfluence

ROOT = Path(__file__).resolve().parents[1] / "cases" / "two_level_model_selection"


def design(k, replicates, centers, rng, truth, sd):
    pts = [list(p) for p in itertools.product([-1.0, 1.0], repeat=k)]
    # Ordem padrão com o primeiro fator variando mais rápido, como nas matrizes do aplicativo.
    pts = [[p[j] for j in range(k)] for p in sorted(pts, key=lambda p: tuple(reversed(p)))]
    rows = pts * replicates + [[0.0] * k for _ in range(centers)]
    y = [round(float(truth(p) + rng.normal(0, sd)), 3) for p in rows]
    return np.array(rows), np.array(y)


def terms_of(k):
    return [("main", i) for i in range(k)] + [("cross", i, j) for i in range(k) for j in range(i + 1, k)]


def column(term, x):
    return x[:, term[1]] if term[0] == "main" else x[:, term[1]] * x[:, term[2]]


def removable(terms, idx):
    t = terms[idx]
    if t[0] != "main":
        return True
    return not any(u[0] == "cross" and t[1] in u[1:] for u in terms)


def fit(terms, x, y, curvature):
    cols = [np.ones(len(y))] + [column(t, x) for t in terms]
    if curvature is not None:
        cols.append(curvature)
    X = np.column_stack(cols)
    model = sm.OLS(y, X).fit()
    n, k = len(y), X.shape[1]
    rss = float(model.ssr)
    press = float((OLSInfluence(model).resid_press ** 2).sum())
    sst = float(((y - y.mean()) ** 2).sum())
    aic, bic = float(model.aic), float(model.bic)
    aicc = aic + 2 * k * (k + 1) / (n - k - 1) if n - k - 1 > 0 else None
    # Erro puro: linhas com os mesmos níveis codificados.
    groups = {}
    for row, value in zip(x, y):
        groups.setdefault(tuple(np.round(row, 9)), []).append(value)
    ss_pe = sum(float(((np.array(v) - np.mean(v)) ** 2).sum()) for v in groups.values())
    df_pe = len(y) - len(groups)
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


def run(k, replicates, centers, seed, truth, sd, alpha, curvature_on):
    rng = np.random.default_rng(seed)
    x, y = design(k, replicates, centers, rng, truth, sd)
    is_center = np.all(x == 0.0, axis=1)
    curvature = is_center.astype(float) if curvature_on and is_center.any() and (~is_center).any() else None
    low, high = [10.0 * (i + 1) for i in range(k)], [10.0 * (i + 1) + 20.0 for i in range(k)]
    terms = terms_of(k)
    model, full = fit(terms, x, y, curvature)
    steps = [{"removed": None, "metrics": full, "n_terms": len(terms)}]
    stopped = "no_candidate"
    while True:
        pvals = model.pvalues[1 : 1 + len(terms)]
        best = None
        blocked = False
        for i, p in enumerate(pvals):
            if np.isnan(p) or p <= alpha:
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
        model, m = fit(terms, x, y, curvature)
        steps.append({"removed": list(removed), "removed_p": best[1], "metrics": m, "n_terms": len(terms)})
    real = [[low[i] + (x[r, i] + 1.0) / 2.0 * (high[i] - low[i]) for i in range(k)] for r in range(len(y))]
    return {"k": k, "alpha": alpha, "curvature": curvature is not None, "low": low, "high": high, "real": real,
            "y": [float(v) for v in y], "full": full, "steps": steps, "stopped": stopped}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    cases = [
        {"id": "fatorial-2-3-com-curvatura", **run(3, 2, 3, 21, lambda p: 6 + 2.0 * p[0] - 1.5 * p[2] + 1.2 * p[0] * p[1] + 1.5, 0.6, 0.05, True)},
        {"id": "fatorial-2-4-sem-curvatura", **run(4, 1, 3, 22, lambda p: 4 + 1.8 * p[0] - 1.2 * p[3] + 0.9 * p[1] * p[2], 0.5, 0.05, False)},
        {"id": "fatorial-2-2-tres-repeticoes", **run(2, 3, 2, 23, lambda p: 3 + 2.5 * p[0] + 0.1 * p[1], 0.4, 0.05, True)},
        {"id": "fatorial-2-3-modelo-cheio-significativo", **run(3, 2, 0, 24, lambda p: 5 + 3 * p[0] + 2 * p[1] + 1.5 * p[2] + 2 * p[0] * p[1] - 1.5 * p[1] * p[2], 0.3, 0.05, False)},
    ]
    (ROOT / "selection.json").write_text(json.dumps({"id": "two_level_model_selection", "cases": cases}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print({c["id"]: (len(c["steps"]), c["stopped"]) for c in cases})


if __name__ == "__main__":
    main()
