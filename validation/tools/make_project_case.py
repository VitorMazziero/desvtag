"""Gera os casos de validação do formato `.enzitag` (`project_file`) com Python puro.

O contêiner (zipfile), o manifesto e os resumos SHA-256 (hashlib) são escritos aqui, sem usar o
código Rust, de modo que a leitura pelo Rust (nativo, WebAssembly e IPC do Tauri) é verificada
contra uma implementação independente do formato descrito em docs/arquitetura/formato-enzitag.md.
"""
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "cases" / "project_file"
NOW = "2026-11-01T12:00:00Z"


def dumps(value) -> bytes:
    # Mesma serialização compacta do serde_json: sem espaços, UTF-8 sem escapar não-ASCII.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def revision_hash(data: dict) -> str:
    return sha256(dumps(data))  # ordem dos campos = ordem de declaração das structs Rust


def make_data():
    return {
        "factors": [{"id": "f1", "name": "Condição", "kind": "categorical", "unit": "", "levelsText": "Água; Ácido"}],
        "responses": [{"id": "r1", "name": "Atividade", "unit": "U/mL"}],
        "rows": [
            {"id": "o1", "unitId": "", "factors": ["Água"], "responses": ["10,5"]},
            {"id": "o2", "unitId": "", "factors": ["Água"], "responses": ["11,5"]},
            {"id": "o3", "unitId": "", "factors": ["Ácido"], "responses": ["20"]},
            {"id": "o4", "unitId": "", "factors": ["Ácido"], "responses": [""]},
        ],
    }


EMPTY = {"factors": [], "responses": [], "rows": []}


def stat(v):
    return {"status": "defined", "value": v}


def ui_signature() -> str:
    """Assinatura que a interface calcula para estes dados e opções (resultado reaberto = atual).

    Replica `inputSignature` de app/web/src/features/analysis/buildRequest.ts: JSON compacto de
    [dataset, responseId, groupBy], com números sem ".0" e células vazias como null."""
    def number(text):
        if text == "":
            return None
        value = float(text.replace(",", "."))
        return int(value) if value.is_integer() else value

    dataset = {
        "factors": [{"id": "f1", "name": "Condição", "kind": "categorical", "unit": None, "levels": ["Água", "Ácido"]}],
        "responses": [{"id": "r1", "name": "Atividade", "unit": "U/mL"}],
        "observations": [
            {"id": r["id"], "unitId": None, "factors": [r["factors"][0]], "responses": [number(r["responses"][0])]}
            for r in make_data()["rows"]
        ],
    }
    return json.dumps([dataset, "r1", ["f1"]], ensure_ascii=False, separators=(",", ":"))


def document(schema_version=1):
    data = make_data()
    summary_a = {"nTotal": 2, "nMissing": 0, "nValid": 2, "mean": stat(11.0), "variance": stat(0.5),
                 "sd": stat(0.7071067811865476), "min": stat(10.5), "max": stat(11.5)}
    summary_b = {"nTotal": 2, "nMissing": 1, "nValid": 1, "mean": stat(20.0),
                 "variance": {"status": "undefined", "reason": "fewerThanTwoObservations"},
                 "sd": {"status": "undefined", "reason": "fewerThanTwoObservations"},
                 "min": stat(20.0), "max": stat(20.0)}
    # Valores válidos: 10,5; 11,5; 20 → média 14, soma dos quadrados 12,25 + 6,25 + 36 = 54,5, variância 54,5/2 = 27,25.
    overall = {"nTotal": 4, "nMissing": 1, "nValid": 3, "mean": stat(14.0), "variance": stat(27.25),
               "sd": stat(math.sqrt(27.25)), "min": stat(10.5), "max": stat(20.0)}
    return {
        "schemaVersion": schema_version,
        "projectId": "p-golden",
        "name": "Projeto de referência — açúcar, ß, 日本",
        "createdAt": NOW,
        "modifiedAt": NOW,
        "appVersion": "0.1.0",
        "experiments": [
            {
                "id": "e1", "name": "Quatro condições", "entryPath": "analyze", "showUnitColumn": False,
                "analysisSelection": {"responseId": "r1", "groupBy": ["f1"]},
                "revisions": [
                    {"id": "v1", "parent": None, "createdAt": NOW, "reason": "created", "data": EMPTY, "contentHash": revision_hash(EMPTY)},
                    {"id": "v2", "parent": "v1", "createdAt": NOW, "reason": "analysis", "data": data, "contentHash": revision_hash(data)},
                ],
                "analyses": [
                    {
                        "id": "a1", "createdAt": NOW, "revisionId": "v2", "signature": ui_signature(),
                        "methodId": "descriptive_summary", "methodVersion": 1, "engineVersion": "0.1.0",
                        "options": {"responseId": "r1", "groupBy": ["f1"]},
                        "result": {
                            "type": "descriptive", "responseId": "r1", "overall": overall,
                            "groups": [
                                {"labels": [{"factorId": "f1", "label": "Água"}], "summary": summary_a},
                                {"labels": [{"factorId": "f1", "label": "Ácido"}], "summary": summary_b},
                            ],
                            "excludedMissingFactor": 0, "facts": [],
                            "provenance": {"methodId": "descriptive_summary", "methodVersion": 1, "engineVersion": "0.1.0"},
                        },
                    }
                ],
                "notes": "Observação com acentos: ação, coração.",
            },
            {
                "id": "e2", "name": "Segundo experimento", "entryPath": None, "showUnitColumn": False,
                "analysisSelection": {"responseId": None, "groupBy": []},
                "revisions": [{"id": "v1", "parent": None, "createdAt": NOW, "reason": "created", "data": EMPTY, "contentHash": revision_hash(EMPTY)}],
                "analyses": [], "notes": "",
            },
        ],
    }


def write_enzitag(path: Path, project_bytes: bytes, manifest: dict) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in (("manifest.json", json.dumps(manifest, indent=2).encode()), ("project.json", project_bytes)):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, content)


def manifest_for(project_bytes: bytes, schema_version=1) -> dict:
    return {
        "format": "enzitag", "containerVersion": 1, "schemaVersion": schema_version, "appVersion": "0.1.0",
        "files": [{"path": "project.json", "sha256": sha256(project_bytes), "size": len(project_bytes)}],
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cases = {}

    doc = document()
    pb = dumps(doc)
    write_enzitag(OUT / "001-valid.enzitag", pb, manifest_for(pb))
    (OUT / "001-valid.expected.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cases["001-valid.enzitag"] = {"ok": True}

    future = document(schema_version=99)
    fb = dumps(future)
    write_enzitag(OUT / "002-future-schema.enzitag", fb, manifest_for(fb, 99))
    cases["002-future-schema.enzitag"] = {"ok": False, "code": "project.future_schema", "params": {"found": "99", "supported": "1"}}

    tampered = dumps({**doc, "name": "adulterado"})
    write_enzitag(OUT / "003-tampered.enzitag", tampered, manifest_for(pb))  # manifesto do original
    cases["003-tampered.enzitag"] = {"ok": False, "code": "project.integrity_failed"}

    (OUT / "004-not-a-zip.enzitag").write_bytes("isto não é um arquivo zip".encode("utf-8"))
    cases["004-not-a-zip.enzitag"] = {"ok": False, "code": "project.not_a_zip"}

    bad_hash = document()
    bad_hash["experiments"][0]["revisions"][1]["contentHash"] = "0" * 64
    bb = dumps(bad_hash)
    write_enzitag(OUT / "005-revision-hash-mismatch.enzitag", bb, manifest_for(bb))
    cases["005-revision-hash-mismatch.enzitag"] = {"ok": False, "code": "project.revision_hash_mismatch"}

    (OUT / "cases.json").write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "README.md").write_text(
        """# project_file — arquivos `.enzitag` escritos por Python independente

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O leitor do formato `.enzitag` (Rust nativo, WebAssembly e IPC do Tauri) lê corretamente arquivos produzidos por **outra implementação** do formato, preserva texto Unicode e recusa, com códigos de erro, esquema futuro, adulteração, resumo de revisão incorreto e arquivos que não são ZIP?

## Dados

Gerados por `validation/tools/make_project_case.py` (sintéticos): `001-valid.enzitag` (dois experimentos, duas revisões, uma análise guardada, acentos e `ß`/`日本`), `002-future-schema.enzitag` (esquema 99), `003-tampered.enzitag` (documento alterado com o manifesto do original), `004-not-a-zip.enzitag`, `005-revision-hash-mismatch.enzitag`. `cases.json` lista o resultado esperado de cada um; `001-valid.expected.json` é o documento esperado.

## Referência independente

Python `zipfile` e `hashlib` escrevem o contêiner, o manifesto e todos os resumos SHA-256 (inclusive o de cada revisão, sobre a serialização JSON compacta na ordem dos campos). Nenhum código Rust é usado para gerar os arquivos.

## Resultados esperados e tolerâncias

Documento decodificado **igual** ao esperado (comparação estrutural exata; números idênticos) ou o código de erro indicado em `cases.json`. Sem tolerância numérica.

## Diferenças admitidas

Nenhuma.

## Execução

`app/crates/optima-project/tests/project_file_validation.rs` (nativo), `app/web/src/services/engine/project.parity.test.ts` (WebAssembly), `app/desktop/tests/native-smoke.mjs` (IPC do Tauri) e o E2E `app/web/tests/e2e/project.spec.ts` (abrir pelo navegador).
""",
        encoding="utf-8",
    )
    print("ok", OUT)


if __name__ == "__main__":
    main()
