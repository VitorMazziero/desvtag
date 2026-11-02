// Menu suspenso do cabeçalho (ET29): botão que abre um painel sobre a página, sem empurrar o
// conteúdo. Fecha com Esc e com um clique fora; o foco volta ao botão. Os filhos ficam sempre no DOM
// (o painel só fica escondido), de modo que o estado deles sobrevive ao fechar.
import { type ReactNode, useEffect, useRef } from "react";

interface Props {
  label: string;
  testId: string;
  children: ReactNode;
  /** Painel alinhado à direita do botão (menus no canto direito do cabeçalho). */
  alignEnd?: boolean;
}

export function Menu({ label, testId, children, alignEnd = false }: Props) {
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const close = () => {
      el.open = false;
    };
    const onPointer = (event: PointerEvent) => {
      if (el.open && event.target instanceof Node && !el.contains(event.target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && el.open) {
        close();
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <details className="menu" data-testid={testId} ref={root}>
      <summary className="button secondary menu-button">{label}</summary>
      <div className={alignEnd ? "menu-panel align-end" : "menu-panel"}>{children}</div>
    </details>
  );
}

/** Fecha o menu que contém o elemento (depois de escolher um item). */
export function closeMenuOf(element: Element | null): void {
  const menu = element?.closest("details.menu");
  if (menu instanceof HTMLDetailsElement) menu.open = false;
}
