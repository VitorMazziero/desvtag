"""Gera os casos de validação de `one_way_comparison` (ANOVA de um fator, Tukey/Tukey–Kramer, letras,
Brown–Forsythe, boxplot e gráfico quantil–quantil).

Referências independentes:
- NIST StRD de ANOVA (SiRstv, SmLs01–09, AtmWtAg): somas de quadrados **exatas** em racionais
  (`fractions`) sobre os binários de 64 bits lidos do CSV; valores certificados guardados como texto.
- Casos aplicados: SciPy (`f_oneway`, `tukey_hsd`, `levene(center="median")`, `norm.ppf`), NumPy
  (quartis do método linear) e letras por **cliques maximais** do grafo de pares não significativos
  (Bron–Kerbosch), algoritmo diferente do de inserção e absorção implementado no motor.

Uso: python make_comparison_cases.py <pasta com os .dat de ANOVA do NIST>
"""
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

import mpmath as mp
import numpy as np
import scipy
from scipy import stats

mp.mp.dps = 60
OUT = Path(__file__).resolve().parents[1] / "cases" / "one_way_comparison"
BASE = "https://www.itl.nist.gov/div898/strd/anova/"
NIST = ["SiRstv", "SmLs01", "SmLs02", "SmLs03", "SmLs04", "SmLs05", "SmLs06", "SmLs07", "SmLs08", "SmLs09", "AtmWtAg"]
# Dígitos corretos mínimos exigidos (SQ entre, SQ dentro, F, R², σ): piso do medido − 1, máximo 13.
MIN_LRE = {}  # preenchido por `min_lre.json` depois da medição (ver README do caso)
MIN_LRE_FILE = Path(__file__).with_name("anova_min_lre.json")
LRE_KEYS = ("ssBetween", "ssWithin", "f", "rSquared", "residualSd")


def parse_nist(path: Path):
    text = path.read_text()
    lines = text.splitlines()
    last = max(i for i, l in enumerate(lines) if l.strip().startswith("Data:"))
    rows = [l.split() for l in lines[last + 1 :] if l.strip()]
    head = "\n".join(lines[:last])
    between = re.search(r"Between \w+\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)", head)
    within = re.search(r"Within \w+\s+(\d+)\s+(\S+)\s+(\S+)", head)
    return rows, {
        "dfBetween": int(between.group(1)), "ssBetween": between.group(2), "f": between.group(4),
        "dfWithin": int(within.group(1)), "ssWithin": within.group(2),
        "rSquared": re.search(r"Certified R-Squared\s+(\S+)", head).group(1),
        "residualSd": re.search(r"Standard Deviation\s+(\S+)", head).group(1),
    }


def fmt(q: Fraction) -> str:
    return mp.nstr(mp.mpf(q.numerator) / mp.mpf(q.denominator), 40)


def lre(value, certified: str) -> float:
    c, v = mp.mpf(certified), mp.mpf(value)
    err = abs(v - c) / abs(c)
    return 15.0 if err < mp.mpf("1e-15") else float(-mp.log10(err))


def exact_anova(groups):
    allv = [v for g in groups for v in g]
    n, k = len(allv), len(groups)
    grand = sum(allv) / n
    means = [sum(g) / len(g) for g in groups]
    ssb = sum(len(g) * (m - grand) ** 2 for g, m in zip(groups, means))
    ssw = sum(sum((v - m) ** 2 for v in g) for g, m in zip(groups, means))
    sst = ssb + ssw
    mse = ssw / (n - k)
    return {
        "n": n, "k": k, "dfBetween": k - 1, "dfWithin": n - k,
        "ssBetween": fmt(ssb), "ssWithin": fmt(ssw), "ssTotal": fmt(sst),
        "f": fmt((ssb / (k - 1)) / mse), "rSquared": fmt(ssb / sst),
        "residualSd": mp.nstr(mp.sqrt(mp.mpf(mse.numerator) / mp.mpf(mse.denominator)), 40),
        "grandMean": fmt(grand),
    }


def write_nist_cases(src: Path):
    min_lre = json.loads(MIN_LRE_FILE.read_text()) if MIN_LRE_FILE.exists() else {}
    for number, name in enumerate(NIST, start=1):
        rows, certified = parse_nist(src / f"{name}.dat")
        levels = sorted({r[0] for r in rows}, key=int)
        groups = [[Fraction(float(r[1])) for r in rows if r[0] == lv] for lv in levels]
        exact = exact_anova(groups)
        cert_lre = {k: lre(mp.mpf(exact[k]), certified[k]) for k in LRE_KEYS}
        folder = OUT / f"{number:03d}-nist-{name.lower()}"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "input.csv").write_text("treatment,y\n" + "\n".join(f"t{r[0]},{r[1]}" for r in rows) + "\n")
        (folder / "config.json").write_text(json.dumps({
            "method": "one_way_comparison", "responseColumn": "y", "factor": "treatment", "alpha": 0.05,
        }, indent=2) + "\n")
        expected = {
            "n": exact["n"], "groups": exact["k"], "exactOnBinary64Inputs": exact, "certifiedNist": certified,
            "referenceVsCertifiedLre": cert_lre,
            "tolerances": {"minLre": min_lre.get(name, {}), "note": "LRE = -log10(erro relativo) contra a referência exata sobre os binários de 64 bits"},
            "reference": {"software": "Python fractions (exato) + mpmath", "python": sys.version.split()[0], "mpmath": mp.__version__, "source": BASE + name + ".dat"},
        }
        (folder / "expected.json").write_text(json.dumps(expected, indent=1) + "\n")
        (folder / "README.md").write_text(f"""# one_way_comparison / {folder.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

A ANOVA de um fator do conjunto NIST StRD `{name}` ({exact['k']} tratamentos, {exact['n']} observações) atinge a exatidão exigida em somas de quadrados, F, R² e desvio residual?

## Dados

Conjunto do NIST Statistical Reference Datasets, Analysis of Variance ({BASE}{name}.dat), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv` (coluna `treatment` = `t` + rótulo original).

## Configuração

`config.json`: método `one_way_comparison`, resposta `y`, fator `treatment`, α = 0,05.

## Referência independente

Somas de quadrados **exatas** em aritmética racional (`fractions`) sobre os binários de 64 bits lidos do CSV; raiz quadrada em 60 dígitos (`mpmath` {mp.__version__}). Gerado por `validation/tools/make_comparison_cases.py`. LRE da referência exata contra o valor certificado do NIST em `referenceVsCertifiedLre`: {min(cert_lre.values()):.1f} dígitos no pior campo (a diferença vem da conversão decimal→binário).

## Resultados esperados e tolerâncias

`expected.json › exactOnBinary64Inputs` e `tolerances.minLre`; regra: piso do LRE medido menos 1 dígito, no máximo 13.

## Diferenças admitidas

Somente a conversão decimal→binário e a tolerância em dígitos.

## Execução

`app/crates/desvtag-core/tests/comparison_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).
""")
        print(folder.name, {k: round(v, 1) for k, v in cert_lre.items()})


def cliques_letters(means, nonsig):
    """Letras por cliques maximais do grafo 'não diferentes' (Bron–Kerbosch), em ordem decrescente de média."""
    k = len(means)
    order = sorted(range(k), key=lambda i: -means[i])
    adj = {i: {j for j in range(k) if j != i and nonsig[i][j]} for i in range(k)}
    cliques = []

    def bk(r, p, x):
        if not p and not x:
            cliques.append(frozenset(r))
            return
        for v in list(p):
            bk(r | {v}, p & adj[v], x & adj[v])
            p = p - {v}
            x = x | {v}

    bk(set(), set(range(k)), set())
    pos = {g: i for i, g in enumerate(order)}
    cliques.sort(key=lambda c: sorted(pos[g] for g in c))

    def name(n):
        s = ""
        while True:
            s = chr(97 + n % 26) + s
            if n < 26:
                return s
            n = n // 26 - 1

    letters = [""] * k
    for idx, c in enumerate(cliques):
        for g in c:
            letters[g] += name(idx)
    return letters


def applied_case(number, slug, title, data, alpha=0.05):
    """`data`: dict nível -> lista de valores (None = ausente)."""
    levels = list(data)
    folder = OUT / f"{number}-{slug}"
    folder.mkdir(parents=True, exist_ok=True)
    rows = []
    for lv in levels:
        for v in data[lv]:
            rows.append((lv, "" if v is None else repr(v)))
    (folder / "input.csv").write_text("treatment,y\n" + "\n".join(f"{a},{b}" for a, b in rows) + "\n")
    (folder / "config.json").write_text(json.dumps({
        "method": "one_way_comparison", "title": title, "responseColumn": "y", "factor": "treatment",
        "levels": levels, "alpha": alpha}, indent=2, ensure_ascii=False) + "\n")
    groups = [np.array([v for v in data[lv] if v is not None], dtype=float) for lv in levels]
    k, n = len(groups), sum(len(g) for g in groups)
    f_stat, f_p = stats.f_oneway(*groups)
    means = [float(g.mean()) for g in groups]
    grand = float(np.concatenate(groups).mean())
    ssb = sum(len(g) * (m - grand) ** 2 for g, m in zip(groups, means))
    ssw = sum(float(((g - g.mean()) ** 2).sum()) for g in groups)
    sst = ssb + ssw
    mse = ssw / (n - k)
    exp = {
        "levels": levels, "n": n, "k": k, "means": means, "sizes": [len(g) for g in groups],
        "sds": [float(g.std(ddof=1)) if len(g) > 1 else None for g in groups],
        "anova": {"ssBetween": ssb, "ssWithin": ssw, "ssTotal": sst, "f": float(f_stat), "p": float(f_p),
                  "dfBetween": k - 1, "dfWithin": n - k},
        "effect": {"etaSquared": ssb / sst, "omegaSquared": (ssb - (k - 1) * mse) / (sst + mse),
                   "cvPercent": 100 * mse**0.5 / abs(grand)},
        "ciPooled": [[m - stats.t.ppf(1 - alpha / 2, n - k) * (mse / len(g)) ** 0.5,
                      m + stats.t.ppf(1 - alpha / 2, n - k) * (mse / len(g)) ** 0.5] for m, g in zip(means, groups)],
    }
    bf = stats.levene(*groups, center="median")
    exp["brownForsythe"] = {"f": float(bf.statistic), "p": float(bf.pvalue), "df1": k - 1, "df2": n - k}
    exp["boxplots"] = []
    for g in groups:
        q1, med, q3 = (float(x) for x in np.percentile(g, [25, 50, 75]))
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        inside = g[(g >= lo) & (g <= hi)]
        exp["boxplots"].append({"min": float(g.min()), "q1": q1, "median": med, "q3": q3, "max": float(g.max()),
                                "whiskerLow": float(inside.min()), "whiskerHigh": float(inside.max()),
                                "outliers": sorted(float(x) for x in g[(g < lo) | (g > hi)])})
    # Resíduos padronizados e QQ
    std = []
    for g in groups:
        r = g - g.mean()
        std += [(float(x) / ((mse**0.5) * (1 - 1 / len(g)) ** 0.5)) if len(g) > 1 else None for x in r]
    exp["standardizedResiduals"] = std
    vals = sorted(x for x in std if x is not None)
    m = len(vals)
    exp["qq"] = [{"theoretical": float(stats.norm.ppf((i + 1 - 0.375) / (m + 0.25))), "sample": v} for i, v in enumerate(vals)]
    # Tukey: fórmula explícita com a amplitude studentizada do SciPy (aceita grupos de 1 observação);
    # quando todos os grupos têm >= 2 observações, confere com `scipy.stats.tukey_hsd`.
    crit = float(stats.studentized_range.isf(alpha, k, n - k))
    reference_t = stats.tukey_hsd(*groups) if all(len(g) > 1 for g in groups) else None
    pairs = []
    for a in range(k):
        for b in range(a + 1, k):
            d = means[a] - means[b]
            se = (0.5 * mse * (1 / len(groups[a]) + 1 / len(groups[b]))) ** 0.5
            q = abs(d) / se
            p_adj = float(stats.studentized_range.sf(q, k, n - k))
            if reference_t is not None:
                assert abs(p_adj - float(reference_t.pvalue[a, b])) < 1e-9, (a, b)
            pairs.append({"a": a, "b": b, "difference": d, "stdError": se, "q": q, "pAdjusted": p_adj,
                          "ciLower": d - crit * se, "ciUpper": d + crit * se, "significant": bool(p_adj < alpha)})
    exp["tukey"] = {"variant": "tukey" if len({len(g) for g in groups}) == 1 else "tukeyKramer",
                    "criticalValue": crit, "pairs": pairs}
    nonsig = [[False] * k for _ in range(k)]
    for p in pairs:
        nonsig[p["a"]][p["b"]] = nonsig[p["b"]][p["a"]] = not p["significant"]
    exp["letters"] = cliques_letters(means, nonsig)
    exp["tolerances"] = {"relative": 1e-9, "absoluteScale": 1e-12, "pAbsolute": 1e-10,
                         "note": "p ajustado do Tukey: erro absoluto 1e-10 (estatística q contra SciPy); demais: relativo 1e-9 + 1e-12 × escala"}
    exp["software"] = {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__}
    (folder / "expected.json").write_text(json.dumps(exp, indent=1) + "\n")
    (folder / "README.md").write_text(f"""# one_way_comparison / {folder.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{title}. ANOVA, tamanhos de efeito, CV, Tukey{"" if exp['tukey']['variant'] == 'tukey' else "–Kramer"}, letras, Brown–Forsythe, boxplots e quantis do gráfico de normalidade concordam com a referência independente?

## Dados

Sintéticos, identificados como tais, em `input.csv` (célula vazia = resposta ausente). Valores escolhidos à mão para produzir o cenário descrito.

## Configuração

`config.json`: fator `treatment`, α = {alpha}.

## Referência independente

SciPy {scipy.__version__} (`f_oneway`, `tukey_hsd`, `levene`, `norm.ppf`), NumPy {np.__version__} (percentis lineares) e letras por cliques maximais (Bron–Kerbosch). Gerado por `validation/tools/make_comparison_cases.py`.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 + 1e-12 × escala; valores-p do Tukey com erro absoluto ≤ 1e-10; letras idênticas.

## Diferenças admitidas

A ordem de atribuição das letras segue as médias decrescentes (a letra `a` é do grupo de maior média); outro software pode usar a ordem inversa, o que não altera a conclusão (a verificação é pelo conjunto de pares que compartilham letra, além da igualdade textual neste caso).

## Execução

`app/crates/desvtag-core/tests/comparison_validation.rs` (nativo) e `app/web/src/services/engine/comparison.parity.test.ts` (WebAssembly).
""")
    print(folder.name, "n =", n, "k =", k, "letters:", exp["letters"], exp["tukey"]["variant"])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        write_nist_cases(Path(sys.argv[1]))
    # 1. Quatro condições enzimáticas, 5 réplicas independentes (atividade em U/mL, sintético).
    applied_case("101", "enzimas-quatro-condicoes", "Quatro condições enzimáticas, cinco réplicas independentes", {
        "controle": [10.2, 9.8, 10.5, 10.1, 9.9],
        "pH 5": [12.4, 12.9, 12.1, 12.7, 12.5],
        "pH 7": [15.8, 16.3, 15.5, 16.1, 15.9],
        "pH 9": [12.8, 13.1, 12.6, 13.3, 12.9],
    })
    # 2. Desbalanceado (Tukey–Kramer) com sobreposição de letras.
    applied_case("102", "desbalanceado-sobreposicao", "Cinco grupos de tamanhos diferentes com letras sobrepostas", {
        "A": [20.1, 19.5, 20.8, 21.0, 19.9, 20.4],
        "B": [21.5, 22.0, 21.1, 22.4],
        "C": [22.9, 23.4, 22.5, 23.1, 23.8, 22.7, 23.0],
        "D": [24.8, 25.3, 24.1, 25.0, 24.6],
        "E": [21.9, 22.6, 22.1, 21.4, 22.8, 22.2],
    })
    # 3. Sete grupos, variâncias distintas e um ponto distante.
    applied_case("103", "sete-grupos-ponto-distante", "Sete grupos com variâncias distintas e um ponto distante", {
        "g1": [5.0, 5.2, 4.9, 5.1, 5.0],
        "g2": [5.6, 5.9, 5.4, 5.7, 5.5],
        "g3": [6.3, 6.1, 6.6, 6.2, 6.4],
        "g4": [6.9, 7.4, 6.5, 7.1, 6.8],
        "g5": [7.8, 8.9, 7.0, 8.2, 7.5],
        "g6": [8.4, 9.9, 7.1, 9.2, 15.5],
        "g7": [9.0, 9.4, 8.8, 9.3, 9.1],
    })
    # 4. Dados ausentes e grupo com uma única observação.
    applied_case("104", "ausentes-grupo-unitario", "Respostas ausentes e um grupo com uma observação", {
        "x": [3.1, 3.4, None, 3.0, 3.3],
        "y": [4.2, 4.6, 4.4, None],
        "z": [5.9],
        "w": [4.1, 4.5, 4.3, 4.0, 4.2, 4.4],
    })


if __name__ == "__main__":
    main()
