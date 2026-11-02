"""Gera os casos de validação de `optimal_design` (planejamentos D e I-ótimos).

Referências independentes (NumPy, sem usar o código Rust):
- **métricas**: para planejamentos dados, `ln|XᵀX|` (slogdet), eficiência D, A e G, e a variância
  média de predição `n·tr((XᵀX)⁻¹W)` sobre a malha de candidatos filtrada pelas restrições;
- **busca exaustiva**: em problemas pequenos, o melhor critério entre **todas** as seleções com
  reposição de candidatos (`itertools.combinations_with_replacement`), com ensaios já realizados
  fixos quando houver. O planejamento do aplicativo precisa alcançar esse ótimo global.
"""
import itertools
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "cases" / "optimal_design"


def model_row(x, model):
    k = len(x)
    row = [1.0] + list(x)
    if model in ("interactions", "quadratic"):
        row += [x[i] * x[j] for i in range(k) for j in range(i + 1, k)]
    if model == "quadratic":
        row += [v * v for v in x]
    return row


def candidates(factors, levels, constraints):
    pts = []
    grid = [-1.0 + 2.0 * i / (levels - 1) for i in range(levels)]
    # primeiro fator varia mais depressa (mesma ordem do motor)
    for coded in itertools.product(grid, repeat=len(factors)):
        coded = tuple(reversed(coded))
        real = [(f["low"] + f["high"]) / 2 + c * (f["high"] - f["low"]) / 2 for f, c in zip(factors, coded)]
        if all(sum(a * x for a, x in zip(c["coefficients"], real)) <= c["upper"] + 1e-9 for c in constraints):
            pts.append((coded, real))
    return pts


def coded_of(factors, real):
    return [(v - (f["low"] + f["high"]) / 2) / ((f["high"] - f["low"]) / 2) for f, v in zip(factors, real)]


def metrics(factors, model, levels, constraints, runs_real):
    cands = candidates(factors, levels, constraints)
    Xc = np.array([model_row(c, model) for c, _ in cands])
    W = Xc.T @ Xc / len(Xc)
    X = np.array([model_row(coded_of(factors, r), model) for r in runs_real])
    n, p = X.shape
    M = X.T @ X
    sign, logdet = np.linalg.slogdet(M)
    if sign <= 0 or np.linalg.matrix_rank(M) < p:
        return None
    inv = np.linalg.inv(M)
    d = np.einsum("ij,jk,ik->i", Xc, inv, Xc)
    return {
        "parameters": p,
        "logDet": float(logdet),
        "dEfficiency": float(np.exp(logdet / p) / n),
        "aEfficiency": float(p / (n * np.trace(inv))),
        "gEfficiency": float(p / (n * d.max())),
        "iAverage": float(n * np.trace(inv @ W)),
    }


def spec_dict(factors, model, criterion, runs, levels, constraints, fixed, starts=20, seed=11):
    return {
        "factors": factors,
        "model": model,
        "criterion": criterion,
        "runs": runs,
        "levels": levels,
        "constraints": constraints,
        "fixedRuns": fixed,
        "starts": starts,
        "randomize": False,
        "seed": seed,
    }


def exhaustive(factors, model, criterion, runs, levels, constraints, fixed):
    cands = candidates(factors, levels, constraints)
    rows = [np.array(model_row(c, model)) for c, _ in cands]
    Xc = np.array(rows)
    W = Xc.T @ Xc / len(Xc)
    fixed_rows = [np.array(model_row(coded_of(factors, r), model)) for r in fixed]
    free = runs - len(fixed)
    p = len(rows[0])
    base = sum((np.outer(r, r) for r in fixed_rows), np.zeros((p, p)))
    best = None
    count = 0
    for combo in itertools.combinations_with_replacement(range(len(rows)), free):
        M = base + sum((np.outer(rows[i], rows[i]) for i in combo), np.zeros((p, p)))
        sign, logdet = np.linalg.slogdet(M)
        if sign <= 0 or np.linalg.matrix_rank(M) < p:
            continue
        count += 1
        value = float(logdet) if criterion == "d" else -float(np.trace(np.linalg.inv(M) @ W))
        if best is None or value > best:
            best = value
    return {"best": best, "evaluated": count}


def fx(k, low=10.0, high=30.0):
    return [{"name": f"X{i + 1}", "low": low, "high": high} for i in range(k)]


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    # --- métricas de planejamentos dados ---
    metric_cases = []

    def add_metric(name, factors, model, levels, constraints, runs_real):
        spec = spec_dict(factors, model, "d", max(len(runs_real), 1), levels, constraints, [])
        metric_cases.append({"name": name, "spec": spec, "runsReal": runs_real, "expected": metrics(factors, model, levels, constraints, runs_real)})

    f2, f3 = fx(2), fx(3)
    add_metric("2^2-interacoes", f2, "interactions", 3, [], [[10, 10], [30, 10], [10, 30], [30, 30]])
    add_metric(
        "2^2+centrais-quadratico",
        f2,
        "quadratic",
        3,
        [],
        [[10, 10], [30, 10], [10, 30], [30, 30], [20, 10], [20, 30], [10, 20], [30, 20], [20, 20]],
    )
    add_metric("3-fatores-linear-8", f3, "linear", 3, [], [[10, 10, 10], [30, 10, 10], [10, 30, 10], [30, 30, 10], [10, 10, 30], [30, 10, 30], [10, 30, 30], [30, 30, 30]])
    add_metric("2-fatores-restrito", f2, "interactions", 5, [{"coefficients": [1.0, 1.0], "upper": 40.0}], [[10, 10], [30, 10], [10, 30], [20, 20], [10, 20], [20, 10]])
    add_metric("3-fatores-interacoes-10", f3, "interactions", 3, [], [[10, 10, 10], [30, 30, 10], [30, 10, 30], [10, 30, 30], [20, 20, 20], [20, 20, 20], [10, 10, 30], [30, 10, 10], [10, 30, 10], [30, 30, 30]])

    # --- buscas exaustivas (ótimo global) ---
    exhaustive_cases = []

    def add_exhaustive(name, factors, model, criterion, runs, levels, constraints, fixed):
        spec = spec_dict(factors, model, criterion, runs, levels, constraints, fixed)
        exhaustive_cases.append({"name": name, "spec": spec, "expected": exhaustive(factors, model, criterion, runs, levels, constraints, fixed)})

    add_exhaustive("D-quadratico-2f-7", f2, "quadratic", "d", 7, 3, [], [])
    add_exhaustive("I-quadratico-2f-8", f2, "quadratic", "i", 8, 3, [], [])
    add_exhaustive("D-interacoes-2f-5-restrito", f2, "interactions", "d", 5, 3, [{"coefficients": [1.0, 1.0], "upper": 40.0}], [])
    add_exhaustive("D-linear-3f-5", f3, "linear", "d", 5, 3, [], [])
    add_exhaustive("D-ampliacao-2f", f2, "interactions", "d", 6, 3, [], [[10, 10], [30, 10], [20, 20]])
    add_exhaustive("I-interacoes-2f-6", f2, "interactions", "i", 6, 3, [], [])

    out = {"id": "optimal_design", "metricCases": metric_cases, "exhaustiveCases": exhaustive_cases}
    (ROOT / "optimal.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("métricas:", len(metric_cases), "exaustivas:", len(exhaustive_cases), [c["expected"]["evaluated"] for c in exhaustive_cases])


if __name__ == "__main__":
    main()
