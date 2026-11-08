"""Fai–Cornelius, EMM e Holm em modelo fatorial desbalanceado com covariável.
Referência NumPy/SciPy densa, codificação de soma zero construída independentemente.
"""
import json
from pathlib import Path
import numpy as np
import scipy
from scipy.optimize import minimize
from scipy.stats import t,f
from repeated_reference import solve
ROOT=Path(__file__).resolve().parents[1]
rng=np.random.default_rng(20261104)

def row(a,b,x):
    ac=np.array([[1.,0.],[0.,1.],[-1.,-1.]])[a]
    bc=np.array([[1.,0.],[0.,1.],[-1.,-1.]])[b]
    return np.r_[1.,ac,bc,np.outer(ac,bc).ravel(),x]

cases=[]
for kind in ['cs','ar1']:
    groups=[];times=[];X=[];y=[];observations=[]
    truth_beta=np.array([10.,.5,-.3,.8,-.1,.4,-.2,-.1,.2,.7])
    truth_cov=2.+1.3*(.45**np.abs(np.subtract.outer(np.arange(3),np.arange(3))) if kind=='ar1' else np.eye(3))
    for unit in range(36):
        group=[];a=unit%3;errors=rng.multivariate_normal(np.zeros(3),truth_cov)
        for b in range(3):
            if (unit+3*b)%13==0:continue
            x=float(rng.normal(2.,.8));vector=row(a,b,x)
            group.append(len(y));times.append(float(b));X.append(vector);y.append(float(vector@truth_beta+errors[b]))
            observations.append({'id':f'o{len(y)}','unitId':f'u{unit+1}','factors':[['A','B','C'][a],['Before','During','After'][b],x],'responses':[y[-1]]})
        groups.append(np.asarray(group,dtype=int))
    X=np.asarray(X);y=np.asarray(y);times=np.asarray(times)
    starts=[np.array([0.,0.])] if kind=='cs' else [np.array([0.,0.,np.arctanh(r)]) for r in [-.6,0.,.6]]
    candidates=[]
    for boundary in [False,True]:
        for start in starts:
            initial=start[1:] if boundary else start
            def objective(theta):
                result=solve(kind,X,y,groups,times,theta,3,boundary)
                return result[0] if result else np.inf
            result=minimize(objective,initial,method='BFGS',options={'gtol':2e-6,'maxiter':700})
            if np.max(np.abs(result.jac))<4e-5:candidates.append((result.fun,boundary,result.x))
    nll,boundary,theta=min(candidates,key=lambda item:item[0]);nll,beta,cov=solve(kind,X,y,groups,times,theta,3,boundary)
    k=len(theta);h=.001;hessian=np.zeros((k,k));derivatives=[]
    for i in range(k):
        ei=np.eye(k)[i]*h;plus=solve(kind,X,y,groups,times,theta+ei,3,boundary);minus=solve(kind,X,y,groups,times,theta-ei,3,boundary)
        derivatives.append((plus[2]-minus[2])/(2*h));hessian[i,i]=(plus[0]-2*nll+minus[0])/h**2
        for j in range(i):
            ej=np.eye(k)[j]*h
            hessian[i,j]=hessian[j,i]=sum(sign*solve(kind,X,y,groups,times,theta+di*ei+dj*ej,3,boundary)[0] for di,dj,sign in [(1,1,1),(1,-1,-1),(-1,1,-1),(-1,-1,1)])/(4*h*h)
    assert np.linalg.eigvalsh(hessian).min()>0;information=np.linalg.inv(hessian)
    def inference(L,level=.95):
        variance=float(L@cov@L);gradient=np.array([L@d@L for d in derivatives]);df=float(2*variance**2/(gradient@information@gradient));estimate=float(L@beta);se=float(np.sqrt(variance));critical=t.ppf((1+level)/2,df)
        return {'estimate':estimate,'stdError':se,'df':df,'pValue':float(2*t.sf(abs(estimate/se),df)),'ciLower':float(estimate-critical*se),'ciUpper':float(estimate+critical*se)}
    tests=[]
    for columns in [[1,2],[3,4],[5,6,7,8],[9]]:
        values,vectors=np.linalg.eigh(cov[np.ix_(columns,columns)]);stat=0.;dfs=[]
        for j in range(len(columns)):
            L=np.zeros(10);L[columns]=vectors[:,j];stat+=float(L@beta)**2/values[j];dfs.append(inference(L)['df'])
        q=len(columns);stat/=q
        if q==1 or max(dfs)-min(dfs)<1e-7:df=float(np.mean(dfs))
        elif min(dfs)<=2:df=2.
        else:
            E=sum(v/(v-2) for v in dfs);df=2*E/(E-q)
        tests.append({'f':stat,'df':df,'pValue':float(f.sf(stat,q,df))})
    reference=2.25;vectors=[np.mean([row(a,b,reference) for b in range(3)],axis=0) for a in range(3)]
    means=[inference(L) for L in vectors];comparisons=[]
    for a in range(3):
        for b in range(a+1,3):comparisons.append({'first':a,'second':b,**inference(vectors[a]-vectors[b],1-.05/3)})
    previous=0.
    for rank,index in enumerate(sorted(range(3),key=lambda i:comparisons[i]['pValue'])):
        previous=max(previous,min(1.,(3-rank)*comparisons[index]['pValue']));comparisons[index]['adjustedPValue']=previous
    request={'dataset':{'factors':[{'id':'g','name':'Group','kind':'categorical','unit':None,'levels':['A','B','C']},{'id':'occasion','name':'Occasion','kind':'categorical','unit':None,'levels':['Before','During','After']},{'id':'x','name':'Covariate','kind':'numeric','unit':None,'levels':[]}],'responses':[{'id':'y','name':'Response','unit':None}],'observations':observations},'spec':{'responseId':'y','intercept':True,'terms':[{'type':'main','factorId':'g'},{'type':'main','factorId':'occasion'},{'type':'interaction','factorIds':['g','occasion']},{'type':'main','factorId':'x'}],'coding':'sum','confidenceLevel':.95},'advanced':{'covariance':'compoundSymmetry' if kind=='cs' else 'ar1','times':times.tolist(),'timeEffect':'none','marginalFactors':['g'],'marginalTime':False,'adjustment':'holm','references':[{'factorId':'x','value':reference}]}}
    cases.append({'name':f'{kind}_factorial_sum_unbalanced','request':request,'expected':{'nll':nll,'beta':beta.tolist(),'fixedCovariance':cov.ravel().tolist(),'termTests':tests,'means':means,'comparisons':comparisons}})
    print(kind,nll,theta,flush=True)
path=ROOT/'cases/repeated_covariance/factorial.json';path.write_text(json.dumps({'reference':{'numpy':np.__version__,'scipy':scipy.__version__,'seed':20261104,'coding':'sum; interaction is outer product','referenceCovariate':2.25,'weighting':'equal among all three occasion levels','intervals':'Bonferroni within Group','pValues':'Holm within Group','toleranceRelative':.003},'cases':cases},indent=2,allow_nan=False)+'\n',encoding='utf-8')
