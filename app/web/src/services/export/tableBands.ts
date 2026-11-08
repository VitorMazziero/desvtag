/** Horizontal table bands for paper: repeat the first column and preserve every data cell. */
export function tableBands(table: HTMLTableElement): HTMLTableElement[] {
  const limit = 6;
  const rows = [...table.querySelectorAll("tr")].filter((row) => row.closest("table") === table);
  const cells = (row: Element) =>
    [...row.children].filter((cell) => ["TH", "TD"].includes(cell.tagName));
  const expanded = rows.map((row) =>
    cells(row).flatMap((cell) =>
      Array.from(
        { length: Math.max(1, Number(cell.getAttribute("colspan") ?? "1") || 1) },
        () => cell,
      ),
    ),
  );
  const columns = Math.max(0, ...expanded.map((row) => row.length));
  if (columns <= limit) return [table];
  const dataRows = rows.filter(
    (row) => !["THEAD", "TFOOT"].includes(row.parentElement?.tagName ?? ""),
  );
  const references = dataRows.map((row) =>
    (cells(row)[0]?.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
  const ordinal = new Set(references).size !== references.length;
  const stride = limit - 1 - Number(ordinal);
  const bands: HTMLTableElement[] = [];
  for (let start = 1; start < columns; start += stride) {
    const indices = [
      0,
      ...Array.from({ length: Math.min(stride, columns - start) }, (_, i) => start + i),
    ];
    const band = table.cloneNode(false) as HTMLTableElement;
    if (ordinal) band.dataset.paperOrdinal = "true";
    const caption = [...table.children].find((child) => child.tagName === "CAPTION");
    if (caption) band.append(caption.cloneNode(true));
    if (ordinal && table.dataset.paperRowReference) {
      let label = band.querySelector("caption");
      if (!label) {
        label = table.ownerDocument.createElement("caption");
        band.prepend(label);
      }
      label.append(
        table.ownerDocument.createTextNode(
          (label.textContent ? ". " : "") + table.dataset.paperRowReference,
        ),
      );
    }
    let position = 0;
    rows.forEach((row, i) => {
      const target = row.parentElement?.tagName.toLowerCase() ?? "tbody";
      let group = band.querySelector(target);
      if (!group) {
        group = table.ownerDocument.createElement(target);
        band.append(group);
      }
      const copy = row.cloneNode(false) as HTMLTableRowElement;
      if (ordinal) {
        const header = row.parentElement?.tagName === "THEAD";
        const footer = row.parentElement?.tagName === "TFOOT";
        const reference = table.ownerDocument.createElement(header ? "th" : "td");
        reference.textContent = header ? "#" : footer ? "" : String(++position);
        reference.classList.add("num");
        copy.append(reference);
      }
      for (const index of indices) {
        const source = expanded[i]?.[index];
        const cell = source
          ? (source.cloneNode(true) as HTMLTableCellElement)
          : table.ownerDocument.createElement("td");
        cell.removeAttribute("colspan");
        copy.append(cell);
      }
      group.append(copy);
    });
    bands.push(band);
  }
  return bands;
}
