// Ao trocar de etapa, volta ao topo do fluxo de forma suave (ou sem animação com movimento reduzido)
// e leva o foco ao título da etapa, sem rolar de novo (a rolagem já foi feita).

export interface ScrollTarget {
  scrollIntoView?: (options: ScrollIntoViewOptions) => void;
  querySelector: (selector: string) => HTMLElement | null;
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
  root.scrollIntoView?.({ behavior, block: "start" });
  const heading = root.querySelector("h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  return behavior;
}
