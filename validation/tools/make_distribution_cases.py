"""Gera os casos de validação das distribuições (`distributions`) com mpmath em alta precisão.

Referência independente: mpmath (60 dígitos) calcula cdf, cauda superior e quantis por
definição matemática (beta/gama incompletas e `erfc` do próprio mpmath), sem usar o código Rust.
Os quantis são obtidos por busca de raiz em alta precisão sobre o logaritmo da cauda.
"""
import json
import sys
from pathlib import Path

import mpmath as mp
import scipy
from scipy import stats

mp.mp.dps = 60
OUT = Path(__file__).resolve().parents[1] / "cases" / "distributions"
MIN_VALUE = mp.mpf("1e-290")


def fmt(v) -> str:
    return mp.nstr(v, 25)


def keep(v) -> bool:
    return MIN_VALUE < v < 1


# ---- funções de referência (alta precisão) ----
def normal_cdf(x):
    return mp.erfc(-x / mp.sqrt(2)) / 2


def normal_sf(x):
    return mp.erfc(x / mp.sqrt(2)) / 2


def t_sf(t, df):
    t, df = mp.mpf(t), mp.mpf(df)
    x = df / (df + t * t)
    two = mp.betainc(df / 2, mp.mpf(1) / 2, 0, x, regularized=True)
    return two / 2 if t >= 0 else 1 - two / 2


def chi2_cdf(x, df):
    return mp.gammainc(mp.mpf(df) / 2, 0, mp.mpf(x) / 2, regularized=True)


def chi2_sf(x, df):
    return mp.gammainc(mp.mpf(df) / 2, mp.mpf(x) / 2, mp.inf, regularized=True)


def f_cdf(x, d1, d2):
    x, d1, d2 = mp.mpf(x), mp.mpf(d1), mp.mpf(d2)
    u = d1 * x / (d1 * x + d2)
    return mp.betainc(d1 / 2, d2 / 2, 0, u, regularized=True)


def f_sf(x, d1, d2):
    """Cauda superior da F pela forma `I_y(d2/2, d1/2)`, y = d2/(d1 x + d2).

    A forma ingênua `betainc(d1/2, d2/2, u, 1)` (integral de u a 1) mostrou-se imprecisa em
    3,4e-11 para F(50, 200) em x = 20 (cauda ≈ 5e-55): foi detectada ao comparar com esta forma e
    com o SciPy, e abandonada."""
    x, d1, d2 = mp.mpf(x), mp.mpf(d1), mp.mpf(d2)
    y = d2 / (d1 * x + d2)
    return mp.betainc(d2 / 2, d1 / 2, 0, y, regularized=True)


def f_sf_alt(x, d1, d2):
    x, d1, d2 = mp.mpf(x), mp.mpf(d1), mp.mpf(d2)
    u = d1 * x / (d1 * x + d2)
    return mp.betainc(d1 / 2, d2 / 2, u, 1, regularized=True)


def bracket_root(fn, guess):
    """Intervalo [lo, hi] com mudança de sinal de fn, expandindo a partir de `guess`."""
    g = mp.mpf(guess) if (guess and mp.isfinite(guess) and guess > 0) else mp.mpf(1)
    lo, hi = g / 2, g * 2
    for _ in range(2000):
        if fn(lo) * fn(hi) < 0:
            return lo, hi
        lo, hi = lo / 2, hi * 2
    raise RuntimeError(f"sem intervalo (palpite {guess})")


def solve_increasing_root(fn, guess):
    lo, hi = bracket_root(fn, guess)
    return mp.findroot(fn, (lo, hi), solver="illinois", tol=mp.mpf("1e-50"), maxsteps=500, verify=False)


def solve_upper(tail, q, guess):
    """x com tail(x) = q, por busca de raiz sobre ln(cauda) em alta precisão."""
    target = mp.log(mp.mpf(q))
    return solve_increasing_root(lambda x: mp.log(tail(x)) - target, guess)


def write(name: str, points: dict, note: str):
    case = OUT / name
    case.mkdir(parents=True, exist_ok=True)
    (case / "expected.json").write_text(json.dumps(points, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (case / "README.md").write_text(note, encoding="utf-8")
    n = sum(len(v) for k, v in points.items() if isinstance(v, list))
    print(name, n, "pontos")


def readme(title, what):
    return f"""# distributions / {title}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{what}

## Dados

Grades de argumentos fixas em `validation/tools/make_distribution_cases.py`, incluindo graus de liberdade fracionários e muito grandes e caudas de até 1e-290 (sintético).

## Referência independente

mpmath {mp.__version__} com 60 dígitos (beta e gama incompletas regularizadas e `erfc` do mpmath); quantis por busca de raiz em alta precisão sobre o logaritmo da cauda, com ponto inicial do SciPy {scipy.__version__}. Nenhum código Rust é usado. Valores esperados guardados com 25 algarismos significativos.

## Resultados esperados e tolerâncias

`expected.json`: cada ponto traz o argumento e o valor exato. Erro relativo máximo aceito: ver `tolerances` no arquivo (a justificativa está em `docs/metodos/distribuicoes.md`).

## Diferenças admitidas

Nenhuma além da tolerância relativa.

## Execução

`app/crates/desvtag-core/tests/distributions_validation.rs` (nativo) e `app/web/src/services/engine/numeric.parity.test.ts` (WebAssembly).
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- normal ----
    pts = {"cdf": [], "sf": [], "quantile_upper": []}
    for x in [-37, -20, -10, -5, -3, -1.96, -1, -0.5, -1e-8, 0, 1e-8, 0.5, 1, 1.96, 3, 5, 10, 20]:
        c, s = normal_cdf(mp.mpf(x)), normal_sf(mp.mpf(x))
        if keep(c) or c == 1:
            pts["cdf"].append({"x": x, "value": fmt(c)})
        if keep(s) or s == 1:
            pts["sf"].append({"x": x, "value": fmt(s)})
    pts["quantile_upper"].append({"q": "0.5", "value": "0"})
    for q in ["0.4", "0.1", "0.025", "1e-3", "1e-8", "1e-20", "1e-100", "1e-300"]:
        g = float(stats.norm.isf(float(q)))
        pts["quantile_upper"].append({"q": q, "value": fmt(solve_upper(normal_sf, q, g if g else mp.mpf("1e-3")))})
    pts["tolerances"] = {"cdf_sf_relative": 5e-14, "quantile_relative": 1e-12}
    write("001-normal", pts, readme("normal", "`cdf`, `sf` e `quantile_upper` da normal padrão têm erro relativo pequeno, inclusive nas caudas extremas?"))

    # ---- t ----
    pts = {"sf": [], "quantile_upper": []}
    for df in [0.5, 1, 2, 3.5, 5, 10, 30, 100, 1000, 1e6]:
        for t in [0, 0.1, 1, 2, 5, 10, 50, 1000]:
            v = t_sf(t, df)
            if keep(v):
                pts["sf"].append({"df": df, "t": t, "value": fmt(v)})
        for q in ["0.4", "0.1", "0.025", "1e-4", "1e-10", "1e-50"]:
            g = float(stats.t.isf(float(q), df))
            pts["quantile_upper"].append({"df": df, "q": q, "value": fmt(solve_upper(lambda x: t_sf(x, df), q, g))})
    pts["tolerances"] = {"sf_relative": 1e-12, "sf_relative_df_above_1e5": 5e-11, "quantile_relative": 1e-10, "quantile_relative_df_above_1e5": 5e-9}
    write("002-student-t", pts, readme("student-t", "A cauda superior e o quantil da t de Student são exatos para df de 0,5 a 1e6?"))

    # ---- qui-quadrado ----
    pts = {"cdf": [], "sf": [], "quantile_upper": [], "quantile_lower": []}
    for df in [0.5, 1, 2, 5, 10, 50, 200, 1000]:
        for mult in [0.01, 0.1, 0.5, 1, 2, 5]:
            x = df * mult
            c, s = chi2_cdf(x, df), chi2_sf(x, df)
            if s > mp.mpf("1e-30"):  # cdf + sf = 1 em alta precisão
                assert abs(c + s - 1) < mp.mpf("1e-45"), (df, x)
            if keep(c):
                pts["cdf"].append({"df": df, "x": x, "value": fmt(c)})
            if keep(s):
                pts["sf"].append({"df": df, "x": x, "value": fmt(s)})
        for q in ["0.4", "0.05", "1e-4", "1e-10", "1e-40"]:
            g = float(stats.chi2.isf(float(q), df))
            pts["quantile_upper"].append({"df": df, "q": q, "value": fmt(solve_upper(lambda x: chi2_sf(x, df), q, g))})
        for p in ["0.4", "0.05", "1e-4", "1e-10"]:
            g = float(stats.chi2.ppf(float(p), df))
            target = mp.log(mp.mpf(p))
            x = solve_increasing_root(lambda x: mp.log(chi2_cdf(x, df)) - target, g)
            pts["quantile_lower"].append({"df": df, "p": p, "value": fmt(x)})
    pts["tolerances"] = {"cdf_sf_relative": 1e-12, "quantile_relative": 1e-10}
    write("003-chi-square", pts, readme("chi-square", "`cdf`, `sf` e os quantis do qui-quadrado são exatos para df de 0,5 a 1000?"))

    # ---- F ----
    pts = {"cdf": [], "sf": [], "quantile_upper": []}
    for d1, d2 in [(1, 1), (1, 10), (2, 5), (3, 12), (5, 5), (10, 3), (10, 100), (50, 200), (1, 1000), (1000, 1000)]:
        for x in [0.01, 0.1, 0.5, 1, 2, 5, 20, 100]:
            c, s = f_cdf(x, d1, d2), f_sf(x, d1, d2)
            if s > mp.mpf("1e-30"):  # onde a forma ingênua é confiável, as duas formas devem concordar
                assert abs(f_sf_alt(x, d1, d2) / s - 1) < mp.mpf("1e-20"), (d1, d2, x)
            if keep(c):
                pts["cdf"].append({"d1": d1, "d2": d2, "x": x, "value": fmt(c)})
            if keep(s):
                pts["sf"].append({"d1": d1, "d2": d2, "x": x, "value": fmt(s)})
        for q in ["0.4", "0.05", "1e-3", "1e-10"]:
            g = float(stats.f.isf(float(q), d1, d2))
            pts["quantile_upper"].append({"d1": d1, "d2": d2, "q": q, "value": fmt(solve_upper(lambda x: f_sf(x, d1, d2), q, g))})
    pts["tolerances"] = {"cdf_sf_relative": 1e-12, "quantile_relative": 1e-10}
    write("004-f", pts, readme("f", "`cdf`, `sf` e quantil superior da F de Snedecor são exatos para pares de df de 1 a 1000?"))


if __name__ == "__main__":
    main()
