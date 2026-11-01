import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RecentItem } from "../../services/storage";
import { useStorage } from "../../services/storage/context";
import { useProjectActions } from "../project";

/**
 * Projetos recentes (Windows: lista guardada pelo aplicativo) e abertura de projeto.
 * No navegador não há como reabrir um arquivo sem a escolha do usuário; a sessão não salva é
 * oferecida pelo aviso de recuperação.
 */
export function RecentProjects() {
  const { t } = useTranslation();
  const storage = useStorage();
  const { open, openRecent, busy } = useProjectActions();
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    let active = true;
    void storage.recents().then(
      (list) => active && setRecents(list),
      () => active && setRecents([]),
    );
    return () => {
      active = false;
    };
  }, [storage]);

  return (
    <section className="panel" aria-labelledby="recent-title">
      <h2 id="recent-title">{t("home.recentTitle")}</h2>
      {recents.length === 0 ? (
        <p className="muted">{t("home.recentEmpty")}</p>
      ) : (
        <ul className="recent-list">
          {recents.map((item, index) => (
            <li key={item.path}>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void openRecent(index)}
              >
                {item.name}
              </button>
              <span className="muted small"> {item.path}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => void open()}
      >
        {t("home.open")}
      </button>
    </section>
  );
}
