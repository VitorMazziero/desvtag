"""Gera os casos de validação de `multiple_comparison_procedures` (ET11).

Referências independentes, sem usar o código Rust:
- ANOVA de Welch: statsmodels (`anova_oneway(use_var="unequal")`);
- Games–Howell: fórmula com `scipy.stats.studentized_range` e conferência com scikit-posthocs;
- Bonferroni/Holm: testes t com variância combinada (SciPy) e `multipletests` (statsmodels),
  conferidos com `scikit_posthocs.posthoc_ttest(pool_sd=True)`;
- Dunnett: `scipy.stats.dunnett` (quasi-Monte Carlo, ~1e-3) e uma integração dupla própria da
  distribuição do máximo de |T| (`scipy.integrate.dblquad`, ~1e-9) para o valor exato;
- Kruskal–Wallis: `scipy.stats.kruskal` (com correção de empates); Dunn: scikit-posthocs.
"""
import json
from pathlib import Path

import numpy as np
import scikit_posthocs as sp
from scipy import integrate, optimize, stats
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.oneway import anova_oneway

ROOT = Path(__file__).resolve().parents[1] / "cases" / "multiple_comparison_procedures"


def cases_data():
    rng = np.random.default_rng(20261101)
    unequal = {
        "A": np.round(rng.normal(10.0, 0.6, 6), 2),
        "B": np.round(rng.normal(11.5, 2.5, 9), 2),
        "C": np.round(rng.normal(12.0, 1.1, 5), 2),
        "D": np.round(rng.normal(15.0, 4.0, 8), 2),
        "E": np.round(rng.normal(10.5, 0.4, 7), 2),
    }
    balanced_ties = {
        "controle": [12, 14, 13, 15, 12, 14],
        "pH 5": [16, 18, 17, 17, 19, 16],
        "pH 7": [14, 15, 15, 16, 14, 15],
        "pH 9": [11, 12, 12, 13, 11, 12],
    }
    dunnett_unbalanced = {
        "controle": np.round(rng.normal(20.0, 2.0, 8), 2),
        "T1": np.round(rng.normal(22.0, 2.0, 5), 2),
        "T2": np.round(rng.normal(25.0, 2.0, 6), 2),
        "T3": np.round(rng.normal(20.5, 2.0, 7), 2),
    }
    return {
        "desiguais": {k: [float(x) for x in v] for k, v in unequal.items()},
        "empates": {k: [float(x) for x in v] for k, v in balanced_ties.items()},
        "dunnett": {k: [float(x) for x in v] for k, v in dunnett_unbalanced.items()},
    }


def welch(groups):
    r = anova_oneway([np.array(v) for v in groups.values()], use_var="unequal", welch_correction=True)
    return {"statistic": float(r.statistic), "df1": float(r.df_num), "df2": float(r.df_denom), "p": float(r.pvalue)}


def games_howell(groups, alpha):
    labels = list(groups)
    k = len(labels)
    arr = {l: np.array(v) for l, v in groups.items()}
    mean = {l: arr[l].mean() for l in labels}
    var = {l: arr[l].var(ddof=1) for l in labels}
    n = {l: len(arr[l]) for l in labels}
    pairs = []
    for i in range(k):
        for j in range(i + 1, k):
            a, b = labels[i], labels[j]
            vi, vj = var[a] / n[a], var[b] / n[b]
            se = np.sqrt(vi + vj)
            df = (vi + vj) ** 2 / (vi**2 / (n[a] - 1) + vj**2 / (n[b] - 1))
            diff = mean[a] - mean[b]
            t = diff / se
            q = abs(t) * np.sqrt(2)
            p = float(stats.studentized_range.sf(q, k, df))
            qc = float(stats.studentized_range.isf(alpha, k, df))
            half = qc * se / np.sqrt(2)
            pairs.append({"a": i, "b": j, "difference": diff, "std_error": se, "statistic": t, "df": df, "p": p, "ci": [diff - half, diff + half]})
    # conferência independente com scikit-posthocs
    import pandas as pd

    frame = pd.DataFrame([(l, v) for l in labels for v in groups[l]], columns=["g", "y"])
    matrix = sp.posthoc_games_howell(frame, val_col="y", group_col="g")
    for pr in pairs:
        ref = float(matrix.loc[labels[pr["a"]], labels[pr["b"]]])
        assert abs(ref - pr["p"]) < 1e-6, (ref, pr["p"])
    return pairs


def pooled_t(groups, method):
    labels = list(groups)
    arr = [np.array(groups[l]) for l in labels]
    k = len(arr)
    n_total = sum(len(a) for a in arr)
    df = n_total - k
    mse = sum(((a - a.mean()) ** 2).sum() for a in arr) / df
    grand = np.concatenate(arr).mean()
    ssb = sum(len(a) * (a.mean() - grand) ** 2 for a in arr)
    fval = (ssb / (k - 1)) / mse
    glob = {"statistic": float(fval), "df1": float(k - 1), "df2": float(df), "p": float(stats.f.sf(fval, k - 1, df))}
    pairs, raw = [], []
    for i in range(k):
        for j in range(i + 1, k):
            se = np.sqrt(mse * (1 / len(arr[i]) + 1 / len(arr[j])))
            diff = arr[i].mean() - arr[j].mean()
            t = diff / se
            p = 2 * stats.t.sf(abs(t), df)
            raw.append(p)
            pairs.append({"a": i, "b": j, "difference": float(diff), "std_error": float(se), "statistic": float(t), "df": float(df), "p_raw": float(p)})
    adj = multipletests(raw, method="bonferroni" if method == "bonferroni" else "holm")[1]
    for pr, a in zip(pairs, adj):
        pr["p_adjusted"] = float(a)
    import pandas as pd

    frame = pd.DataFrame([(l, v) for l in labels for v in groups[l]], columns=["g", "y"])
    ref = sp.posthoc_ttest(frame, val_col="y", group_col="g", pool_sd=True, p_adjust=method)
    for pr in pairs:
        assert abs(float(ref.loc[labels[pr["a"]], labels[pr["b"]]]) - pr["p_adjusted"]) < 1e-9
    return glob, pairs


def dunnett_exact(c, lambdas, df):
    """P(max |T_i| <= c) por integração dupla própria (S ~ chi_df/sqrt(df); fator comum z)."""
    lam = np.array(lambdas)
    r = np.sqrt(1 - lam**2)

    def integrand(z, s):
        a = (c * s - lam * z) / r
        b = (-c * s - lam * z) / r
        prod = np.prod(stats.norm.cdf(a) - stats.norm.cdf(b))
        dens = stats.chi.pdf(s * np.sqrt(df), df) * np.sqrt(df)
        return stats.norm.pdf(z) * prod * dens

    val, _ = integrate.dblquad(integrand, 0.0, 12.0 / np.sqrt(max(df, 1.0)) + 3.0, -9.0, 9.0, epsabs=1e-11, epsrel=1e-11)
    return val


def dunnett(groups, control, alpha):
    labels = list(groups)
    c = labels.index(control)
    arr = [np.array(groups[l]) for l in labels]
    n_total = sum(len(a) for a in arr)
    k = len(arr)
    df = n_total - k
    mse = sum(((a - a.mean()) ** 2).sum() for a in arr) / df
    others = [i for i in range(k) if i != c]
    n0 = len(arr[c])
    lambdas = [np.sqrt(len(arr[i]) / (len(arr[i]) + n0)) for i in others]
    res = stats.dunnett(*[arr[i] for i in others], control=arr[c])
    ci = res.confidence_interval(confidence_level=1 - alpha)
    crit = optimize.brentq(lambda x: dunnett_exact(x, lambdas, df) - (1 - alpha), 1.0, 6.0, xtol=1e-9)
    grand = np.concatenate(arr).mean()
    ssb = sum(len(a) * (a.mean() - grand) ** 2 for a in arr)
    fval = (ssb / (k - 1)) / mse
    pairs = []
    for idx, i in enumerate(others):
        se = np.sqrt(mse * (1 / len(arr[i]) + 1 / n0))
        diff = arr[i].mean() - arr[c].mean()
        t = diff / se
        p_exact = 1 - dunnett_exact(abs(t), lambdas, df)
        assert abs(p_exact - float(res.pvalue[idx])) < 3e-3, (p_exact, res.pvalue[idx])
        pairs.append({"a": i, "b": c, "difference": float(diff), "std_error": float(se), "statistic": float(t), "df": float(df),
                      "p_raw": float(2 * stats.t.sf(abs(t), df)), "p_adjusted": float(p_exact), "p_scipy_qmc": float(res.pvalue[idx]),
                      "ci": [float(diff - crit * se), float(diff + crit * se)], "ci_scipy_qmc": [float(ci.low[idx]), float(ci.high[idx])]})
    glob = {"statistic": float(fval), "df1": float(k - 1), "df2": float(df), "p": float(stats.f.sf(fval, k - 1, df))}
    return glob, pairs, float(crit)


def kruskal_dunn(groups, method):
    labels = list(groups)
    arr = [np.array(groups[l]) for l in labels]
    h = stats.kruskal(*arr)
    import pandas as pd

    frame = pd.DataFrame([(l, v) for l in labels for v in groups[l]], columns=["g", "y"])
    matrix = sp.posthoc_dunn(frame, val_col="y", group_col="g", p_adjust=method)
    allv = np.concatenate(arr)
    ranks = stats.rankdata(allv)
    n = len(allv)
    _, counts = np.unique(allv, return_counts=True)
    tie_sum = float((counts**3 - counts).sum())
    sigma2 = n * (n + 1) / 12 - tie_sum / (12 * (n - 1))
    pos, mean_ranks = 0, []
    for a in arr:
        mean_ranks.append(float(ranks[pos : pos + len(a)].mean()))
        pos += len(a)
    pairs = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            se = float(np.sqrt(sigma2 * (1 / len(arr[i]) + 1 / len(arr[j]))))
            diff = mean_ranks[i] - mean_ranks[j]
            pairs.append({"a": i, "b": j, "difference": diff, "std_error": se, "statistic": diff / se,
                          "p_adjusted": float(matrix.loc[labels[i], labels[j]])})
    return {"statistic": float(h.statistic), "df1": float(len(arr) - 1), "p": float(h.pvalue)}, pairs, mean_ranks


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    data = cases_data()
    alpha = 0.05
    cases = []
    g = data["desiguais"]
    cases.append({"id": "games-howell-desiguais", "procedure": {"type": "gamesHowell"}, "groups": g, "levels": list(g), "alpha": alpha,
                  "expected": {"global": welch(g), "pairs": games_howell(g, alpha)}})
    t = data["empates"]
    for method, proc in (("bonferroni", {"type": "bonferroni"}), ("holm", {"type": "holm"})):
        glob, pairs = pooled_t(t, method)
        cases.append({"id": f"{method}-empates", "procedure": proc, "groups": t, "levels": list(t), "alpha": alpha, "expected": {"global": glob, "pairs": pairs}})
    for method in ("bonferroni", "holm"):
        glob, pairs, mean_ranks = kruskal_dunn(t, method)
        cases.append({"id": f"kruskal-dunn-{method}-empates", "procedure": {"type": "kruskalDunn", "adjustment": method}, "groups": t, "levels": list(t), "alpha": alpha,
                      "expected": {"global": glob, "pairs": pairs, "mean_ranks": mean_ranks}})
    d = data["dunnett"]
    glob, pairs, crit = dunnett(d, "controle", alpha)
    cases.append({"id": "dunnett-desbalanceado", "procedure": {"type": "dunnett", "control": "controle"}, "groups": d, "levels": list(d), "alpha": alpha,
                  "expected": {"global": glob, "pairs": pairs, "critical_value": crit}})
    out = {"id": "multiple_comparison_procedures", "cases": cases}
    (ROOT / "procedures.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("casos:", [c["id"] for c in cases])


if __name__ == "__main__":
    main()
