"""Gera os casos de validação de `two_level_model_selection` (ET14-T03).

Fracionários regulares e Plackett–Burman (ET28 T03): as colunas de interação confundidas com colunas
anteriores são identificadas em ordem de termos (a coluna posterior é a aliasada, residual da regressão
nas colunas independentes anteriores ≈ 0); o ajuste usa só as colunas independentes (statsmodels), o
valor-p das aliasadas é indefinido e elas nunca são candidatas à remoção. Parâmetros = posto.

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


def base_points(k, kind):
    """Pontos do planejamento básico em níveis codificados; `kind` descreve fracionário ou PB."""
    if kind is None:
        pts = [list(p) for p in itertools.product([-1.0, 1.0], repeat=k)]
        # Ordem padrão com o primeiro fator variando mais rápido, como nas matrizes do aplicativo.
        return [[p[j] for j in range(k)] for p in sorted(pts, key=lambda p: tuple(reversed(p)))]
    if kind["type"] == "fractional":
        gens = [g.split("=")[1] for g in kind["generators"]]
        base = k - len(gens)
        full = [list(p) for p in itertools.product([-1.0, 1.0], repeat=base)]
        full = [list(p) for p in sorted(full, key=lambda p: tuple(reversed(p)))]
        for row in full:
            for g in gens:
                value = 1.0
                for letter in g:
                    value *= row[ord(letter) - ord("A")]
                row.append(value)
        return full
    # Plackett–Burman de 12 ensaios: linha geradora cíclica e linha final toda negativa.
    generator = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1]
    rows = [[float(generator[(j - i) % 11]) for j in range(11)] for i in range(11)] + [[-1.0] * 11]
    return [row[:k] for row in rows]


def design(k, replicates, centers, rng, truth, sd, kind=None):
    pts = base_points(k, kind)
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


def independent_columns(cols):
    """Colunas básicas: o aplicativo usa QR com pivoteamento sobre colunas de norma 1 e escolhe, a cada
    passo, a coluna de maior norma restante (empate: a primeira); o posto é o número de passos com norma
    restante acima de max(m, n)·ε vezes a primeira. Reproduzido aqui por Gram–Schmidt (independente do
    código do aplicativo). Em aliasing exato (desenhos regulares) a escolha é a primeira coluna do
    grupo; em colinearidade parcial (Plackett–Burman) é a de maior contribuição, por convenção."""
    m = len(cols[0])
    units = [c / np.linalg.norm(c) for c in cols]
    residual = [u.copy() for u in units]
    remaining = list(range(len(cols)))
    kept, first = [], None
    tol = max(m, len(cols)) * np.finfo(float).eps
    while remaining and len(kept) < m:
        norms = {j: float(np.linalg.norm(residual[j])) for j in remaining}
        top = max(norms.values())
        best = min(j for j in remaining if norms[j] >= top * (1 - 1e-12))
        if first is None:
            first = top
        if top <= tol * first:
            break
        kept.append(best)
        remaining.remove(best)
        q = residual[best] / np.linalg.norm(residual[best])
        for j in remaining:
            residual[j] = residual[j] - (q @ residual[j]) * q
    return sorted(kept)


def fit(terms, x, y, curvature):
    cols = [np.ones(len(y))] + [column(t, x) for t in terms]
    if curvature is not None:
        cols.append(curvature)
    kept = independent_columns(cols)
    X = np.column_stack([cols[j] for j in kept])
    model = sm.OLS(y, X).fit()
    n, k = len(y), X.shape[1]
    rss = float(model.ssr)
    influence = OLSInfluence(model)
    # Alavanca 1 (ensaio sem réplica ajustado exatamente): PRESS indefinido; o quociente residual/(1−h)
    # seria ruído de arredondamento.
    saturated_point = bool(np.any(influence.hat_matrix_diag >= 1 - 1e-9))
    press = float("nan") if saturated_point else float((influence.resid_press ** 2).sum())
    sst = float(((y - y.mean()) ** 2).sum())
    aic, bic = float(model.aic), float(model.bic)
    aicc = aic + 2 * k * (k + 1) / (n - k - 1) if n - k - 1 > 0 else None
    # Erro puro: linhas com os mesmos níveis codificados.
    groups = {}
    for row, value in zip(x, y):
        groups.setdefault(tuple(float(v) + 0.0 for v in row), []).append(value)
    ss_pe = sum(float(((np.array(v) - np.mean(v)) ** 2).sum()) for v in groups.values())
    df_pe = len(y) - len(groups)
    df_res = int(model.df_resid)
    df_lof = df_res - df_pe
    lof_p = None
    if df_pe > 0 and df_lof > 0 and ss_pe > 0:
        f = ((rss - ss_pe) / df_lof) / (ss_pe / df_pe)
        lof_p = float(stats.f.sf(f, df_lof, df_pe))
    # Valor-p por termo (posição em `terms`): indefinido (NaN) quando a coluna foi aliasada.
    pvalues = np.full(len(terms), np.nan)
    for position, j in enumerate(kept):
        if 1 <= j <= len(terms):
            pvalues[j - 1] = model.pvalues[position]
    model.term_pvalues = pvalues
    return model, {
        "parameters": k, "df_error": df_res, "r2": float(model.rsquared), "adj_r2": float(model.rsquared_adj),
        "pred_r2": 1 - press / sst, "press": press, "rmse": float(np.sqrt(rss / df_res)), "model_p": float(model.f_pvalue),
        "lof_p": lof_p, "aic": aic, "aicc": aicc, "bic": bic,
    }


def run(k, replicates, centers, seed, truth, sd, alpha, curvature_on, kind=None, start=None):
    rng = np.random.default_rng(seed)
    x, y = design(k, replicates, centers, rng, truth, sd, kind)
    is_center = np.all(x == 0.0, axis=1)
    curvature = is_center.astype(float) if curvature_on and is_center.any() and (~is_center).any() else None
    low, high = [10.0 * (i + 1) for i in range(k)], [10.0 * (i + 1) + 20.0 for i in range(k)]
    # Modelo completo (efeitos principais e todas as interações) e modelo de partida da eliminação.
    _, full = fit(terms_of(k), x, y, curvature)
    terms = [tuple(t) for t in start] if start else terms_of(k)
    model, first = fit(terms, x, y, curvature)
    steps = [{"removed": None, "metrics": first, "n_terms": len(terms)}]
    stopped = "no_candidate"
    while True:
        pvals = model.term_pvalues
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
    return {"kind": kind, "start": start, "k": k, "alpha": alpha, "curvature": curvature is not None, "low": low, "high": high, "real": real,
            "y": [float(v) for v in y], "full": full, "steps": steps, "stopped": stopped}


def finite(value):
    """JSON válido: valores não finitos (PRESS com alavanca 1, por exemplo) viram null = indefinido."""
    if isinstance(value, float):
        return value if np.isfinite(value) else None
    if isinstance(value, dict):
        return {key: finite(item) for key, item in value.items()}
    if isinstance(value, list):
        return [finite(item) for item in value]
    return value


def main():
    np.seterr(all="ignore")
    ROOT.mkdir(parents=True, exist_ok=True)
    cases = [
        {"id": "fatorial-2-3-com-curvatura", **run(3, 2, 3, 21, lambda p: 6 + 2.0 * p[0] - 1.5 * p[2] + 1.2 * p[0] * p[1] + 1.5, 0.6, 0.05, True)},
        {"id": "fatorial-2-4-sem-curvatura", **run(4, 1, 3, 22, lambda p: 4 + 1.8 * p[0] - 1.2 * p[3] + 0.9 * p[1] * p[2], 0.5, 0.05, False)},
        {"id": "fatorial-2-2-tres-repeticoes", **run(2, 3, 2, 23, lambda p: 3 + 2.5 * p[0] + 0.1 * p[1], 0.4, 0.05, True)},
        {"id": "fatorial-2-3-modelo-cheio-significativo", **run(3, 2, 0, 24, lambda p: 5 + 3 * p[0] + 2 * p[1] + 1.5 * p[2] + 2 * p[0] * p[1] - 1.5 * p[1] * p[2], 0.3, 0.05, False)},
        # Fracionário 2^(4-1) IV: AB~CD, AC~BD, AD~BC (três interações aliasadas, valor-p indefinido).
        {"id": "fracionario-2-4-1-resolucao-iv", **run(4, 2, 3, 31, lambda p: 5 + 2.2 * p[0] - 1.4 * p[1] + 1.1 * p[0] * p[1], 0.5, 0.05, True, {"type": "fractional", "generators": ["D=ABC"]})},
        # Fracionário 2^(5-1) V: todas as interações de dois fatores separáveis, duas repetições.
        {"id": "fracionario-2-5-1-resolucao-v", **run(5, 2, 2, 32, lambda p: 3 + 1.6 * p[0] + 1.2 * p[2] - 0.9 * p[4] + 1.0 * p[1] * p[3], 0.45, 0.05, False, {"type": "fractional", "generators": ["E=ABCD"]})},
        # Plackett–Burman de 12 ensaios, 4 fatores: efeitos principais e interações parcialmente correlacionados,
        # sem aliasing exato (colunas independentes), então os valores-p independem da base escolhida.
        {"id": "plackett-burman-12-quatro-fatores", **run(4, 1, 3, 33, lambda p: 4 + 2.0 * p[0] - 1.3 * p[3] + 0.8 * p[1] * p[2], 0.5, 0.05, True, {"type": "plackett_burman", "runs": 12})},
        # Plackett–Burman de 12 ensaios, 5 fatores, partindo do modelo só de efeitos principais (uso típico de triagem).
        {"id": "plackett-burman-12-cinco-fatores-triagem", **run(5, 1, 2, 35, lambda p: 4 + 2.0 * p[0] - 1.3 * p[3] + 0.6 * p[1], 0.5, 0.05, True, {"type": "plackett_burman", "runs": 12}, [["main", i] for i in range(5)])},
        # Fracionário 2^(5-2) com mais aliasing e alfa mais permissivo.
        {"id": "fracionario-2-5-2-resolucao-iii", **run(5, 2, 0, 34, lambda p: 6 + 2.5 * p[0] + 1.5 * p[1] - 1.0 * p[2], 0.4, 0.10, False, {"type": "fractional", "generators": ["D=AB", "E=AC"]})},
    ]
    (ROOT / "selection.json").write_text(json.dumps(finite({"id": "two_level_model_selection", "cases": cases}), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print({c["id"]: (len(c["steps"]), c["stopped"]) for c in cases})


if __name__ == "__main__":
    main()
