"""Compare deterministic counters and require unchanged complete native scientific results."""
from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[2]
directory = root / "validation/cases/et24/performance-work-counts"
normal = root / "validation/cases/et24/performance-precision-native"
before = json.loads((directory / "before.json").read_text(encoding="utf-8"))
after = json.loads((directory / "after.json").read_text(encoding="utf-8"))
assert len(before) == len(after) == 28
comparison = []
for old, new in zip(before, after):
    assert old["name"] == new["name"]
    assert old["error"] is None and new["error"] is None, new["name"]
    assert old["result"] == new["result"], new["name"]
    production = json.loads((normal / f"{new['name']}.json").read_text(encoding="utf-8"))["response"]["outcome"]["result"]
    production.pop("type")
    assert new["result"] == production, new["name"]
    labels = sorted(old["counts"].keys() | new["counts"].keys())
    comparison.append({"name": new["name"], "exactBeforeAfterAndProductionNative": True,
        "counters": {label: {"before": old["counts"].get(label, 0), "after": new["counts"].get(label, 0)} for label in labels}})
output = root / ".local/validation/et24/performance-work-counts"
output.mkdir(parents=True, exist_ok=True)
report = {"cases": comparison, "interpretation": "Counters observe named construction/evaluation points, not system allocator calls or timings. Native complete results are exactly preserved. Normal uninstrumented timings remain separate. Cross-platform floating-point identity is not claimed."}
(output / "comparison.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"{len(comparison)}/28 observed results equal before/after and the normal native engine; counters saved.")
