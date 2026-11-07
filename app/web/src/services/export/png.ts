import { embedFigureFonts } from "./figureFonts";

// SVG → PNG no navegador (U16) e inserção de metadados em um chunk `tEXt`.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Dimensions in a locally generated PNG's IHDR. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Texto Latin-1 (o chunk `tEXt` não admite outros caracteres): o restante vira `?`. */
function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, (c) => (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 63));
}

/** Insere um chunk `tEXt` (palavra-chave + texto) logo após o `IHDR`. */
export function addPngText(png: Uint8Array, keyword: string, text: string): Uint8Array {
  if (!PNG_SIGNATURE.every((b, i) => png[i] === b)) throw new Error("not a PNG");
  const ihdrLength = new DataView(png.buffer, png.byteOffset + 8, 4).getUint32(0);
  const insertAt = 8 + 12 + ihdrLength;
  const body = new Uint8Array([...latin1(keyword), 0, ...latin1(text)]);
  const chunk = new Uint8Array(12 + body.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, body.length);
  chunk.set([0x74, 0x45, 0x58, 0x74], 4); // "tEXt"
  chunk.set(body, 8);
  view.setUint32(8 + body.length, crc32(chunk.subarray(4, 8 + body.length)));
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

/** Rasteriza um SVG autônomo (cores literais, `width`/`height` no `viewBox`). */
export async function svgToPng(
  svg: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Uint8Array> {
  const url = URL.createObjectURL(
    new Blob([await embedFigureFonts(svg)], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("svg render failed"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("png encoding failed");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
