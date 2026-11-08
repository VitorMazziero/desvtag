// Ao trocar de etapa, leva o foco ao título e rola até o início do fluxo.

export interface ScrollTarget {
  scrollIntoView?: (options: ScrollIntoViewOptions) => void;
  querySelector: (selector: string) => HTMLElement | null;
  querySelectorAll?: (selector: string) => NodeListOf<HTMLElement>;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Rola até o início do fluxo e foca o título da etapa nova. Devolve o comportamento usado. */
export function scrollToStep(root: ScrollTarget | null, reduceMotion: boolean): ScrollBehavior {
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
  if (!root) return behavior;
  const heading = root.querySelectorAll
    ? [...root.querySelectorAll("h2,h3")].find((e) => !e.closest("[hidden]"))
    : root.querySelector("h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  root.scrollIntoView?.({ behavior, block: "start" });
  return behavior;
}
