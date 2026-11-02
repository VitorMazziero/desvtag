// Comentários de revisão (ET20): lista, resposta, resolução e novo comentário. Tudo é texto livre
// guardado no projeto; nenhum resultado depende dele. Cada comentário registra a revisão dos dados
// em que foi escrito. O nome de quem comenta é opcional e fica só neste dispositivo.
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { nowIso } from "../../lib/ids";
import type { Comment, CommentTarget } from "../../services/engine";
import { useProject, useProjectDispatch } from "../../state/ProjectContext";

const AUTHOR_KEY = "optima.commentAuthor";
const MAX_TEXT = 2000;

function readAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeAuthor(author: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, author);
  } catch {
    // sem armazenamento: o nome vale só nesta sessão
  }
}

/**
 * Mesmo alvo: figuras e tabelas valem pela chave (continuam visíveis quando a análise é refeita);
 * análises pelo identificador; o experimento é único.
 */
export function sameTarget(a: CommentTarget, b: CommentTarget): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "experiment") return true;
  if (a.kind === "analysis") return a.analysisId === b.analysisId;
  return (a.key ?? "") === (b.key ?? "");
}

/** Rótulo legível do alvo: experimento, análise ou figura. */
export function useTargetLabel(): (target: CommentTarget) => string {
  const { t } = useTranslation("common");
  const project = useProject();
  return (target) => {
    if (target.kind === "experiment") return t("comments.target.experiment");
    const analysis = project.analyses.find((a) => a.id === target.analysisId);
    const method = analysis ? `${analysis.id} (${analysis.methodId})` : (target.analysisId ?? "");
    if (target.kind === "analysis") return t("comments.target.analysis", { analysis: method });
    return t(`comments.target.${target.kind}`, { key: target.key ?? "" });
  };
}

export function CommentForm({ target, onAdded }: { target: CommentTarget; onAdded?: () => void }) {
  const { t } = useTranslation("common");
  const dispatch = useProjectDispatch();
  const id = useId();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(readAuthor);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim() === "") return;
    writeAuthor(author.trim());
    dispatch({ type: "addComment", target, text, author, now: nowIso() });
    setText("");
    onAdded?.();
  };

  return (
    <form className="comment-form" onSubmit={submit}>
      <label className="field" htmlFor={`${id}-text`}>
        <span>{t("comments.new")}</span>
        <textarea
          id={`${id}-text`}
          rows={3}
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="row">
        <label className="field" htmlFor={`${id}-author`}>
          <span>{t("comments.author")}</span>
          <input
            id={`${id}-author`}
            type="text"
            maxLength={200}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </label>
        <button type="submit" className="button secondary small" disabled={text.trim() === ""}>
          {t("comments.add")}
        </button>
      </div>
    </form>
  );
}

function when(iso: string, language: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(language, { dateStyle: "short", timeStyle: "short" });
}

export function CommentItem({ comment, label }: { comment: Comment; label?: string }) {
  const { t, i18n } = useTranslation("common");
  const dispatch = useProjectDispatch();
  const id = useId();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const resolved = comment.resolvedAt !== undefined;

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (reply.trim() === "") return;
    dispatch({
      type: "replyComment",
      id: comment.id,
      text: reply,
      author: readAuthor(),
      now: nowIso(),
    });
    setReply("");
    setReplying(false);
  };

  return (
    <li className={resolved ? "comment resolved" : "comment"} data-testid={`comment-${comment.id}`}>
      <p className="muted small">
        {label ? <strong>{label} · </strong> : null}
        {comment.author ? `${comment.author} · ` : ""}
        {when(comment.createdAt, i18n.language)} ·{" "}
        {t("comments.revision", { id: comment.revisionId })}
        {resolved ? ` · ${t("comments.resolved")}` : ""}
      </p>
      <p className="comment-text">{comment.text}</p>
      {(comment.replies ?? []).length > 0 && (
        <ul className="comment-replies">
          {(comment.replies ?? []).map((r) => (
            <li key={r.id}>
              <p className="muted small">
                {r.author ? `${r.author} · ` : ""}
                {when(r.createdAt, i18n.language)}
              </p>
              <p className="comment-text">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button
          type="button"
          className="button secondary small"
          aria-expanded={replying}
          onClick={() => setReplying((v) => !v)}
        >
          {t("comments.reply")}
        </button>
        <button
          type="button"
          className="button secondary small"
          onClick={() =>
            dispatch({
              type: "setCommentResolved",
              id: comment.id,
              resolved: !resolved,
              now: nowIso(),
            })
          }
        >
          {resolved ? t("comments.reopen") : t("comments.resolve")}
        </button>
        <button
          type="button"
          className="button secondary small"
          onClick={() => {
            if (window.confirm(t("comments.confirmDelete"))) {
              dispatch({ type: "deleteComment", id: comment.id });
            }
          }}
        >
          {t("comments.delete")}
        </button>
      </div>
      {replying && (
        <form className="comment-form" onSubmit={send}>
          <label className="field" htmlFor={`${id}-reply`}>
            <span>{t("comments.replyLabel")}</span>
            <textarea
              id={`${id}-reply`}
              rows={2}
              maxLength={MAX_TEXT}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
          </label>
          <button type="submit" className="button secondary small" disabled={reply.trim() === ""}>
            {t("comments.send")}
          </button>
        </form>
      )}
    </li>
  );
}

/** Comentários de um alvo (por exemplo uma figura), recolhidos até o usuário abrir. */
export function CommentThread({ target, testId }: { target: CommentTarget; testId: string }) {
  const { t } = useTranslation("common");
  const project = useProject();
  const [open, setOpen] = useState(false);
  const comments = project.comments.filter((c) => sameTarget(c.target, target));
  const unresolved = comments.filter((c) => c.resolvedAt === undefined).length;
  return (
    <details
      className="advanced comments"
      data-testid={`comments-${testId}`}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t("comments.summary", { count: comments.length, open: unresolved })}</summary>
      {open && (
        <>
          {comments.length === 0 ? (
            <p className="muted small">{t("comments.none")}</p>
          ) : (
            <ul className="comment-list">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </ul>
          )}
          <CommentForm target={target} />
        </>
      )}
    </details>
  );
}
