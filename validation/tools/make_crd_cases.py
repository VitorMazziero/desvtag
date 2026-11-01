"""Gera os casos de validação de `completely_randomized_design` (DIC aleatorizado).

Referência independente, escrita sem usar o código Rust e sem NumPy/SciPy: a ordem padrão é
enumerada por definição (nível 1 com as repetições, nível 2, …) e a ordem de execução é a
permutação Fisher–Yates com PCG32 (inteiros arbitrários de Python), a mesma especificada em
`docs/metodos/aleatorizacao.md`. Cada caso lista, em ordem de execução, o par (posição padrão
1-based, nível, repetição).
"""
import json
from pathlib import Path

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


def crd_case(levels, replicates, randomize, seed):
    standard = [(lv, rep) for lv in range(len(levels)) for rep in range(1, replicates + 1)]
    order = permutation(len(standard), seed) if randomize else list(range(len(standard)))
    runs = [{"standardOrder": i + 1, "levelIndex": standard[i][0], "level": levels[standard[i][0]], "replicate": standard[i][1]} for i in order]
    return {"levels": levels, "replicates": replicates, "randomize": randomize, "seed": seed, "runs": runs}


def main():
    folder = ROOT / "completely_randomized_design"
    folder.mkdir(parents=True, exist_ok=True)
    cases = [
        crd_case(["Controle", "pH 5", "pH 7", "Temperatura 37"], 5, True, 42),
        crd_case(["A", "B"], 2, True, 0),
        crd_case(["A", "B", "C"], 3, False, 99),
        crd_case([f"T{i}" for i in range(1, 11)], 4, True, 12345),
        crd_case(["x", "y", "z"], 1, True, (1 << 63) + 5),
        crd_case([f"N{i}" for i in range(1, 26)], 8, True, 9007199254740991),
    ]
    out = {"id": "completely_randomized_design", "description": "DIC: ordem de execução = Fisher–Yates/PCG32 sobre a ordem padrão agrupada por nível", "cases": cases}
    (folder / "crd.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("casos:", len(cases))


if __name__ == "__main__":
    main()
