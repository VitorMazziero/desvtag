"""Gera os casos de validação de `desirability_optimization`.

Referências independentes, escritas sem usar o código Rust:
- ajuste dos modelos: NumPy (`lstsq`, inversa de XᵀX) sobre os dados sintéticos;
- desejabilidade individual e global: fórmulas de Derringer e Suich implementadas aqui;
- ótimo: **busca exaustiva** numa malha densa da região (união dos intervalos observados e
  alavancagem de predição ≤ maior alavancagem dos ensaios), que não depende de nenhum algoritmo de
  otimização;
- sondagens: valores previstos, intervalos (confiança da média e de predição), desejabilidades e
  indicador de extrapolação em pontos escolhidos.
"""
import importlib.util
import json
from itertools import product
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("surf", HERE / "make_surface_cases.py")
surf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(surf)

ROOT = HERE.parents[0] / "cases" / "desirability_optimization"
FEAS = 1e-9


def d_individual(goal, y):
    t = goal["type"]
    if t == "maximize":
        L, T, s = goal["low"], goal["target"], goal["shape"]
        return 0.0 if y <= L else 1.0 if y >= T else ((y - L) / (T - L)) ** s
    if t == "minimize":
        T, U, s = goal["target"], goal["high"], goal["shape"]
        return 1.0 if y <= T else 0.0 if y >= U else ((U - y) / (U - T)) ** s
    if t == "target":
        L, T, U = goal["low"], goal["target"], goal["high"]
        if y < L or y > U:
            return 0.0
        return ((y - L) / (T - L)) ** goal["shapeLow"] if y <= T else ((U - y) / (U - T)) ** goal["shapeHigh"]
    L, U = goal["low"], goal["high"]
    return 1.0 if L <= y <= U else 0.0


def d_global(ds, ws):
    if any(d <= 0 for d in ds):
        return 0.0
    return float(np.exp(sum(w * np.log(d) for d, w in zip(ds, ws)) / sum(ws)))


FULL = {2: ["A", "B", "AA", "BB", "AB"], 3: ["A", "B", "C", "AA", "BB", "CC", "AB", "AC", "BC"]}


class Model:
    def __init__(self, coded, y, k, alpha):
        self.k = k
        self.mon = surf.monomials(k, FULL[k])
        X = np.array([surf.design_row(self.mon, r) for r in coded])
        self.xtx_inv = np.linalg.inv(X.T @ X)
        self.beta = self.xtx_inv @ X.T @ np.array(y)
        n, p = X.shape
        res = np.array(y) - X @ self.beta
        self.df = n - p
        self.sigma = float(np.sqrt(res @ res / self.df))
        self.hmax = float(np.einsum("ij,jk,ik->i", X, self.xtx_inv, X).max())
        self.tc = float(stats.t.ppf(1 - alpha / 2, self.df))
        self.ymin, self.ymax = float(min(y)), float(max(y))

    def row(self, x):
        return np.array(surf.design_row(self.mon, x))

    def predict(self, x):
        r = self.row(x)
        return float(r @ self.beta), float(r @ self.xtx_inv @ r)


def truth(coded, b0, lin, quad, cross):
    return surf.surface_truth(coded, b0, lin, quad, cross)


def build(name, title, k, design_rows, truths, noise, seed, goals, limits, importances, lows, highs, alpha=0.05,
          grid_n=None, location_check=True):
    rng = np.random.default_rng(seed)
    coded = np.array(design_rows, float)
    ys = [np.round(truth(coded, *t) + rng.normal(0, noise, len(coded)), 3) for t in truths]
    center, half = (np.array(highs, float) + np.array(lows, float)) / 2, (np.array(highs, float) - np.array(lows, float)) / 2
    real = center + coded * half
    models = [Model(coded, y, k, alpha) for y in ys]
    # região: intervalo observado (em codificado) e alavancagem
    clo, chi = coded.min(axis=0), coded.max(axis=0)
    n_axis = grid_n or {2: 401, 3: 61}[k]
    axes = [np.linspace(clo[j], chi[j], n_axis) for j in range(k)]
    mesh = np.array(list(product(*axes)))
    cols = {}
    for i, m in enumerate(models):
        R = np.array([surf.design_row(m.mon, x) for x in mesh])
        y = R @ m.beta
        q = np.einsum("ij,jk,ik->i", R, m.xtx_inv, R)
        cols[i] = (y, q)
    feasible = np.ones(len(mesh), bool)
    for i, m in enumerate(models):
        y, q = cols[i]
        feasible &= q <= m.hmax * (1 + 1e-9)
        lim = limits[i]
        scale = m.ymax - m.ymin
        if lim.get("min") is not None:
            feasible &= (lim["min"] - y) / scale <= FEAS
        if lim.get("max") is not None:
            feasible &= (y - lim["max"]) / scale <= FEAS
    D = np.zeros(len(mesh))
    for idx in np.flatnonzero(feasible):
        ds = [d_individual(goals[i], cols[i][0][idx]) for i in range(len(models))]
        D[idx] = d_global(ds, importances)
    best = int(np.argmax(np.where(feasible, D, -1)))
    feasible_count = int(feasible.sum())
    nonzero = int((D > 0).sum())
    status = "infeasible" if feasible_count == 0 else ("onlyZeroDesirability" if nonzero == 0 else "found")
    # sondagens
    probes = [np.zeros(k), clo * 0.5 + chi * 0.5, chi * 0.8, clo * 0.8, np.array([0.3 * (j + 1) for j in range(k)]) % 1.0,
              chi * 1.3]
    probe_out = []
    for x in probes:
        entry = {"coded": x.tolist(), "responses": []}
        ds = []
        extrapolated = bool(np.any(x < clo - 1e-9) or np.any(x > chi + 1e-9))
        ratios = []
        for i, m in enumerate(models):
            fit, q = m.predict(x)
            ratios.append(q / m.hmax)
            half_mean = m.tc * m.sigma * np.sqrt(q)
            half_new = m.tc * m.sigma * np.sqrt(1 + q)
            d = d_individual(goals[i], fit)
            ds.append(d)
            entry["responses"].append({"fitted": fit, "meanLower": fit - half_mean, "meanUpper": fit + half_mean,
                                       "predLower": fit - half_new, "predUpper": fit + half_new, "desirability": d})
        entry["global"] = d_global(ds, importances)
        entry["extrapolated"] = bool(extrapolated or max(ratios) > 1 + 1e-9)
        probe_out.append(entry)
    config = {
        "method": "desirability_optimization", "title": title,
        "factors": [{"id": f"f{i + 1}", "name": f"F{i + 1}", "low": lows[i], "high": highs[i]} for i in range(k)],
        "responses": [{"id": f"r{i + 1}", "terms": FULL[k], "goal": goals[i], "importance": importances[i],
                       "limit": limits[i]} for i in range(len(models))],
        "alpha": alpha, "seed": 20261101, "starts": 40,
    }
    expected = {"reference": {
        "status": status, "feasibleCount": feasible_count, "nonzeroCount": nonzero,
        "bestD": float(D[best]) if feasible_count else 0.0,
        "bestCoded": mesh[best].tolist() if status == "found" else None,
        "locationCheck": bool(location_check and status == "found"),
        "gridResolution": float((chi[0] - clo[0]) / (n_axis - 1)),
        "probes": probe_out,
        "coefficients": [m.beta.tolist() for m in models],
    }, "software": {"numpy": np.__version__, "scipy": scipy.__version__}}
    data_header = ",".join([f"F{i + 1}" for i in range(k)] + [f"R{i + 1}" for i in range(len(models))])
    lines = [data_header]
    for r, *ys_row in zip(real.tolist(), *[y.tolist() for y in ys]):
        lines.append(",".join(repr(round(v, 9)) for v in r) + "," + ",".join(repr(v) for v in ys_row))
    return {"name": name, "config": config, "expected": expected, "csv": "\n".join(lines) + "\n"}


def cases():
    out = []
    c2, _, _ = surf.central_composite(2, "rotatable")
    c2 = c2 + [[0.0, 0.0]] * 5
    c3, _, _ = surf.central_composite(3, "rotatable")
    c3 = c3 + [[0.0, 0.0, 0.0]] * 5
    bb3 = surf.box_behnken(3) + [[0.0, 0.0, 0.0]] * 3
    nolimit = {"min": None, "max": None}
    out.append(build("001-um-resposta-maximizar", "Uma resposta (maximizar) com ótimo interior, CCD de 2 fatores", 2, c2,
                     [(50.0, [3.0, -2.0], [-4.0, -3.0], {(0, 1): 1.5})], 0.4, 201,
                     [{"type": "maximize", "low": 40.0, "target": 56.0, "shape": 1.0}], [nolimit], [1.0], [30, 5], [40, 8]))
    out.append(build("002-duas-respostas-conflito", "Duas respostas em conflito (maximizar e minimizar) com limite obrigatório e pesos, DCCR de 3 fatores", 3, c3,
                     [(100.0, [5.0, 3.0, -1.0], [-6.0, -4.0, -3.0], {(0, 1): 1.2}),
                      (20.0, [4.0, -3.0, 2.0], [2.0, 1.0, 1.5], {})], 0.5, 202,
                     [{"type": "maximize", "low": 80.0, "target": 115.0, "shape": 1.0},
                      {"type": "minimize", "target": 12.0, "high": 30.0, "shape": 2.0}],
                     [{"min": 95.0, "max": None}, nolimit], [2.0, 1.0], [20, 3, 1], [40, 7, 2]))
    out.append(build("003-alvo-e-faixa", "Alvo em uma resposta e faixa em outra, Box–Behnken de 3 fatores", 3, bb3,
                     [(60.0, [4.0, -2.0, 1.0], [-3.0, -2.0, -1.0], {(0, 2): 1.0}),
                      (15.0, [-1.0, 2.0, 0.5], [1.5, 0.5, 1.0], {(1, 2): 0.8})], 0.3, 203,
                     [{"type": "target", "low": 50.0, "target": 62.0, "high": 72.0, "shapeLow": 1.0, "shapeHigh": 1.5},
                      {"type": "range", "low": 14.0, "high": 18.0}],
                     [nolimit, nolimit], [1.0, 1.0], [10, 0, 100], [20, 10, 200], location_check=False))
    out.append(build("004-otimo-na-fronteira", "Máximo na fronteira da região (resposta quase linear), CCD de 2 fatores", 2, c2,
                     [(10.0, [4.0, 1.0], [-0.2, -0.1], {})], 0.2, 204,
                     [{"type": "maximize", "low": 5.0, "target": 20.0, "shape": 1.0}], [nolimit], [1.0], [0, 0], [10, 10]))
    out.append(build("005-regiao-inviavel", "Limite obrigatório inatingível: nenhum ponto viável", 2, c2,
                     [(50.0, [3.0, -2.0], [-4.0, -3.0], {(0, 1): 1.5})], 0.4, 205,
                     [{"type": "maximize", "low": 40.0, "target": 56.0, "shape": 1.0}],
                     [{"min": 500.0, "max": None}], [1.0], [30, 5], [40, 8]))
    out.append(build("006-desejabilidade-zero", "Faixa inatingível: pontos viáveis, mas desejabilidade zero em toda a região", 2, c2,
                     [(50.0, [3.0, -2.0], [-4.0, -3.0], {(0, 1): 1.5})], 0.4, 206,
                     [{"type": "range", "low": 200.0, "high": 210.0}], [nolimit], [1.0], [30, 5], [40, 8]))
    return out


README = """# desirability_optimization / {name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{title}. A solução encontrada pela busca (hipercubo latino com semente + Nelder–Mead com projeção) é pelo menos tão boa quanto o melhor ponto de uma **busca exaustiva** numa malha densa da região viável, e as previsões, intervalos e desejabilidades do motor concordam com a referência independente em pontos de sondagem?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng`) a partir de superfícies quadráticas conhecidas mais ruído normal, arredondados a 3 casas. `input.csv` tem os valores **reais** dos fatores e as respostas.

## Configuração

`config.json`: fatores e níveis, termos (modelo completo de segunda ordem), objetivo, limite obrigatório e importância de cada resposta, α, semente e número de inícios.

## Referência independente

NumPy {numpy} (`lstsq`, inversa de XᵀX), SciPy {scipy} (`t`); desejabilidades de Derringer e Suich; **busca exaustiva** na malha da região (intervalo observado de cada fator e alavancagem de predição não superior à maior dos ensaios), sem algoritmo de otimização. [Método](../../../../docs/metodos/desejabilidade.md) e [busca](../../../../docs/metodos/busca-otimizacao.md).

## Resultados esperados e tolerâncias

`expected.json`. Previsões e intervalos: erro relativo ≤ 1e-8; desejabilidades ≤ 1e-9. O melhor `D` do motor deve ser **≥ o da busca exaustiva − 1e-9** e **≤ ele + 5e-3** (resolução da malha); a posição do ótimo deve concordar até 0,05 em unidades codificadas quando o máximo é único.

## Diferenças admitidas

Nenhuma além da tolerância; o motor refina além da malha.

## Execução

`cargo test -p optima-core --test optimization_validation` e `npm test` (paridade WebAssembly). Regenerar: `python validation/tools/make_optimization_cases.py`.
"""


def main():
    for c in cases():
        d = ROOT / c["name"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "config.json").write_text(json.dumps(c["config"], indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        (d / "expected.json").write_text(json.dumps(c["expected"], indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        (d / "input.csv").write_text(c["csv"], encoding="utf-8")
        (d / "README.md").write_text(README.format(name=c["name"], title=c["config"]["title"], numpy=np.__version__,
                                                   scipy=scipy.__version__), encoding="utf-8")
        r = c["expected"]["reference"]
        print(c["name"], r["status"], round(r["bestD"], 4), r["feasibleCount"], r["nonzeroCount"])


if __name__ == "__main__":
    main()
