"""Gera os casos de validação de `randomized_block_design` (DBC aleatorizado).

Referência independente em Python (inteiros arbitrários): PCG32 único, na ordem dos blocos,
com Fisher–Yates de trás para frente em cada bloco (mesmo algoritmo de `docs/metodos/aleatorizacao.md`).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "cases" / "randomized_block_design"
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


def rcbd(levels, blocks, randomize, seed):
    rng = PCG32(seed)
    runs = []
    for b, block in enumerate(blocks):
        order = list(range(len(levels)))
        if randomize:
            for i in range(len(order) - 1, 0, -1):
                j = rng.bounded(i + 1)
                order[i], order[j] = order[j], order[i]
        for pos, lv in enumerate(order):
            runs.append({"run": len(runs) + 1, "blockIndex": b, "block": block, "position": pos + 1, "levelIndex": lv, "level": levels[lv]})
    return {"levels": levels, "blocks": blocks, "randomize": randomize, "seed": seed, "runs": runs}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    cases = [
        rcbd(["Controle", "pH 5", "pH 7", "pH 9"], ["Dia 1", "Dia 2", "Dia 3", "Dia 4", "Dia 5"], True, 42),
        rcbd(["A", "B", "C"], ["b1", "b2"], True, 0),
        rcbd(["A", "B", "C"], ["b1", "b2", "b3"], False, 7),
        rcbd([f"T{i}" for i in range(1, 9)], [f"L{i}" for i in range(1, 7)], True, 12345),
        rcbd(["x", "y"], ["u", "v", "w"], True, (1 << 63) + 5),
    ]
    (ROOT / "rcbd.json").write_text(json.dumps({"id": "randomized_block_design", "cases": cases}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("casos:", len(cases))


if __name__ == "__main__":
    main()
