"""Referência REML matricial independente: SciPy, V densa e otimização BFGS.
Não importa implementações Rust nem usa precisão AR(1) de Markov.
Semente, versão, inícios, convergência e tolerâncias ficam no artefato.
"""
import json
from pathlib import Path
import numpy as np
import scipy
from scipy.linalg import block_diag, cho_factor, cho_solve
from scipy.optimize import minimize
from scipy.stats import t as student, f as fisher

ROOT=Path(__file__).resolve().parents[1]
RNG=np.random.default_rng(20261103)

from repeated_reference import matrix, solve

cases=[]
for name,kind,rho,missing,q in [('cs_balanced','cs',0.,False,4),('ar1_positive','ar1',.65,False,4),('ar1_negative_gaps','ar1',-.6,True,5),('un_heterogeneous','unstructured',0.,False,3),('un_missing','unstructured',0.,True,4)]:
    units=24 if kind=='unstructured' else 18
    if kind=='unstructured':
        a=np.diag(np.linspace(1,2,q));a[np.tril_indices(q,-1)]=.35;truth=a@a.T
    else:
        truth=2.+1.5*rho**np.abs(np.subtract.outer(np.arange(q),np.arange(q))) if kind=='ar1' else 2.+1.5*np.eye(q)
    rows=[];groups=[];y=[];times=[];X=[]
    for unit in range(units):
        errors=RNG.multivariate_normal(np.zeros(q),truth)
        group=[]
        for time in range(q):
            if missing and (unit+2*time)%9==0:continue
            group.append(len(y));times.append(float(time));X.append([1.]+[float(time==j) for j in range(1,q)])
            y.append(float(10.+.7*time+errors[time]))
            rows.append({'unit':f'u{unit+1}','time':time,'y':y[-1]})
        groups.append(np.asarray(group,dtype=int))
    X=np.asarray(X);y=np.asarray(y);times=np.asarray(times)
    if kind=='unstructured':
        starts=[np.zeros(q*(q+1)//2),np.array([0. if i==j else .3 for i in range(q) for j in range(i+1)])]
    elif kind=='ar1':starts=[np.array([0.,0.,np.arctanh(r)]) for r in [-.65,0.,.65]]
    else:starts=[np.array([0.,0.]),np.array([-2.,0.])]
    candidates=[];attempts=[]
    for boundary in ([False] if kind=='unstructured' else [False,True]):
        for initial in starts:
            if boundary:initial=initial[1:]
            def objective(theta):
                got=solve(kind,X,y,groups,times,theta,q,boundary)
                return got[0] if got is not None else np.inf
            result=minimize(objective,initial,method='BFGS',options={'gtol':1e-6,'maxiter':700})
            attempts.append({'boundary':boundary,'success':bool(result.success),'message':str(result.message),'nll':float(result.fun),'gradientMax':float(np.max(np.abs(result.jac)))})
            if np.isfinite(result.fun) and np.max(np.abs(result.jac))<3e-5:candidates.append((result.fun,boundary,result.x))
    value,boundary,theta=min(candidates,key=lambda item:item[0])
    for v,b,t in candidates:
        if b and v<=value+1e-7:value,boundary,theta=v,b,t
    value,beta,cov=solve(kind,X,y,groups,times,theta,q,boundary)
    # Independent observed REML information in transformed covariance parameters.
    k=len(theta);h=np.full(k,0.001)
    hessian=np.zeros((k,k));derivatives=[]
    for i in range(k):
        ei=np.eye(k)[i]*h[i]
        plus=solve(kind,X,y,groups,times,theta+ei,q,boundary)
        minus=solve(kind,X,y,groups,times,theta-ei,q,boundary)
        derivatives.append((plus[2]-minus[2])/(2*h[i]))
        hessian[i,i]=(plus[0]-2*value+minus[0])/h[i]**2
        for j in range(i):
            ej=np.eye(k)[j]*h[j]
            hessian[i,j]=hessian[j,i]=(solve(kind,X,y,groups,times,theta+ei+ej,q,boundary)[0]-solve(kind,X,y,groups,times,theta+ei-ej,q,boundary)[0]-solve(kind,X,y,groups,times,theta-ei+ej,q,boundary)[0]+solve(kind,X,y,groups,times,theta-ei-ej,q,boundary)[0])/(4*h[i]*h[j])
    assert np.linalg.eigvalsh(hessian).min()>0
    inverse_information=np.linalg.inv(hessian)
    def inference(L,level=.95):
        variance=float(L@cov@L);gradient=np.asarray([L@d@L for d in derivatives])
        df=float(2*variance**2/(gradient@inverse_information@gradient))
        estimate=float(L@beta);se=float(np.sqrt(variance));crit=student.ppf((1+level)/2,df)
        return {'estimate':estimate,'stdError':se,'df':df,'pValue':float(2*student.sf(abs(estimate/se),df)),'ciLower':float(estimate-crit*se),'ciUpper':float(estimate+crit*se)}
    coefficient_inference=[inference(L) for L in np.eye(q)]
    eigenvalues,eigenvectors=np.linalg.eigh(cov[1:,1:]);nus=[];F=0.
    for j in range(q-1):
        L=np.r_[0.,eigenvectors[:,j]]
        F+=float(L@beta)**2/eigenvalues[j];nus.append(inference(L)['df'])
    F/=q-1
    if max(nus)-min(nus)<1e-7:ddf=float(np.mean(nus))
    elif min(nus)<=2:ddf=2.
    else:
        E=sum(nu/(nu-2) for nu in nus);ddf=2*E/(E-(q-1))
    vectors=np.c_[np.ones(q),np.eye(q)[:,1:]]
    means=[inference(L) for L in vectors]
    family=q*(q-1)//2
    differences=[{'first':i,'second':j,**inference(vectors[i]-vectors[j],1-.05/family)} for i in range(q) for j in range(i+1,q)]
    for difference in differences:difference['adjustedPValue']=min(1.,family*difference['pValue'])
    cases.append({'name':name,'structure':kind,'q':q,'rows':rows,'x':X.tolist(),'y':y.tolist(),'times':times.tolist(),'groups':[g.tolist() for g in groups],
        'expected':{'nll':value,'beta':beta.tolist(),'fixedCovariance':cov.ravel().tolist(),'theta':theta.tolist(),'boundary':boundary,'matrix':matrix(kind,np.arange(q),theta,q,boundary).ravel().tolist(),'coefficients':coefficient_inference,'termTest':{'f':float(F),'numeratorDf':q-1,'denominatorDf':ddf,'pValue':float(fisher.sf(F,q-1,ddf))},'means':means,'comparisons':differences},'attempts':attempts})
    print(name,value,theta,'boundary',boundary,flush=True)
path=ROOT/'cases/repeated_covariance/reml.json';path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps({'reference':{'numpy':np.__version__,'scipy':scipy.__version__,'seed':20261103,'method':'dense covariance Cholesky GLS, scipy.optimize BFGS','tolerances':{'nllAbsolute':2e-7,'betaAbsolute':2e-5,'covarianceAbsolute':3e-5,'thetaAbsolute':2e-4,'inferenceRelative':0.003}},'cases':cases},indent=2,allow_nan=False)+'\n',encoding='utf-8')
