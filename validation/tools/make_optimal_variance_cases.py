"""ET25 T07: pointwise geometric prediction variance, independent NumPy solve.

Consumes declared designs, never the Rust search/output. Finite candidate measure:
equal spatial weights and, when present, equal declared-block weights.
"""
import copy
import itertools
import json
import platform
from pathlib import Path
import numpy as np
from make_optimal_cases import candidates, coded_of, model_row, spec_dict
from make_blocked_optimal_cases import contrast

ROOT = Path(__file__).resolve().parents[1] / "cases" / "optimal_design"


def case(name, spec, runs, assignments=None):
    spec=copy.deepcopy(spec)
    for i,factor in enumerate(spec["factors"]): factor.setdefault("id",f"x{i+1}")
    count = len(spec["blocks"]["labels"]) if spec.get("blocks") else 1
    row = lambda x, b: model_row(x, spec["model"]) + (contrast(b, count) if count > 1 else [])
    assignments = assignments if assignments is not None else [0]*len(runs)
    design = np.array([row(coded_of(spec["factors"], point), block) for point, block in zip(runs, assignments)])
    info = design.T @ design
    assert np.linalg.matrix_rank(info) == design.shape[1]
    cands = candidates(spec["factors"], spec["levels"], spec["constraints"])
    points = []
    values = []
    for coded, real in cands:
        rows = np.array([row(coded, b) for b in range(count)])
        h = np.einsum("ij,ji->i", rows, np.linalg.solve(info, rows.T))
        points.append({"coded": coded, "real": real, "relative": h.tolist(), "scaled": (len(runs)*h).tolist()})
        values.append(h)
    values=np.array(values)
    summaries=[]
    for block in ([None]+list(range(count)) if count > 1 else [None]):
        h = values.flatten() if block is None else values[:,block]
        summaries.append({"block": block,"minimum":float(h.min()),"average":float(h.mean()),"maximum":float(h.max()),"ordered":np.sort(h).tolist()})
    return {"name":name,"request":{"spec":spec,"runsReal":runs,"runBlocks":assignments if count>1 else None},"parameters":design.shape[1],"points":points,"summaries":summaries,"iAverage":float(len(runs)*values.mean()),"gEfficiency":float(design.shape[1]/(len(runs)*values.max()))}


def main():
    source=json.loads((ROOT/"optimal.json").read_text(encoding="utf-8"))
    cases=[case(c["name"],c["spec"],c["runsReal"]) for c in source["metricCases"]]
    blocked=json.loads((ROOT/"blocked.json").read_text(encoding="utf-8"))
    cases += [case(c["name"],c["spec"],c["bestRuns"],c["bestBlocks"]) for c in blocked["cases"] if c["fullRank"]]
    for k, model in [(1,"quadratic"),(3,"quadratic"),(4,"interactions"),(5,"quadratic")]:
        factors=[{"id":f"x{i+1}","name":f"X{i+1}","low":-1.,"high":1.} for i in range(k)]
        runs=list(map(list,itertools.product([-1.,1.],repeat=k)))
        if model=="quadratic":
            runs += [[0.]*k]
            runs += [[sign if j==i else 0. for j in range(k)] for i in range(k) for sign in [-1.,1.]]
        spec=spec_dict(factors,model,"i",len(runs),3,[],[],starts=2,seed=17)
        cases.append(case(f"full-region-{k}-{model}",spec,runs))
        if 2*len(runs) <= 60:
            replicated=case(f"replicated-{k}-{model}",spec,runs+runs)
            a,b=cases[-1]["points"],replicated["points"]
            assert all(np.allclose(x["scaled"],y["scaled"],rtol=1e-12,atol=1e-12) for x,y in zip(a,b))
            cases.append(replicated)
    # Near the operational candidate bound, with all five factors and eight blocks.
    factors=[{"id":f"x{i+1}","name":f"X{i+1}","low":-1.,"high":1.} for i in range(5)]
    constraints=[{"coefficients":[1.]*5,"upper":-.5}]
    spec=spec_dict(factors,"quadratic","i",60,5,constraints,[],starts=1,seed=17)
    allocation=[8,8,8,8,7,7,7,7]
    spec["blocks"]={"labels":[f"Block {i+1}" for i in range(8)],"fixedBlocks":[],"newRuns":allocation}
    region=candidates(factors,5,constraints);rng=np.random.default_rng(1705)
    runs=[region[int(i)][1] for i in rng.choice(len(region),60,replace=False)]
    assignments=[b for b,count in enumerate(allocation) for _ in range(count)]
    cases.append(case("five-factors-eight-blocks-near-limit",spec,runs,assignments))
    target=ROOT/"variance.json"
    target.write_text(json.dumps({"id":"optimal_prediction_variance","environment":{"python":platform.python_version(),"numpy":np.__version__},"definition":"h=f.T solve(X.T X,f); scaled=n*h; finite uniform candidates x blocks","cases":cases},indent=1)+"\n",encoding="utf-8")
    print(f"{len(cases)} independent variance profiles; {sum(len(c['points']) for c in cases)} spatial points")

if __name__=="__main__":main()
