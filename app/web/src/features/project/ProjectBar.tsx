import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import type { RecoveryStatus } from "../../services/storage/autosave";
import { useStorage } from "../../services/storage/context";
import { useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { hasUnsavedChanges } from "../../state/workspace";
import { DrivePanel } from "../drive/DrivePanel";
import { closeMenuOf, Menu } from "../menus/Menu";
import { SaveStatus } from "./SaveStatus";
import { useProjectActions } from "./useProjectActions";

export function ProjectBar({ recovery }: { recovery: RecoveryStatus }) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const storage = useStorage();
  const actions = useProjectActions();
  const { notice, busy, newProject, open, save } = actions;
  const unsaved = hasUnsavedChanges(workspace);
  return (
    <section className="file-bar" aria-label={t("project.bar")}>
      <div className="file-row">
        <label className="field grow">
          <span>{t("project.name")}</span>
          <input
            type="text"
            value={workspace.name}
            placeholder={t("project.namePlaceholder")}
            onChange={(e) => dispatch({ type: "renameProject", name: e.target.value })}
          />
        </label>
        <div className="file-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => void newProject()}
            disabled={busy}
          >
            {t("project.new")}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => void open()}
            disabled={busy}
          >
            {t("project.open")}
          </button>
          <button type="button" className="button" onClick={() => void save()} disabled={busy}>
            {t("project.save")}
          </button>
          <Menu label={t("project.more")} testId="file-menu" alignEnd>
            {storage.overwritesFile ? (
              <ul className="menu-list">
                <li>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={(e) => {
                      closeMenuOf(e.currentTarget);
                      void save({ saveAs: true });
                    }}
                    disabled={busy}
                  >
                    {t("project.saveAs")}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={(e) => {
                      closeMenuOf(e.currentTarget);
                      void save({ copy: true });
                    }}
                    disabled={busy}
                  >
                    {t("project.saveCopy")}
                  </button>
                </li>
              </ul>
            ) : (
              <p className="muted small">{t("project.saveBrowserHelp")}</p>
            )}
            {storage.kind === "browser" && <DrivePanel actions={actions} />}
            {storage.kind === "desktop" && <p className="muted small">{t("drive.desktopNote")}</p>}
          </Menu>
          <Menu
            label={
              <span className="save-chip" data-unsaved={unsaved}>
                {unsaved ? t("status.unsaved") : t("status.clean")}
              </span>
            }
            testId="save-details"
            alignEnd
            buttonClassName="chip-button"
          >
            <SaveStatus
              workspace={workspace}
              recovery={recovery}
              downloads={!storage.overwritesFile}
            />
          </Menu>
        </div>
      </div>
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={notice.kind === "error" ? "error" : "muted"}
        >
          {notice.messages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
    </section>
  );
}

export function ExperimentBar() {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const dispatch = useProjectDispatch();
  const current = workspace.experiments.find((e) => e.id === workspace.currentId);
  return (
    <section aria-label={t("experiments.label")} className="experiment-bar">
      <ul className="tabs">
        {workspace.experiments.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="tab"
              aria-pressed={e.id === workspace.currentId}
              aria-label={t("experiments.tab", { name: e.name })}
              onClick={() => dispatch({ type: "selectExperiment", id: e.id })}
            >
              {e.name || e.id}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="button secondary small"
            onClick={() =>
              dispatch({
                type: "addExperiment",
                name: t("project.newExperimentName", { n: workspace.experiments.length + 1 }),
                now: nowIso(),
              })
            }
          >
            {t("experiments.add")}
          </button>
        </li>
      </ul>
      {current && (
        <label className="field">
          <span>{t("experiments.name")}</span>
          <input
            type="text"
            value={current.name}
            onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
          />
        </label>
      )}
    </section>
  );
}
