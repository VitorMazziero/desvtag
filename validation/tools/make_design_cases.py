"""Gera os casos de validação de `two_level_design` (matrizes) e `two_level_design_analysis` (análise).

Referências independentes, escritas sem usar o código Rust:
- matrizes: enumeração em Python (ordem padrão), fracionários por álgebra em GF(2) com
  enumeração de palavras (resolução e confundimento por força bruta), Plackett–Burman por
  Paley/Sylvester com NumPy (H·Hᵀ = N·I);
- aleatorização: PCG32 e Fisher–Yates reimplementados em Python com inteiros arbitrários;
- análise: NumPy (`lstsq`, inversa de XᵀX), SciPy (`t`, `f`), método de Lenth e falta de ajuste por
  definição, e o teste clássico de curvatura (Montgomery) como verificação do termo indicador.
"""
import json
import sys
from itertools import combinations, product
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

ROOT = Path(__file__).resolve().parents[1] / "cases"
MASK = (1 << 64) - 1


class PCG32:
    def __init__(self, seed, seq=54):
        self.state, self.inc = 0, ((seq << 1) | 1) & MASK
        self.next()
        self.state = (self.state + seed) & MASK
        self.next()

    def next(self):
        old = self.state
        self.state = (old * 6364136223846793005 + self.inc) & MASK
        xs = (((old >> 18) ^ old) >> 27) & 0xFFFFFFFF
        rot = old >> 59
        return ((xs >> rot) | (xs << ((-rot) & 31))) & 0xFFFFFFFF

    def bounded(self, bound):
        threshold = ((-bound) & 0xFFFFFFFF) % bound
        while True:
            r = self.next()
            if r >= threshold:
                return r % bound


def permutation(n, seed):
    rng, items = PCG32(seed), list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.bounded(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def full_factorial(k):
    return [[1.0 if (r >> j) & 1 else -1.0 for j in range(k)] for r in range(1 << k)]


def parse_generators(k, gens):
    out = []
    base = k - len(gens)
    for i, g in enumerate(gens):
        left, right = g.replace(" ", "").upper().replace("−", "-").split("=")
        sign = -1 if right.startswith("-") else 1
        word = right.lstrip("+-")
        assert left == chr(65 + base + i)
        out.append((base + i, [ord(c) - 65 for c in word], sign))
    return out


def fractional(k, gens):
    parsed = parse_generators(k, gens)
    rows = full_factorial(k - len(gens))
    result = []
    for r in rows:
        row = list(r) + [0.0] * len(gens)
        for target, rhs, sign in parsed:
            row[target] = sign * float(np.prod([row[j] for j in rhs]))
        result.append(row)
    return result, parsed


def words_and_resolution(parsed):
    masks = [(sum(1 << j for j in rhs) | (1 << t), s) for t, rhs, s in parsed]
    words = {}
    for r in range(1, len(masks) + 1):
        for subset in combinations(masks, r):
            m, s = 0, 1
            for mask, sign in subset:
                m ^= mask
                s *= sign
            words[m] = s
    res = min(bin(m).count("1") for m in words) if words else None
    return words, res


def name(mask):
    return "".join(chr(65 + i) for i in range(26) if (mask >> i) & 1)


def aliases(k, words):
    out = {}
    effects = [1 << a for a in range(k)] + [(1 << a) | (1 << b) for a in range(k) for b in range(a + 1, k)]
    for e in effects:
        out[name(e)] = sorted(
            ((("-" if s < 0 else "+") + name(e ^ m)) for m, s in words.items()),
            key=lambda t: (len(t) - 1, t[1:]),
        )
    return out


def hadamard(n):
    if n & (n - 1) == 0:
        h = np.array([[1]])
        while len(h) < n:
            h = np.block([[h, h], [h, -h]])
    else:
        q = n - 1
        chi = lambda a: 0 if a % q == 0 else (1 if pow(a % q, (q - 1) // 2, q) == 1 else -1)
        h = np.zeros((n, n), dtype=int)
        h += np.eye(n, dtype=int)
        h[0, 1:] = 1
        h[1:, 0] = -1
        for i in range(q):
            for j in range(q):
                h[i + 1, j + 1] += chi(i - j)
    h = h * np.where(h[:, [0]] < 0, -1, 1)
    assert (h @ h.T == n * np.eye(n)).all()
    return h


def generate_runs(kind, k, gens, runs, replicates, centers, randomize, seed):
    if kind == "full":
        base = full_factorial(k)
    elif kind == "fractional":
        base, _ = fractional(k, gens)
    else:
        base = [[float(v) for v in row[1 : k + 1]] for row in hadamard(runs)]
    standard = [("factorial", r + 1, list(row)) for r in range(replicates) for row in base]
    standard += [("center", 0, [0.0] * k) for _ in range(centers)]
    order = permutation(len(standard), seed) if randomize else list(range(len(standard)))
    return [
        {"run": pos + 1, "standardOrder": idx + 1, "point": standard[idx][0], "replicate": standard[idx][1], "coded": standard[idx][2]}
        for pos, idx in enumerate(order)
    ]


def matrix_cases():
    out = []
    # Permutações e geração completa.
    out.append({"id": "permutations", "cases": [{"n": n, "seed": s, "permutation": permutation(n, s)} for n in (1, 2, 8, 12, 50) for s in (0, 1, 42, 12345, (1 << 63) + 5)]})
    specs = [
        dict(kind="full", k=2, gens=[], runs=0, replicates=1, centers=0, randomize=False, seed=1),
        dict(kind="full", k=3, gens=[], runs=0, replicates=2, centers=3, randomize=True, seed=20261101),
        dict(kind="full", k=5, gens=[], runs=0, replicates=1, centers=0, randomize=True, seed=7),
        dict(kind="fractional", k=4, gens=["D=ABC"], runs=0, replicates=2, centers=2, randomize=True, seed=99),
        dict(kind="fractional", k=5, gens=["D=AB", "E=-AC"], runs=0, replicates=1, centers=0, randomize=False, seed=1),
        dict(kind="fractional", k=7, gens=["E=ABC", "F=BCD", "G=ACD"], runs=0, replicates=1, centers=1, randomize=True, seed=3),
        dict(kind="pb", k=8, gens=[], runs=12, replicates=1, centers=4, randomize=True, seed=2026),
        dict(kind="pb", k=11, gens=[], runs=12, replicates=1, centers=0, randomize=False, seed=1),
        dict(kind="pb", k=19, gens=[], runs=20, replicates=2, centers=0, randomize=True, seed=5),
    ]
    out.append({"id": "designs", "cases": [{**s, "runsList": generate_runs(**s)} for s in specs]})
    # Fracionários: resolução e confundimento por força bruta.
    catalog = [
        (3, ["C=AB"]), (4, ["D=ABC"]), (5, ["E=ABCD"]), (5, ["D=AB", "E=AC"]), (6, ["F=ABCDE"]),
        (6, ["E=ABC", "F=BCD"]), (6, ["D=AB", "E=AC", "F=BC"]), (7, ["G=ABCDEF"]), (7, ["F=ABCD", "G=ABDE"]),
        (7, ["E=ABC", "F=BCD", "G=ACD"]), (7, ["D=AB", "E=AC", "F=BC", "G=ABC"]), (8, ["G=ABCD", "H=ABEF"]),
        (8, ["F=ABC", "G=ABD", "H=BCDE"]), (8, ["E=BCD", "F=ACD", "G=ABC", "H=ABD"]), (6, ["E=-ABC", "F=BCD"]),
    ]
    frac = []
    for k, gens in catalog:
        _, parsed = fractional(k, gens)
        words, res = words_and_resolution(parsed)
        frac.append({"k": k, "generators": gens, "resolution": res,
                     "definingRelation": [("I = " + ("−" if s < 0 else "") + name(m)) for m, s in sorted(words.items(), key=lambda t: (bin(t[0]).count("1"), t[0]))],
                     "aliases": {e: [a.replace("-", "−") for a in v] for e, v in aliases(k, words).items()}})
    out.append({"id": "fractional", "cases": frac})
    out.append({"id": "plackett-burman", "cases": [{"runs": n, "orthogonal": True} for n in (8, 12, 16, 20, 24, 32, 44, 48)]})
    return out


def lenth(effects, alpha=0.05):
    a = np.abs(effects)
    s0 = 1.5 * np.median(a)
    pse = 1.5 * np.median(a[a < 2.5 * s0])
    m = len(effects)
    d = m / 3
    gamma = (1 + (1 - alpha) ** (1 / m)) / 2
    return {"pse": float(pse), "df": d, "marginOfError": float(stats.t.ppf(1 - alpha / 2, d) * pse),
            "simultaneousMargin": float(stats.t.ppf(gamma, d) * pse)}


def analysis_case(number, slug, title, kind, k, gens, runs, replicates, centers, terms, seed, noise, true_effects, alpha=0.05, curvature=True, shift=0.0):
    """Gera dados, ajusta com NumPy/SciPy e escreve o caso."""
    rng = np.random.default_rng(seed)
    design = generate_runs(kind, k, gens, runs, replicates, centers, True, seed)
    names = [f"F{i + 1}" for i in range(k)]
    lows, highs = [10.0 * (i + 1) for i in range(k)], [10.0 * (i + 1) + 8.0 for i in range(k)]
    rows = []
    for r in design:
        c = np.array(r["coded"])
        y = 50.0 + sum(true_effects.get(t, 0.0) * np.prod([c[j] for j in [ord(ch) - 65 for ch in t]]) for t in true_effects)
        y += shift * (1.0 if r["point"] == "center" else 0.0) + rng.normal(0, noise)
        rows.append({"coded": r["coded"], "real": [lows[j] + (c[j] + 1) / 2 * (highs[j] - lows[j]) for j in range(k)], "y": round(float(y), 3), "point": r["point"]})
    coded = np.array([r["coded"] for r in rows])
    y = np.array([r["y"] for r in rows])
    n = len(y)
    has_center = any(r["point"] == "center" for r in rows) and any(r["point"] != "center" for r in rows)
    cols, labels = [np.ones(n)], ["(Intercept)"]
    for t in terms:
        idx = [ord(ch) - 65 for ch in t]
        cols.append(np.prod(coded[:, idx], axis=1))
        labels.append(":".join(names[j] for j in idx))
    use_curv = curvature and has_center
    if use_curv:
        cols.append(np.array([1.0 if r["point"] == "center" else 0.0 for r in rows]))
        labels.append("curvature")
    x = np.column_stack(cols)
    rank = int(np.linalg.matrix_rank(x))
    beta = np.linalg.lstsq(x, y, rcond=None)[0]
    fitted = x @ beta
    sse = float(((y - fitted) ** 2).sum())
    df = n - rank
    ref = {"labels": labels, "rank": rank, "dfResidual": df, "n": n, "sse": sse, "fitted": fitted.tolist()}
    estimable = rank == x.shape[1]
    ref["estimable"] = estimable
    if estimable and df > 0:
        sigma2 = sse / df
        inv = np.linalg.inv(x.T @ x)
        se = np.sqrt(sigma2 * np.diag(inv))
        t = beta / se
        crit = stats.t.ppf(1 - alpha / 2, df)
        ref["coefficients"] = [{"coefficient": float(b), "effect": float(2 * b), "stdError": float(2 * s), "t": float(tv),
                                "p": float(2 * stats.t.sf(abs(tv), df)), "ciLower": float(2 * (b - crit * s)), "ciUpper": float(2 * (b + crit * s))}
                               for b, s, tv in zip(beta, se, t)]
        ref["residualSd"] = float(np.sqrt(sigma2))
        ref["tCritical"] = float(crit)
        ssm = float(((fitted - y.mean()) ** 2).sum())
        dfm = rank - 1
        ref["anova"] = {"ssModel": ssm, "dfModel": dfm, "ssResidual": sse, "f": (ssm / dfm) / sigma2 if dfm > 0 else None,
                        "p": float(stats.f.sf((ssm / dfm) / sigma2, dfm, df)) if dfm > 0 else None,
                        "rSquared": 1 - sse / float(((y - y.mean()) ** 2).sum())}
    elif estimable:
        ref["coefficients"] = [{"coefficient": float(b), "effect": float(2 * b)} for b in beta]
    else:
        ref["aliasedColumns"] = int(x.shape[1] - rank)
    n_terms = len(terms)
    eff = [float(2 * b) for b in beta[1 : 1 + n_terms]]
    if estimable and n_terms >= 3:
        ref["lenth"] = lenth(np.array(eff), alpha)
    # Falta de ajuste por definição.
    groups = {}
    for r in rows:
        groups.setdefault(tuple(round(v, 9) for v in r["coded"]), []).append(r["y"])
    dfpe = n - len(groups)
    if dfpe > 0 and df > 0:
        sspe = sum(float(((np.array(g) - np.mean(g)) ** 2).sum()) for g in groups.values())
        dflof = df - dfpe
        lof = {"ssPureError": sspe, "dfPureError": dfpe, "dfLackOfFit": dflof, "ssLackOfFit": max(sse - sspe, 0.0)}
        if dflof > 0 and sspe > 0:
            f = ((sse - sspe) / dflof) / (sspe / dfpe)
            lof.update({"f": float(f), "p": float(stats.f.sf(f, dflof, dfpe))})
        ref["lackOfFit"] = lof
    # Verificação clássica da curvatura: quando o modelo é saturado nos ajustes fatoriais, todo o erro
    # residual é erro puro (réplicas fatoriais e pontos centrais) e o termo indicador reproduz
    # t = (ȳ_centro − ȳ_fatoriais) / √(QM_puro · (1/n_c + 1/n_f)).
    if use_curv and estimable and df > 0 and df == dfpe:
        yf = np.array([r["y"] for r in rows if r["point"] != "center"])
        yc = np.array([r["y"] for r in rows if r["point"] == "center"])
        mse_pure = sse / dfpe
        tc = (yc.mean() - yf.mean()) / np.sqrt(mse_pure * (1 / len(yc) + 1 / len(yf)))
        ref["classicalCurvatureT"] = float(tc)
        assert abs(tc - ref["coefficients"][-1]["t"]) < 1e-8, (tc, ref["coefficients"][-1]["t"])
    # Séries.
    main = []
    for j in range(k):
        lo = [r["y"] for r in rows if r["coded"][j] < -1e-9]
        hi = [r["y"] for r in rows if r["coded"][j] > 1e-9]
        ce = [r["y"] for r in rows if all(abs(v) < 1e-9 for v in r["coded"])]
        main.append({"low": float(np.mean(lo)), "high": float(np.mean(hi)), "center": float(np.mean(ce)) if ce else None})
    ref["mainEffects"] = main
    folder = ROOT / "two_level_design_analysis" / f"{number}-{slug}"
    folder.mkdir(parents=True, exist_ok=True)
    spec = {"kind": ({"type": "fullFactorial"} if kind == "full" else {"type": "fractional", "generators": gens} if kind == "fractional" else {"type": "plackettBurman", "runs": runs}),
            "factors": [{"id": f"f{i + 1}", "name": names[i], "low": lows[i], "high": highs[i], "unit": None} for i in range(k)],
            "replicates": replicates, "centerPoints": centers, "randomize": True, "seed": seed}
    (folder / "input.csv").write_text(",".join(names + ["y"]) + "\n" + "\n".join(",".join(repr(float(v)) for v in r["real"]) + "," + repr(float(r["y"])) for r in rows) + "\n")
    (folder / "config.json").write_text(json.dumps({"method": "two_level_design_analysis", "title": title, "responseColumn": "y",
                                                     "spec": spec, "terms": terms, "alpha": alpha, "includeCurvature": curvature}, indent=2, ensure_ascii=False) + "\n")
    (folder / "expected.json").write_text(json.dumps({"reference": ref, "tolerances": {"relative": 1e-9, "absoluteScale": 1e-12},
                                                       "software": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__}}, indent=1) + "\n")
    (folder / "README.md").write_text(f"""# two_level_design_analysis / {folder.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

{title}. Coeficientes e efeitos (2 × coeficiente), erros-padrão, t, valores-p, intervalos, ANOVA, falta de ajuste, curvatura, método de Lenth e médias dos gráficos concordam com a referência independente?

## Dados

Sintéticos, gerados com semente fixa (`numpy.random.default_rng({seed})`) a partir de efeitos verdadeiros conhecidos mais ruído normal, arredondados a 3 casas; `input.csv` tem os valores **reais** dos fatores (níveis `F_i`: baixo = 10·i, alto = 10·i + 8) e a resposta `y`, na ordem de execução aleatória.

## Configuração

`config.json`: planejamento (`spec`), termos do modelo {json.dumps(terms)}, α = {alpha}, curvatura {'incluída' if curvature else 'não incluída'}.

## Referência independente

NumPy {np.__version__} (`lstsq`, inversa de XᵀX), SciPy {scipy.__version__} (`stats.t`, `stats.f`); Lenth e falta de ajuste implementados em Python pela definição ([método](../../../../docs/metodos/fatorial-dois-niveis.md)). O teste de curvatura por termo indicador é conferido contra a fórmula clássica (Montgomery) quando o modelo é saturado nos pontos fatoriais.

## Resultados esperados e tolerâncias

`expected.json`; erro relativo ≤ 1e-9 + 1e-12 × escala.

## Diferenças admitidas

Nenhuma além da tolerância.

## Execução

`app/crates/desvtag-core/tests/design_validation.rs` (nativo) e `app/web/src/services/engine/design.parity.test.ts` (WebAssembly).
""")
    print(folder.name, "n", n, "rank", rank, "df", df, "estimable", estimable)


def main():
    folder = ROOT / "two_level_design"
    folder.mkdir(parents=True, exist_ok=True)
    for item in matrix_cases():
        (folder / f"{item['id']}.json").write_text(json.dumps(item, indent=1, ensure_ascii=False) + "\n")
        print("matrizes:", item["id"], len(item["cases"]))
    analysis_case("001", "fatorial-2x3-replicas-centrais", "Fatorial 2³ com duas réplicas e quatro pontos centrais, modelo com todas as interações e curvatura",
                  "full", 3, [], 0, 2, 4, ["A", "B", "C", "AB", "AC", "BC", "ABC"], 11, 0.4, {"A": 3.0, "B": 2.0, "C": 0.5, "AB": 1.5}, shift=1.2)
    analysis_case("002", "fracionario-resolucao-iv", "Fracionário 2^(4−1) IV com duas réplicas: principais e três interações (uma delas confundida com outra do modelo)",
                  "fractional", 4, ["D=ABC"], 0, 2, 0, ["A", "B", "C", "D", "AB", "AC", "CD"], 12, 0.5, {"A": 4.0, "C": -2.5, "AB": 2.0})
    analysis_case("003", "plackett-burman-12-fatores-oito", "Plackett–Burman de 12 ensaios com 8 fatores e 4 pontos centrais (triagem, efeitos principais e curvatura)",
                  "pb", 8, [], 12, 1, 4, list("ABCDEFGH"), 13, 0.6, {"A": 5.0, "D": -3.0, "F": 2.0}, shift=2.0)
    analysis_case("004", "saturado-lenth", "Fatorial 2³ sem réplicas e modelo saturado (7 efeitos): só o método de Lenth indica efeitos",
                  "full", 3, [], 0, 1, 0, ["A", "B", "C", "AB", "AC", "BC", "ABC"], 14, 0.3, {"A": 6.0, "B": -4.0, "AB": 3.0}, curvature=False)
    analysis_case("005", "fatorial-2x4-sem-replica-erro-por-interacao", "Fatorial 2⁴ sem réplicas com modelo de principais e interações de dois fatores (erro vem das interações de ordem superior)",
                  "full", 4, [], 0, 1, 0, ["A", "B", "C", "D", "AB", "AC", "AD", "BC", "BD", "CD"], 15, 0.5, {"A": 5.0, "B": -3.0, "C": 1.0, "AB": 2.5}, curvature=False)


if __name__ == "__main__":
    main()
