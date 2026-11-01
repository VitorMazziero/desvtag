"""Gera os casos de validação de `linear_model` a partir do NIST StRD (Linear Least Squares).

Referência independente: mínimos quadrados **exatos** em aritmética racional (`fractions`) sobre os
números binários de 64 bits que o aplicativo lê do CSV (equações normais resolvidas sem
arredondamento), com raízes quadradas em 60 dígitos (`mpmath`). Os valores certificados do NIST são
copiados como texto, e o LRE (dígitos corretos) da referência exata contra eles é registrado: para
conjuntos cujos decimais não são exatos em binário (Filip, Wampler 4 e 5) ele mostra o quanto a
simples leitura em binário já altera a solução.

Uso: python make_regression_cases.py <pasta com os .dat do NIST>
"""
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

import mpmath as mp
import numpy as np

mp.mp.dps = 60
OUT = Path(__file__).resolve().parents[1] / "cases" / "linear_model"
BASE = "https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/"

# nome -> (grau polinomial ou 0 para multivariado, intercepto, dificuldade declarada pelo NIST)
CASES = [
    ("norris", "Norris", 1, True),
    ("pontius", "Pontius", 2, True),
    ("noint1", "NoInt1", 1, False),
    ("noint2", "NoInt2", 1, False),
    ("longley", "Longley", 0, True),
    ("filip", "Filip", 10, True),
    ("wampler1", "Wampler1", 5, True),
    ("wampler2", "Wampler2", 5, True),
    ("wampler3", "Wampler3", 5, True),
    ("wampler4", "Wampler4", 5, True),
    ("wampler5", "Wampler5", 5, True),
]

# Dígitos corretos mínimos exigidos (LRE) por caso, na ordem: coeficientes, erros-padrão, σ, R²,
# SQ modelo, SQ resíduo, F (None: ajuste perfeito, sem F). Regra: piso do LRE medido menos 1 dígito,
# no máximo 13 (margem para diferenças de plataforma e de compilador); medidos em README.md do caso.
MIN_LRE = {
    "norris": (11, 12, 12, 13, 13, 12, 12),
    "pontius": (10, 11, 11, 13, 13, 10, 10),
    "noint1": (13, 13, 13, 13, 13, 13, 13),
    "noint2": (13, 13, 13, 13, 13, 13, 13),
    "longley": (10, 11, 11, 13, 13, 11, 11),
    "filip": (6, 6, 7, 10, 10, 7, 7),
    "wampler1": (8, 13, 13, 13, 13, 13, None),
    "wampler2": (12, 13, 13, 13, 13, 13, None),
    "wampler3": (8, 12, 12, 13, 13, 12, 12),
    "wampler4": (6, 13, 13, 13, 13, 13, 13),
    "wampler5": (4, 13, 13, 12, 13, 13, 13),
}
LRE_KEYS = ("coefficients", "stdErrors", "sigma", "rSquared", "ssModel", "ssResidual", "f")


def parse(path: Path):
    lines = path.read_text().splitlines()
    last = max(i for i, l in enumerate(lines) if l.strip().startswith("Data:"))
    names = lines[last].split()[1:]
    rows = [l.split() for l in lines[last + 1 :] if l.strip()]
    text = "\n".join(lines[:last])
    params = [
        (int(m.group(1)), m.group(2), m.group(3))
        for m in re.finditer(r"^\s+B(\d+)\s+(\S+)\s+(\S+)\s*$", text, re.M)
    ]
    certified = {
        "coefficients": [{"index": i, "estimate": e, "sd": s} for i, e, s in params],
        "residualSd": re.search(r"Residual\s+Standard Deviation\s+(\S+)", text).group(1),
        "rSquared": re.search(r"R-Squared\s+(\S+)", text).group(1),
    }
    reg = re.search(r"^Regression\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)", text, re.M)
    res = re.search(r"^Residual\s+(\d+)\s+(\S+)\s+(\S+)\s*$", text, re.M)
    certified["anova"] = {
        "dfModel": int(reg.group(1)),
        "ssModel": reg.group(2),
        "f": reg.group(4),
        "dfResidual": int(res.group(1)),
        "ssResidual": res.group(2),
    }
    return names, rows, certified


def solve_exact(a, b):
    """Resolve A·x = b (e A⁻¹ completa) por Gauss-Jordan exato."""
    n = len(a)
    m = [row[:] + [Fraction(int(i == j)) for j in range(n)] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        piv = next(r for r in range(col, n) if m[r][col] != 0)
        m[col], m[piv] = m[piv], m[col]
        p = m[col][col]
        m[col] = [v / p for v in m[col]]
        for r in range(n):
            if r != col and m[r][col] != 0:
                f = m[r][col]
                m[r] = [v - f * w for v, w in zip(m[r], m[col])]
    inv = [row[n : 2 * n] for row in m]
    x = [row[-1] for row in m]
    return x, inv


def fmt(q: Fraction) -> str:
    return mp.nstr(mp.mpf(q.numerator) / mp.mpf(q.denominator), 40)


def sqrt_fmt(q: Fraction) -> str:
    return mp.nstr(mp.sqrt(mp.mpf(q.numerator) / mp.mpf(q.denominator)), 40)


def lre(value, certified: str) -> float:
    c = mp.mpf(certified)
    v = mp.mpf(value)
    if c == 0:
        return float(-mp.log10(abs(v))) if v != 0 else 15.0
    err = abs(v - c) / abs(c)
    return 15.0 if err < mp.mpf("1e-15") else float(-mp.log10(err))


def build(slug, nist_name, degree, intercept, src_dir):
    names, rows, certified = parse(src_dir / f"{nist_name}.dat")
    response, predictors = names[0], names[1:]
    data = [[Fraction(float(v)) for v in r] for r in rows]  # binário de 64 bits exato
    y = [r[0] for r in data]
    cols = []
    terms = []
    if intercept:
        cols.append([Fraction(1)] * len(data))
    if degree:
        for d in range(1, degree + 1):
            cols.append([r[1] ** d for r in data])
            terms.append({"type": "main", "factor": predictors[0]} if d == 1 else {"type": "power", "factor": predictors[0], "degree": d})
    else:
        for j, name in enumerate(predictors):
            cols.append([r[1 + j] for r in data])
            terms.append({"type": "main", "factor": name})
    n, p = len(data), len(cols)
    xtx = [[sum(cols[i][k] * cols[j][k] for k in range(n)) for j in range(p)] for i in range(p)]
    xty = [sum(cols[i][k] * y[k] for k in range(n)) for i in range(p)]
    beta, inv = solve_exact(xtx, xty)
    sse = sum((y[k] - sum(beta[j] * cols[j][k] for j in range(p))) ** 2 for k in range(n))
    if intercept:
        mean = sum(y) / n
        sst, df_model, df_total = sum((v - mean) ** 2 for v in y), p - 1, n - 1
    else:
        sst, df_model, df_total = sum(v * v for v in y), p, n
    ssm, df_res = sst - sse, n - p
    sigma2 = sse / df_res
    se = [mp.sqrt(mp.mpf((sigma2 * inv[j][j]).numerator) / mp.mpf((sigma2 * inv[j][j]).denominator)) for j in range(p)]
    f_stat = (ssm / df_model) / (sse / df_res) if sse != 0 else None
    r2 = 1 - sse / sst
    exact = {
        "coefficients": [{"estimate": fmt(b), "sd": mp.nstr(s, 40)} for b, s in zip(beta, se)],
        "residualSd": sqrt_fmt(sigma2),
        "rSquared": fmt(r2),
        "ssModel": fmt(ssm),
        "ssResidual": fmt(sse),
        "ssTotal": fmt(sst),
        "f": fmt(f_stat) if f_stat is not None else None,
        "dfModel": df_model,
        "dfResidual": df_res,
        "dfTotal": df_total,
    }
    # LRE da referência exata (binária) contra os valores certificados do NIST.
    cert_lre = {
        "coefficients": min(lre(mp.mpf(e["estimate"]), c["estimate"]) for e, c in zip(exact["coefficients"], certified["coefficients"])),
        "residualSd": lre(mp.mpf(exact["residualSd"]), certified["residualSd"]),
        "rSquared": lre(mp.mpf(exact["rSquared"]), certified["rSquared"]),
    }
    # Verificação cruzada com NumPy (apenas conjuntos bem condicionados).
    xf = np.array([[float(v) for v in col] for col in cols]).T
    numpy_beta = np.linalg.lstsq(xf, np.array([float(v) for v in y]), rcond=None)[0]
    cross = float(min(lre(mp.mpf(float(nb)), exact["coefficients"][j]["estimate"]) for j, nb in enumerate(numpy_beta)))

    return {
        "names": names, "rows": rows, "terms": terms, "intercept": intercept, "certified": certified,
        "exact": exact, "certifiedLre": cert_lre, "numpyCrossLre": cross, "n": n, "p": p,
    }


def main():
    src_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for number, (slug, nist_name, degree, intercept) in enumerate(CASES, start=1):
        r = build(slug, nist_name, degree, intercept, src_dir)
        folder = OUT / f"{number:03d}-nist-{slug}"
        folder.mkdir(exist_ok=True)
        (folder / "input.csv").write_text(
            ",".join(r["names"]) + "\n" + "\n".join(",".join(row) for row in r["rows"]) + "\n"
        )
        (folder / "config.json").write_text(json.dumps({
            "method": "linear_model",
            "responseColumn": r["names"][0],
            "intercept": r["intercept"],
            "terms": r["terms"],
            "coding": "treatment",
            "confidenceLevel": 0.95,
        }, indent=2) + "\n")
        expected = {
            "n": r["n"],
            "columns": r["p"],
            "exactOnBinary64Inputs": r["exact"],
            "certifiedNist": r["certified"],
            "referenceVsCertifiedLre": r["certifiedLre"],
            "tolerances": {
                "minLre": dict(zip(LRE_KEYS, MIN_LRE[slug])),
                "note": "LRE = -log10(erro relativo) contra a referência exata sobre os binários de 64 bits; em ajustes perfeitos (SQE/SQT < 1e-20) SQE, σ e erros-padrão usam erro absoluto na escala dos dados e F é omitido",
            },
            "reference": {
                "software": "Python fractions (equações normais exatas) + mpmath",
                "python": sys.version.split()[0],
                "numpy": np.__version__,
                "mpmath": mp.__version__,
                "source": BASE + nist_name + ".dat",
            },
        }
        (folder / "expected.json").write_text(json.dumps(expected, indent=2) + "\n")
        lre_note = ", ".join(f"{k} ≥ {v}" for k, v in zip(LRE_KEYS, MIN_LRE[slug]) if v is not None)
        (folder / "README.md").write_text(f"""# linear_model / {folder.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O ajuste por mínimos quadrados do conjunto NIST StRD `{nist_name}` ({r["n"]} observações, {r["p"]} parâmetros{"" if r["intercept"] else ", sem intercepto"}) atinge a exatidão exigida em coeficientes, erros-padrão, desvio residual, R², somas de quadrados e F, e o motor avisa quando o problema é mal condicionado?

## Dados

Conjunto do NIST Statistical Reference Datasets, Linear Least Squares Regression ({BASE}{nist_name}.dat), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv`. Os valores certificados estão em `expected.json › certifiedNist`.

## Configuração

`config.json`: método `linear_model`, intercepto `{str(r["intercept"]).lower()}`, termos {json.dumps(r["terms"], ensure_ascii=False)}.

## Referência independente

Mínimos quadrados **exatos** em aritmética racional (`fractions`) sobre os números binários de 64 bits lidos do CSV; raízes quadradas em 60 dígitos (`mpmath` {mp.__version__}). Gerado por `validation/tools/make_regression_cases.py`. O LRE da referência exata contra os valores certificados do NIST está em `referenceVsCertifiedLre` (coeficientes {r["certifiedLre"]["coefficients"]:.1f} dígitos): a diferença vem apenas de os decimais do arquivo não serem exatos em binário.

## Resultados esperados e tolerâncias

`expected.json › exactOnBinary64Inputs` e `tolerances.minLre` (dígitos corretos exigidos: {lre_note}). Regra: piso do LRE medido menos 1 dígito, máximo 13. Em ajustes perfeitos (SQE/SQT < 1e-20) SQE, σ e erros-padrão usam erro absoluto na escala dos dados e F é omitido.

## Diferenças admitidas

Somente as de conversão decimal→binário descritas acima e a tolerância em dígitos.

## Execução

`app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly). Valores medidos: [regressão linear](../../../../docs/metodos/regressao-linear.md#10-validação).
""")
        print(f"{folder.name}: n={r['n']} p={r['p']} LRE(ref vs NIST)={r['certifiedLre']} numpy-vs-exact={r['numpyCrossLre']:.1f}")


if __name__ == "__main__":
    main()
