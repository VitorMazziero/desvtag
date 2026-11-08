/** Font assets load only when a custom family is exported. All resources are local. */
export async function embedFigureFonts(svg: string): Promise<string> {
  const family = svg.includes('font-family="DejaVu Serif')
    ? "DejaVu Serif"
    : svg.includes('font-family="DejaVu Sans Mono')
      ? "DejaVu Sans Mono"
      : null;
  if (!family || svg.includes('data-embedded-font="true"')) return svg;
  const { fontFiles } = await import("./pdfFonts");
  const prefix = family === "DejaVu Serif" ? "DejaVuSerif" : "DejaVuSansMono";
  const normal = fontFiles[`${prefix}.ttf`];
  const bold = fontFiles[`${prefix}-Bold.ttf`];
  const css = `@font-face{font-family:'${family}';font-weight:400;src:url(data:font/ttf;base64,${normal})} @font-face{font-family:'${family}';font-weight:600 700;src:url(data:font/ttf;base64,${bold})}`;
  return svg.replace(
    /(<svg\b[^>]*>)/,
    `$1<defs><style data-embedded-font="true">${css}</style></defs>`,
  );
}
