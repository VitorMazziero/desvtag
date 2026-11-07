"""Check actual browser-exported mixed optimal archives with independent NumPy/statsmodels."""
import argparse
import json
import zipfile
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from make_optimal_category_cases import row, region, metrics


def close(actual, expected, label):
    assert np.isclose(actual, expected, rtol=2e-8, atol=2e-9), (label, actual, expected)


def number(text):
    return float(text.replace(",", "."))


def check(path):
    with zipfile.ZipFile(path) as archive:
        project = json.loads(archive.read("project.json"))
    designs = profiles = fits = points = 0
    for experiment in project["experiments"]:
        revisions = {r["id"]: r["data"] for r in experiment["revisions"]}
        for record in experiment.get("optimalDesigns", []):
            result = record["result"]
            spec = result["spec"]
            if "categories" not in spec:
                continue
            candidates = region(spec)
            blocks = len(spec.get("blocks", {}).get("labels", [None]))
            region_X = np.array([row(spec, p["real"], p["categories"], b) for b in range(blocks) for p in candidates])
            X = np.array([row(spec, p["real"], p["categories"], p.get("block", 0)) for p in result["runs"]])
            expected, _ = metrics(X, region_X)
            for key in ["logDet", "dEfficiency", "aEfficiency", "gEfficiency", "iAverage"]:
                close(result["metrics"][key], expected[key], f"design {key}")
            data = revisions[record["revisionId"]]
            indexes = {f["id"]: i for i, f in enumerate(data["factors"])}
            observations = {r["id"]: r for r in data["rows"]}
            for condition, identity in zip(result["runs"], record["rowIds"]):
                applied = observations[identity]
                for factor, expected_label in zip(spec["categories"]["factors"], condition["categories"]):
                    assert applied["factors"][indexes[factor["id"]]] == expected_label
                for factor, expected_value in zip(spec["factors"], condition["real"]):
                    close(number(applied["factors"][indexes[factor["id"]]]), expected_value, "applied numeric")
            designs += 1
        for record in experiment.get("optimalVariances", []):
            profile = record["result"]
            request = profile["request"]
            spec = request["spec"]
            if "categories" not in spec:
                continue
            X = np.array([row(spec, real, labels, request.get("runBlocks", [0]*profile["runs"])[i]) for i, (real, labels) in enumerate(zip(request["runsReal"], request["runCategories"]))])
            inverse = np.linalg.solve(X.T @ X, np.eye(X.shape[1]))
            for point in profile["points"]:
                for b, output in enumerate(point["values"]):
                    vector = np.array(row(spec, point["real"], point["categories"], b))
                    h = float(vector @ inverse @ vector)
                    close(output["relative"], h, "profile h")
                    close(output["scaled"], len(X)*h, "profile n*h")
                    points += 1
            profiles += 1
        for record in experiment.get("analyses", []):
            result = record["result"]
            if result["type"] != "optimalModel":
                continue
            spec = result["spec"]
            data = revisions[record["revisionId"]]
            indexes = {f["id"]: i for i, f in enumerate(data["factors"])}
            response = next(i for i, r in enumerate(data["responses"]) if r["id"] == result["responseId"])
            observations = {r["id"]: r for r in data["rows"]}
            X, y = [], []
            for fitted in result["fit"]["observations"]:
                observation = observations[fitted["observationId"]]
                real = [number(observation["factors"][indexes[f["id"]]]) for f in spec["factors"]]
                labels = [observation["factors"][indexes[f["id"]]] for f in spec["categories"]["factors"]]
                block = spec["blocks"]["labels"].index(observation["factors"][indexes[result["blockFactorId"]]]) if "blocks" in spec else 0
                X.append(row(spec, real, labels, block))
                y.append(number(observation["responses"][response]))
            X, y = np.array(X), np.array(y)
            independent = sm.OLS(y, X).fit()
            for coefficient, beta, se, p, ci in zip(result["fit"]["coefficients"], independent.params, independent.bse, independent.pvalues, independent.conf_int()):
                close(coefficient["estimate"]["value"], beta, "fit beta")
                close(coefficient["stdError"]["value"], se, "fit SE")
                close(coefficient["pValue"]["value"], p, "fit p")
                close(coefficient["ciLower"]["value"], ci[0], "fit lower CI")
                close(coefficient["ciUpper"]["value"], ci[1], "fit upper CI")
            close(result["fit"]["anova"]["residual"]["sumSquares"]["value"], independent.ssr, "fit SSE")
            for fitted, expected in zip(result["fit"]["observations"], independent.fittedvalues):
                close(fitted["fitted"], expected, "fit observed-row prediction")
            fits += 1
    return {"path": str(path), "designs": designs, "profiles": profiles, "profileValues": points, "fits": fits}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    outputs = [check(path) for path in sorted(args.directory.rglob("*.enzitag"))]
    assert outputs, "no exported archives"
    print(json.dumps({"status": "passed", "archives": outputs}, indent=2))
