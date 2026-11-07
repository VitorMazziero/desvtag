"""Prepare deterministic load inputs only. Scientific calculations remain in the real Rust engine."""
from pathlib import Path
from copy import deepcopy
import json

root = Path(__file__).resolve().parents[2]
out = root / "validation/cases/et24/performance-budget-inputs"
out.mkdir(exist_ok=True)
read = lambda path: json.loads((root / path).read_text(encoding="utf-8"))
profiles = read("validation/cases/nonlinear_profile/profile.json")["cases"]
cases = []
for model in ["monod", "hill"]:
    request = deepcopy(next(c["request"] for c in profiles if c["name"] == model))
    for key in ["x", "y"]:
        base = request[key]
        request[key] = [base[i % len(base)] for i in range(4096)]
    request["profile"] = True
    cases.append({"name": f"nonlinear-{model}-4096", "operation": {"type": "modelNonlinear", **request}})
oversized = deepcopy(cases[0]["operation"])
oversized["x"].append(1.0)
oversized["y"].append(1.0)
cases.append({"name": "nonlinear-row-refusal", "operation": oversized, "expectedIssue": "nonlinear.row_budget"})
balanced = read("validation/cases/repeated_covariance/resource_q12.json")["request"]
cases.append({"name": "mixed-un-balanced-q12", "operation": {"type": "modelMixed", **balanced}})
old = read("validation/cases/repeated_covariance/pre_budget_q13.json")["request"]
cases.append({"name": "mixed-occasion-refusal", "operation": {"type": "modelMixed", **old}, "expectedIssue": "mixed.occasion_budget"})
dense = deepcopy(balanced)
dense["advanced"] = {"covariance": "compoundSymmetry", "timeEffect": "none", "marginalTime": False}
dense["dataset"]["observations"] = [
    {"id": f"o{i}", "unitId": f"u{i//2048}", "factors": [], "responses": [1+i%7]}
    for i in range(4096)
]
cases.append({"name": "mixed-work-refusal", "operation": {"type": "modelMixed", **dense}, "expectedIssue": "mixed.work_budget"})
(out / "inputs.json").write_text(json.dumps(cases, indent=2), encoding="utf-8")
for count in (100, 1000):
    previous = read(f"validation/cases/et24/performance-before-history-web/history-{count}-encode.json")
    archive = previous["response"]["outcome"]["result"]
    cases.append({
        "name": f"history-{count}-decode",
        "operation": {"type": "projectDecode", "bytesBase64": archive["bytesBase64"]},
    })
(out / "transport-boundaries.json").write_text(json.dumps(cases, indent=2), encoding="utf-8")
partial = deepcopy(balanced)
source = balanced["dataset"]["observations"]
partial["dataset"]["observations"] = [
    {**row, "id": f"o{i + 1}", "unitId": f"u{i // 12 + 1}"}
    for i, row in enumerate(source * 2)
]
partial["advanced"]["times"] = balanced["advanced"]["times"] * 2
(out / "mixed-q12-partial-request.json").write_text(json.dumps(partial, indent=2), encoding="utf-8")
print(f"Prepared {len(cases)} resource-boundary inputs; no analyses were calculated.")
