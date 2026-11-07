"""Gera os casos de validação de `mixture_design` (geração) e `mixture_model` (modelos de Scheffé).

Referências independentes, sem usar o código Rust:
- geração: `itertools.product` (lattice, ordem lexicográfica) e `itertools.combinations`
  (centroide), pseudocomponentes `a/m` e `1/k`, proporções `L + (1 − ΣL)·x′`, PCG32 e
  Fisher–Yates sobre a ordem padrão (repetições e centrais extras incluídos);
- análise: `statsmodels.OLS` **sem intercepto** nos pseudocomponentes (coeficientes, erros-padrão,
  t, valores-p e intervalos); a ANOVA usa a soma total **centrada** (`n − 1` gl; modelo com
  `posto − 1`), F e valor-p por `scipy.stats.f`, `R²` e `R²` ajustado por definição.
"""
import itertools
import json
import platform
from pathlib import Path

import numpy as np
import statsmodels.api as sm
import scipy
from scipy import stats
from scipy.optimize import linprog, minimize
from scipy.spatial import HalfspaceIntersection

ROOT = Path(__file__).resolve().parents[1] / "cases"
MASK = (1 << 64) - 1


class PCG32:
    def __init__(self, seed, seq=54):
        self.state, self.inc = 0, ((seq << 1) | 1) & MASK
        self.next()
        self.state = (self.state + seed) & MASK
        self.next()

    def next(self):
        old = self.state
        self.state = (old * 6364136223846793005 + self.inc) & MASK
        xs = (((old >> 18) ^ old) >> 27) & 0xFFFFFFFF
        rot = old >> 59
        return ((xs >> rot) | (xs << ((-rot) & 31))) & 0xFFFFFFFF

    def bounded(self, bound):
        threshold = ((-bound) & 0xFFFFFFFF) % bound
        while True:
            r = self.next()
            if r >= threshold:
                return r % bound


def permutation(n, seed):
    rng, items = PCG32(seed), list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.bounded(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def base_points(q, kind, degree):
    if kind == "lattice":
        pts = []
        for a in itertools.product(range(degree + 1), repeat=q):
            if sum(a) == degree:
                pts.append([v / degree for v in a])
        return pts
    pts = []
    for k in range(1, q + 1):
        for subset in itertools.combinations(range(q), k):
            pts.append([(1.0 / k) if i in subset else 0.0 for i in range(q)])
    return pts


def design_case(q, kind, degree, lowers, replicates, centers, randomize, seed):
    lowers = list(lowers) + [0.0] * (q - len(lowers))
    scale = 1.0
    for l in lowers:
        scale -= l
    # Rust: 1 − Σ L com soma sequencial; reproduz a mesma ordem de operações.
    total = 0.0
    for l in lowers:
        total += l
    scale = 1.0 - total
    base = base_points(q, kind, degree)
    standard = [(p, rep, False) for rep in range(1, replicates + 1) for p in base]
    standard += [([1.0 / q] * q, n, True) for n in range(1, centers + 1)]
    order = permutation(len(standard), seed) if randomize else list(range(len(standard)))
    runs = []
    for position, index in enumerate(order):
        pseudo, rep, extra = standard[index]
        runs.append(
            {
                "run": position + 1,
                "standardOrder": index + 1,
                "support": sum(1 for v in pseudo if v > 0.0),
                "extraCenter": extra,
                "pseudo": pseudo,
                "proportions": [lowers[i] + scale * pseudo[i] for i in range(q)],
                "replicate": rep,
            }
        )
    return {
        "q": q,
        "kind": kind,
        "degree": degree,
        "lowers": lowers,
        "replicates": replicates,
        "centerPoints": centers,
        "randomize": randomize,
        "seed": seed,
        "baseCount": len(base),
        "runs": runs,
    }


def columns(pseudo, model):
    q = len(pseudo)
    cols = list(pseudo)
    if model in ("quadratic", "specialCubic"):
        cols += [pseudo[i] * pseudo[j] for i in range(q) for j in range(i + 1, q)]
    if model == "specialCubic":
        cols += [pseudo[i] * pseudo[j] * pseudo[k] for i in range(q) for j in range(i + 1, q) for k in range(j + 1, q)]
    return cols


def analysis_case(name, q, lowers, model, truth, noise, seed, replicates, kind="lattice", degree=2, alpha=0.05):
    lowers = list(lowers) + [0.0] * (q - len(lowers))
    scale = 1.0 - sum(lowers)
    base = base_points(q, kind, degree) * replicates + [[1.0 / q] * q]
    rng = np.random.default_rng(seed)
    props, pseudos, y = [], [], []
    for p in base:
        row = [lowers[i] + scale * p[i] for i in range(q)]
        props.append(row)
        pseudos.append([(row[i] - lowers[i]) / scale for i in range(q)])
        y.append(round(float(truth(p) + rng.normal(0, noise)), 4))
    X = np.array([columns(p, model) for p in pseudos])
    fit = sm.OLS(np.array(y), X).fit()
    n, rank = len(y), int(np.linalg.matrix_rank(X))
    yb = float(np.mean(y))
    sst = float(np.sum((np.array(y) - yb) ** 2))
    sse = float(np.sum(fit.resid ** 2))
    dfe = n - rank
    dfm = rank - 1
    f = ((sst - sse) / dfm) / (sse / dfe)
    ci = fit.conf_int(alpha=alpha)
    return {
        "name": name,
        "request": {
            "componentNames": [f"C{i + 1}" for i in range(q)],
            "lowerBounds": lowers,
            "proportions": props,
            "response": y,
            "model": model,
            "alpha": alpha,
        },
        "expected": {
            "n": n,
            "rank": rank,
            "dfResidual": dfe,
            "coefficients": [
                {
                    "estimate": float(fit.params[i]),
                    "stdError": float(fit.bse[i]),
                    "t": float(fit.tvalues[i]),
                    "p": float(fit.pvalues[i]),
                    "ciLower": float(ci[i][0]),
                    "ciUpper": float(ci[i][1]),
                }
                for i in range(X.shape[1])
            ],
            "ssTotal": sst,
            "ssResidual": sse,
            "f": float(f),
            "pValue": float(stats.f.sf(f, dfm, dfe)),
            "rSquared": 1.0 - sse / sst,
            "adjustedRSquared": 1.0 - (1.0 - (1.0 - sse / sst)) * (n - 1) / dfe,
        },
    }


def bounded_case(name, lower, upper, degree):
    """Independent polytope vertices from Qhull, with an LP interior point.

    Eliminate the sum constraint and components fixed by equal bounds. This uses
    halfspace intersection rather than the bound-assignment enumeration planned
    for Rust. Edge incidence is checked by the rank of common active facets.
    """
    lower, upper = np.array(lower, dtype=float), np.array(upper, dtype=float)
    q = len(lower)
    feasible = linprog(np.zeros(q), A_eq=np.ones((1, q)), b_eq=[1.0],
                       bounds=list(zip(lower, upper)), method="highs")
    if not feasible.success:
        return {"name": name, "lower": lower.tolist(), "upper": upper.tolist(),
                "degree": degree, "feasible": False}
    free = np.flatnonzero(upper > lower)
    point = lower.copy()
    dimension = max(len(free) - 1, 0)
    if abs(upper.sum() - 1.0) < 1e-12:
        vertices = upper.reshape(1, q)
        dimension = 0
    elif len(free) <= 1:
        point[free] += 1.0 - point.sum()
        vertices = point.reshape(1, q)
    else:
        # x_last = remaining_total - sum(x_free_except_last).
        total = 1.0 - sum(lower[i] for i in range(q) if i not in free)
        identity = np.eye(dimension)
        a = np.vstack([identity, -identity, -np.ones(dimension), np.ones(dimension)])
        b = np.r_[upper[free[:-1]], -lower[free[:-1]],
                  upper[free[-1]] - total, total - lower[free[-1]]]
        interior = linprog(np.r_[np.zeros(dimension), -1.0],
                           A_ub=np.column_stack([a, np.linalg.norm(a, axis=1)]), b_ub=b,
                           bounds=[(None, None)] * dimension + [(0, None)], method="highs")
        assert interior.success and interior.x[-1] > 1e-12, name
        if dimension == 1:
            coords = np.array([[linprog(sign * np.ones(1), A_ub=a, b_ub=b,
                                       bounds=[(None, None)], method="highs").x[0]]
                               for sign in [1.0, -1.0]])
        else:
            coords = HalfspaceIntersection(np.column_stack([a, -b]), interior.x[:-1]).intersections
        vertices = np.tile(lower, (len(coords), 1))
        vertices[:, free[:-1]] = coords
        vertices[:, free[-1]] = total - coords.sum(axis=1)
    vertices = np.unique(np.round(vertices, 12), axis=0)
    edges = []
    for i, j in itertools.combinations(range(len(vertices)), 2):
        active = []
        # Rank in the original affine space, including sum and fixed dimensions.
        for k in range(q):
            same_lower = np.all(np.abs(vertices[[i, j], k] - lower[k]) < 1e-9)
            same_upper = np.all(np.abs(vertices[[i, j], k] - upper[k]) < 1e-9)
            if same_lower or same_upper:
                active.append(np.eye(q)[k])
        if np.linalg.matrix_rank(np.vstack([np.ones(q), *active])) == q - 1:
            edges.append([i, j])
    points = list(vertices)
    for i, j in edges:
        points.extend((1 - part / degree) * vertices[i] + (part / degree) * vertices[j]
                      for part in range(1, degree))
    base = np.unique(np.round(points, 12), axis=0)
    assert np.max(np.abs(base.sum(axis=1) - 1.0)) < 1e-10
    assert np.all(base >= lower - 1e-10) and np.all(base <= upper + 1e-10)
    return {"name": name, "lower": lower.tolist(), "upper": upper.tolist(),
            "degree": degree, "feasible": True, "dimension": dimension,
            "vertices": vertices.tolist(), "edges": edges, "base": base.tolist(),
            "vertexMean": vertices.mean(axis=0).tolist()}


def cox_case(name, lower, upper, reference, model, vertices_only=False):
    """LP path endpoints and independent least-squares predictions/row-space checks."""
    lower, upper, reference = map(lambda v: np.array(v, dtype=float), (lower, upper, reference))
    q = len(lower)
    vertices = np.array(bounded_case(name, lower, upper, 1)["vertices"])
    rng = np.random.default_rng(417)
    observations = vertices if vertices_only else np.vstack([
        vertices, rng.dirichlet(np.ones(len(vertices)), size=max(40, 3*q*q)) @ vertices])
    scale = 1-lower.sum()
    matrix = np.array([columns((p-lower)/scale, model) for p in observations])
    truth = np.array([5*(i+1) if i < q else (-1)**i*4 for i in range(matrix.shape[1])])
    response = matrix @ truth + (np.zeros(len(matrix)) if vertices_only else rng.normal(0, .03, len(matrix)))
    beta = np.linalg.lstsq(matrix, response, rcond=None)[0]
    series = []
    for i in range(q):
        if sum(reference[j] for j in range(q) if j != i) == 0:
            series.append({"component":i,"interval":None,"points":[]})
            continue
        equations=[np.ones(q)]
        rhs=[1.0]
        for j in range(q):
            if i == j: continue
            row=np.zeros(q)
            row[j]=1-reference[i]
            row[i]=reference[j]
            equations.append(row)
            rhs.append(reference[j])
        intervals=[]
        for sign in [1.,-1.]:
            objective=np.zeros(q)
            objective[i]=sign
            solved=linprog(objective,A_eq=equations,b_eq=rhs,bounds=list(zip(lower,upper)),method="highs")
            assert solved.success,(name,i,solved.message)
            intervals.append(float(solved.x[i]))
        lo,hi=intervals
        locations=[reference[i]] if hi-lo < 1e-12 else list(np.linspace(lo,hi,51))
        locations=[v for v in locations if abs(v-reference[i]) > 1e-12]+[reference[i]]
        locations.sort()
        points=[]
        for t in locations:
            p=(1-t)*reference/(1-reference[i])
            p[i]=t
            if t == reference[i]: p=reference.copy()
            pseudo=(p-lower)/scale
            row=np.array(columns(pseudo,model))
            weights=np.linalg.lstsq(matrix.T,row,rcond=None)[0]
            estimable=np.linalg.norm(matrix.T @ weights-row) < 1e-9
            points.append({"delta":float(t-reference[i]),"proportions":p.tolist(),"pseudo":pseudo.tolist(),
                           "value":float(row @ beta) if estimable else None})
        series.append({"component":i,"interval":intervals,"points":points})
    return {"name":name,"request":{"componentNames":[f"C{i+1}" for i in range(q)],"lowerBounds":lower.tolist(),
            "upperBounds":upper.tolist(),"coxReference":reference.tolist(),"proportions":observations.tolist(),
            "response":response.tolist(),"model":model,"alpha":.05},"series":series}


def write_cox_cases():
    cases=[
        cox_case("binary",[0,0],[1,1],[.3,.7],"linear"),
        cox_case("quadratic-bounded",[.05,.1,0],[.6,.65,.7],[.25,.35,.4],"quadratic"),
        cox_case("special-cubic-four",[0]*4,[.7]*4,[.1,.2,.3,.4],"specialCubic"),
        cox_case("eight-components",[0]*8,[.5]*8,[.125]*8,"linear"),
        cox_case("fixed-component",[.1,0,0,0],[.1,.5,.6,.7],[.1,.2,.3,.4],"linear"),
        cox_case("pure-reference",[0]*3,[1]*3,[1,0,0],"linear"),
        cox_case("single-composition",[0]*3,[.2,.3,.5],[.2,.3,.5],"linear"),
        cox_case("aliased-quadratic",[0]*3,[1]*3,[1/3]*3,"quadratic",vertices_only=True),
    ]
    path=ROOT/"mixture_model"/"cox.json"
    path.write_text(json.dumps({"id":"mixture_model_cox","environment":{"python":platform.python_version(),
        "numpy":np.__version__,"scipy":scipy.__version__},"cases":cases},indent=1)+"\n",encoding="utf-8")
    print("Cox references:",len(cases))


def mixture_desirability(goal, y):
    """Independent formula, deliberately separate from the production implementation."""
    kind=goal["type"]
    if kind == "maximize": return float(np.clip((y-goal["low"])/(goal["target"]-goal["low"]),0,1)**goal["shape"])
    if kind == "minimize": return float(np.clip((goal["high"]-y)/(goal["high"]-goal["target"]),0,1)**goal["shape"])
    if kind == "range": return float(goal["low"] <= y <= goal["high"])
    if y < goal["low"] or y > goal["high"]: return 0.
    return float(((y-goal["low"])/(goal["target"]-goal["low"]))**goal["shapeLow"] if y <= goal["target"]
                 else ((goal["high"]-y)/(goal["high"]-goal["target"]))**goal["shapeHigh"])


def mixture_opt_case(name, lower, upper, model, truths, goals, weights=None, limits=None, linear=None, vertices_only=False, observation_sets=None):
    lower,upper=np.array(lower,dtype=float),np.array(upper,dtype=float)
    q=len(lower)
    region=bounded_case(name,lower,upper,1)
    vertices=np.array(region["vertices"])
    rng=np.random.default_rng(925)
    observed=vertices if vertices_only else np.vstack([vertices,rng.dirichlet(np.ones(len(vertices)),size=50) @ vertices])
    matrix=np.array([columns((row-lower)/(1-lower.sum()),model) for row in observed])
    ys=[np.array([truth(row) for row in observed]) for truth in truths]
    observation_sets=observation_sets or [(observed,y) for y in ys]
    observed,ys0=observation_sets[0]
    betas=[np.linalg.lstsq(np.array([columns((row-lower)/(1-lower.sum()),model) for row in points]),y,rcond=None)[0] for points,y in observation_sets]
    weights=weights or [1.]*len(goals)
    limits=limits or []
    data=[{"responseId":f"y{i+1}","name":f"Y{i+1}","proportions":points.tolist(),"response":y.tolist()} for i,(points,y) in enumerate(observation_sets)]
    setup={"responses":[{"responseId":f"y{i+1}","terms":[],"goal":goal,"importance":weight} for i,(goal,weight) in enumerate(zip(goals,weights))],
           "limits":limits,"domain":{"type":"region"},"search":{"starts":40,"seed":20261104,"maxCandidates":5,"clusterTolerance":.01},"alpha":.05}
    request={"componentNames":[f"C{i+1}" for i in range(q)],"lowerBounds":lower.tolist(),"upperBounds":upper.tolist(),
             "proportions":observed.tolist(),"response":ys0.tolist(),"model":model,"alpha":.05,
             "optimization":{"setup":setup,"data":data}}
    if vertices_only: return {"name":name,"request":request,"expectedError":"optimization.model_not_estimable"}
    predict=lambda x: np.array([np.array(columns((x-lower)/(1-lower.sum()),model)) @ beta for beta in betas])
    def desire(x):
        ds=[mixture_desirability(g,y) for g,y in zip(goals,predict(x))]
        return 0. if min(ds)==0 else float(np.exp(np.dot(np.log(ds),weights)/sum(weights)))
    def violations(x):
        values=predict(x)
        out=[]
        for limit in limits:
            index=int(limit["responseId"][1:])-1
            if limit["min"] is not None: out.append(values[index]-limit["min"])
            if limit["max"] is not None: out.append(limit["max"]-values[index])
        return np.array(out)
    valid=lambda x: np.all(x >= lower-1e-8) and np.all(x <= upper+1e-8) and abs(x.sum()-1)<1e-8 and (not limits or np.all(violations(x)>=-1e-8))
    if linear is not None:
        a,b=[],[]
        for limit in limits:
            assert limit["responseId"] == "y1"
            if limit["min"] is not None: a.append(-np.array(linear));b.append(-limit["min"])
            if limit["max"] is not None: a.append(np.array(linear));b.append(limit["max"])
        solved=linprog(-np.array(linear),A_ub=a or None,b_ub=b or None,A_eq=np.ones((1,q)),b_eq=[1.],bounds=list(zip(lower,upper)),method="highs")
        if not solved.success: return {"name":name,"request":request,"feasible":False,"reference":"scipy.linprog/HiGHS"}
        best=solved.x
        reference="scipy.linprog/HiGHS (monotone scalar goal)"
    elif region["dimension"] == 0:
        best=vertices[0]
        reference="unique feasible composition"
    else:
        constraints=[{"type":"eq","fun":lambda x:x.sum()-1}]
        if limits: constraints.append({"type":"ineq","fun":violations})
        starts=np.vstack([vertices,vertices.mean(axis=0),rng.dirichlet(np.ones(len(vertices)),size=20) @ vertices])
        answers=[minimize(lambda x:-desire(x),np.clip(start,lower,upper),method="SLSQP",bounds=list(zip(lower,upper)),constraints=constraints,
                          options={"maxiter":2000,"ftol":1e-13}) for start in starts]
        answers=[answer for answer in answers if answer.success and valid(answer.x)]
        assert answers,name
        best=max(answers,key=lambda answer:desire(answer.x)).x
        reference="scipy.optimize.minimize/SLSQP, vertices + centre + 20 independent starts"
    assert valid(best),name
    answer={"name":name,"request":request,"feasible":True,"bestReal":best.tolist(),"bestPredictions":predict(best).tolist(),
            "bestDesirability":desire(best),"reference":reference}
    if q <= 3:
        feasible=[np.array(p)/200 for p in itertools.product(range(201),repeat=q-1)]
        grid=[np.r_[p,1-p.sum()] for p in feasible if p.sum() <= 1.]
        grid=[point for point in grid if valid(point)]
        grid_best=max(map(desire,grid),default=None)
        assert grid_best is None or grid_best <= answer["bestDesirability"]+1e-7,(name,grid_best,answer["bestDesirability"])
        answer["gridDegree"]=200;answer["gridBestDesirability"]=grid_best
    return answer


def write_mixture_opt_cases():
    maximum=lambda low,target:{"type":"maximize","low":low,"target":target,"shape":1.}
    centre=np.array([.2,.3,.5])
    cases=[
        mixture_opt_case("interior-quadratic",[0]*3,[1]*3,"quadratic",[lambda x:1-np.sum((x-centre)**2)],[maximum(0,1.2)]),
        mixture_opt_case("bounded-linear",[.05,.1,0],[.6,.65,.7],"linear",[lambda x:np.dot(x,[10,20,30])],[maximum(0,40)],linear=[10,20,30]),
        mixture_opt_case("two-response-compromise",[0,0],[1,1],"linear",[lambda x:x[0],lambda x:x[1]],[maximum(0,1),maximum(0,1)]),
        mixture_opt_case("weighted-compromise",[0,0],[1,1],"linear",[lambda x:x[0],lambda x:x[1]],[maximum(0,1),maximum(0,1)],weights=[3,1]),
        mixture_opt_case("hard-limits-and-plateau",[.1,0,0],[.7,.7,.7],"linear",[lambda x:x[2],lambda x:x[1]],[maximum(0,1),{"type":"range","low":0,"high":1}],limits=[{"responseId":"y1","min":None,"max":.4},{"responseId":"y2","min":.3,"max":None}]),
        mixture_opt_case("flat-feasible-goal",[0]*3,[1]*3,"linear",[lambda x:1.],[{"type":"range","low":.5,"high":1.5}]),
        mixture_opt_case("fixed-component",[.1,0,0,0],[.1,.5,.6,.7],"linear",[lambda x:np.dot(x,[5,10,15,20])],[maximum(0,30)],linear=[5,10,15,20]),
        mixture_opt_case("eight-components",[0]*8,[.5]*8,"linear",[lambda x:np.dot(x,np.arange(1,9)*5)],[maximum(0,50)],linear=(np.arange(1,9)*5).tolist()),
        mixture_opt_case("single-composition",[0]*3,[.2,.3,.5],"linear",[lambda x:np.dot(x,[10,20,30])],[maximum(0,40)]),
        mixture_opt_case("special-cubic-interior",[0]*3,[.7]*3,"specialCubic",[lambda x:5+40*np.prod(x)],[maximum(4,8)]),
        mixture_opt_case("infeasible-response-limit",[.05,.1,0],[.6,.65,.7],"linear",[lambda x:np.dot(x,[10,20,30])],[maximum(0,40)],limits=[{"responseId":"y1","min":35.,"max":None}],linear=[10,20,30]),
        mixture_opt_case("quadratic-not-identified-on-domain",[0]*3,[1]*3,"quadratic",[lambda x:np.dot(x,[10,20,30])],[maximum(0,40)],vertices_only=True),
    ]
    # A nearly flat compromise ridge with missing observations, found in the real UI.
    points=np.array(bounded_case("ridge",[0]*3,[.6]*3,2)["base"]+[[1/3]*3])
    values=np.array([10*a+20*b+30*c+8*a*b+.002*(i%3) for i,(a,b,c) in enumerate(points)])
    keep=np.arange(len(points)) != 4
    ridge=mixture_opt_case("noisy-ridge-with-missing-response",[0]*3,[.6]*3,"quadratic",[],[maximum(0,40),maximum(0,40)],
                           observation_sets=[(points,values),(points[keep],40-values[keep])])
    ridge["maximumEvaluations"]=60000
    cases.append(ridge)
    cases.extend([
        mixture_opt_case("zero-desirability-found",[0]*3,[.6]*3,"linear",[lambda x:np.dot(x,[10,20,30])],[maximum(100,101)]),
        mixture_opt_case("minimize-shaped",[0,0],[1,1],"quadratic",[lambda x:1+(x[0]-.3)**2],[{"type":"minimize","target":0,"high":2,"shape":1.5}]),
        mixture_opt_case("target-asymmetric-shaped",[0]*3,[.7]*3,"linear",[lambda x:np.dot(x,[10,20,30])],[{"type":"target","low":10,"target":22,"high":35,"shapeLow":.5,"shapeHigh":2.}]),
    ])
    path=ROOT/"mixture_model"/"optimization.json"
    path.write_text(json.dumps({"id":"mixture_model_optimization","environment":{"python":platform.python_version(),"numpy":np.__version__,"scipy":scipy.__version__},"cases":cases},indent=1)+"\n",encoding="utf-8")
    print("mixture optimization references:",len(cases))


def main():
    d = ROOT / "mixture_design"
    d.mkdir(parents=True, exist_ok=True)
    designs = [
        design_case(3, "lattice", 2, [], 2, 2, True, 42),
        design_case(4, "centroid", 0, [], 1, 0, False, 0),
        design_case(4, "lattice", 3, [0.1, 0.05, 0.0, 0.2], 1, 1, True, 7),
        design_case(2, "lattice", 1, [], 3, 0, True, 12345),
        design_case(3, "centroid", 0, [0.0, 0.3], 3, 2, True, 9007199254740991),
        design_case(5, "lattice", 2, [], 1, 0, False, 99),
    ]
    bounded = [
        bounded_case("hexagon-three", [0, 0, 0], [0.6, 0.6, 0.6], 2),
        bounded_case("four-lower-and-upper", [0.05, 0.1, 0, 0.05], [0.6, 0.5, 0.45, 0.7], 3),
        bounded_case("binary-interval", [0.1, 0.2], [0.7, 0.8], 4),
        bounded_case("fixed-component", [0.1, 0, 0, 0], [0.1, 0.5, 0.6, 0.7], 2),
        bounded_case("eight-components", [0] * 8, [0.5] * 8, 2),
        bounded_case("single-composition", [0, 0, 0], [0.2, 0.3, 0.5], 2),
        bounded_case("infeasible-upper-sum", [0, 0, 0], [0.2, 0.2, 0.2], 2),
    ]
    (d / "mixture.json").write_text(
        json.dumps({"id": "mixture_design", "cases": designs, "boundedCases": bounded,
                    "boundedReferenceEnvironment": {"python": platform.python_version(),
                                                     "numpy": np.__version__, "scipy": scipy.__version__}},
                   indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    m = ROOT / "mixture_model"
    m.mkdir(parents=True, exist_ok=True)
    analyses = [
        analysis_case("linear-3", 3, [], "linear", lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2], 0.4, 1, 3),
        analysis_case(
            "quadratic-3",
            3,
            [],
            "quadratic",
            lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2] + 25 * p[0] * p[1] - 15 * p[1] * p[2],
            0.3,
            2,
            3,
        ),
        analysis_case(
            "special-cubic-3",
            3,
            [],
            "specialCubic",
            lambda p: 10 * p[0] + 20 * p[1] + 30 * p[2] + 12 * p[0] * p[1] + 80 * p[0] * p[1] * p[2],
            0.3,
            3,
            3,
        ),
        analysis_case(
            "quadratic-4-lower-bounds",
            4,
            [0.05, 0.1, 0.0, 0.1],
            "quadratic",
            lambda p: 8 * p[0] + 12 * p[1] + 5 * p[2] + 9 * p[3] + 20 * p[0] * p[3] - 10 * p[1] * p[2],
            0.25,
            4,
            2,
            kind="lattice",
            degree=2,
        ),
        analysis_case("linear-2", 2, [], "linear", lambda p: 4 * p[0] + 9 * p[1], 0.2, 5, 4, degree=2),
    ]
    (m / "scheffe.json").write_text(
        json.dumps({"id": "mixture_model", "cases": analyses}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print("planejamentos:", len(designs), "análises:", len(analyses))
    write_cox_cases()
    write_mixture_opt_cases()


if __name__ == "__main__":
    main()
