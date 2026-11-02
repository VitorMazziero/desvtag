"""Gera os casos de validação de `power_analysis`, das distribuições não centrais e de
`nonlinear_saturation_fit` (Monod, Haldane e Hill).

Referências independentes (SciPy; sem usar o código Rust):
- **não centrais**: `scipy.stats.ncf.sf` e `scipy.stats.nct.cdf` em uma grade de pontos;
- **potência**: para cada desenho, a potência exata por `ncf`/`nct` e, nos objetivos de tamanho de
  amostra e de precisão, o menor `n` por varredura inteira de 2 a 5000 (sem busca binária);
- **ajuste não linear**: `scipy.optimize.curve_fit` (`trf`, limites positivos) com a matriz de
  covariância `pcov`, o desvio residual e a soma de quadrados.
"""
import json
from pathlib import Path

import numpy as np
from scipy import optimize, stats

ROOT = Path(__file__).resolve().parents[1] / "cases"


def power_at(design, sigma, alpha, two_sided, n):
    kind = design["type"]
    if kind == "anova":
        means = np.array(design["means"], float)
        k = len(means)
        lam = n * np.sum((means - means.mean()) ** 2) / sigma**2
        d1, d2 = k - 1, k * (n - 1)
        crit = stats.f.isf(alpha, d1, d2)
        return float(stats.ncf.sf(crit, d1, d2, lam)), float(lam), float(d1), float(d2), float(crit)
    two = kind == "twoSampleT"
    d = abs(design["difference"])
    df = 2 * n - 2 if two else n - 1
    delta = d / sigma * np.sqrt(n / 2 if two else n)
    tail = alpha / 2 if two_sided else alpha
    crit = stats.t.isf(tail, df)
    p = stats.nct.sf(crit, df, delta) + (stats.nct.cdf(-crit, df, delta) if two_sided else 0.0)
    return float(p), float(delta), float(df), 0.0, float(crit)


def power_case(name, design, sigma, alpha, two_sided, goal):
    case = {"name": name, "design": design, "sigma": sigma, "alpha": alpha, "twoSided": two_sided, "goal": goal}
    if goal["type"] == "powerAt":
        n = goal["n"]
    elif goal["type"] == "sampleSizeFor":
        n = next(m for m in range(2, 5001) if power_at(design, sigma, alpha, two_sided, m)[0] >= goal["power"])
    else:
        two = design["type"] == "twoSampleT"
        c = 2.0 if two else 1.0
        n = next(
            m
            for m in range(2, 5001)
            if stats.t.isf(alpha / 2, (2 * m - 2) if two else (m - 1)) * sigma * np.sqrt(c / m) <= goal["halfWidth"]
        )
    p, nc, df1, df2, crit = power_at(design, sigma, alpha, two_sided, n)
    case["expected"] = {"n": int(n), "power": p, "noncentrality": nc, "df1": df1, "df2": df2, "critical": crit}
    return case


MODELS = {
    "monod": (lambda s, a, b: a * s / (b + s), 2),
    "haldane": (lambda s, a, b, c: a * s / (b + s + s * s / c), 3),
    "hill": (lambda s, a, b, n: a * s**n / (b**n + s**n), 3),
}


def nonlinear_case(name, model, truth, x, noise, seed):
    f, p = MODELS[model]
    rng = np.random.default_rng(seed)
    x = np.array(x, float)
    y = np.round(f(x, *truth) + rng.normal(0, noise, len(x)), 5)
    popt, pcov = optimize.curve_fit(f, x, y, p0=truth, bounds=(1e-12, np.inf), method="trf", xtol=1e-14, ftol=1e-14, gtol=1e-14, maxfev=20000)
    resid = y - f(x, *popt)
    sse = float(np.sum(resid**2))
    n = len(x)
    sigma = float(np.sqrt(sse / (n - p)))
    sst = float(np.sum((y - y.mean()) ** 2))
    return {
        "name": name,
        "model": model,
        "x": list(map(float, x)),
        "y": list(map(float, y)),
        "expected": {
            "estimates": list(map(float, popt)),
            "stdErrors": list(map(float, np.sqrt(np.diag(pcov)))),
            "sse": sse,
            "sigma": sigma,
            "rSquared": 1.0 - sse / sst,
        },
    }


def main():
    for folder in ("power_analysis", "nonlinear_saturation_fit"):
        (ROOT / folder).mkdir(parents=True, exist_ok=True)

    # distribuições não centrais
    grid = []
    for x in (0.5, 1.0, 2.0, 3.5, 6.0):
        for d1, d2 in ((1, 10), (3, 16), (4, 30), (7, 60)):
            for lam in (0.0, 1.0, 4.5, 12.0, 30.0):
                # `scipy.stats.ncf.sf` devolve valores NEGATIVOS com nc = 0 exato (defeito observado no SciPy 1.18.1):
                # com λ = 0 a referência é a F central (`scipy.stats.f.sf`).
                ref = stats.f.sf(x, d1, d2) if lam == 0.0 else stats.ncf.sf(x, d1, d2, lam)
                grid.append({"x": x, "d1": d1, "d2": d2, "lambda": lam, "sf": float(ref)})
    nct = []
    for t in (-3.0, -1.2, 0.0, 0.7, 2.0, 4.5):
        for df in (3, 10, 25, 80):
            for delta in (-2.0, 0.0, 0.8, 2.5, 5.0):
                nct.append({"t": t, "df": df, "delta": delta, "cdf": float(stats.nct.cdf(t, df, delta))})

    power_cases = [
        power_case("anova-potencia-n8", {"type": "anova", "means": [10, 12, 14, 12]}, 3.0, 0.05, True, {"type": "powerAt", "n": 8}),
        power_case("anova-tamanho-0.8", {"type": "anova", "means": [10, 12, 14, 12]}, 3.0, 0.05, True, {"type": "sampleSizeFor", "power": 0.8}),
        power_case("anova-3grupos-0.9", {"type": "anova", "means": [5.0, 6.0, 8.0]}, 2.0, 0.01, True, {"type": "sampleSizeFor", "power": 0.9}),
        power_case("t-uma-amostra-bilateral", {"type": "oneSampleT", "difference": 0.8}, 1.5, 0.05, True, {"type": "sampleSizeFor", "power": 0.8}),
        power_case("t-pareado-unilateral", {"type": "pairedT", "difference": 1.0}, 1.5, 0.05, False, {"type": "sampleSizeFor", "power": 0.9}),
        power_case("t-duas-amostras", {"type": "twoSampleT", "difference": 1.0}, 1.5, 0.05, True, {"type": "sampleSizeFor", "power": 0.9}),
        power_case("t-duas-amostras-potencia", {"type": "twoSampleT", "difference": 2.0}, 3.0, 0.05, True, {"type": "powerAt", "n": 15}),
        power_case("precisao-uma-amostra", {"type": "oneSampleT", "difference": 1.0}, 2.0, 0.05, True, {"type": "precisionFor", "halfWidth": 0.5}),
        power_case("precisao-duas-amostras", {"type": "twoSampleT", "difference": 1.0}, 2.0, 0.10, True, {"type": "precisionFor", "halfWidth": 1.0}),
    ]
    (ROOT / "power_analysis" / "power.json").write_text(
        json.dumps({"id": "power_analysis", "ncf": grid, "nct": nct, "cases": power_cases}, indent=1, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    s = [0.3, 0.6, 1.0, 1.6, 2.5, 4.0, 6.5, 10.0, 16.0, 25.0]
    nl = [
        nonlinear_case("monod-ruido-baixo", "monod", [3.0, 2.5], s, 0.04, 21),
        nonlinear_case("monod-ruido-alto", "monod", [8.0, 4.0], s, 0.4, 22),
        nonlinear_case("haldane", "haldane", [5.0, 3.0, 40.0], [0.2, 0.5, 1, 2, 4, 8, 16, 32, 64, 100], 0.05, 23),
        nonlinear_case("hill", "hill", [4.0, 6.0, 2.0], [0.5, 1, 2, 3, 4, 6, 8, 12, 20, 40], 0.06, 24),
    ]
    (ROOT / "nonlinear_saturation_fit" / "nonlinear.json").write_text(
        json.dumps({"id": "nonlinear_saturation_fit", "cases": nl}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print("ncf:", len(grid), "nct:", len(nct), "potência:", len(power_cases), "não linear:", len(nl))


if __name__ == "__main__":
    main()
