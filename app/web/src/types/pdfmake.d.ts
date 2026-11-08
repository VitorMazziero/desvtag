// Declarações mínimas do pdfmake (a biblioteca não traz tipos): só o que o aplicativo usa.
declare module "pdfmake/build/pdfmake" {
  interface PdfDocument {
    getBuffer(): Promise<Uint8Array>;
  }
  const pdfMake: {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    addFonts(
      fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>,
    ): void;
    setUrlAccessPolicy(policy: (url: string) => boolean): void;
    createPdf(definition: object): PdfDocument;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
