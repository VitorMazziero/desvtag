"""Gera os casos de validação de `mixture_design` (geração) e `mixture_model` (modelos de Scheffé).

Referências independentes, sem usar o código Rust:
- geração: `itertools.product` (lattice, ordem lexicográfica) e `itertools.combinations`
  (centroide), pseudocomponentes `a/m` e `1/k`, proporções `L + (1 − ΣL)·x′`, PCG32 e
  Fisher–Yates sobre a ordem padrão (repetições e centrais extras incluídos);
- análise: `statsmodels.OLS` **sem intercepto** nos pseudocomponentes (coeficientes, erros-padrão,
  t, valores-p e intervalos); a ANOVA usa a soma total **centrada** (`n − 1` gl; modelo com
  `posto − 1`), F e valor-p por `scipy.stats.f`, `R²` e `R²` ajustado por definição.
"""
import itertools
import json
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from scipy import stats

ROOT = Path(__file__).resolve().parents[1] / "cases"
MASK = (1 << 64) - 1


class PCG32:
    def __init__(self, seed, seq=54):
        self.state, self.inc = 0, ((seq << 1) | 1) & MASK
        self.next()
        self.state = (self.state + seed) & MASK
        self.next()

    def next(self):
        old = self.state
        self.state = (old * 6364136223846793005 + self.inc) & MASK
        xs = (((old >> 18) ^ old) >> 27) & 0xFFFFFFFF
        rot = old >> 59
        return ((xs >> rot) | (xs << ((-rot) & 31))) & 0xFFFFFFFF

    def bounded(self, bound):
        threshold = ((-bound) & 0xFFFFFFFF) % bound
        while True:
            r = self.next()
            if r >= threshold:
                return r % bound


def permutation(n, seed):
    rng, items = PCG32(seed), list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.bounded(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def base_points(q, kind, degree):
    if kind == "lattice":
        pts = []
        for a in itertools.product(range(degree + 1), repeat=q):
            if sum(a) == degree:
                pts.append([v / degree for v in a])
        return pts
    pts = []
    for k in range(1, q + 1):
        for subset in itertools.combinations(range(q), k):
            pts.append([(1.0 / k) if i in subset else 0.0 for i in range(q)])
    return pts


def design_case(q, kind, degree, lowers, replicates, centers, randomize, seed):
    lowers = list(lowers) + [0.0] * (q - len(lowers))
    scale = 1.0
    for l in lowers:
        scale -= l
    # Rust: 1 − Σ L com soma sequencial; reproduz a mesma ordem de operações.
    total = 0.0
    for l in lowers:
        total += l
    scale = 1.0 - total
    base = base_points(q, kind, degree)
    standard = [(p, rep, False) for rep in range(1, replicates + 1) for p in base]
    standard += [([1.0 / q] * q, n, True) for n in range(1, centers + 1)]
    order = permutation(len(standard), seed) if randomize else list(range(len(standard)))
    runs = []
    for position, index in enumerate(order):
        pseudo, rep, extra = standard[index]
        runs.append(
            {
                "run": position + 1,
                "standardOrder": index + 1,
                "support": sum(1 for v in pseudo if v > 0.0),
                "extraCenter": extra,
                "pseudo": pseudo,
                "proportions": [lowers[i] + scale * pseudo[i] for i in range(q)],
                "replicate": rep,
            }
        )
    return {
        "q": q,
        "kind": kind,
        "degree": degree,
        "lowers": lowers,
        "replicates": replicates,
        "centerPoints": centers,
        "randomize": randomize,
        "seed": seed,
        "baseCount": len(base),
        "runs": runs,
    }


def columns(pseudo, model):
    q = len(pseudo)
    cols = list(pseudo)
    if model in ("quadratic", "specialCubic"):
        cols += [pseudo[i] * pseudo[j] for i in range(q) for j in range(i + 1, q)]
    if model == "specialCubic":
        cols += [pseudo[i] * pseudo[j] * pseudo[k] for i in range(q) for j in range(i + 1, q) for k in range(j + 1, q)]
    return cols


def analysis_case(name, q, lowers, model, truth, noise, seed, replicates, kind="lattice", degree=2, alpha=0.05):
    lowers = list(lowers) + [0.0] * (q - len(lowers))
    scale = 1.0 - sum(lowers)
    base = base_points(q, kind, degree) * replicates + [[1.0 / q] * q]
    rng = np.random.default_rng(seed)
    props, pseudos, y = [], [], []
    for p in base:
        row = [lowers[i] + scale * p[i] for i in range(q)]
        props.append(row)
        pseudos.append([(row[i] - lowers[i]) / scale for i in range(q)])
        y.append(round(float(truth(p) + rng.normal(0, noise)), 4))
    X = np.array([columns(p, model) for p in pseudos])
    fit = sm.OLS(np.array(y), X).fit()
    n, rank = len(y), int(np.linalg.matrix_rank(X))
    yb = float(np.mean(y))
    sst = float(np.sum((np.array(y) - yb) ** 2))
    sse = float(np.sum(fit.resid ** 2))
    dfe = n - rank
    dfm = rank - 1
    f = ((sst - sse) / dfm) / (sse / dfe)
    ci = fit.conf_int(alpha=alpha)
    return {
        "name": name,
        "request": {
            "componentNames": [f"C{i + 1}" for i in range(q)],
            "lowerBounds": lowers,
            "proportions": props,
            "response": y,
            "model": model,
            "alpha": alpha,
        },
        "expected": {
            "n": n,
            "rank": rank,
            "dfResidual": dfe,
            "coefficients": [
                {
                    "estimate": float(fit.params[i]),
                    "stdError": float(fit.bse[i]),
                    "t": float(fit.tvalues[i]),
                    "p": float(fit.pvalues[i]),
                    "ciLower": float(ci[i][0]),
                    "ciUpper": float(ci[i][1]),
                }
                for i in range(X.shape[1])
            ],
            "ssTotal": sst,
            "ssResidual": sse,
            "f": float(f),
            "pValue": float(stats.f.sf(f, dfm, dfe)),
            "rSquared": 1.0 - sse / sst,
            "adjustedRSquared": 1.0 - (1.0 - (1.0 - sse / sst)) * (n - 1) / dfe,
        },
    }


def main():
    d = ROOT / "mixture_design"
    d.mkdir(parents=True, exist_ok=True)
    designs = [
        design_case(3, "lattice", 2, [], 2, 2, True, 42),
        design_case(4, "centroid", 0, [], 1, 0, False, 0),
        design_case(4, "lattice", 3, [0.1, 0.05, 0.0, 0.2], 1, 1, True, 7),
        design_case(2, "lattice", 1, [], 3, 0, True, 12345),
        design_case(3, "centroid", 0, [0.0, 0.3], 3, 2, True, 9007199254740991),
        design_case(5, "lattice", 2, [], 1, 0, False, 99),
    ]
    (d / "mixture.json").write_text(
        json.dumps({"id": "mixture_design", "cases": designs}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    m = ROOT / "mixture_model"
    m.mkdir(parents=True, exist_ok=True)
    analyses = [
        analysis_case("linear-3", 3, [], "linear", lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2], 0.4, 1, 3),
        analysis_case(
            "quadratic-3",
            3,
            [],
            "quadratic",
            lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2] + 25 * p[0] * p[1] - 15 * p[1] * p[2],
            0.3,
            2,
            3,
        ),
        analysis_case(
            "special-cubic-3",
            3,
            [],
            "specialCubic",
            lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2] + 12 * p[0] * p[1] + 80 * p[0] * p[1] * p[2],
            0.3,
            3,
            3,
        ),
        analysis_case(
            "quadratic-4-lower-bounds",
            4,
            [0.05, 0.1, 0.0, 0.1],
            "quadratic",
            lambda p: 8 * p[0] + 12 * p[1] + 5 * p[2] + 9 * p[3] + 20 * p[0] * p[3] - 10 * p[1] * p[2],
            0.25,
            4,
            2,
            kind="lattice",
            degree=2,
        ),
        analysis_case("linear-2", 2, [], "linear", lambda p: 4 * p[0] + 9 * p[1], 0.2, 5, 4, degree=2),
    ]
    (m / "scheffe.json").write_text(
        json.dumps({"id": "mixture_model", "cases": analyses}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print("planejamentos:", len(designs), "análises:", len(analyses))


if __name__ == "__main__":
    main()
