// Painel de comentários do experimento: todos os comentários (de experimento, análises e figuras)
// e o formulário para comentar o experimento ou uma análise guardada. Comentários de figura são
// escritos na própria figura (ver `CommentThread`).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CommentTarget } from "../../services/engine";
import { useProject } from "../../state/ProjectContext";
import { CommentForm, CommentItem, useTargetLabel } from "./CommentThread";

export function CommentsPanel() {
  const { t } = useTranslation("common");
  const project = useProject();
  const label = useTargetLabel();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("experiment");
  const comments = project.comments;
  const unresolved = comments.filter((c) => c.resolvedAt === undefined).length;
  const target: CommentTarget =
    choice === "experiment" ? { kind: "experiment" } : { kind: "analysis", analysisId: choice };
  return (
    <details
      className="advanced comments"
      data-testid="comments-panel"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("comments.panelTitle", { count: comments.length, open: unresolved })}</summary>
      {open && (
        <>
          <p className="muted small">{t("comments.intro")}</p>
          {comments.length === 0 ? (
            <p className="muted small">{t("comments.none")}</p>
          ) : (
            <ul className="comment-list">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} label={label(c.target)} />
              ))}
            </ul>
          )}
          <label className="field">
            <span>{t("comments.about")}</span>
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="experiment">{t("comments.target.experiment")}</option>
              {project.analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {t("comments.target.analysis", { analysis: `${a.id} (${a.methodId})` })}
                </option>
              ))}
            </select>
          </label>
          <CommentForm target={target} />
        </>
      )}
    </details>
  );
}
