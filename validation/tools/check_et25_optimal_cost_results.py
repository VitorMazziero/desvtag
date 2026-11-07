"""Recompute ET25 benchmark D/A/G/I from the returned design and check local stationarity."""
import argparse
import json
from pathlib import Path

import numpy as np
from make_optimal_category_cases import metrics, region, row


def verify(path):
    artifact = json.loads(path.read_text(encoding="utf-8"))
    request = artifact["operation"]
    result = artifact["response"]["outcome"]["result"]
    spec = {"categories": {"factors": []}, **result["spec"]}
    points = region(spec)
    assert len(points) == result["candidates"]
    blocks = len(spec.get("blocks", {}).get("labels", [None]))
    region_rows = np.array([
        [row(spec, point["real"], point["categories"], b) for point in points]
        for b in range(blocks)
    ])
    candidates = region_rows.reshape(-1, region_rows.shape[-1])
    runs = result["runs"]
    x = np.array([row(spec, run["real"], run.get("categories", []), run.get("block", 0)) for run in runs])
    expected, _ = metrics(x, candidates)
    for key, value in expected.items():
        assert np.isclose(result["metrics"][key], value, rtol=2e-8, atol=2e-9), (path, key, value)
    fixed = spec["fixedRuns"]
    assert [run["fixed"] for run in runs] == [True] * len(fixed) + [False] * (len(runs) - len(fixed))
    assert [run["real"] for run in runs[:len(fixed)]] == fixed
    if "fixedRuns" in spec["categories"]:
        assert [run["categories"] for run in runs[:len(fixed)]] == spec["categories"]["fixedRuns"]
    if blocks > 1:
        assert [run["block"] for run in runs[:len(fixed)]] == spec["blocks"]["fixedBlocks"]
        for b, count in enumerate(spec["blocks"]["newRuns"]):
            assert sum(run["block"] == b for run in runs[len(fixed):]) == count

    p = x.shape[1]
    m = x.T @ x
    w = candidates.T @ candidates / len(candidates)
    is_d = request["criterion"] == "d"
    current = expected["logDet"] if is_d else -expected["iAverage"] / len(x)
    best = current
    # Independently factor explicit replacement information in batches of one slot.
    # The eigenvalue guard excludes singular proposals before the batched solve.
    for run, departing in zip(runs[len(fixed):], x[len(fixed):]):
        incoming = region_rows[run.get("block", 0)]
        replacement = m - np.outer(departing, departing) + np.einsum("ij,ik->ijk", incoming, incoming)
        nonsingular = replacement[np.linalg.eigvalsh(replacement)[:, 0] > 1e-10]
        if nonsingular.size == 0:
            continue
        if is_d:
            scores = np.linalg.slogdet(nonsingular)[1]
        else:
            moments = np.broadcast_to(w, (len(nonsingular), p, p))
            scores = -np.trace(np.linalg.solve(nonsingular, moments), axis1=-2, axis2=-1)
        best = max(best, float(max(scores)))

    search = result["search"]
    assert search["startsSucceeded"] + search["startsFailed"] == search["startsAttempted"]
    assert search["startsAttempted"] == result["startsRun"]
    if search["selectedStop"] == "noImprovingExchange":
        assert best - current <= 2e-10 * (1 + abs(current)), (path, current, best)
    return {
        "case": path.stem, "objective": current, "bestNeighbor": best,
        "evaluations": search["evaluations"], "passes": search["passes"],
        "stop": search["selectedStop"], "metrics": expected,
    }


def compare_limited(directory, baseline, limited):
    current = json.loads((directory / "measurements.json").read_text(encoding="utf-8"))
    before = json.loads((baseline / "measurements.json").read_text(encoding="utf-8"))
    old_cases = {case["name"]: case for case in before["cases"]}
    assert old_cases.keys() == {case["name"] for case in current["cases"]}
    assert limited <= old_cases.keys()
    comparisons = []
    for case in current["cases"]:
        name = case["name"]
        original = old_cases[name]
        assert case["requestHash"] == original["requestHash"], name
        item = {
            "case": name,
            "beforeMedianMs": original["medianMilliseconds"],
            "afterMedianMs": case["medianMilliseconds"],
            "beforeP95Ms": original["p95Milliseconds"],
            "afterP95Ms": case["p95Milliseconds"],
            "beforePrivateBytes": original["memory"]["privateBytes"],
            "afterPrivateBytes": case["memory"]["privateBytes"],
            "sameCompleteResponse": case["resultHash"] == original["resultHash"],
        }
        if name not in limited:
            assert item["sameCompleteResponse"], name
        else:
            assert case["outcome"] == "ok"
            after_path = directory / f"{name}.json"
            before_path = baseline / f"{name}.json"
            after = verify(after_path)
            before = verify(before_path)
            design = json.loads(after_path.read_text(encoding="utf-8"))["response"]["outcome"]["result"]
            search = design["search"]
            assert search["workLimit"] > 0
            assert 0 < design["startsRun"] <= design["spec"]["starts"]
            assert after["evaluations"] < before["evaluations"]
            assert after["objective"] <= before["objective"] + 2e-9 * (1 + abs(before["objective"]))
            item.update({
                "workLimitMillionProducts": search["workLimit"],
                "requestedStarts": design["spec"]["starts"],
                "attemptedStarts": design["startsRun"],
                "before": before,
                "after": after,
            })
        comparisons.append(item)
    return comparisons


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--limited", nargs="+", default=[])
    args = parser.parse_args()
    if args.baseline:
        print(json.dumps(compare_limited(args.directory, args.baseline, set(args.limited)), indent=2))
        raise SystemExit()
    designs = sorted(args.directory.glob("numeric-*.json")) + sorted(args.directory.glob("mixed-*.json"))
    assert designs, "no measured designs"
    print(json.dumps([verify(path) for path in designs], indent=2))
