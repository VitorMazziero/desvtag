"""ET25 T06: independent NumPy enumeration, conditional on block allocation.

The candidate geometry/model helpers are the independent Python reference, never Rust.
Enumerate multisets separately in each block; test stationarity with a fresh information
matrix for every within-block exchange. I averages prediction variance uniformly over
the declared blocks and spatial candidates, not according to experimental block sizes.
"""
import itertools
import json
import platform
from pathlib import Path

import numpy as np
import statsmodels.api as sm

from make_optimal_cases import candidates, coded_of, model_row, spec_dict

ROOT = Path(__file__).resolve().parents[1] / "cases" / "optimal_design"


def contrast(block, count):
    return [float(block == j) if block < count - 1 else -1. for j in range(count - 1)]


def reference(name, k, model, criterion, fixed, fixed_blocks, allocation, constraints=None):
    factors = [{"id": f"x{i+1}", "name": f"X{i+1}", "low": -1., "high": 1.} for i in range(k)]
    constraints = constraints or []
    spec = spec_dict(factors, model, criterion, len(fixed) + sum(allocation), 3, constraints, fixed, starts=10, seed=17)
    count = len(allocation)
    spec["blocks"] = {"labels": [f"Block {b+1}" for b in range(count)], "fixedBlocks": fixed_blocks, "newRuns": allocation}
    cands = candidates(factors, 3, constraints)
    row = lambda x, b: model_row(x, model) + contrast(b, count)
    rows = np.array([[row(x, b) for x, _ in cands] for b in range(count)])
    targets = rows.reshape(-1, rows.shape[-1])
    moment = targets.T @ targets / len(targets)
    fixed_rows = np.array([row(coded_of(factors, x), b) for x, b in zip(fixed, fixed_blocks)])
    p = rows.shape[-1]
    base = fixed_rows.T @ fixed_rows

    def evaluate(selection):
        expanded = [rows[b, i] for b, combo in enumerate(selection) for i in combo]
        info = base + sum((np.outer(r, r) for r in expanded), np.zeros((p, p)))
        if np.linalg.matrix_rank(info) < p:
            return None
        sign, logdet = np.linalg.slogdet(info)
        if sign <= 0:
            return None
        inverse = np.linalg.inv(info)
        variances = np.einsum("ij,jk,ik->i", targets, inverse, targets)
        average = float(np.trace(inverse @ moment))
        assert abs(average - variances.mean()) < 1e-9
        n = spec["runs"]
        return {"parameters": p, "logDet": float(logdet), "dEfficiency": float(np.exp(logdet/p)/n),
                "aEfficiency": float(p/(n*np.trace(inverse))), "gEfficiency": float(p/(n*variances.max())),
                "iAverage": n*average}

    objective = lambda m: m["logDet"] if criterion == "d" else -m["iAverage"] / spec["runs"]
    choices = [list(itertools.combinations_with_replacement(range(len(cands)), n)) for n in allocation]
    all_results = {selection: evaluate(selection) for selection in itertools.product(*choices)}
    valid = {selection: result for selection, result in all_results.items() if result is not None}
    stationary = []
    for selection, result in valid.items():
        value = objective(result)
        improving = False
        for block, combo in enumerate(selection):
            for slot in range(len(combo)):
                for candidate in range(len(cands)):
                    changed = list(combo); changed[slot] = candidate
                    neighbor = list(selection); neighbor[block] = tuple(sorted(changed)); neighbor = tuple(neighbor)
                    other = all_results[neighbor]
                    if other is not None and objective(other) > value + 1e-10*(1+abs(value)):
                        improving = True
        if not improving:
            stationary.append(value)
    best = max(valid, key=lambda key: objective(valid[key])) if valid else None
    best_runs = fixed + [cands[i][1] for b, combo in enumerate(best or ()) for i in combo]
    best_blocks = fixed_blocks + [b for b, combo in enumerate(best or ()) for _ in combo]
    return {"name": name, "spec": spec, "enumerated": len(all_results), "fullRank": len(valid),
            "best": None if best is None else objective(valid[best]), "stationary": sorted(set(stationary)),
            "bestRuns": best_runs, "bestBlocks": best_blocks, "metrics": None if best is None else valid[best],
            "candidateReal": [real for _, real in cands]}


def main():
    corners = [[-1., -1.], [1., -1.], [-1., 1.], [1., 1.]]
    cases = []
    for criterion in ["d", "i"]:
        cases.extend([
            reference(f"saturated-{criterion}", 1, "linear", criterion, [[0.25]], [0], [0, 2]),
            reference(f"three-blocks-{criterion}", 1, "linear", criterion, [[-1.], [1.]], [0, 0], [0, 2, 1]),
            reference(f"quadratic-augmentation-{criterion}", 2, "quadratic", criterion, corners, [0]*4, [0, 4]),
            reference(f"two-new-blocks-quadratic-{criterion}", 2, "quadratic", criterion, corners, [0]*4, [0, 4, 2]),
            reference(f"restricted-off-grid-{criterion}", 2, "linear", criterion,
                      [[-.4, -.2], [.6, -.5], [-.3, .6]], [0]*3, [0, 2, 1],
                      [{"coefficients": [1., 1.], "upper": 1.}]),
        ])
    cases.append(reference("only-fixed", 1, "linear", "d", [[-1.], [1.], [-.5], [.5]], [0, 0, 1, 1], [0, 0]))
    cases.append(reference("unidentifiable-block", 2, "quadratic", "i", [[-1., 0.], [-.5, 0.], [.5, 0.], [1., 0.]], [0]*4, [0, 3], [{"coefficients": [0., 1.], "upper": 0.}, {"coefficients": [0., -1.], "upper": 0.}]))
    target = ROOT / "blocked.json"
    target.write_text(json.dumps({"id": "blocked_optimal", "environment": {"python": platform.python_version(), "numpy": np.__version__},
                                  "predictionMeasure": "uniform spatial candidates x uniform declared blocks; sum contrasts", "cases": cases}, indent=1)+"\n", encoding="utf-8")
    print(f"{len(cases)} blocked references; {sum(c['enumerated'] for c in cases)} designs enumerated")
    surface_cases()


def surface_cases():
    """Treatment-coded polynomial fits; reference switching leaves fitted values unchanged."""
    cases = []
    for dimension, block_count, ref in [(2, 2, 0), (2, 2, 1), (2, 3, 2), (1, 2, 0), (1, 2, 1)]:
        labels = ["Antes", "Ampliação", "Confirmação"][:block_count]
        labels = [labels[ref]] + [name for i, name in enumerate(labels) if i != ref]
        observations, matrix, groups = [], [], {}
        for b in range(block_count):
            original = ["Antes", "Ampliação", "Confirmação"][b]
            points = list(itertools.product([-1., 0., 1.], repeat=dimension)) + [(0.,)*dimension, (0.,)*dimension]
            if b == 2:
                points = [(-1., 0.), (0., 1.), (1., -1.), (0., 0.), (0., 0.)]
            for i, point in enumerate(points):
                a, c = point[0], point[1] if dimension == 2 else 0.
                y = 5+2*a-3*c-.5*a*a+.25*c*c+1.25*a*c + [0., 4., -2.][b] + .03*np.sin(i+2*b)
                matrix.append(([1., a, c, a*a, c*c, a*c] if dimension == 2 else [1., a, a*a]) + [float(original == label) for label in labels[1:]])
                observations.append({"id": f"o{len(observations)+1}", "unitId": None, "factors": list(point)+[original], "responses": [y]})
                groups.setdefault((a, c, original), []).append(y)
        X = np.array(matrix); y = np.array([o["responses"][0] for o in observations]); fit = sm.OLS(y, X).fit()
        pure = sum(float(np.sum((np.array(v)-np.mean(v))**2)) for v in groups.values())
        dataset = {"factors": [{"id": f"x{i+1}", "name": f"X{i+1}", "kind": "numeric", "unit": None, "levels": []} for i in range(dimension)] +
                   [{"id": "block", "name": "Etapa de execução", "kind": "categorical", "unit": None, "levels": ["Antes", "Ampliação", "Confirmação"][:block_count]}],
                   "responses": [{"id": "y", "name": "Rendimento", "unit": None}], "observations": observations}
        request = {"dataset": dataset, "responseId": "y", "factors": [{"id": f"x{i+1}", "name": f"X{i+1}", "low": -1., "high": 1., "unit": ""} for i in range(dimension)],
                   "terms": [], "alpha": .05, "block": {"factorId": "block", "reference": labels[0]}}
        probes = []
        for a, c in [(-.5, .25), (0., 0.), (.75, -.25)]:
            row = np.array(([1., a, c, a*a, c*c, a*c] if dimension == 2 else [1., a, a*a])+[0.]*(block_count-1))
            prediction = fit.get_prediction(row).summary_frame(alpha=.05).iloc[0]
            probes.append({"coded": [a, c][:dimension], "fitted": float(prediction["mean"]), "meanLower": float(prediction["mean_ci_lower"]), "meanUpper": float(prediction["mean_ci_upper"]),
                           "predictionLower": float(prediction["obs_ci_lower"]), "predictionUpper": float(prediction["obs_ci_upper"])})
        cases.append({"name": f"factors-{dimension}-blocks-{block_count}-reference-{ref}", "request": request, "coefficients": fit.params.tolist(), "stdErrors": fit.bse.tolist(),
                      "ci": fit.conf_int().tolist(), "dfResidual": int(fit.df_resid), "sse": float(fit.ssr), "fitted": fit.fittedvalues.tolist(),
                      "pureError": pure, "dfPureError": len(y)-len(groups), "probes": probes})
    path = ROOT.parent / "response_surface" / "blocked.json"
    path.write_text(json.dumps({"id": "blocked_surface", "environment": {"python": platform.python_version(), "numpy": np.__version__, "statsmodels": sm.__version__}, "cases": cases}, indent=1)+"\n", encoding="utf-8")
    print(f"{len(cases)} independent blocked surface fits")


if __name__ == "__main__":
    main()
