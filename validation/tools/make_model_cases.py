"""Gera os casos de validação do construtor de modelos de `linear_model` (fatores categóricos,
interações, potências, dados ausentes, aliasing e modelo saturado).

Referência independente: NumPy (`lstsq`, inversa de XᵀX em dupla precisão — adequada a matrizes bem
condicionadas) e SciPy (`t`, `f`) calculam coeficientes, erros-padrão, t, valores-p, intervalos,
ANOVA, alavancagem, resíduos studentizados e distância de Cook. A matriz do modelo é construída aqui,
em Python, pela especificação de `docs/metodos/regressao-linear.md` (não pelo código Rust).
"""
import json
import sys
from itertools import product
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

OUT = Path(__file__).resolve().parents[1] / "cases" / "linear_model"
RNG = np.random.default_rng(20261101)


def columns_of(factor, values, kinds, coding, levels):
    """Colunas e rótulos do efeito principal de `factor`."""
    if kinds[factor] == "numeric":
        return [factor], [np.array(values[factor], dtype=float)]
    lv = levels[factor]
    last = len(lv) - 1
    kept = range(1, len(lv)) if coding == "treatment" else range(last)
    cols, labels = [], []
    for k in kept:
        col = []
        for v in values[factor]:
            i = lv.index(v)
            col.append(1.0 if i == k else (-1.0 if coding == "sum" and i == last else 0.0))
        cols.append(np.array(col))
        labels.append(f"{factor}[{lv[k]}]")
    return labels, cols


def build_design(values, kinds, terms, intercept, coding, rows):
    levels = {
        f: sorted({values[f][r] for r in rows}) for f in kinds if kinds[f] == "categorical"
    }
    sub = {f: [values[f][r] for r in rows] for f in kinds}
    labels, cols = [], []
    if intercept:
        labels.append("(Intercept)")
        cols.append(np.ones(len(rows)))
    for t in terms:
        if t["type"] == "main":
            l, c = columns_of(t["factor"], sub, kinds, coding, levels)
        elif t["type"] == "power":
            _, c0 = columns_of(t["factor"], sub, kinds, coding, levels)
            l, c = [f"{t['factor']}^{t['degree']}"], [c0[0] ** t["degree"]]
        else:
            l, c = columns_of(t["factors"][0], sub, kinds, coding, levels)
            for f in t["factors"][1:]:
                l2, c2 = columns_of(f, sub, kinds, coding, levels)
                l, c = (
                    [f"{a}:{b}" for a, b in product(l, l2)],
                    [x * y for x, y in product(c, c2)],
                )
        labels += l
        cols += c
    return np.column_stack(cols), labels


def reference(x, y, intercept, conf=0.95):
    n, p = x.shape
    rank = int(np.linalg.matrix_rank(x))
    beta = np.linalg.lstsq(x, y, rcond=None)[0]
    fitted = x @ beta
    resid = y - fitted
    sse = float(resid @ resid)
    df = n - rank
    if intercept:
        sst, df_model, df_total = float(((y - y.mean()) ** 2).sum()), rank - 1, n - 1
        ssm = float(((fitted - y.mean()) ** 2).sum())
    else:
        sst, df_model, df_total = float(y @ y), rank, n
        ssm = float(fitted @ fitted)
    out = {
        "rank": rank,
        "dfResidual": df,
        "dfModel": df_model,
        "ssResidual": sse,
        "ssModel": ssm,
        "ssTotal": sst,
        "fitted": fitted.tolist(),
        "residuals": resid.tolist(),
        "rSquared": 1 - sse / sst,
    }
    if df > 0:
        out["adjRSquared"] = 1 - (1 - out["rSquared"]) * df_total / df
        f_stat = (ssm / df_model) / (sse / df) if df_model > 0 else None
        if f_stat is not None:
            out["f"], out["fP"] = f_stat, float(stats.f.sf(f_stat, df_model, df))
        sigma2 = sse / df
        out["sigma"] = sigma2**0.5
    if rank == p and df > 0:
        inv = np.linalg.inv(x.T @ x)
        se = np.sqrt(sigma2 * np.diag(inv))
        t = beta / se
        crit = stats.t.ppf(1 - (1 - conf) / 2, df)
        out["coefficients"] = [
            {
                "estimate": float(b), "stdError": float(s), "t": float(tv),
                "p": float(2 * stats.t.sf(abs(tv), df)),
                "ciLower": float(b - crit * s), "ciUpper": float(b + crit * s),
            }
            for b, s, tv in zip(beta, se, t)
        ]
        h = np.einsum("ij,jk,ik->i", x, inv, x)
        r_int = resid / (out["sigma"] * np.sqrt(1 - h))
        out["leverage"] = h.tolist()
        out["standardized"] = r_int.tolist()
        if df > 1:
            out["studentized"] = (r_int * np.sqrt((df - 1) / (df - r_int**2))).tolist()
        out["cook"] = (r_int**2 * h / (rank * (1 - h))).tolist()
    return out


def write_case(number, slug, title, names, table, kinds, terms, intercept, coding, extra_expected=None):
    """`table`: lista de linhas (dict nome -> texto), '' = ausente; resposta em `y`."""
    folder = OUT / f"{number}-model-{slug}"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "input.csv").write_text(
        ",".join(names) + "\n" + "\n".join(",".join(r[c] for c in names) for r in table) + "\n"
    )
    values = {f: [r[f] if kinds[f] == "categorical" else (float(r[f]) if r[f] != "" else None) for r in table] for f in kinds}
    y_all = [float(r["y"]) if r["y"] != "" else None for r in table]
    used = [i for i in range(len(table)) if y_all[i] is not None and all(values[f][i] not in (None, "") for f in {t_f for t in terms for t_f in ([t["factor"]] if "factor" in t else t["factors"])})]
    excluded = [f"o{i + 1}" for i in range(len(table)) if i not in used]
    x, labels = build_design(values, kinds, terms, intercept, coding, used)
    y = np.array([y_all[i] for i in used])
    expected = {
        "n": len(used),
        "labels": labels,
        "usedObservations": [f"o{i + 1}" for i in used],
        "excludedObservations": excluded,
        "reference": reference(x, y, intercept),
        "tolerances": {"relative": 1e-9, "absoluteScale": 1e-12, "note": "relativa à referência NumPy/SciPy em dupla precisão; absoluta (× escala dos dados) para valores nulos"},
        "software": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__},
    }
    expected.update(extra_expected or {})
    (folder / "expected.json").write_text(json.dumps(expected, indent=2) + "\n")
    (folder / "config.json").write_text(json.dumps({
        "method": "linear_model", "title": title, "responseColumn": "y", "intercept": intercept,
        "factors": kinds, "terms": terms, "coding": coding, "confidenceLevel": 0.95,
    }, indent=2) + "\n")
    (folder / "README.md").write_text(f"""# linear_model / {folder.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{title}. O construtor de modelos e o ajuste concordam com a referência independente em coeficientes, erros-padrão, t, valores-p, intervalos, ANOVA, ajustados, resíduos e diagnósticos{" (e com as observações excluídas e o estado explícito esperado)" if extra_expected is None and (number in ("103", "105", "106")) else ""}?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng(20261101)`) por `validation/tools/make_model_cases.py`, arredondados a 2 casas decimais; `input.csv` ({len(table)} linhas; célula vazia = ausente).

## Configuração

`config.json`: termos {json.dumps(terms, ensure_ascii=False)}, intercepto {str(intercept).lower()}, codificação `{coding}`, confiança 0,95.

## Referência independente

NumPy {np.__version__} (`lstsq`, inversa de XᵀX em dupla precisão) e SciPy {scipy.__version__} (`stats.t`, `stats.f`); a matriz do modelo é construída em Python pela especificação de `docs/metodos/regressao-linear.md`, sem usar o código Rust.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 mais 1e-12 × escala dos dados (matrizes bem condicionadas; o erro típico medido é muito menor).

## Diferenças admitidas

Nenhuma além da tolerância.{" Em modelos com aliasing só as quantidades invariantes (ajustados, resíduos, SQ, R², F, posto) são comparadas; qual coluna é declarada aliasada é uma convenção do pivoteamento." if number == "105" else ""}

## Execução

`app/crates/optima-core/tests/linear_model_validation.rs` (nativo) e `app/web/src/services/engine/linear.parity.test.ts` (WebAssembly).
""")
    print(folder.name, "n =", len(used), "p =", x.shape[1], "rank =", expected["reference"]["rank"])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    kinds = {"A": "categorical", "B": "categorical"}
    terms = [{"type": "main", "factor": "A"}, {"type": "main", "factor": "B"}, {"type": "interaction", "factors": ["A", "B"]}]
    # 2 × 3 fatorial, 3 repetições; efeitos conhecidos + ruído arredondado a 2 casas.
    effect = {("a1", "b1"): 10.0, ("a1", "b2"): 12.5, ("a1", "b3"): 11.0, ("a2", "b1"): 14.0, ("a2", "b2"): 13.0, ("a2", "b3"): 17.5}
    table = []
    for (a, b), mu in effect.items():
        for _ in range(3):
            table.append({"A": a, "B": b, "y": f"{mu + RNG.normal(0, 0.8):.2f}"})
    names = ["A", "B", "y"]
    write_case("101", "fatorial-tratamento", "Fatorial 2×3 com interação, codificação de tratamento", names, table, kinds, terms, True, "treatment")
    write_case("102", "fatorial-soma", "Fatorial 2×3 com interação, codificação de soma", names, table, kinds, terms, True, "sum")

    # Desbalanceado com dados ausentes: uma resposta ausente, um valor de fator ausente, uma repetição a menos.
    unb = [dict(r) for r in table]
    unb[4]["y"] = ""
    unb[7]["A"] = ""
    del unb[16]
    write_case("103", "ausentes-desbalanceado", "Casos completos com resposta e fator ausentes", names, unb, kinds, terms, True, "treatment")

    # Quadrático + covariável categórica (sem interação), fator numérico x.
    kinds4 = {"x": "numeric", "C": "categorical"}
    t4 = [{"type": "main", "factor": "x"}, {"type": "power", "factor": "x", "degree": 2}, {"type": "main", "factor": "C"}]
    table4 = []
    for c, shift in (("c1", 0.0), ("c2", 2.0), ("c3", -1.5)):
        for x in (-2, -1, 0, 1, 2, 3):
            table4.append({"x": str(x), "C": c, "y": f"{3 + 1.2 * x - 0.4 * x * x + shift + RNG.normal(0, 0.3):.2f}"})
    write_case("104", "quadratico-categorico", "Quadrático em x com fator categórico", ["x", "C", "y"], table4, kinds4, t4, True, "treatment")

    # Aliasing exato: x3 = x1 + x2.
    kinds5 = {"x1": "numeric", "x2": "numeric", "x3": "numeric"}
    t5 = [{"type": "main", "factor": f} for f in ("x1", "x2", "x3")]
    table5 = []
    for x1, x2 in product((0, 1, 2, 3), (0, 2, 5)):
        table5.append({"x1": str(x1), "x2": str(x2), "x3": str(x1 + x2), "y": f"{1 + 2 * x1 - x2 + RNG.normal(0, 0.4):.2f}"})
    write_case("105", "aliasing", "Coluna x3 = x1 + x2 (posto deficiente)", ["x1", "x2", "x3", "y"], table5, kinds5, t5, True, "treatment")

    # Modelo saturado: 2² sem repetição com interação (4 observações, 4 parâmetros).
    kinds6 = {"A": "categorical", "B": "categorical"}
    table6 = [{"A": a, "B": b, "y": v} for (a, b), v in zip(product(("a1", "a2"), ("b1", "b2")), ("5.0", "7.5", "6.0", "11.0"))]
    write_case("106", "saturado", "2² sem repetição com interação (sem graus de liberdade residuais)", ["A", "B", "y"], table6, kinds6, terms, True, "treatment")


if __name__ == "__main__":
    main()
