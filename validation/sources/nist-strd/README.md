# NIST StRD — fonte para a ET24

Misra1d original obtido em 2026-11-03 do [NIST](https://www.itl.nist.gov/div898/strd/nls/data/LINKS/DATA/Misra1d.dat), sem modificações. SHA-256: `4dfa39a381a5ffea3e5d9306af1bda9d53bc57226a8e6f0c19af6b9702580481`.

[Descrição](https://itl.nist.gov/div898/strd/nls/data/misra1d.shtml) e [valores certificados](https://www.itl.nist.gov/div898/strd/nls/data/LINKS/v-misra1d.shtml). São 14 observações e dois parâmetros. O modelo publicado `b1*b2*x/(1+b2*x)` equivale ao Monod/Michaelis–Menten com `Vmax=b1` e `K=1/b2`; essa correspondência é uma transformação algébrica para a verificação planejada. Os valores certificados permanecem na parametrização original.

Estado: fonte conferida na ET24-T03 contra estimativas, erros-padrão e soma de quadrados certificados, com os dois inícios publicados. [Casos e tolerâncias](../../cases/nonlinear_profile/profile.json), teste público `nonlinear_profile_validation.rs`. O IC por perfil é referência independente SciPy, não certificado NIST; apenas Misra1d é declarado coberto, sem generalizar ao catálogo inteiro. A ET24 continua aberta.
