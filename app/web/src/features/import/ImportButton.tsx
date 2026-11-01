import { useState } from "react";
import { useTranslation } from "react-i18next";
import { pickFile, readFileBytes } from "../../services/storage/browserFile";
import { type ImportFile, ImportWizard } from "./ImportWizard";

/** Botão "Importar arquivo…": escolhe CSV/TSV/TXT/XLSX e abre o assistente. */
export function ImportButton() {
  const { t } = useTranslation();
  const [file, setFile] = useState<ImportFile | null>(null);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={async () => {
          const picked = await pickFile(".csv,.tsv,.txt,.xlsx");
          if (picked) setFile(await readFileBytes(picked));
        }}
      >
        {t("import.button")}
      </button>
      {file && <ImportWizard file={file} onClose={() => setFile(null)} />}
    </>
  );
}
