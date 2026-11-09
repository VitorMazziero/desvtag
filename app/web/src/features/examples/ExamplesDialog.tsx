import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectActions } from "../project";
import { availableExamples } from "./catalog";

/**
 * Conteúdo do pop-up «Exemplos» (menu Extras): lista os projetos de exemplo e abre o escolhido
 * no lugar do projeto atual, pedindo confirmação se houver alterações não salvas.
 */
export function ExamplesDialog({ onOpened }: { onOpened: () => void }) {
  const { t } = useTranslation();
  const { loadOpened, confirmDiscard, busy } = useProjectActions();
  const [failed, setFailed] = useState(false);
  const examples = availableExamples();

  const openExample = async (url: string, fileName: string) => {
    if (!confirmDiscard()) return;
    setFailed(false);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      const bytes = new Uint8Array(await response.arrayBuffer());
      await loadOpened({ name: fileName, bytes });
      onOpened();
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="examples-dialog" data-testid="examples-list">
      <p className="muted">{t("examples.intro")}</p>
      {failed && (
        <p role="alert" className="error">
          {t("examples.failed")}
        </p>
      )}
      <ul className="examples-list">
        {examples.map((example) => (
          <li key={example.id} className="example-item">
            <div>
              <h3>
                {example.id} — {t(`examples.items.${example.id}.title`)}
              </h3>
              <p className="muted small">{t(`examples.items.${example.id}.description`)}</p>
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              data-testid={`open-example-${example.id}`}
              onClick={() => void openExample(example.url, example.fileName)}
            >
              {t("examples.open")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
