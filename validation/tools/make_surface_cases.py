"""Gera os casos de validação de `surface_design` (matrizes CCD e Box–Behnken) e de
`response_surface` (ajuste de segunda ordem, ANOVA, falta de ajuste, equação em unidades reais,
malha de predições e extrapolação).

Referências independentes, escritas sem usar o código Rust:
- matrizes: enumeração em Python (ordem padrão de Yates), distâncias axiais pela definição e
  verificação da condição de rotacionalidade (Box e Hunter, 1957) pelos momentos da matriz;
- análise: NumPy (`lstsq`, inversa de XᵀX), SciPy (`t`, `f`); equação em unidades reais por um
  **segundo ajuste** dos valores ajustados com colunas nos fatores reais (sem usar a fórmula de
  substituição);
  falta de ajuste e erro puro pela definição; alavancagem pela fórmula x₀ᵀ(XᵀX)⁻¹x₀.
"""
import json
from itertools import combinations, product
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

ROOT = Path(__file__).resolve().parents[1] / "cases"


def full_factorial(k):
    # Ordem padrão: o primeiro fator varia mais rápido.
    return [[(-1.0, 1.0)[(i >> j) & 1] for j in range(k)] for i in range(2 ** k)]


def central_composite(k, alpha_kind, inscribed=False, alpha=None):
    cube = full_factorial(k)
    f = len(cube)
    a = {"rotatable": f ** 0.25, "face": 1.0, "custom": alpha}[alpha_kind]
    cube_level, axial_level = (1.0 / a, 1.0) if inscribed else (1.0, a)
    rows = [[c * cube_level for c in r] for r in cube]
    for i in range(k):
        for s in (-1.0, 1.0):
            r = [0.0] * k
            r[i] = s * axial_level
            rows.append(r)
    return rows, a, f


def box_behnken(k):
    rows = []
    for i, j in combinations(range(k), 2):
        for a, b in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            r = [0.0] * k
            r[i], r[j] = float(a), float(b)
            rows.append(r)
    return rows


def rotatable(rows, tol=1e-9):
    """Condição de Box–Hunter: momentos pares de ordem 4 = 3 × momentos cruzados e ordem 2 iguais."""
    x = np.array(rows)
    n, k = x.shape
    odd = any(abs((x[:, i] * x[:, j] * x[:, l]).sum()) > tol for i in range(k) for j in range(k) for l in range(k))
    m2 = [(x[:, i] ** 2).sum() for i in range(k)]
    ok = not odd and max(m2) - min(m2) < tol
    for i in range(k):
        for j in range(i + 1, k):
            ok = ok and abs((x[:, i] ** 4).sum() - 3 * (x[:, i] ** 2 * x[:, j] ** 2).sum()) < tol * n
    return bool(ok)


def matrix_cases():
    cases = []
    for k, kind, inscribed, alpha in [
        (2, "rotatable", False, None), (3, "rotatable", False, None), (4, "rotatable", False, None),
        (2, "face", False, None), (3, "face", False, None), (3, "custom", False, 1.5),
        (2, "rotatable", True, None), (3, "custom", True, 2.0), (5, "rotatable", False, None),
    ]:
        rows, a, f = central_composite(k, kind, inscribed, alpha)
        cases.append({
            "kind": "centralComposite", "k": k, "axial": kind, "inscribed": inscribed,
            "alpha": a, "factorialPoints": f, "axialPoints": 2 * k, "rows": rows,
            "rotatable": rotatable(rows),
        })
    for k in (3, 4, 5):
        rows = box_behnken(k)
        cases.append({"kind": "boxBehnken", "k": k, "alpha": None, "rows": rows,
                      "factorialPoints": len(rows), "axialPoints": 0})
    return cases


# ------------------------------------------------------------------ análise

def monomials(k, terms):
    out = []
    for t in terms:
        idx = [ord(c) - 65 for c in t]
        out.append(("sq", idx[0]) if len(idx) == 2 and idx[0] == idx[1] else ("main", idx[0]) if len(idx) == 1 else ("x", idx[0], idx[1]))
    return out


def design_row(m, z):
    cols = [1.0]
    for t in m:
        cols.append(z[t[1]] if t[0] == "main" else z[t[1]] ** 2 if t[0] == "sq" else z[t[1]] * z[t[2]])
    return cols


def label(t, names):
    return names[t[1]] if t[0] == "main" else names[t[1]] + "²" if t[0] == "sq" else names[t[1]] + ":" + names[t[2]]


def analyse(name, title, names, lows, highs, coded_rows, terms, y, alpha=0.05, grid_axes=(0, 1)):
    k = len(names)
    low, high = np.array(lows, float), np.array(highs, float)
    center, half = (low + high) / 2, (high - low) / 2
    coded = np.array(coded_rows, float)
    real = center + coded * half
    m = monomials(k, terms)
    X = np.array([design_row(m, r) for r in coded])
    n, p = X.shape
    yv = np.array(y, float)
    xtx_inv = np.linalg.inv(X.T @ X)
    beta = xtx_inv @ X.T @ yv
    fitted = X @ beta
    resid = yv - fitted
    sse = float(resid @ resid)
    df_res = n - p
    sst = float(((yv - yv.mean()) ** 2).sum())
    ssm = sst - sse
    df_m = p - 1
    sigma2 = sse / df_res
    se = np.sqrt(sigma2 * np.diag(xtx_inv))
    t = beta / se
    pv = 2 * stats.t.sf(np.abs(t), df_res)
    tc = stats.t.ppf(1 - alpha / 2, df_res)
    f_stat = (ssm / df_m) / sigma2
    leverage = np.einsum("ij,jk,ik->i", X, xtx_inv, X)
    # falta de ajuste
    groups = {}
    for r, v in zip(np.round(coded, 9), yv):
        groups.setdefault(tuple(r), []).append(v)
    ss_pure = sum(((np.array(g) - np.mean(g)) ** 2).sum() for g in groups.values())
    df_pure = n - len(groups)
    lof = None
    if df_pure > 0 and df_res - df_pure > 0:
        ss_lof = sse - ss_pure
        df_lof = df_res - df_pure
        f_lof = (ss_lof / df_lof) / (ss_pure / df_pure)
        lof = {"ssPure": ss_pure, "dfPure": df_pure, "ssLof": ss_lof, "dfLof": df_lof,
               "f": f_lof, "p": float(stats.f.sf(f_lof, df_lof, df_pure))}
    # equação em unidades reais: segundo ajuste direto com os fatores reais
    cols_real = [("1",)] + [("z", i) for i in range(k)]
    for t_ in m:
        if t_[0] == "sq":
            cols_real.append(("sq", t_[1]))
        elif t_[0] == "x":
            cols_real.append(("x", t_[1], t_[2]))

    def real_row(z):
        out = []
        for c in cols_real:
            out.append(1.0 if c[0] == "1" else z[c[1]] if c[0] == "z" else z[c[1]] ** 2 if c[0] == "sq" else z[c[1]] * z[c[2]])
        return out

    Xr = np.array([real_row(r) for r in real])
    # O alvo são os valores ajustados: eles estão exatamente no espaço das colunas reais, mesmo em
    # modelos sem hierarquia (onde um ajuste livre de y teria mais parâmetros que o modelo).
    beta_real = np.linalg.lstsq(Xr, fitted, rcond=None)[0]
    equation_real = [{"term": "|".join(map(str, c)), "coefficient": float(b)} for c, b in zip(cols_real, beta_real)]
    # região e malha 5×5 nos eixos escolhidos, demais fatores no centro
    rmin, rmax = real.min(axis=0), real.max(axis=0)
    ax, ay = grid_axes
    xs, ys = np.linspace(rmin[ax], rmax[ax], 5), np.linspace(rmin[ay], rmax[ay], 5)
    hmax = float(leverage.max())
    grid = []
    for yy in ys:
        row = []
        for xx in xs:
            z = center.copy()
            z[ax], z[ay] = xx, yy
            c = (z - center) / half
            xr = np.array(design_row(m, c))
            h = float(xr @ xtx_inv @ xr)
            outside = bool(np.any(z < rmin - 1e-9 * np.maximum(1, half)) or np.any(z > rmax + 1e-9 * np.maximum(1, half)))
            row.append({"z": float(xr @ beta), "leverage": h, "extrapolated": bool(outside or h > hmax * (1 + 1e-9) + 1e-12)})
        grid.append(row)
    return {
        "name": name, "title": title,
        "config": {"method": "response_surface", "title": title, "responseColumn": "y",
                   "factors": [{"id": f"f{i + 1}", "name": names[i], "low": lows[i], "high": highs[i]} for i in range(k)],
                   "terms": terms, "alpha": alpha, "gridAxes": [ax, ay], "gridSteps": 5},
        "real": real.tolist(),
        "y": yv.tolist(),
        "expected": {"reference": {
            "labels": [label(t_, names) for t_ in m], "n": n, "p": p, "dfResidual": df_res,
            "coefficients": [{"coefficient": float(beta[i]), "stdError": float(se[i]), "t": float(t[i]),
                              "p": float(pv[i]), "ciLower": float(beta[i] - tc * se[i]),
                              "ciUpper": float(beta[i] + tc * se[i])} for i in range(p)],
            "anova": {"ssModel": ssm, "ssResidual": sse, "ssTotal": sst, "dfModel": df_m, "dfResidual": df_res,
                      "f": float(f_stat), "p": float(stats.f.sf(f_stat, df_m, df_res)),
                      "r2": 1 - sse / sst, "adjR2": 1 - (sse / df_res) / (sst / (n - 1))},
            "lackOfFit": lof, "fitted": fitted.tolist(), "leverage": leverage.tolist(),
            "maxLeverage": hmax, "equationReal": equation_real,
            "ranges": [{"min": float(rmin[i]), "max": float(rmax[i])} for i in range(k)],
            "grid": grid,
            "hierarchyGaps": [label(t_, names) for t_ in m
                              if (t_[0] == "sq" and ("main", t_[1]) not in m)
                              or (t_[0] == "x" and (("main", t_[1]) not in m or ("main", t_[2]) not in m))],
        }, "tolerances": {"relative": 1e-8, "absolute": 1e-9},
            "software": {"numpy": np.__version__, "scipy": scipy.__version__}},
    }


def surface_truth(coded, b0, lin, quad, cross):
    x = np.array(coded)
    y = b0 + x @ np.array(lin) + (x ** 2) @ np.array(quad)
    for (i, j), c in cross.items():
        y = y + c * x[:, i] * x[:, j]
    return y


def make(name, title, names, lows, highs, coded_rows, terms, truth, seed, noise, **kw):
    rng = np.random.default_rng(seed)
    y = np.round(surface_truth(coded_rows, *truth) + rng.normal(0, noise, len(coded_rows)), 3)
    return analyse(name, title, names, lows, highs, coded_rows, terms, y, **kw)


FULL2 = ["A", "B", "AA", "BB", "AB"]
FULL3 = ["A", "B", "C", "AA", "BB", "CC", "AB", "AC", "BC"]


def analysis_cases():
    out = []
    # 001: CCD rotatável 2 fatores, 5 centrais.
    rows, _, _ = central_composite(2, "rotatable")
    rows = rows + [[0.0, 0.0]] * 5
    out.append(make("001-ccd-rotacional-2-fatores", "CCD rotacional com 2 fatores, 5 pontos centrais e modelo completo",
                    ["Temperatura", "pH"], [30, 5], [40, 8], rows, FULL2,
                    (60.0, [3.0, -2.0], [-4.0, -3.0], {(0, 1): 1.5}), 101, 0.8))
    # 002: FCD 3 fatores, 6 centrais.
    rows, _, _ = central_composite(3, "face")
    rows = rows + [[0.0, 0.0, 0.0]] * 6
    out.append(make("002-fcd-3-fatores", "Composto de face centrada com 3 fatores, 6 pontos centrais e modelo completo",
                    ["Glicose", "Peptona", "Tempo"], [10, 2, 24], [30, 8, 72], rows, FULL3,
                    (45.0, [4.0, 2.5, -1.0], [-3.0, -2.0, -1.5], {(0, 1): 1.0, (1, 2): -0.8}), 102, 0.7,
                    grid_axes=(0, 2)))
    # 003: Box–Behnken 3 fatores, 3 centrais.
    rows = box_behnken(3) + [[0.0, 0.0, 0.0]] * 3
    out.append(make("003-box-behnken-3-fatores", "Box–Behnken com 3 fatores, 3 pontos centrais e modelo completo",
                    ["A", "B", "C"], [0, 10, 100], [10, 30, 300], rows, FULL3,
                    (30.0, [2.0, -3.0, 1.0], [-2.5, -1.0, -2.0], {(0, 2): 1.2}), 103, 0.5, grid_axes=(1, 2)))
    # 004: planejamento personalizado: pontos irregulares, um par repetido.
    rng = np.random.default_rng(104)
    pts = rng.uniform(-1, 1, size=(16, 3))
    pts = np.vstack([pts, pts[0], pts[5]])
    out.append(make("004-personalizado-3-fatores", "Planejamento personalizado (pontos irregulares, 2 repetições) com modelo completo",
                    ["X1", "X2", "X3"], [1, 20, -5], [5, 60, 5], pts.round(6).tolist(), FULL3,
                    (12.0, [1.0, 2.0, -1.0], [-1.5, 0.5, -2.0], {(0, 1): 0.7}), 104, 0.2))
    # 005: modelo reduzido sem principal de B (lacuna de hierarquia) sobre os dados do caso 001.
    first = out[0]
    rows1, _, _ = central_composite(2, "rotatable")
    rows1 = rows1 + [[0.0, 0.0]] * 5
    out.append(analyse("005-hierarquia-incompleta", "Modelo reduzido sem o efeito principal de B (B² e A:B sem hierarquia)",
                       ["Temperatura", "pH"], [30, 5], [40, 8], rows1, ["A", "AA", "BB", "AB"], first["y"]))
    # 006: um só ponto central: sem erro puro, falta de ajuste indisponível.
    rows, _, _ = central_composite(2, "rotatable")
    rows = rows + [[0.0, 0.0]]
    out.append(make("006-sem-erro-puro", "CCD com 2 fatores e um só ponto central: falta de ajuste indisponível",
                    ["A", "B"], [0, 0], [10, 10], rows, FULL2,
                    (20.0, [1.0, 2.0], [-1.0, -2.0], {(0, 1): 0.5}), 106, 0.3))
    return out


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


README = """# response_surface / {name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{title}. Coeficientes, erros-padrão, t, valores-p e intervalos (escala codificada), ANOVA, R² e R² ajustado, falta de ajuste e erro puro, equação em unidades reais, valores ajustados, alavancagens, intervalos experimentais e a malha 5×5 de predições com o indicador de extrapolação concordam com a referência independente?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng`) a partir de uma superfície quadrática conhecida mais ruído normal, arredondados a 3 casas. `input.csv` tem os valores **reais** dos fatores e a resposta `y`.

## Configuração

`config.json`: fatores e níveis (definem a codificação), termos ({terms}), α = {alpha} e os eixos da malha.

## Referência independente

NumPy {numpy} (`lstsq`, inversa de XᵀX) e SciPy {scipy} (`t`, `f`). A equação em unidades reais vem de **outro ajuste** dos valores ajustados, feito diretamente com os fatores reais; a falta de ajuste e o erro puro, pela definição; a extrapolação, pela alavancagem `x₀ᵀ(XᵀX)⁻¹x₀` comparada com a maior alavancagem dos ensaios e pelos intervalos observados. [Método](../../../docs/metodos/superficie-resposta.md).

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-8 + 1e-9 × escala.

## Diferenças admitidas

Nenhuma além da tolerância.

## Execução

`cargo test -p optima-core --test surface_validation` e `npm test` (paridade WebAssembly). Regenerar: `python validation/tools/make_surface_cases.py`.
"""


def main():
    write_json(ROOT / "surface_design" / "designs.json", {"id": "surface_design", "cases": matrix_cases()})
    for c in analysis_cases():
        d = ROOT / "response_surface" / c["name"]
        write_json(d / "config.json", c["config"])
        write_json(d / "expected.json", c["expected"])
        names = [f["name"] for f in c["config"]["factors"]]
        lines = [",".join(names + ["y"])]
        for r, y in zip(c["real"], c["y"]):
            lines.append(",".join(repr(round(v, 9)) for v in r) + "," + repr(y))
        (d / "input.csv").write_text("\n".join(lines) + "\n", encoding="utf-8")
        (d / "README.md").write_text(README.format(
            name=c["name"], title=c["title"], terms=", ".join(c["config"]["terms"]), alpha=c["config"]["alpha"],
            numpy=np.__version__, scipy=scipy.__version__), encoding="utf-8")
    print("casos gerados")


if __name__ == "__main__":
    main()
