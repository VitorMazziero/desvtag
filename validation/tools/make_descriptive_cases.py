"""Gera os casos de validação de `descriptive_summary` a partir dos conjuntos univariados do NIST StRD.

Referências independentes usadas:
  1. Aritmética racional exata (fractions.Fraction) e raiz quadrada de 60 dígitos (mpmath)
     sobre os MESMOS números binários de 64 bits que o aplicativo lê — mede a exatidão do algoritmo.
  2. Valores certificados pelo NIST (sobre os decimais originais) — o aplicativo lê decimais como
     binário de 64 bits; a diferença admitida é limitada matematicamente (ver `certifiedBounds`).
  3. NumPy (ddof=1) como verificação cruzada de software estabelecido.

Uso: python validation/tools/make_descriptive_cases.py <pasta-com-os-.dat>
"""
import json
import re
import sys
from fractions import Fraction
from decimal import Decimal
from pathlib import Path

import mpmath
import numpy

mpmath.mp.dps = 60
DATASETS = ["NumAcc1", "NumAcc2", "NumAcc3", "NumAcc4", "Lew", "Lottery", "Mavro", "Michelso", "PiDigits"]
OUT = Path(__file__).resolve().parents[1] / "cases" / "descriptive_summary"
NIST_URL = "https://www.itl.nist.gov/div898/strd/univ/data/{}.dat"


def parse(path: Path):
    lines = path.read_text(encoding="latin-1").splitlines()
    mean = sd = None
    for line in lines:
        m = re.search(r"ybar:\s+([-+0-9.eE]+)", line)
        if m:
            mean = m.group(1)
        m = re.search(r"\bs:\s+([-+0-9.eE]+)", line)
        if m and "denom" in line:
            sd = m.group(1)
    start = next(i for i, l in enumerate(lines) if l.strip().startswith("Data:") and l.strip().endswith("Y")) + 2
    values = [l.strip() for l in lines[start:] if l.strip()]
    return values, mean, sd


def exact_stats(fractions):
    n = len(fractions)
    mean = sum(fractions) / n
    ss = sum((x - mean) ** 2 for x in fractions)
    var = ss / (n - 1)
    sd = mpmath.sqrt(mpmath.mpf(var.numerator) / mpmath.mpf(var.denominator))
    return mean, var, sd


def to_float(fr: Fraction) -> float:
    return float(fr)


def main(src: Path):
    for index, name in enumerate(DATASETS, start=1):
        values, certified_mean, certified_sd = parse(src / f"{name}.dat")
        floats = [float(v) for v in values]
        binary = [Fraction(f) for f in floats]
        decimal = [Fraction(Decimal(v)) for v in values]
        mean, var, sd = exact_stats(binary)
        mean_d, _, sd_d = exact_stats(decimal)
        n = len(values)
        deltas = [b - d for b, d in zip(binary, decimal)]
        sd_bound = float(mpmath.sqrt(mpmath.mpf(sum(d * d for d in deltas).numerator) / mpmath.mpf(sum(d * d for d in deltas).denominator) / (n - 1))) if any(deltas) else 0.0
        mean_bound = float(sum(abs(d) for d in deltas) / n)
        np_mean = float(numpy.mean(floats))
        np_var = float(numpy.var(floats, ddof=1))
        assert abs(np_mean - to_float(mean)) <= 1e-12 * max(1.0, abs(to_float(mean))), name
        assert abs(np_var - to_float(var)) <= 1e-9 * to_float(var), (name, np_var, to_float(var))
        case = OUT / f"{index:03d}-nist-{name.lower()}"
        case.mkdir(parents=True, exist_ok=True)
        (case / "input.csv").write_text("y\n" + "\n".join(values) + "\n", encoding="utf-8")
        (case / "config.json").write_text(
            json.dumps({"method": "descriptive_summary", "responseColumn": "y", "groupBy": []}, indent=2) + "\n",
            encoding="utf-8",
        )
        expected = {
            "n": n,
            "exactOnBinary64Inputs": {
                "mean": to_float(mean),
                "variance": to_float(var),
                "sd": float(sd),
                "min": min(floats),
                "max": max(floats),
            },
            "certifiedNist": {"mean": certified_mean, "sd": certified_sd},
            "certifiedBounds": {"mean": mean_bound, "sd": sd_bound},
            "tolerances": {"relative": 1e-12, "note": "relativa ao valor exato sobre os mesmos binários de 64 bits"},
            "reference": {
                "software": "Python fractions (exato) + mpmath; verificação cruzada com NumPy",
                "python": sys.version.split()[0],
                "numpy": numpy.__version__,
                "mpmath": mpmath.__version__,
                "source": NIST_URL.format(name),
            },
        }
        (case / "expected.json").write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")
        (case / "README.md").write_text(
            f"""# descriptive_summary / {case.name}

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

A média, a variância e o desvio-padrão amostrais (denominador n − 1) calculados pelo motor são exatos para o conjunto NIST StRD `{name}` ({n} observações)?

## Dados

Conjunto univariado do NIST Statistical Reference Datasets ({NIST_URL.format(name)}), de domínio público (governo dos EUA). Valores copiados sem alteração para `input.csv` (coluna `y`).

## Configuração

`config.json`: método `descriptive_summary`, resposta `y`, sem agrupamento.

## Referência independente

Aritmética racional exata em Python (`fractions`) com raiz quadrada de 60 dígitos (`mpmath` {mpmath.__version__}) sobre os números binários de 64 bits lidos do CSV; verificação cruzada com NumPy {numpy.__version__} e comparação com os valores certificados pelo NIST. Gerado por `validation/tools/make_descriptive_cases.py`.

## Resultados esperados e tolerâncias

`expected.json`. Média, variância e desvio-padrão: erro relativo ≤ 1e-12 em relação ao valor exato sobre os binários de 64 bits (o algoritmo — soma compensada e segunda passagem corrigida — erra na ordem de 1e-16; 1e-12 deixa margem de quatro ordens de grandeza sem aceitar erros de algoritmo ingênuo).

Valores certificados do NIST (decimais): o aplicativo lê cada decimal como binário de 64 bits, o que perturba os dados por δᵢ. Pela desigualdade triangular, |s_bin − s_cert| ≤ √(Σδᵢ² / (n−1)) e |média_bin − média_cert| ≤ Σ|δᵢ|/n; esses limites estão em `certifiedBounds` e são a diferença admitida, mais 1e-12 relativo.

## Diferenças admitidas

Somente a conversão decimal→binário descrita acima.

## Execução

Ver `app/crates/optima-core/tests/descriptive_validation.rs` (nativo) e `app/web/src/services/engine/descriptive.parity.test.ts` (WebAssembly).
""",
            encoding="utf-8",
        )
        print(case.name, n, to_float(mean), float(sd), "bounds", mean_bound, sd_bound)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
