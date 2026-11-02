// Seção «Comentários» do relatório (ET20): montada a partir dos comentários do projeto e anexada ao
// DOM do relatório antes da conversão, de modo que HTML, PDF e Word saem com o mesmo conteúdo.
import type { Comment, CommentTarget } from "../engine";

export interface CommentsLabels {
  title: string;
  resolved: string;
  revision: (id: string) => string;
  target: (target: CommentTarget) => string;
  /** Formata uma data RFC 3339 para leitura (por exemplo, no idioma da exportação). */
  date: (iso: string) => string;
}

function element(
  document: Document,
  tag: string,
  options: { text?: string; children?: Node[] } = {},
): HTMLElement {
  const el = document.createElement(tag);
  if (options.text !== undefined) el.textContent = options.text;
  for (const child of options.children ?? []) el.append(child);
  return el;
}

/** Texto com as quebras de linha do comentário preservadas. */
function lines(document: Document, text: string): Node[] {
  return text
    .split(String.fromCharCode(10))
    .flatMap((line, i) => [
      ...(i > 0 ? [document.createElement("br")] : []),
      document.createTextNode(line),
    ]);
}

function header(document: Document, parts: string[]): Node[] {
  const [first, ...rest] = parts;
  return [
    element(document, "strong", { text: first ?? "" }),
    document.createTextNode(rest.length ? ` · ${rest.join(" · ")}` : ""),
  ];
}

/** `null` quando não há comentários: o relatório fica sem a seção. */
export function commentsSection(
  document: Document,
  comments: Comment[],
  labels: CommentsLabels,
): HTMLElement | null {
  if (comments.length === 0) return null;
  const items = comments.map((c) => {
    const meta = [
      labels.target(c.target),
      ...(c.author ? [c.author] : []),
      labels.date(c.createdAt),
      labels.revision(c.revisionId),
      ...(c.resolvedAt === undefined ? [] : [labels.resolved]),
    ];
    const children: Node[] = [
      ...header(document, meta),
      document.createElement("br"),
      ...lines(document, c.text),
    ];
    const replies = c.replies ?? [];
    if (replies.length > 0) {
      children.push(
        element(document, "ul", {
          children: replies.map((r) =>
            element(document, "li", {
              children: [
                ...header(
                  document,
                  [...(r.author ? [r.author] : []), labels.date(r.createdAt)].filter(Boolean),
                ),
                document.createElement("br"),
                ...lines(document, r.text),
              ],
            }),
          ),
        }),
      );
    }
    return element(document, "li", { children });
  });
  return element(document, "section", {
    children: [
      element(document, "h2", { text: labels.title }),
      element(document, "ul", { children: items }),
    ],
  });
}
