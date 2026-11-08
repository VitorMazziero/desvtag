"""Compare every exported matrix cell with CSV; no scientific calculation is performed."""
import csv
import json
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

import fitz
import openpyxl

folder = Path(sys.argv[1]).resolve()
output = folder / "paper-check"
output.mkdir(exist_ok=True)
csv_path = next(folder.glob("*matrix*.csv"))
with csv_path.open(encoding="utf-8-sig", newline="") as stream:
    rows = [row for row in csv.reader(line for line in stream if not line.lstrip().startswith("#")) if row]
expected = [[float(cell) for cell in row] for row in rows[1:] if row]
assert len(expected) == 4096 and all(len(row) == 33 for row in expected)
assert [row[0] for row in expected] == list(range(1, 4097))

xlsx = openpyxl.load_workbook(next(folder.glob("*matrix*.xlsx")), read_only=True, data_only=True)
raw = list(xlsx.worksheets[0].values)
assert len(raw) == 4097
assert [[float(value) for value in row] for row in raw[1:]] == expected
xlsx.close()

ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with zipfile.ZipFile(next(folder.glob("*matrix*.docx"))) as package:
    root = ET.fromstring(package.read("word/document.xml"))
word_cells = 0
word_bands = 0
for table in root.findall(".//w:tbl", ns):
    records = table.findall("w:tr", ns)
    def contents(record):
        return ["".join(c.itertext()) for c in record.findall("w:tc", ns)]
    header = contents(records[0])
    if len(header) < 2 or not all(re.fullmatch(r"X\d+", s) for s in header[1:]):
        continue
    columns = [int(label[1:]) for label in header[1:]]
    assert len(records) == 4097
    for index, record in enumerate(records[1:], 1):
        values = contents(record)
        assert int(values[0]) == index
        assert [float(v.replace("−", "-")) for v in values[1:]] == [expected[index-1][c] for c in columns]
        word_cells += len(columns)
    word_bands += 1
assert word_bands == 7 and word_cells == 4096 * 32

document = fitz.open(next(folder.glob("*matrix*.pdf")))
seen = set()
bounds = []
minimum = 100.0
for number, page in enumerate(document):
    lines = defaultdict(list)
    words = page.get_text("words")
    for word in words:
        if word[3] - word[1] < 2:  # invisible font registration marks
            continue
        if word[0] < 37 or word[2] > page.rect.width - 37:
            bounds.append({"page": number+1, "word": word[4], "x0": word[0], "x1": word[2]})
        lines[round(word[1], 1)].append(word)
    columns = None
    for y in sorted(lines):
        tokens = [w[4] for w in sorted(lines[y], key=lambda w: w[0])]
        xs = [int(token[1:]) for token in tokens if re.fullmatch(r"X\d+", token)]
        if xs and tokens[0] in ["Condição", "Condition"]:
            columns = xs
            continue
        if tokens[:1] == ["n"]:
            columns = None
        if not columns or len(tokens) != len(columns) + 1:
            continue
        if not tokens[0].isdigit() or not 1 <= int(tokens[0]) <= 4096:
            continue
        numeric = [token.replace("−", "-") for token in tokens[1:]]
        if any(token not in ["1", "-1"] for token in numeric):
            continue
        row = int(tokens[0])
        for column, token in zip(columns, numeric):
            assert float(token) == expected[row-1][column], (number+1, row, column, token)
            assert (row, column) not in seen, ("duplicate", row, column)
            seen.add((row, column))
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if re.fullmatch(r"-?1", span["text"]):
                    minimum = min(minimum, span["size"])
assert len(seen) == 4096 * 32, len(seen)
assert not bounds, bounds[:8]
assert minimum >= 8.99, minimum
for index in sorted({0, 1, len(document)//2, len(document)-2, len(document)-1}):
    document[index].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(output / f"pdf-{index+1}.png")
verification = {"rows": 4096, "predictors": 32, "pdfPages": len(document),
    "pdfCellsCompared": len(seen), "wordCellsCompared": word_cells, "wordBands": word_bands,
    "xlsxCellsCompared": 4096 * 33, "minimumNumericFontPt": minimum, "horizontalOverflow": bounds,
    "note": "PDF/Word formatted predictor values compared against the complete technical CSV; XLSX raw values checked independently. Word pagination was not rendered in Microsoft Word."}
(output / "verification.json").write_text(json.dumps(verification, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(verification, ensure_ascii=True))
