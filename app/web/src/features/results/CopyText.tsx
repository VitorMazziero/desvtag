// Botão «Copiar» de um texto curto (equações): usa a área de transferência do navegador e avisa o
// resultado; sem permissão, orienta a copiar à mão.
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CopyText({ label, text }: { label: string; text: string }) {
  const { t } = useTranslation("results");
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };
  return (
    <>
      <button type="button" className="button secondary small" onClick={copy}>
        {label}
      </button>
      {status !== null && (
        <span role="status" className="muted small">
          {" "}
          {t(status === "copied" ? "surface.equation.copied" : "surface.equation.copyFailed")}
        </span>
      )}
    </>
  );
}
