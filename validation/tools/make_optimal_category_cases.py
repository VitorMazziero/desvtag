"""ET25 T09: independent nominal/numeric optimal models, finite regions and enumeration.

NumPy information/solve/slogdet, with explicit sum contrasts; never calls Rust.
Small designs are enumerated as multisets separately by prescribed execution block.
"""
import itertools
import json
import platform
from pathlib import Path

import numpy as np
import scipy
from scipy import stats
import statsmodels.api as sm

TARGET = Path(__file__).resolve().parents[1] / "cases" / "optimal" / "categories.json"


def coded(spec, real):
    return [(x-(f["low"]+f["high"])/2)/((f["high"]-f["low"])/2) for x,f in zip(real,spec["factors"])]


def row(spec, real, labels, block=0):
    x=coded(spec,real)
    columns=[[v] for v in x]
    for factor,label in zip(spec["categories"]["factors"],labels):
        levels=factor["levels"]
        columns.append([-1.]*(len(levels)-1) if label==levels[-1] else [float(label==level) for level in levels[:-1]])
    values=[1.]+[v for column in columns for v in column]
    if spec["model"]!="linear":
        values += [a*b for i,first in enumerate(columns) for second in columns[i+1:] for a in first for b in second]
    if spec["model"]=="quadratic":values += [v*v for v in x]
    if spec.get("blocks"):
        n=len(spec["blocks"]["labels"])
        values += [-1.]*(n-1) if block==n-1 else [float(block==j) for j in range(n-1)]
    return values


def region(spec):
    numeric=[]
    for point in itertools.product(np.linspace(-1,1,spec["levels"]),repeat=len(spec["factors"])):
        real=[(f["low"]+f["high"])/2+x*(f["high"]-f["low"])/2 for f,x in zip(spec["factors"],point)]
        if all(sum(a*x for a,x in zip(c["coefficients"],real))<=c["upper"]+1e-9 for c in spec["constraints"]):numeric.append(real)
    # Match the documented source-coordinate order, not a Rust-generated region.
    numeric.sort(key=lambda p:tuple(reversed(p)))
    tuples=spec["categories"].get("combinations")
    if tuples is None:
        tuples=list(itertools.product(*(f["levels"] for f in spec["categories"]["factors"])))
        tuples.sort(key=lambda t:tuple(reversed(t)))
    return [{"real":real,"categories":list(labels)} for labels in tuples for real in numeric]


def information(spec, design):
    return np.array([row(spec,d["real"],d["categories"],d.get("block",0)) for d in design])


def metrics(matrix, candidates):
    n,p=matrix.shape
    M=matrix.T@matrix
    if np.linalg.matrix_rank(matrix,tol=1e-10)<p:return {"parameters":p,"logDet":None,"dEfficiency":None,"aEfficiency":None,"gEfficiency":None,"iAverage":None},None
    sign,logdet=np.linalg.slogdet(M)
    assert sign>0
    inverse=np.linalg.solve(M,np.eye(p))
    variance=np.einsum("ij,jk,ik->i",candidates,inverse,candidates)
    return {"parameters":p,"logDet":float(logdet),"dEfficiency":float(np.exp(logdet/p)/n),"aEfficiency":float(p/(n*np.trace(inverse))),"gEfficiency":float(p/(n*max(variance))),"iAverage":float(n*np.mean(variance))},variance


def case(name,numeric,categories,model="linear",runs=4,criterion="d",constraints=(),combinations=None,fixed=(),blocks=None,enumerate_designs=True):
    spec={"factors":[{"id":f"x{i+1}","name":f"X{i+1}","low":bounds[0],"high":bounds[1]} for i,bounds in enumerate(numeric)],
          "categories":{"factors":[{"id":f"c{i+1}","name":f"Categoria {i+1}","levels":levels} for i,levels in enumerate(categories)],"fixedRuns":[d["categories"] for d in fixed]},
          "model":model,"criterion":criterion,"runs":runs,"levels":3,"constraints":list(constraints),"fixedRuns":[d["real"] for d in fixed],"starts":8,"randomize":False,"seed":17}
    if combinations is not None:spec["categories"]["combinations"]=combinations
    if blocks is not None:spec["blocks"]=blocks
    points=region(spec);count=len(points);B=len(blocks["labels"]) if blocks else 1
    candidate_rows=np.array([row(spec,p["real"],p["categories"],b) for b in range(B) for p in points])
    # Explicit repeated candidate design for evaluation/profile, independent of the search.
    explicit=[dict(point,**({"block":b} if blocks else {})) for b in range(B) for point in points for _ in range(2 if B*count*2<=60 else 1)]
    X=information(spec,explicit);evaluation,h=metrics(X,candidate_rows)
    exhaustive=None
    if enumerate_designs:
        allocation=blocks["newRuns"] if blocks else [runs-len(fixed)]
        selections=[list(itertools.combinations_with_replacement(range(count),n)) for n in allocation]
        best=None;valid=0;total=0;best_design=None
        for selection in itertools.product(*selections):
            design=list(fixed)+[dict(points[i],**({"block":b} if blocks else {})) for b,group in enumerate(selection) for i in group]
            output,_=metrics(information(spec,design),candidate_rows);total+=1
            if output["logDet"] is None:continue
            valid+=1;score=output["logDet"] if criterion=="d" else -output["iAverage"]/runs
            if best is None or score>best+1e-11:best=score;best_design=design
        assert best is not None,(name,"no feasible full rank design")
        exhaustive={"total":total,"fullRank":valid,"bestObjective":best,"oneOptimum":best_design}
    return {"name":name,"spec":spec,"points":points,"candidateRows":candidate_rows.tolist(),"explicitRuns":explicit,"matrix":X.tolist(),"metrics":evaluation,"variances":None if h is None else h.tolist(),"exhaustive":exhaustive}


def fitting_reference(c,missing_category=None):
    spec=c["spec"];points=c["explicitRuns"];X=np.array(c["matrix"])
    truth=.2*np.arange(1,X.shape[1]+1);truth[0]=3.
    y=X@truth+np.array([.11,-.09,.03,-.07,.13]*((len(X)+4)//5))[:len(X)]
    factors=[dict(id=f["id"],name=f["name"],kind="numeric",unit=None,levels=[]) for f in spec["factors"]]
    factors += [dict(id=f["id"],name=f["name"],kind="categorical",unit=None,levels=f["levels"]) for f in spec["categories"]["factors"]]
    if spec.get("blocks"):factors += [dict(id="block",name="Block",kind="categorical",unit=None,levels=spec["blocks"]["labels"])]
    observations=[];keep=[]
    for i,point in enumerate(points):
        values=point["real"]+point["categories"]+([spec["blocks"]["labels"][point["block"]]] if spec.get("blocks") else [])
        missing=missing_category is not None and missing_category in point["categories"]
        observations.append(dict(id=f"o{i+1}",unitId=None,factors=values,responses=[None if missing else float(y[i])]))
        if not missing:keep.append(i)
    matrix=X[keep];ys=y[keep];model=sm.OLS(ys,matrix).fit();inverse=np.linalg.pinv(matrix,rcond=1e-12);projection=inverse@matrix
    estimable=[np.linalg.norm(e-e@projection)<1e-9 for e in np.eye(X.shape[1])]
    return {"request":{"dataset":{"factors":factors,"responses":[{"id":"y","name":"Atividade","unit":"U"}],"observations":observations},"spec":spec,"responseId":"y","blockFactorId":"block" if spec.get("blocks") else None,"alpha":.05},
            "rank":int(np.linalg.matrix_rank(matrix)),"dfResidual":int(model.df_resid),"sse":float(model.ssr),"coefficients":[float(v) if ok else None for v,ok in zip(model.params,estimable)],
            "stdErrors":[float(v) if ok else None for v,ok in zip(model.bse,estimable)],"pValues":[float(v) if ok else None for v,ok in zip(model.pvalues,estimable)],
            "confidenceIntervals":[list(map(float,values)) if ok else None for values,ok in zip(model.conf_int(),estimable)],"fitted":list(map(float,model.fittedvalues)),"usedIds":[f"o{i+1}" for i in keep]}


def main():
    cases=[
      case("nominal-only-three-levels",[],[["A","B","C"]],runs=3),
      case("two-nominal-complete-interactions",[],[["A","B"],["P","Q","R"]],model="interactions",runs=6),
      case("mixed-linear-saturated",[[-1,1]],[["A","B"]],runs=3),
      case("mixed-linear-I",[[-1,1]],[["A","B"]],runs=4,criterion="i"),
      case("mixed-interactions-saturated",[[-1,1]],[["A","B"]],model="interactions",runs=4),
      case("mixed-quadratic",[[-1,1]],[["A","B"]],model="quadratic",runs=5),
      case("mixed-quadratic-I",[[-1,1]],[["A","B"]],model="quadratic",runs=6,criterion="i"),
      case("restricted-category-tuples",[],[["A","B"],["P","Q","R"]],runs=4,combinations=[["A","P"],["A","Q"],["B","Q"],["B","R"]]),
      case("numeric-constraint-three-categories",[[-1,1]],[["A","B","C"]],runs=5,constraints=[{"coefficients":[1.],"upper":.4}]),
      case("off-grid-fixed-mixed-I",[[-1,1]],[["A","B","C"]],runs=6,criterion="i",constraints=[{"coefficients":[1.],"upper":.4}],fixed=[{"real":[-.6],"categories":["A"]},{"real":[.25],"categories":["C"]}]),
      case("mixed-block-interactions",[[-1,1]],[["A","B"]],model="interactions",runs=6,blocks={"labels":["D1","D2"],"fixedBlocks":[],"newRuns":[3,3]}),
      case("mixed-block-augmentation-I",[[-1,1]],[["A","B"]],runs=6,criterion="i",fixed=[{"real":[-.5],"categories":["A"],"block":0},{"real":[.7],"categories":["B"],"block":0}],blocks={"labels":["Old","New"],"fixedBlocks":[0,0],"newRuns":[0,4]}),
      case("two-numeric-three-categories-quadratic",[[-10,20],[2,8]],[["A","B","C"]],model="quadratic",runs=16,enumerate_designs=False),
      case("two-numeric-two-categories-linear",[[-10,20],[2,8]],[["A","B"],["P","Q","R"]],runs=10,enumerate_designs=False),
    ]
    for c in cases:c["analysis"]=fitting_reference(c)
    missing=fitting_reference(cases[8],missing_category="C")
    # Full replication scales h by 1/2 and preserves n*h; relabelling has no metric effect.
    for c in cases:
        X=np.array(c["matrix"]);region_X=np.array(c["candidateRows"])
        replicated,h=metrics(np.vstack([X,X]),region_X)
        assert np.isclose(replicated["iAverage"],c["metrics"]["iAverage"])
        assert np.allclose(2*h,c["variances"])
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_text(json.dumps({"id":"optimal_nominal_factors","environment":{"python":platform.python_version(),"numpy":np.__version__,"scipy":scipy.__version__},"definition":"sum coding, finite uniform numeric x permitted nominal tuples x declared blocks; exhaustive multisets by block","cases":cases,"missingResponseAnalysis":missing},indent=1,allow_nan=False)+"\n",encoding="utf-8")
    print(f"{len(cases)} independent mixed optimal references; {sum(c['exhaustive']['total'] for c in cases if c['exhaustive'])} enumerated designs")


if __name__=="__main__":main()
