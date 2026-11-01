"""Gera o caso de validação de importação XLSX (`import_xlsx`) com openpyxl.

O arquivo é escrito por um software independente do leitor testado. O resultado esperado é
escrito aqui por regra explícita (não lido de volta do leitor): texto decimal mais curto para
números, vazio para células vazias/erros/fórmulas sem valor armazenado.
"""
import datetime
import json
import sys
from pathlib import Path

import openpyxl

OUT = Path(__file__).resolve().parents[1] / "cases" / "import_xlsx" / "001-acentos-virgula-ausentes-formula"
OUT.mkdir(parents=True, exist_ok=True)

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Dados"
rows = [
    ["Condição", "Atividade (U/mL)", "Unidade", "Observação"],
    ["Água", "10,5", "U1", "texto com vírgula decimal"],
    ["Água", 11.5, "U1", "mesma unidade experimental (medida repetida)"],
    ["Ácido", 20, "U2", None],
    ["Ácido", None, "U3", "valor ausente"],
    ["Base", 7, "U4", "ç ã é ü ñ 日本"],
]
for r in rows:
    ws.append(r)
ws["B7"] = "=SUM(B2:B6)"  # fórmula sem valor armazenado (openpyxl não calcula)
ws["C7"] = "total"
ws["D2"] = datetime.datetime(2026, 11, 1)  # célula de data (substitui a observação da linha 2)
ws["E2"].value = "#DIV/0!"
ws["E2"].data_type = "e"  # célula com erro
notes = wb.create_sheet("Notas")
notes.append(["isto não é dado"])
wb.save(OUT / "input.xlsx")

# Resultado esperado, por regra: números = texto decimal mais curto; vazio = "".
expected_rows = [
    ["Condição", "Atividade (U/mL)", "Unidade", "Observação", ""],
    ["Água", "10,5", "U1", "46327", "" ],
    ["Água", "11.5", "U1", "mesma unidade experimental (medida repetida)", ""],
    ["Ácido", "20", "U2", "", ""],
    ["Ácido", "", "U3", "valor ausente", ""],
    ["Base", "7", "U4", "ç ã é ü ñ 日本", ""],
    ["", "", "total", "", ""],
]
(OUT / "expected.json").write_text(
    json.dumps(
        {
            "sheets": ["Dados", "Notas"],
            "selected": "Dados",
            "rows": expected_rows,
            "warningCounts": {
                "import.formula_without_value": 1,
                "import.dates_as_serial": 1,
                "import.error_cells": 1,
            },
            "reference": {"software": f"openpyxl {openpyxl.__version__}", "python": sys.version.split()[0]},
            "note": "A data 2026-11-01 tem número de série 46327 no calendário de 1900 do Excel (conferido: (date - 1899-12-30).days).",
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
assert (datetime.date(2026, 11, 1) - datetime.date(1899, 12, 30)).days == 46327
(OUT / "README.md").write_text(
    """# import_xlsx / 001-acentos-virgula-ausentes-formula

**Estado:** aprovado · **Atualizado em:** 2026-11-01

## Pergunta

O leitor de XLSX devolve, como texto, apenas os **valores armazenados**, preservando acentos e vírgula decimal digitada como texto, tratando vazio como ausente e **sem executar fórmulas**?

## Dados

`input.xlsx` (gerado por `validation/tools/make_import_cases.py` com openpyxl): duas planilhas (`Dados`, `Notas`); texto `10,5` com vírgula decimal; número `11.5`; inteiro; células vazias; mesma unidade experimental (`U1`) em duas linhas (medidas repetidas da mesma unidade); caracteres `ç ã é ü ñ 日本`; uma data; um erro `#DIV/0!`; uma fórmula `=SUM(B2:B6)` sem valor armazenado. Dados sintéticos.

## Referência independente

O arquivo foi escrito por openpyxl; o resultado esperado em `expected.json` foi escrito por regra explícita no gerador, sem ler o resultado do leitor testado.

## Resultados esperados e tolerâncias

Igualdade exata das grades de texto e das contagens de avisos. Sem tolerância numérica (não há cálculo).

## Diferenças admitidas

Nenhuma.

## Execução

`app/crates/optima-project/tests/import_xlsx_validation.rs` (nativo) e o mesmo arquivo pelo WebAssembly em `app/web/src/services/engine/import.parity.test.ts`.
""",
    encoding="utf-8",
)
print("ok", OUT)
