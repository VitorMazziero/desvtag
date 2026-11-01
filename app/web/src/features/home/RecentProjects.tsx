import { useTranslation } from "react-i18next";

/** Projetos recentes e abertura de projeto: ainda indisponíveis até o salvamento (ET03). */
export function RecentProjects() {
  const { t } = useTranslation();
  return (
    <section className="panel" aria-labelledby="recent-title">
      <h2 id="recent-title">{t("home.recentTitle")}</h2>
      <p className="muted">{t("home.recentEmpty")}</p>
      <button type="button" className="button secondary" disabled aria-describedby="open-help">
        {t("home.open")}
      </button>
      <p id="open-help" className="muted small">
        {t("home.openUnavailable")}
      </p>
    </section>
  );
}
