"""Álgebra matricial independente compartilhada pelos casos de medidas repetidas."""
import numpy as np
from scipy.linalg import block_diag,cho_factor,cho_solve

def matrix(kind,times,theta,q,boundary=False):
    if kind=='unstructured':
        lower=np.zeros((q,q));lower[np.tril_indices(q)]=theta
        lower[np.diag_indices(q)]=np.exp(lower[np.diag_indices(q)])
        full=lower@lower.T
        index=np.asarray(times,dtype=int)
        return full[np.ix_(index,index)]
    su=0. if boundary else np.exp(theta[0]);se=np.exp(theta[int(not boundary)])
    if kind=='ar1':
        rho=np.tanh(theta[-1]);lag=np.abs(np.subtract.outer(times,times)).astype(int)
        return su+se*rho**lag
    return su+se*np.eye(len(times))

def solve(kind,X,y,groups,times,theta,q,boundary=False):
    try:
        V=block_diag(*[matrix(kind,times[g],theta,q,boundary) for g in groups])
        c=cho_factor(V,lower=True,check_finite=False)
        ViX=cho_solve(c,X,check_finite=False)
        info=X.T@ViX
        cov=np.linalg.inv(info)
        beta=cov@(ViX.T@y)
        residual=y-X@beta
        value=.5*(2*np.log(np.diag(c[0])).sum()+np.linalg.slogdet(info)[1]+residual@cho_solve(c,residual,check_finite=False)+(len(y)-X.shape[1])*np.log(2*np.pi))
        return float(value),beta,cov
    except (ValueError,np.linalg.LinAlgError,OverflowError):
        return None
