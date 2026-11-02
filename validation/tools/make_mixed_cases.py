"""Gera os casos de validação de `mixed_levels_design` (fatorial de níveis mistos).

Referência independente em Python (inteiros arbitrários), sem usar o código Rust:
- ordem padrão com o primeiro fator variando mais depressa (`itertools.product` sobre os fatores
  em ordem inversa), repetição 1 completa, depois a 2, e assim por diante;
- ordem de execução = Fisher–Yates de trás para frente com PCG32 sobre a ordem padrão
  (mesmo algoritmo de `docs/metodos/aleatorizacao.md`).
"""
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "cases" / "mixed_levels_design"
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


def mixed_case(factors, replicates, randomize, seed):
    sizes = [len(levels) for _, levels in factors]
    # product sobre os fatores em ordem inversa: o último varia mais devagar e o primeiro, mais depressa.
    combos = [tuple(reversed(c)) for c in itertools.product(*[range(n) for n in reversed(sizes)])]
    standard = [(c, rep) for rep in range(1, replicates + 1) for c in combos]
    order = permutation(len(standard), seed) if randomize else list(range(len(standard)))
    runs = []
    for position, index in enumerate(order):
        combo, rep = standard[index]
        runs.append(
            {
                "run": position + 1,
                "standardOrder": index + 1,
                "levelIndices": list(combo),
                "levels": [factors[k][1][combo[k]] for k in range(len(factors))],
                "replicate": rep,
            }
        )
    return {
        "factors": [{"name": n, "levels": lv} for n, lv in factors],
        "replicates": replicates,
        "randomize": randomize,
        "seed": seed,
        "runs": runs,
    }


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    cases = [
        mixed_case([("Cepa", ["A", "B", "C"]), ("pH", ["5", "7"])], 3, True, 42),
        mixed_case([("Cepa", ["A", "B", "C"]), ("pH", ["5", "7"])], 1, False, 0),
        mixed_case([("Meio", ["M1", "M2"]), ("Temperatura", ["25", "30", "37"]), ("Agitação", ["100", "150", "200", "250"])], 2, True, 12345),
        mixed_case([("A", ["a1", "a2"]), ("B", ["b1", "b2", "b3"]), ("C", ["c1", "c2"])], 2, False, 7),
        mixed_case([("X", ["x1", "x2", "x3", "x4"]), ("Y", ["y1", "y2"])], 2, True, 9007199254740991),
        mixed_case([("F1", ["a", "b"]), ("F2", ["c", "d"])], 4, True, (1 << 63) + 5),
    ]
    out = {
        "id": "mixed_levels_design",
        "description": "Fatorial de níveis mistos: ordem padrão com o 1.º fator mais rápido; execução = Fisher–Yates/PCG32 sobre a ordem padrão",
        "cases": cases,
    }
    (ROOT / "mixed.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("casos:", len(cases))


if __name__ == "__main__":
    main()
