"""Closed-form balanced UN reference at the qualified occasion envelope (NumPy/SciPy)."""
from pathlib import Path
import json
import numpy as np
import scipy
from scipy.stats import t

root = Path(__file__).resolve().parents[2]
directory = root / "validation/cases/et24/performance-resource-balanced"
operation = json.loads((directory / "inputs.json").read_text(encoding="utf-8"))[0]["operation"]
request = {k: v for k, v in operation.items() if k != "type"}
y = np.array([row["responses"][0] for row in request["dataset"]["observations"]]).reshape(32, 12)
means = y.mean(axis=0)
covariance = np.cov(y, rowvar=False, ddof=1)
assert np.max(np.abs(covariance - np.eye(12) * 32 / 31)) < 1e-12
se = np.sqrt(np.diag(covariance) / 32)
critical = t.isf(0.025, 31)
log_determinant = np.linalg.slogdet(covariance)[1]
log_likelihood = -0.5 * ((32-1)*12*np.log(2*np.pi) + (32-1)*log_determinant + 12*np.log(32) + (32-1)*12)
result = {
    "purpose": "Balanced independent-unit UN: sample covariance and one-sample t inference are closed-form; this is independent of the optimizer.",
    "referenceSoftware": {"numpy": np.__version__, "scipy": scipy.__version__},
    "request": request,
    "expected": {"covarianceMatrix": covariance.flatten().tolist(), "means": means.tolist(),
        "meanStandardErrors": se.tolist(), "df": 31,
        "lower": (means-critical*se).tolist(), "upper": (means+critical*se).tolist(),
        "remlLogLikelihood": float(log_likelihood)},
    "tolerances": {"estimate": 1e-8, "covariance": 1e-8, "df": 0.002, "interval": 1e-6},
}
(root / "validation/cases/repeated_covariance/resource_q12.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
observed = json.loads((directory / "work-counts.json").read_text(encoding="utf-8"))[0]["result"]["advanced"]
assert observed["inferenceAvailable"]
assert np.max(np.abs(np.array(observed["covarianceMatrix"]) - covariance.flatten())) < 1e-8
assert abs(observed["remlLogLikelihood"] - log_likelihood) < 1e-8
for index, point in enumerate(observed["meanProfiles"]):
    inference = point["inference"]
    assert abs(inference["estimate"] - means[index]) < 1e-8
    assert abs(inference["stdError"]["value"] - se[index]) < 1e-8
    assert abs(inference["df"]["value"] - 31) < 0.002
    assert abs(inference["ciLower"]["value"] - result["expected"]["lower"][index]) < 1e-6
    assert abs(inference["ciUpper"]["value"] - result["expected"]["upper"][index]) < 1e-6
(directory / "independent-check.json").write_text(json.dumps({"covarianceAndMeanIntervalsMatch": True, "reference": "validation/cases/repeated_covariance/resource_q12.json", "df": 31, "remlLogLikelihood": float(log_likelihood)}, indent=2), encoding="utf-8")
print("Balanced q=12 covariance, means, SE, df=31, confidence intervals and REML likelihood match the independent closed-form reference.")
