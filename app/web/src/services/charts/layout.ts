// Composição de textos de SVG após a personalização. Só geometria; nunca modifica dados.
const NS = "http://www.w3.org/2000/svg";

/** Estimativa conservadora independente de fonte/rede, inclusive em exportação offline. */
export function textWidth(value: string, size: number): number {
  return [...value].reduce(
    (sum, ch) =>
      sum +
      (/\s/.test(ch)
        ? 0.35
        : /[il.,:;'!|]/.test(ch)
          ? 0.35
          : /[MW@%]/.test(ch) || ch.codePointAt(0)! > 0x24f
            ? 1
            : 0.68) *
        size,
    0,
  );
}

export function wrapWidth(value: string, width: number, size: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/)) {
    if (line && textWidth(`${line} ${word}`, size) > width) {
      lines.push(line);
      line = "";
    }
    // Textos sem espaços também precisam caber; preserva todos os caracteres.
    for (const ch of (line ? " " : "") + word) {
      if (line && textWidth(line + ch, size) > width) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Limita uma reta aos eixos (Liang–Barsky), antes de aplicar o recorte SVG. */
export function clipLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  box: { left: number; top: number; right: number; bottom: number },
): [number, number, number, number] | null {
  const dx = x1 - x0,
    dy = y1 - y0;
  let lo = 0,
    hi = 1;
  for (const [p, q] of [
    [-dx, x0 - box.left],
    [dx, box.right - x0],
    [-dy, y0 - box.top],
    [dy, box.bottom - y0],
  ]) {
    if (p === 0) {
      if (q! < 0) return null;
      continue;
    }
    const r = q! / p!;
    if (p! < 0) lo = Math.max(lo, r);
    else hi = Math.min(hi, r);
    if (lo > hi) return null;
  }
  return [x0 + lo * dx, y0 + lo * dy, x0 + hi * dx, y0 + hi * dy];
}

/** Título e rodapé ganham linhas e espaço; a área dos dados preserva suas proporções. */
export function layoutFigure(svg: string): string {
  if (!svg.includes("data-plot=")) return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svg;
  const root = doc.documentElement;
  const dims = root.getAttribute("viewBox")?.split(/\s+/).map(Number);
  if (!dims || dims.length !== 4) return svg;
  const width = dims[2]!,
    height = dims[3]!;
  const title = root.querySelector('text[data-figure="title"]');
  let topExtra = 0;
  if (title) {
    const x = Number(title.getAttribute("x") ?? 16),
      size = Number(title.getAttribute("font-size") ?? 14);
    const lines = wrapWidth(title.textContent ?? "", width - x - 16, size);
    topExtra = Math.max(0, lines.length - 1) * size * 1.35;
    const y = Number(title.getAttribute("y") ?? 22);
    title.textContent = "";
    lines.forEach((value, i) => {
      const span = doc.createElementNS(NS, "tspan");
      span.setAttribute("x", String(x));
      span.setAttribute("y", String(y + i * size * 1.35));
      span.textContent = value;
      title.append(span);
    });
  }
  const notes = [
    ...root.querySelectorAll('text[data-figure="legend"], text[data-figure="lettersLegend"]'),
  ];
  let bottomExtra = 0;
  if (notes.length) {
    const firstY = Math.min(...notes.map((e) => Number(e.getAttribute("y"))));
    const groups: Array<{ node: Element; text: string }> = [];
    for (const node of notes) {
      const prev = groups.at(-1);
      if (
        prev &&
        prev.node.getAttribute("data-figure") === node.getAttribute("data-figure") &&
        prev.node.getAttribute("data-note-group") === node.getAttribute("data-note-group")
      )
        prev.text += ` ${node.textContent}`;
      else groups.push({ node, text: node.textContent ?? "" });
    }
    for (const node of notes) node.remove();
    const otherBaselines = [...root.querySelectorAll("text")]
      .filter(
        (e) => !e.hasAttribute("transform") && e !== title && !e.hasAttribute("data-contour-label"),
      )
      .map((e) => Number(e.getAttribute("y") ?? 0));
    let y = Math.max(firstY, ...otherBaselines.map((v) => v + 22));
    for (const { node, text } of groups) {
      const x = Number(node.getAttribute("x") ?? 64),
        size = Number(node.getAttribute("font-size") ?? 12);
      const lines = wrapWidth(text, width - x - 16, size);
      for (const content of lines) {
        const line = node.cloneNode(false) as Element;
        line.setAttribute("y", String(y));
        line.textContent = content;
        root.append(line);
        y += size * 1.4;
      }
    }
    bottomExtra = Math.max(0, y + 8 - height);
  }
  // Translation moves data, axes and notes together; title and background stay in their own areas.
  if (topExtra) {
    const group = doc.createElementNS(NS, "g");
    group.setAttribute("transform", `translate(0 ${topExtra})`);
    for (const node of [...root.children])
      if (
        node !== title &&
        !["title", "desc", "metadata"].includes(node.localName) &&
        node.getAttribute("data-figure") !== "background"
      )
        group.append(node);
    root.append(group);
  }
  // Textos permanecem na largura da figura mesmo após o aumento da fonte.
  for (const node of root.querySelectorAll("text")) {
    if (node === title || node.hasAttribute("transform")) continue;
    const size = Number(node.getAttribute("font-size") ?? 12);
    const extent = textWidth(node.textContent ?? "", size);
    const anchor = node.getAttribute("text-anchor") ?? "start";
    const anchorPart = anchor === "middle" ? 0.5 : anchor === "end" ? 1 : 0;
    const x = Number(node.getAttribute("x") ?? 0);
    if (extent > width - 16) node.setAttribute("font-size", String((size * (width - 16)) / extent));
    const actual = Math.min(extent, width - 16);
    node.setAttribute(
      "x",
      String(Math.max(8 + actual * anchorPart, Math.min(width - 8 - actual * (1 - anchorPart), x))),
    );
  }
  const finalHeight = Math.ceil(height + topExtra + bottomExtra);
  root.setAttribute("viewBox", `0 0 ${width} ${finalHeight}`);
  root.setAttribute("data-layout", "flow");
  root.querySelector('[data-figure="background"]')?.setAttribute("height", String(finalHeight));
  return new XMLSerializer().serializeToString(root);
}
