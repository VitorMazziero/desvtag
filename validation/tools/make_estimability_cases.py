"""ET25 T08: independent sum-coded model geometry and estimable linear functions.

Uses NumPy SVD/pseudoinverse and statsmodels fits, never Rust outputs. Small
reference grids are enumerated explicitly, including contrasts of non-estimable
marginal means. Undefined quantities are JSON null, never invented zeros.
"""
import itertools
import json
import platform
from pathlib import Path

import numpy as np
import scipy
from scipy import stats
import statsmodels.api as sm

ROOT = Path(__file__).resolve().parents[1] / "cases" / "factorial_anova"


def effect(level, count):
    return [-1.0] * (count - 1) if level == count - 1 else [float(level == j) for j in range(count - 1)]


def structure(levels, order, block=False):
    treatment = len(levels) - int(block)
    terms = [list(c) for degree in range(1, min(order, 4, treatment) + 1)
             for c in itertools.combinations(range(treatment), degree)]
    if block:
        terms.insert(0, [len(levels)-1])
    columns, positions = ["Intercept"], []
    for term in terms:
        start = len(columns)
        for combo in itertools.product(*(range(len(levels[i])-1) for i in term)):
            columns.append(":".join(f"{'Block' if block and i == len(levels)-1 else chr(65+i)}[{levels[i][j]}]" for i,j in zip(term,combo)))
        positions.append(list(range(start,len(columns))))
    def row(codes):
        values = [1.0]
        for term in terms:
            values.extend(float(np.prod(v)) for v in itertools.product(*(effect(codes[i], len(levels[i])) for i in term)))
        return np.array(values)
    return terms, columns, positions, row


def rank(matrix):
    return int(np.linalg.matrix_rank(matrix, tol=1e-10)) if matrix.size else 0


def cells(levels, positions, row):
    others = [i for i in range(len(levels)) if i not in positions]
    combos = list(itertools.product(*(range(len(levels[i])) for i in positions)))
    vectors = []
    for combo in combos:
        rows = []
        for rest in itertools.product(*(range(len(levels[i])) for i in others)):
            codes = [0]*len(levels)
            for i,code in zip(positions,combo):codes[i]=code
            for i,code in zip(others,rest):codes[i]=code
            rows.append(row(codes))
        vectors.append(np.mean(rows,axis=0))
    return combos, np.array(vectors)


def case(name, levels, observed, order=1, reps=3, block=False, missing_y=()):
    ids = [chr(65+i) for i in range(len(levels)-int(block))] + (["Block"] if block else [])
    terms, columns, positions, row = structure(levels,order,block)
    codes, y, observations = [], [], []
    truth = .5*np.arange(1,len(columns)+1)
    for point in observed:
        for repeat in range(reps):
            value=float(row(point)@truth + (repeat-(reps-1)/2)*.2)
            if name.startswith("three-cells"):
                value=[10.,12.,16.][observed.index(point)] + repeat-1
            index=len(observations)
            labels=[levels[i][code] for i,code in enumerate(point)]
            observations.append({"id":f"o{index+1}","unitId":None,"factors":labels,"responses":[None if index in missing_y else value]})
            if index not in missing_y:codes.append(point);y.append(value)
    matrix=np.array([row(c) for c in codes]);y=np.array(y)
    planned=np.array([row(c) for c in observed for _ in range(reps)])
    fullrank=rank(matrix);p=len(columns)
    U,s,Vh=np.linalg.svd(matrix,full_matrices=True)
    inverse=np.linalg.pinv(matrix,rcond=1e-12)
    projection=inverse@matrix; covariance=inverse@inverse.T
    beta=inverse@y;fit=sm.OLS(y,matrix).fit()
    sse=float(np.sum((y-matrix@beta)**2));df=len(y)-fullrank
    assert fullrank==len(y)-int(fit.df_resid)
    assert np.isclose(sse,fit.ssr,rtol=1e-10,atol=1e-10)
    mse=sse/df if df>0 else None
    def estimable(vector):
        scale=float(np.max(np.abs(vector)))
        normalized=vector/scale if scale else vector
        return bool(np.linalg.norm(normalized-normalized@projection)<=1e-9*np.linalg.norm(normalized))
    def linear(vector):
        ok=estimable(vector)
        if not ok:return {"estimable":False,"estimate":None,"stdError":None,"ci":None,"p":None}
        est=float(vector@beta)
        if mse is None:return {"estimable":True,"estimate":est,"stdError":None,"ci":None,"p":None}
        se=float(np.sqrt(max(0.,mse*(vector@covariance@vector))))
        t=est/se if se>0 else None
        half=float(stats.t.isf(.025,df)*se)
        return {"estimable":True,"estimate":est,"stdError":se,"ci":[est-half,est+half],"p":None if t is None else float(2*stats.t.sf(abs(t),df))}
    model_terms=[]
    for term,cols in zip(terms,positions):
        reduced=np.delete(matrix,cols,axis=1)
        model_terms.append({"factors":[ids[i] for i in term],"nominalDf":len(cols),"estimableDf":fullrank-rank(reduced),"columns":cols})
    marginals=[];requests=[]
    # One-dimensional and joint treatment cells are checked separately.
    subsets=[[i] for i in range(len(levels))]+[list(range(len(levels)-int(block)))]
    for subset in subsets:
        if subset in [m["positions"] for m in marginals]:continue
        combos,vectors=cells(levels,subset,row)
        entries=[linear(v) for v in vectors]
        pairs=[]
        for a,b in itertools.combinations(range(len(vectors)),2):
            entry=linear(vectors[a]-vectors[b]);entry.update({"a":a,"b":b});pairs.append(entry)
        marginals.append({"positions":subset,"factors":[ids[i] for i in subset],"combos":combos,"vectors":vectors.tolist(),"cells":entries,"pairs":pairs})
        requests.append({"factors":[ids[i] for i in subset],"adjustment":"none"})
    contrast_requests=[];contrasts=[]
    for i in range(len(levels)):
        _,vectors=cells(levels,[i],row)
        weights=[0.]*len(vectors);weights[-2]=1.;weights[-1]=-1.
        contrast_requests.append({"name":f"{ids[i]} last pair","factors":[ids[i]],"coefficients":weights})
        entry=linear(np.array(weights)@vectors);entry["name"]=contrast_requests[-1]["name"];contrasts.append(entry)
    if name == "three-cells-additive":
        for scale in (1e-12, -1e12):
            for i in range(len(levels)):
                _,vectors=cells(levels,[i],row)
                weights=[0.]*len(vectors);weights[-2]=scale;weights[-1]=-scale
                contrast_requests.append({"name":f"{ids[i]} scaled {scale}","factors":[ids[i]],"coefficients":weights})
                entry=linear(np.array(weights)@vectors);entry["name"]=contrast_requests[-1]["name"];contrasts.append(entry)
    anova={}
    def nested(indices):
        cols=[0]+[c for t in indices for c in positions[t]]
        design=matrix[:,cols]
        residual=y-design@np.linalg.lstsq(design,y,rcond=1e-12)[0]
        return float(residual@residual),rank(design)
    for ss_type in ("typeI","typeII","typeIII"):
        anova[ss_type]=[]
        for t,term in enumerate(terms):
            if ss_type == "typeI": reduced=list(range(t)); full=list(range(t+1))
            elif ss_type == "typeII":
                reduced=[u for u,other in enumerate(terms) if not set(term).issubset(other)]
                full=reduced+[t]
            else: reduced=[u for u in range(len(terms)) if u!=t]; full=list(range(len(terms)))
            rss_r,rank_r=nested(reduced);rss_f,rank_f=nested(full);df_term=rank_f-rank_r
            ss=max(0.,rss_r-rss_f) if df_term else None
            fvalue=ss/df_term/mse if df_term and mse else None
            anova[ss_type].append({"df":df_term,"ss":ss,"f":fvalue,"p":None if fvalue is None else float(stats.f.sf(fvalue,df_term,df))})
    for entry in contrasts:
        entry["pAdjusted"]=None if entry["p"] is None else min(1.,len(contrasts)*entry["p"])
    request={"dataset":{"factors":[{"id":id,"name":id,"kind":"categorical","unit":None,"levels":labels} for id,labels in zip(ids,levels)],
                        "responses":[{"id":"y","name":"Atividade","unit":"U"}],"observations":observations},
             "responseId":"y","factorIds":ids[:-1] if block else ids,"blockId":ids[-1] if block else None,
             "interactionOrder":order,"ssType":"typeIII","alpha":.05,"marginals":requests,"contrasts":contrast_requests}
    return {"name":name,"request":request,"columns":columns,"matrix":matrix.tolist(),"rank":fullrank,"parameters":p,
            "anova":anova,"plannedRank":rank(planned),"plannedRows":len(planned),"usedRows":len(y),"nullBasis":Vh[fullrank:].T.tolist(),
            "coefficientEstimable":[estimable(e) for e in np.eye(p)],"terms":model_terms,"dfResidual":df,"sse":sse,
            "mse":mse,"fitted":(matrix@beta).tolist(),"marginals":marginals,"contrasts":contrasts}


def main():
    full23=list(itertools.product(range(2),range(3)))
    cases=[
        case("full-2x3-additive",[["a1","a2"],["b1","b2","b3"]],full23),
        case("full-2x3-interaction",[["a1","a2"],["b1","b2","b3"]],full23,order=2,reps=2),
        case("three-cells-additive",[["a1","a2"],["b1","b2","b3"]],[(0,0),(1,1),(1,2)]),
        case("three-cells-interaction",[["a1","a2"],["b1","b2","b3"]],[(0,0),(1,1),(1,2)],order=2),
        case("connected-four-cells",[["a1","a2"],["b1","b2","b3"]],[(0,0),(0,1),(1,1),(1,2)]),
        case("diagonal-3x3",[["a1","a2","a3"],["b1","b2","b3"]],[(0,0),(1,1),(2,2)]),
        case("cyclic-six-cells",[["a1","a2","a3"],["b1","b2","b3"]],[(0,0),(0,1),(1,1),(1,2),(2,2),(2,0)],order=2,reps=2),
        case("a-confounded-with-c",[["a1","a2"],["b1","b2","b3"],["c1","c2"]],[(a,b,a) for a,b in full23]),
        case("a-confounded-with-c-interactions",[["a1","a2"],["b1","b2","b3"],["c1","c2"]],[(a,b,a) for a,b in full23],order=2,reps=2),
        case("a-confounded-with-block",[["a1","a2"],["b1","b2","b3"],["day1","day2"]],[(a,b,a) for a,b in full23],block=True),
        case("declared-unobserved-levels",[["a1","a2"],["b1","b2","b3","b4"]],[(a,b) for a in range(2) for b in range(2)]),
        case("saturated-no-error-df",[["a1","a2"],["b1","b2","b3"]],full23,order=2,reps=1),
        case("response-missing",[["a1","a2"],["b1","b2","b3"]],full23,order=2,reps=2,missing_y=(4,5)),
    ]
    proof=cases[2]
    b=next(m for m in proof["marginals"] if m["positions"]==[1])
    assert all(not c["estimable"] for c in b["cells"])
    pair=next(p for p in b["pairs"] if p["a"]==1 and p["b"]==2)
    assert pair["estimable"] and np.isclose(pair["estimate"],-4.) and np.isclose(pair["stdError"],np.sqrt(2/3))
    data={"id":"mixed_level_estimability","environment":{"python":platform.python_version(),"numpy":np.__version__,"scipy":scipy.__version__,"statsmodels":sm.__version__},
          "definition":"sum coding; SVD row-space membership; uniform full reference grid; planned contrast-family Bonferroni count","cases":cases}
    target=ROOT/"estimability.json";target.write_text(json.dumps(data,indent=1,allow_nan=False)+"\n",encoding="utf-8")
    print(f"{len(cases)} independent mixed-level estimability cases")
    print(f"Proof: rank {proof['rank']}/{proof['parameters']}; all B means non-estimable; B2-B3={pair['estimate']:.12g}, SE={pair['stdError']:.12g}")


if __name__=="__main__":main()
