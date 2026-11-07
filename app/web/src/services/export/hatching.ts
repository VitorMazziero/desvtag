/** Flatten SVG patterns into clipped vector lines for PDF engines without pattern support. */
export function flattenHatching(svg: string): string {
  if (!svg.includes("<pattern")) return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svg;
  const ns = "http://www.w3.org/2000/svg";
  const root = doc.documentElement;
  const defs =
    root.querySelector("defs") ??
    root.insertBefore(doc.createElementNS(ns, "defs"), root.firstChild);
  let id = 0;
  for (const shape of root.querySelectorAll('[fill^="url(#"]')) {
    const key = /^url\(#(.+)\)$/.exec(shape.getAttribute("fill") ?? "")?.[1];
    const pattern = [...root.querySelectorAll("pattern")].find((p) => p.id === key);
    const color = pattern?.querySelector("[stroke]")?.getAttribute("stroke");
    if (!color) continue;
    let xs: number[], ys: number[];
    if (shape.localName === "rect") {
      const x = Number(shape.getAttribute("x") ?? 0),
        y = Number(shape.getAttribute("y") ?? 0);
      xs = [x, x + Number(shape.getAttribute("width"))];
      ys = [y, y + Number(shape.getAttribute("height"))];
    } else if (shape.localName === "polygon") {
      const values = (shape.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      xs = values.filter((_, i) => i % 2 === 0);
      ys = values.filter((_, i) => i % 2 === 1);
    } else continue;
    if (!xs.length || !ys.length || [...xs, ...ys].some((v) => !Number.isFinite(v))) continue;
    const left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    const clipId = `pdf-hatch-${++id}`;
    const clip = doc.createElementNS(ns, "clipPath");
    clip.setAttribute("id", clipId);
    const boundary = shape.cloneNode(true) as Element;
    boundary.setAttribute("fill", "black");
    boundary.removeAttribute("fill-opacity");
    clip.append(boundary);
    defs.append(clip);
    const group = doc.createElementNS(ns, "g");
    group.setAttribute("clip-path", `url(#${clipId})`);
    group.setAttribute("data-pdf-hatch", "true");
    group.setAttribute("opacity", shape.getAttribute("fill-opacity") ?? "1");
    const height = bottom - top;
    for (let x = Math.floor((left - height) / 6) * 6; x <= right; x += 6) {
      const line = doc.createElementNS(ns, "line");
      for (const [key, value] of Object.entries({
        x1: x,
        y1: bottom,
        x2: x + height,
        y2: top,
        stroke: color,
        "stroke-width": 1,
      }))
        line.setAttribute(key, String(value));
      group.append(line);
    }
    shape.replaceWith(group);
  }
  for (const pattern of root.querySelectorAll("pattern")) pattern.remove();
  return new XMLSerializer().serializeToString(root);
}
