"""Gera os casos de validação de `linear_mixed_model` (intercepto aleatório por unidade, REML) e de
`paired_comparison` (t pareado e Wilcoxon).

Referências independentes (sem usar o código Rust):
- **modelo misto**: `statsmodels.MixedLM` (REML) para efeitos fixos, erros-padrão, componentes de
  variância e BLUPs; **graus de liberdade de Satterthwaite** por uma implementação independente em
  NumPy com a matriz `V` explícita (derivadas numéricas por diferenças centrais); em dados
  **balanceados**, os graus de liberdade exatos da ANOVA de medidas repetidas, `(a−1)(s−1)`;
  caso de **fronteira** (`σᵤ² = 0`) confirmado pelo estimador da ANOVA (QM_unidades < QM_resíduo) e
  comparado ao `OLS`;
- **pareados**: `scipy.stats.ttest_rel` (+ intervalo pelo t crítico) e `scipy.stats.wilcoxon` com o
  método explícito (`exact` sem zeros nem empates; senão `approx`, sem correção de continuidade).
"""
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

ROOT = Path(__file__).resolve().parents[1] / "cases"


def reml_ll(X, y, groups, su, se):
    n = len(y)
    Z = np.zeros((n, len(set(groups))))
    index = {g: i for i, g in enumerate(dict.fromkeys(groups))}
    for r, g in enumerate(groups):
        Z[r, index[g]] = 1.0
    V = se * np.eye(n) + su * Z @ Z.T
    Vi = np.linalg.inv(V)
    XtViX = X.T @ Vi @ X
    beta = np.linalg.solve(XtViX, X.T @ Vi @ y)
    r = y - X @ beta
    return -0.5 * (np.linalg.slogdet(V)[1] + np.linalg.slogdet(XtViX)[1] + r @ Vi @ r)


def var_beta(X, y, groups, su, se, j):
    n = len(y)
    index = {g: i for i, g in enumerate(dict.fromkeys(groups))}
    Z = np.zeros((n, len(index)))
    for r, g in enumerate(groups):
        Z[r, index[g]] = 1.0
    V = se * np.eye(n) + su * Z @ Z.T
    return np.linalg.inv(X.T @ np.linalg.inv(V) @ X)[j, j]


def satterthwaite(X, y, groups, su, se, j):
    hu, he = 1e-3 * su, 1e-3 * se
    g = np.array(
        [
            (var_beta(X, y, groups, su + hu, se, j) - var_beta(X, y, groups, su - hu, se, j)) / (2 * hu),
            (var_beta(X, y, groups, su, se + he, j) - var_beta(X, y, groups, su, se - he, j)) / (2 * he),
        ]
    )
    f = lambda u, e: reml_ll(X, y, groups, u, e)
    f0 = f(su, se)
    huu = (f(su + hu, se) - 2 * f0 + f(su - hu, se)) / hu**2
    hee = (f(su, se + he) - 2 * f0 + f(su, se - he)) / he**2
    hue = (f(su + hu, se + he) - f(su + hu, se - he) - f(su - hu, se + he) + f(su - hu, se - he)) / (4 * hu * he)
    info = -np.array([[huu, hue], [hue, hee]])
    A = np.linalg.inv(info)
    var = var_beta(X, y, groups, su, se, j)
    return float(2 * var**2 / (g @ A @ g))


def anova_su(df, a, s):
    """Estimador da ANOVA de σᵤ² em medidas repetidas balanceadas (referência independente)."""
    y = df["y"].to_numpy().reshape(s, a)
    grand = y.mean()
    ss_sub = a * ((y.mean(axis=1) - grand) ** 2).sum()
    ss_time = s * ((y.mean(axis=0) - grand) ** 2).sum()
    ss_err = ((y - grand) ** 2).sum() - ss_sub - ss_time
    ms_sub, ms_err = ss_sub / (s - 1), ss_err / ((s - 1) * (a - 1))
    return (ms_sub - ms_err) / a, ms_err


def make_case(name, df, formula, factors, covariates, balanced=None):
    """`factors`: lista de (nome, níveis); `covariates`: nomes numéricos."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = smf.mixedlm(formula, df, groups=df["unit"])
        fit = model.fit(reml=True, method=["lbfgs"], maxiter=500)
    X = np.asarray(model.exog)
    y = np.asarray(model.endog)
    groups = list(df["unit"])
    su, se = float(fit.cov_re.iloc[0, 0]), float(fit.scale)
    p = X.shape[1]
    expected = {
        "labels": list(fit.params.index[:p]),
        "estimates": [float(v) for v in fit.params.values[:p]],
        "stdErrors": [float(v) for v in fit.bse.values[:p]],
        "varianceUnit": su,
        "varianceResidual": se,
        "blup": {str(g): float(v.iloc[0]) for g, v in fit.random_effects.items()},
        "df": [satterthwaite(X, y, groups, su, se, j) for j in range(p)],
    }
    if balanced:
        a, s = balanced
        expected["exactDf"] = [s - 1] + [(a - 1) * (s - 1)] * (p - 1)
        expected["anovaSu"], expected["anovaSe"] = anova_su(df, a, s)
    return {
        "name": name,
        "factors": [{"name": n, "kind": "categorical", "levels": lv} for n, lv in factors]
        + [{"name": c, "kind": "numeric", "levels": []} for c in covariates],
        "rows": [
            {
                "unit": str(r["unit"]),
                "factors": [str(r[n]) for n, _ in factors] + [float(r[c]) for c in covariates],
                "y": float(r["y"]),
            }
            for _, r in df.iterrows()
        ],
        "fixedTerms": [n for n, _ in factors] + list(covariates),
        "expected": expected,
    }


def rm_data(rng, s, a, su, se, effects):
    rows = []
    for i in range(s):
        u = rng.normal(0, np.sqrt(su))
        for t in range(a):
            rows.append({"unit": f"S{i + 1}", "time": f"T{t + 1}", "y": round(float(10 + effects[t] + u + rng.normal(0, np.sqrt(se))), 4)})
    return pd.DataFrame(rows)


def paired_case(name, first, second):
    first, second = np.array(first, float), np.array(second, float)
    d = first - second
    t = stats.ttest_rel(first, second)
    n = len(d)
    ci = t.confidence_interval(confidence_level=0.95)
    nonzero = d[d != 0]
    ties = len(set(np.abs(nonzero))) < len(nonzero)
    method = "exact" if (len(nonzero) == n and not ties and n <= 50) else "approx"
    w = stats.wilcoxon(first, second, zero_method="wilcox", correction=False, method=method)
    ranks = stats.rankdata(np.abs(nonzero))
    return {
        "name": name,
        "first": list(map(float, first)),
        "second": list(map(float, second)),
        "expected": {
            "meanDifference": float(d.mean()),
            "sd": float(d.std(ddof=1)),
            "t": float(t.statistic),
            "df": int(t.df),
            "p": float(t.pvalue),
            "ciLower": float(ci.low),
            "ciUpper": float(ci.high),
            "dz": float(d.mean() / d.std(ddof=1)),
            "wilcoxon": {
                "nUsed": int(len(nonzero)),
                "nZero": int(n - len(nonzero)),
                "wPlus": float(ranks[nonzero > 0].sum()),
                "statistic": float(w.statistic),
                "p": float(w.pvalue),
                "method": "exact" if method == "exact" else "normalApproximation",
            },
        },
    }


def main():
    (ROOT / "linear_mixed_model").mkdir(parents=True, exist_ok=True)
    (ROOT / "paired_comparison").mkdir(parents=True, exist_ok=True)
    cases = []

    rng = np.random.default_rng(11)
    df = rm_data(rng, 8, 4, 2.0, 1.0, [0.0, 1.0, 2.5, 3.0])
    cases.append(make_case("rm-balanceado-8x4", df, "y ~ C(time)", [("time", ["T1", "T2", "T3", "T4"])], [], balanced=(4, 8)))

    rng = np.random.default_rng(12)
    df = rm_data(rng, 12, 3, 1.5, 0.8, [0.0, -1.0, 0.5])
    cases.append(make_case("rm-balanceado-12x3", df, "y ~ C(time)", [("time", ["T1", "T2", "T3"])], [], balanced=(3, 12)))

    # desbalanceado: fator entre unidades, tempo dentro, covariável numérica e dados ausentes
    rng = np.random.default_rng(13)
    rows = []
    for i in range(14):
        treat = "A" if i < 7 else "B"
        u = rng.normal(0, 1.2)
        for t in range(4):
            if rng.random() < 0.18:
                continue
            x = round(float(rng.normal(5, 1)), 3)
            y = 8 + (1.5 if treat == "B" else 0) + 0.7 * t + 0.4 * x + u + rng.normal(0, 0.7)
            rows.append({"unit": f"U{i + 1}", "treat": treat, "time": f"T{t + 1}", "x": x, "y": round(float(y), 4)})
    df = pd.DataFrame(rows)
    cases.append(
        make_case(
            "desbalanceado-tratamento-tempo-covariavel",
            df,
            "y ~ C(treat) + C(time) + x",
            [("treat", ["A", "B"]), ("time", ["T1", "T2", "T3", "T4"])],
            ["x"],
        )
    )

    # fronteira: sem efeito de unidade, o estimador da ANOVA de σᵤ² é negativo
    boundary = None
    for seed in range(100, 400):
        rng = np.random.default_rng(seed)
        df = rm_data(rng, 8, 4, 1e-12, 1.0, [0.0, 1.0, 2.0, 3.0])
        su_anova, se_anova = anova_su(df, 4, 8)
        if su_anova < -0.05:
            boundary = (seed, df, su_anova, se_anova)
            break
    assert boundary is not None, "nenhuma semente com σᵤ² negativo"
    seed, df, su_anova, se_anova = boundary
    ols = smf.ols("y ~ C(time)", df).fit()
    cases.append(
        {
            "name": "fronteira",
            "factors": [{"name": "time", "kind": "categorical", "levels": ["T1", "T2", "T3", "T4"]}],
            "rows": [{"unit": r["unit"], "factors": [r["time"]], "y": float(r["y"])} for _, r in df.iterrows()],
            "fixedTerms": ["time"],
            "expected": {
                "boundary": True,
                "anovaSu": su_anova,
                "estimates": [float(v) for v in ols.params.values],
                "stdErrors": [float(v) for v in ols.bse.values],
                "dfOls": int(ols.df_resid),
                "varianceResidual": float(ols.scale),
            },
        }
    )
    (ROOT / "linear_mixed_model" / "mixed.json").write_text(
        json.dumps({"id": "linear_mixed_model", "cases": cases}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    paired = [
        paired_case("sem-empates", [12.1, 14.3, 11.8, 15.2, 13.0, 16.4, 12.7, 14.9], [11.0, 13.1, 12.4, 13.9, 12.2, 14.8, 12.9, 13.2]),
        paired_case("com-zeros-e-empates", [5, 6, 7, 8, 9, 10, 12, 8, 6], [5, 5, 6, 7, 7, 11, 10, 8, 4]),
        paired_case("n-grande", [float(v) for v in np.round(np.random.default_rng(5).normal(10, 2, 60), 2)], [float(v) for v in np.round(np.random.default_rng(6).normal(9.4, 2, 60), 2)]),
        paired_case("pequeno", [10.2, 11.5, 9.8, 12.9], [9.1, 10.7, 10.0, 11.2]),
    ]
    (ROOT / "paired_comparison" / "paired.json").write_text(
        json.dumps({"id": "paired_comparison", "cases": paired}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print("misto:", len(cases), "pareados:", len(paired))


if __name__ == "__main__":
    main()
