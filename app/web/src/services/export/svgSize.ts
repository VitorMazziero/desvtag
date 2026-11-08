/** Same viewBox interpretation for main-thread rasterization and Word layout. */
export function svgPixelBox(svg: Element): { width: number; height: number } {
  const box = /^[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)$/.exec(
    (svg.getAttribute("viewBox") ?? "").trim().replace(/\s+/g, " "),
  );
  return { width: Number(box?.[1] ?? 643), height: Number(box?.[2] ?? 380) };
}
