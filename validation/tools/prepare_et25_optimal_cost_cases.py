"""Prepare deterministic ET25 T10 transport cases using existing scientific and app artifacts."""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[2]


def fixture(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def design(name, criterion, factors, runs, *, levels=5, starts=3, **options):
    return {
        "name": name,
        "operation": {
            "type": "designOptimalGenerate",
            "model": "quadratic",
            "criterion": criterion,
            "runs": runs,
            "levels": levels,
            "starts": starts,
            "fixedRuns": [],
            "constraints": [],
            "randomize": False,
            "seed": 2,
            "factors": [
                {"id": f"f{i}", "name": f"F{i}", "low": -1.0, "high": 1.0}
                for i in range(factors)
            ],
            **options,
        },
    }


def categories(counts, fixed=()):
    return {
        "factors": [
            {"id": f"c{i}", "name": f"C{i}", "levels": [f"L{j}" for j in range(n)]}
            for i, n in enumerate(counts)
        ],
        "fixedRuns": list(fixed),
    }


def cases(archive):
    for criterion in ("d", "i"):
        yield design(f"numeric-{criterion}-typical", criterion, 2, 12, starts=8)
        yield design(f"numeric-{criterion}-625", criterion, 4, 30)
        yield design(f"numeric-{criterion}-saturated", criterion, 4, 15, levels=3, starts=2)
        yield design(
            f"mixed-{criterion}-1500", criterion, 3, 60, starts=1, categories=categories([3, 4])
        )
        yield design(
            f"mixed-{criterion}-blocked-fixed", criterion, 2, 28,
            fixedRuns=[[-0.5, 0.25], [0.5, 0.75]],
            categories=categories([3], [["L0"], ["L2"]]),
            blocks={
                "labels": ["Anterior", "Dia 1", "Dia 2", "Dia 3"],
                "fixedBlocks": [0, 0],
                "newRuns": [0, 8, 8, 10],
            },
        )

    profile = next(
        case for case in fixture("validation/cases/optimal_design/variance.json")["cases"]
        if case["name"] == "five-factors-eight-blocks-near-limit"
    )
    yield {
        "name": "variance-1372x8",
        "operation": {"type": "designOptimalVariance", **profile["request"]},
    }

    with ZipFile(archive) as file:
        document = json.loads(file.read("project.json"))
    experiment = document["experiments"][0]
    assert experiment["optimalVariances"], "use a mixed optimal project with a saved profile"
    profile = experiment["optimalVariances"][0]
    experiment["optimalVariances"] = [
        dict(profile, id=f"variance-benchmark-{i}") for i in range(1000)
    ]
    yield {"name": "optimal-history-1000-encode", "operation": {"type": "projectEncode", "document": document}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(list(cases(args.archive)), ensure_ascii=False) + "\n", encoding="utf-8")
