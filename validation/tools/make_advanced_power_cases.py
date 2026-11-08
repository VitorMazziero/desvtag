"""SciPy power/search plus independent full-data OLS simulation for advanced fixed designs."""
from pathlib import Path
import json
import numpy as np
import scipy
from scipy import stats
ROOT=Path(__file__).resolve().parents[2]
SEED=20261104
rng=np.random.default_rng(SEED)
def quantities(design,n,sigma,alpha,two_sided):
 kind=design['type'];x=None;beta=None;c=None
 if kind=='regression':
  z=np.array(design['predictors'],float);beta=np.r_[0.,design['coefficients']];x=np.c_[np.ones(len(z)),z]
  centered=z-z.mean(axis=0);q=z.shape[1];total=len(z)*n;df=total-x.shape[1];nc=float(n*np.sum((centered@beta[1:])**2)/sigma**2)
  if df<=0:return None
  critical=float(stats.f.isf(alpha,q,df));power=float(stats.f.sf(critical,q,df) if nc==0 else stats.ncf.sf(critical,q,df,nc));half=None;d1=q;d2=df
 elif kind=='contrast':
  mu=np.array(design['means']);weights=np.array(design['weights']);allocation=np.array(design['allocation']);total=int(allocation.sum()*n);df=total-len(mu)
  if df<=0:return None
  se=sigma*np.sqrt(np.sum(weights**2/allocation)/n);nc=abs(float(weights@mu))/se;d1=df;d2=0
  critical=float(stats.t.isf(alpha/2 if two_sided else alpha,df));power=float(stats.nct.sf(critical,df,nc)+(stats.nct.cdf(-critical,df,nc) if two_sided else 0));half=float(stats.t.isf(alpha/2,df)*se)
 else:
  k=design['factors'];rows=np.array([[1 if bits&(1<<j) else -1 for j in range(k)]for bits in range(2**k)])
  z=np.array([np.prod(rows[:,term],axis=1) for term in design['terms']]).T;x=np.c_[np.ones(len(z)),z];beta=np.r_[0.,np.array(design['effects'])/2];target=design['target'];total=len(x)*n;df=total-x.shape[1]
  if df<=0:return None
  se=2*sigma/np.sqrt(total);nc=abs(design['effects'][target])/se;d1=df;d2=0;c=np.zeros(len(beta));c[target+1]=2
  critical=float(stats.t.isf(alpha/2 if two_sided else alpha,df));power=float(stats.nct.sf(critical,df,nc)+(stats.nct.cdf(-critical,df,nc) if two_sided else 0));half=float(stats.t.isf(alpha/2,df)*se)
 return dict(power=power,n=n,total=int(total),df1=float(d1),df2=float(d2),noncentrality=float(nc),critical=critical,halfWidth=half),x,beta,c

def simulation(design,n,sigma,alpha,two_sided,B=30000):
 expected,x,beta,c=quantities(design,n,sigma,alpha,two_sided);kind=design['type']
 if kind=='contrast':
  counts=np.array(design['allocation'])*n;mu=np.array(design['means']);weights=np.array(design['weights']);df=expected['df1'];reject=0
  for start in range(0,B,500):
   size=min(500,B-start);groups=[rng.normal(mean,sigma,(size,int(count))) for mean,count in zip(mu,counts)];est=np.stack([g.mean(axis=1)for g in groups],axis=1);sse=sum(np.sum((g-g.mean(axis=1)[:,None])**2,axis=1)for g in groups);se=np.sqrt(sse/df*np.sum(weights**2/counts));t=np.sign(float(weights@mu) or 1)*(est@weights)/se
   reject+=int(np.sum((np.abs(t)>expected['critical'])if two_sided else(t>expected['critical'])))
 else:
  X=np.tile(x,(n,1));N,p=X.shape;inv=np.linalg.inv(X.T@X);pinv=inv@X.T;reject=0
  for start in range(0,B,500):
   size=min(500,B-start);y=X@beta+rng.normal(0,sigma,(size,N));coef=y@pinv.T;resid=y-coef@X.T;sse=np.sum(resid**2,axis=1);mse=sse/(N-p)
   if kind=='regression':
    reduced=y.mean(axis=1);rss0=np.sum((y-reduced[:,None])**2,axis=1);stat=(rss0-sse)/(p-1)/mse;hit=stat>expected['critical']
   else:
    t=np.sign(float(c@beta) or 1)*(coef@c)/np.sqrt(mse*(c@inv@c));hit=np.abs(t)>expected['critical']if two_sided else t>expected['critical']
   reject+=int(np.sum(hit))
 estimate=reject/B;return dict(replications=B,rejections=reject,estimate=estimate,mcse=float(np.sqrt(estimate*(1-estimate)/B)),method='Independent raw normal observations and OLS/group residual variance; NumPy PCG64')

def make(name,design,n,goal=None,two=True):
 sigma=1.2;alpha=.05;goal=goal or dict(type='powerAt',n=n)
 if goal['type']!='powerAt':
  for m in range(1,100001):
   result=quantities(design,m,sigma,alpha,two)
   if result is None:continue
   e=result[0]
   if e['total']>100000:raise RuntimeError('unreachable')
   if (e['power']>=goal['power'] if goal['type']=='sampleSizeFor' else e['halfWidth']<=goal['halfWidth']):n=m;break
 expected=quantities(design,n,sigma,alpha,two)[0]
 return dict(name=name,request=dict(design=design,sigma=sigma,alpha=alpha,twoSided=two,goal=goal),expected=expected,simulation=simulation(design,n,sigma,alpha,two))
reg=dict(type='regression',predictors=[[-2,1],[-1,0],[0,1],[1,0],[2,2]],coefficients=[.45,-.25])
contrast=dict(type='contrast',means=[10.,11.2,12.],weights=[-2.,1.,1.],allocation=[1,2,1])
factorial=dict(type='twoLevel',factors=3,terms=[[0],[1],[2],[0,1]],effects=[.8,.5,.2,.9],target=3)
cases=[make('regression_correlated',reg,5),make('regression_minimum',reg,1,dict(type='sampleSizeFor',power=.8)),make('contrast_unequal',contrast,8),make('contrast_one_sided',contrast,8,two=False),make('contrast_precision',contrast,1,dict(type='precisionFor',halfWidth=.5)),make('factorial_interaction',factorial,4),make('factorial_minimum',factorial,1,dict(type='sampleSizeFor',power=.9)),make('factorial_precision',factorial,1,dict(type='precisionFor',halfWidth=.4)),make('regression_null',{**reg,'coefficients':[0.,0.]},5),make('contrast_null',{**contrast,'means':[10.,10.,10.]},8)]
out=ROOT/'validation/cases/power_advanced';out.mkdir(parents=True,exist_ok=True)
(out/'power.json').write_text(json.dumps(dict(seed=SEED,numpy=np.__version__,scipy=scipy.__version__,method='Exact noncentral F/t, integer enumeration for minimum n, independent raw-data normal OLS Monte Carlo',tolerances=dict(analyticAbsolute=1e-9,monteCarloStandardErrors=6),cases=cases),indent=2,allow_nan=False)+'\n',encoding='utf-8')
print('10 independent power cases generated:',[(c['name'],c['expected']['n'],round(c['expected']['power'],5))for c in cases])
