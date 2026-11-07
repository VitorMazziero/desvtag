"""Generate deterministic extreme, nontrivial noncentral tails with independent SciPy."""
from pathlib import Path
import json
import scipy
from scipy import stats
ROOT=Path(__file__).resolve().parents[2]
f_cases=[]
for nc in [1000.,10000.,1000000.]:
 for d1 in [1.,5.]:
  for d2 in [1.,8.,1000.]:
   for ratio in [.5,1.,2.]:
    x=nc/d1*ratio
    f_cases.append(dict(x=x,d1=d1,d2=d2,noncentrality=nc,expected=float(stats.ncf.sf(x,d1,d2,nc))))
t_cases=[]
for delta in [8.0000001,9.,20.,40.,100.]:
 for df in [1.,2.,10.,100000.]:
  for x in [2.,delta,delta*10]:
   for sign in [1.,-1.]:
    t_cases.append(dict(x=x*sign,df=df,noncentrality=delta*sign,expected=float(stats.nct.cdf(x*sign,df,delta*sign))))
power_request=dict(design=dict(type="oneSampleT",difference=40/2**.5),sigma=1.,alpha=.01,twoSided=True,goal=dict(type="powerAt",n=2))
critical=float(stats.t.isf(.005,1.))
power_case=dict(request=power_request,expected=float(stats.nct.sf(critical,1.,40.)+stats.nct.cdf(-critical,1.,40.)))
out=ROOT/"validation/cases/noncentral_extreme";out.mkdir(parents=True,exist_ok=True)
(out/"tails.json").write_text(json.dumps(dict(scipy=scipy.__version__,method="scipy.stats.ncf.sf and nct.cdf, extreme noncentrality with nontrivial probabilities",toleranceAbsolute=2e-9,f=f_cases,t=t_cases,power=power_case),indent=2,allow_nan=False)+"\n",encoding="utf-8")
print(len(f_cases),"F cases and",len(t_cases),"t cases generated")
