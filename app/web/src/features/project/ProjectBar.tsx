import { useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import type { RecoveryStatus } from "../../services/storage/autosave";
import { useStorage } from "../../services/storage/context";
import { useProjectDispatch, useWorkspace } from "../../state/ProjectContext";
import { hasUnsavedChanges } from "../../state/workspace";
import { DrivePanel } from "../drive/DrivePanel";
import { closeMenuOf, Menu } from "../menus/Menu";
import { RecentFiles } from "./RecentFiles";
import { SaveStatus } from "./SaveStatus";
import { saveLabel } from "./saveLabel";
import { useProjectActions } from "./useProjectActions";

export function ProjectBar({ recovery }: { recovery: RecoveryStatus }) {
  const { t, i18n } = useTranslation();
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
            {t(storage.overwritesFile ? "project.save" : "project.downloadSave")}
          </button>
          <Menu label={t("project.more")} testId="file-menu" alignEnd>
            <h2 className="menu-heading">{t("project.computer")}</h2>
            <div className="row">
              <button
                type="button"
                className="button secondary small"
                disabled={busy}
                onClick={(e) => {
                  closeMenuOf(e.currentTarget);
                  void newProject();
                }}
              >
                {t("project.new")}
              </button>
              <button
                type="button"
                className="button secondary small"
                disabled={busy}
                onClick={(e) => {
                  closeMenuOf(e.currentTarget);
                  void open();
                }}
              >
                {t("project.open")}
              </button>
              <button
                type="button"
                className="button file-menu-save"
                disabled={busy}
                onClick={(e) => {
                  closeMenuOf(e.currentTarget);
                  void save();
                }}
              >
                {t(storage.overwritesFile ? "project.save" : "project.downloadSave")}
              </button>
            </div>
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
            <RecentFiles />
            <section aria-label="Google Drive">
              <h2 className="menu-heading">Google Drive</h2>
              <DrivePanel actions={actions} />
            </section>
          </Menu>
          <Menu
            label={
              <span className="save-chip" data-unsaved={unsaved}>
                {saveLabel(t, workspace, !storage.overwritesFile, i18n.language)}
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
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState(false);
  const matches = workspace.experiments.filter((e) =>
    `${e.name} ${e.id}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <section aria-label={t("experiments.label")} className="experiment-bar">
      {workspace.experiments.length > 5 && (
        <label className="field">
          <span>{t("experiments.search")}</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      )}
      <label className="field grow">
        <span>{t("experiments.active")}</span>
        <select
          value={workspace.currentId}
          onChange={(e) => dispatch({ type: "selectExperiment", id: e.target.value })}
        >
          {(matches.some((e) => e.id === workspace.currentId) ? matches : [current!, ...matches])
            .filter(Boolean)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name || e.id}
                {e.origin ? ` — ${t("experiments.confirmation")}` : ""}
              </option>
            ))}
        </select>
      </label>
      <button
        type="button"
        className="button secondary experiment-action"
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
      <button
        type="button"
        className="button secondary experiment-action"
        aria-expanded={renaming}
        onClick={() => setRenaming(!renaming)}
      >
        {t("experiments.rename")}
      </button>
      {renaming && current && (
        <label className="field">
          <span>{t("experiments.name")}</span>
          <input
            type="text"
            value={current.name}
            onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
          />
        </label>
      )}
      {current?.origin && (
        <button
          type="button"
          className="button secondary small"
          onClick={() => dispatch({ type: "selectExperiment", id: current.origin!.experimentId })}
        >
          {t("experiments.source", {
            name:
              workspace.experiments.find((e) => e.id === current.origin?.experimentId)?.name ??
              current.origin.experimentId,
          })}
        </button>
      )}
    </section>
  );
}
