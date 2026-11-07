"""Independent Gaussian LR profiles: SciPy least_squares nuisance fits and brentq roots."""
from pathlib import Path
import json, hashlib
import numpy as np
import scipy
from scipy.optimize import least_squares, brentq
from scipy.stats import chi2
ROOT=Path(__file__).resolve().parents[2]
rng=np.random.default_rng(20261103)
def predict(model,x,p):
 if model=='monod': return p[0]*x/(p[1]+x)
 if model=='haldane': return p[0]*x/(p[1]+x+x*x/p[2])
 return p[0]*x**p[2]/(p[1]**p[2]+x**p[2])
def case(name,model,x,y,initial):
 x=np.asarray(x);y=np.asarray(y);initial=np.asarray(initial)
 fit=least_squares(lambda z:predict(model,x,np.exp(z))-y,np.log(initial),xtol=1e-14,ftol=1e-14,gtol=1e-14,max_nfev=10000)
 theta=np.exp(fit.x); sse=float(fit.fun@fit.fun); cutoff=float(chi2.isf(.05,1)); intervals=[]
 for index,estimate in enumerate(theta):
  free=np.array([i for i in range(len(theta)) if i!=index])
  def lr(value):
   def residual(z):
    p=theta.copy();p[index]=value;p[free]=np.exp(z);return predict(model,x,p)-y
   fits=[least_squares(residual,np.log(theta[free])+offset,xtol=1e-13,ftol=1e-13,gtol=1e-13,max_nfev=2000) for offset in [-1,0,1]]
   best=min(float(a.fun@a.fun) for a in fits)
   return len(x)*np.log(best/sse)-cutoff
  limits=[]
  for direction in [-1,1]:
   distance=.01
   while lr(estimate*np.exp(direction*distance))<0:
    distance*=1.5
    if distance>30: raise RuntimeError('unbounded reference')
   end=estimate*np.exp(direction*distance)
   limits.append(float(brentq(lr,min(end,estimate),max(end,estimate),xtol=1e-10)))
  intervals.append(limits)
 return dict(name=name,request=dict(x=x.tolist(),y=y.tolist(),model=model,initial=initial.tolist(),lower=None,upper=None,alpha=.05,profile=True),expected=dict(estimates=theta.tolist(),sse=sse,intervals=intervals,cutoff=cutoff),optimizer=dict(success=bool(fit.success),message=fit.message))
cases=[]
for model,theta,noise in [('monod',[3,2.5],.035),('haldane',[4,2,12],.025),('hill',[3.5,4,1.7],.035)]:
 x=np.geomspace(.2,40,32);y=predict(model,x,np.array(theta))+rng.normal(0,noise,len(x));cases.append(case(model,model,x,y,theta))
f=ROOT/'validation/sources/nist-strd/Misra1d.dat';content=f.read_bytes();lines=content.decode('ascii').splitlines();data=np.loadtxt(lines[lines.index('Data:   y            x')+1:])
nist=case('nist_misra1d','monod',data[:,1],data[:,0],[450,1/.0003]);nist['certified']=dict(b1=437.36970754,b2=.00030227324449,stdB1=3.6489174345,stdB2=.0000029334354479,sse=.056419295283,sigma=.068568272111,df=12,starts=[[500,1/.0001],[450,1/.0003]])
cases.append(nist)
out=ROOT/'validation/cases/nonlinear_profile';out.mkdir(parents=True,exist_ok=True)
(out/'profile.json').write_text(json.dumps(dict(seed=20261103,numpy=np.__version__,scipy=scipy.__version__,nistSourceSHA256=hashlib.sha256(content).hexdigest(),method='Gaussian LR n*log(SSE_profile/SSE_min), asymptotic chi2(1); SciPy log-parameterized TRF and brentq',tolerances=dict(parameterRelative=2e-5,sseRelative=2e-7,profileRelative=3e-4),cases=cases),indent=2,allow_nan=False)+'\n',encoding='utf-8')
print('4 independent cases generated:',[(c['name'],c['expected']['intervals']) for c in cases])
