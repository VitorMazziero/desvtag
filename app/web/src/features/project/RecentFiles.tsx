import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RecentItem } from "../../services/storage";
import { useStorage } from "../../services/storage/context";
import { closeMenuOf } from "../menus/Menu";
import { useProjectActions } from "./useProjectActions";

/**
 * Projetos recentes no menu «Arquivo». Só o Windows guarda a lista; no navegador a lista é vazia
 * e a seção não aparece (a sessão não salva é oferecida pelo aviso de recuperação).
 */
export function RecentFiles() {
  const { t } = useTranslation();
  const storage = useStorage();
  const { openRecent, busy } = useProjectActions();
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

  if (recents.length === 0) return null;
  return (
    <section aria-label={t("project.recent")} data-testid="recent-files">
      <h2 className="menu-heading">{t("project.recent")}</h2>
      <ul className="recent-list">
        {recents.map((item, index) => (
          <li key={item.path}>
            <button
              type="button"
              className="button secondary small"
              disabled={busy}
              onClick={(e) => {
                closeMenuOf(e.currentTarget);
                void openRecent(index);
              }}
            >
              {item.name}
            </button>
            <span className="muted small"> {item.path}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
