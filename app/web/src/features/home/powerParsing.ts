/** Parsing only; scientific calculations remain in Rust. */
export function parseInput(text: string): number {
  const trimmed = text.trim().replace("−", "-").replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}
export function parseMeans(text: string): number[] {
  return text
    .split(/[;\n]+/)
    .filter((p) => p.trim() !== "")
    .map(parseInput);
}
