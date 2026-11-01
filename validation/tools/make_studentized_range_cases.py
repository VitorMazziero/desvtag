"""Gera o caso de validação da amplitude studentizada (`studentized_range`).

Referências independentes:
- grade: SciPy `stats.studentized_range` (`cdf`, `sf`, `isf`), implementação própria do SciPy;
- verificação da própria referência: mpmath (20 dígitos), integral dupla pela definição
  (`P(Q ≤ q) = ∫ f_s(s) W(q s; k) ds`), em um subconjunto de pontos (cada um leva ~1–2 min).
O resultado do mpmath em cada ponto de verificação é registrado em `mpmathChecks`.
"""
import json
import sys
from multiprocessing import Pool
from pathlib import Path

import mpmath as mp
import scipy
from scipy import stats

OUT = Path(__file__).resolve().parents[1] / "cases" / "studentized_range" / "001-grade-scipy-mpmath"
KS = [2, 3, 4, 5, 8, 10, 20, 50]
DFS = [2, 3, 5, 10, 20, 60, 120, 1000, float("inf")]
LEVELS = [0.5, 0.1, 0.05, 0.01, 1e-3, 1e-5]
# (k, df, nível de cauda) verificados também com mpmath
MP_POINTS = [(2, 5, 0.05), (3, 10, 0.05), (5, 10, 0.05), (10, 20, 0.01), (20, 60, 0.1), (4, 3, 1e-3),
             (8, 120, 0.05), (5, float("inf"), 0.05), (50, float("inf"), 0.01), (3, 2, 0.5)]


def w_cdf(w, k):
    f = lambda z: k * mp.npdf(z) * (mp.ncdf(z) - mp.ncdf(z - w)) ** (k - 1)
    return mp.quad(f, [-14, -6, -3, 0, w / 2, w, w + 3, w + 6, w + 14])


def mp_cdf(q, k, nu):
    mp.mp.dps = 20
    if nu == float("inf"):
        return w_cdf(mp.mpf(q), k)
    nu_m = mp.mpf(nu)
    c = nu_m ** (nu_m / 2) / (mp.gamma(nu_m / 2) * 2 ** (nu_m / 2 - 1))
    f = lambda s: c * s ** (nu_m - 1) * mp.exp(-nu_m * s * s / 2) * w_cdf(mp.mpf(q) * s, k)
    return mp.quad(f, [0, 0.3, 0.7, 1, 1.4, 2, 3, 6, mp.inf])


def check(args):
    k, df, q = args
    return {"k": k, "df": "inf" if df == float("inf") else df, "q": repr(float(q)), "cdfMpmath": mp.nstr(mp_cdf(q, k, df), 18)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    points = []
    for k in KS:
        for df in DFS:
            for level in LEVELS:
                q = float(stats.studentized_range.isf(level, k, df))
                points.append({
                    "k": k, "df": "inf" if df == float("inf") else df, "level": level, "q": repr(q),
                    "cdf": repr(float(stats.studentized_range.cdf(q, k, df))),
                    "sf": repr(float(stats.studentized_range.sf(q, k, df))),
                })
    mp_args = [(k, df, float(stats.studentized_range.isf(level, k, df))) for k, df, level in MP_POINTS]
    with Pool() as pool:
        checks = pool.map(check, mp_args)
    expected = {
        "points": points,
        "mpmathChecks": checks,
        "tolerances": {"absolute": 2e-12, "quantileRelative": 1e-9,
                       "note": "erro absoluto de cdf/sf e relativo do quantil superior contra o SciPy"},
        "reference": {"software": "SciPy stats.studentized_range; mpmath em subconjunto", "python": sys.version.split()[0],
                      "scipy": scipy.__version__, "mpmath": mp.__version__},
    }
    (OUT / "expected.json").write_text(json.dumps(expected, indent=1) + "\n")
    print(len(points), "pontos;", len(checks), "verificações mpmath")
    for c, (k, df, level) in zip(checks, MP_POINTS):
        sc = float(stats.studentized_range.cdf(float(c["q"]), k, df))
        print(c["k"], c["df"], c["q"], c["cdfMpmath"], "scipy-mpmath:", sc - float(c["cdfMpmath"]))


if __name__ == "__main__":
    main()
