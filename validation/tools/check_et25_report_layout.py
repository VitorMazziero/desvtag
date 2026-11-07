"""Confere a paginação de relatórios PDF e Word (AU-U10/AU-U11, ET28).

PDF (PyMuPDF): rodapé real em todas as páginas; sem página residual (última página só com a nota ou
quase vazia); sem título solto no fim da página; ocupação do papel por página; textos exclusivos da
tela fora do relatório. Word (.docx, XML): a nota está no rodapé, os campos de paginação existem e a
nota não é parágrafo do corpo. Uso: python check_et25_report_layout.py <pasta-ou-arquivo>...
"""
import re
import sys
import zipfile
from pathlib import Path

import fitz

SCREEN_ONLY = ["Escolha dois fatores", "Será analisada", "Mostrar tudo", "mostrar tudo", "Choose two factors"]
FOOTER_FRACTION = 0.93  # a faixa abaixo disso é rodapé
NOTE = "arquivo autocontido"


def body_blocks(page):
    limit = page.rect.height * FOOTER_FRACTION
    return [b for b in page.get_text("blocks") if b[4].strip() and b[3] <= limit]


def heading_spans(page):
    """Spans em negrito de tamanho maior que o corpo (títulos e subtítulos)."""
    sizes = []
    spans = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if span["text"].strip():
                    sizes.append(span["size"])
                    spans.append(span)
    if not sizes:
        return []
    body = sorted(sizes)[len(sizes) // 2]
    return [
        s
        for s in spans
        if s["size"] > body + 0.8
        and (s["flags"] & 16 or re.search(r"Bold|Medium|Black|Semibold", s["font"]))  # negrito
        and len(s["text"].strip()) < 80
        and not s["text"].strip().endswith(".")
        and s["origin"][1] < page.rect.height * FOOTER_FRACTION
    ]


def check_pdf(path):
    problems, notes = [], []
    doc = fitz.open(path)
    n = doc.page_count
    fills = []
    for i, page in enumerate(doc):
        text = page.get_text()
        blocks = body_blocks(page)
        usable = page.rect.height * FOOTER_FRACTION
        figures = [i["bbox"][3] for i in page.get_image_info() if i["bbox"][3] <= usable + 5]
        figures += [d["rect"].y1 for d in page.get_drawings() if d["rect"].y1 <= usable]
        bottom = max([b[3] for b in blocks] + figures, default=0)
        fill = bottom / usable
        fills.append(fill)
        if NOTE not in text:
            problems.append(f"p{i + 1}: sem a nota de rodapé real")
        for phrase in SCREEN_ONLY:
            if phrase in text:
                problems.append(f"p{i + 1}: texto exclusivo da tela «{phrase}»")
        # Título solto: o último bloco do corpo é um título e há outra página depois.
        if i < n - 1 and blocks:
            last = max(blocks, key=lambda b: b[3])
            heads = [s["text"].strip() for s in heading_spans(page) if abs(s["bbox"][3] - last[3]) < 3]
            if heads and fill > 0.80:
                problems.append(f"p{i + 1}: título no fim da página «{heads[0][:50]}»")
        if i == n - 1 and n > 1:
            body_chars = sum(len(b[4]) for b in blocks)
            if body_chars < 250 and fill < 0.35:
                problems.append(f"p{i + 1}: página final residual ({body_chars} caracteres, ocupação {fill:.2f})")
    for i, fill in enumerate(fills[:-1]):
        if fill < 0.30:
            notes.append(f"p{i + 1}: ocupação {fill:.2f}")
    return n, problems, notes


def check_docx(path):
    problems = []
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        footers = [n for n in names if re.match(r"word/footer\d*\.xml", n)]
        body = z.read("word/document.xml").decode("utf8")
        footer_xml = "".join(z.read(n).decode("utf8") for n in footers)
    if not footers:
        problems.append("sem parte de rodapé")
    if NOTE not in footer_xml:
        problems.append("nota ausente do rodapé")
    if NOTE in body:
        problems.append("nota aparece no corpo")
    if "PAGE" not in footer_xml:
        problems.append("campo de página ausente do rodapé")
    for phrase in SCREEN_ONLY:
        if phrase in body:
            problems.append(f"texto exclusivo da tela «{phrase}»")
    return problems


def main(paths):
    failed = 0
    files = []
    for p in map(Path, paths):
        files += sorted(p.rglob("*")) if p.is_dir() else [p]
    for f in files:
        if f.suffix == ".pdf" and re.search(r"variance-(fds|spatial)|figure|chart", f.name):
            continue  # figura isolada exportada em PDF, não relatório
        if f.suffix == ".pdf":
            n, problems, notes = check_pdf(f)
            print(f"PDF  {f.parent.name[-34:]}/{f.name}: {n} páginas; {'OK' if not problems else 'FALHA'}")
        elif f.suffix == ".docx":
            problems, notes = check_docx(f), []
            print(f"DOCX {f.parent.name[-34:]}/{f.name}: {'OK' if not problems else 'FALHA'}")
        else:
            continue
        for item in problems:
            print("   -", item)
        for item in notes:
            print("   ·", item)
        failed += bool(problems)
    print(f"{failed} arquivo(s) com problema")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf8")
    sys.exit(main(sys.argv[1:]))
