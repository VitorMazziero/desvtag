import { useState } from "react";

interface Props {
  label: string;
  onExport: () => Promise<void>;
  onError: (error: unknown) => void;
}

export function ExportButton({ label, onExport, onError }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="button secondary small"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (error) {
          onError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
}
