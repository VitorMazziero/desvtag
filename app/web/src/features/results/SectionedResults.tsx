// Resultados em seções com barra lateral (ET11): cada bloco marcado com `data-section` é uma seção;
// só a ativa fica visível. A ordem das seções é fixa (exportação sempre por último). O relatório
// HTML não usa este componente e continua completo e em sequência.
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

/** Ordem de apresentação; ids desconhecidos vão antes da exportação. */
const ORDER = [
  "summary",
  "tables",
  "effects",
  "model",
  "diagnostics",
  "charts",
  "optimization",
  "confirmation",
  "export",
];

const STORAGE_KEY = "optima.showAllSections";
const ACTIVE_KEY = "optima.activeSection";

/** Seção ativa lembrada ao navegar e ao recarregar (estado da interface, não do projeto). */
function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function readShowAll(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const rank = (id: string): number => {
  const i = ORDER.indexOf(id);
  return i < 0 ? ORDER.length - 1.5 : i;
};

export function SectionedResults({ children }: { children: ReactNode }) {
  const { t } = useTranslation("results");
  const host = useRef<HTMLDivElement>(null);
  const initialActive = useRef(readActive());
  const activeRef = useRef<string | null>(initialActive.current);
  const showAllRef = useRef(readShowAll());
  const [showAll, setShowAll] = useState(showAllRef.current);
  const [ids, setIds] = useState<string[]>([]);
  const [active, setActiveState] = useState<string | null>(initialActive.current);
  const setActive = (id: string) => {
    setActiveState(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  };

  const apply = useCallback(() => {
    const el = host.current;
    if (!el) return;
    // O relatório é montado fora da tela dentro da seção «Exportar»: seus blocos `data-section` não
    // pertencem a esta barra e nunca podem ser escondidos por ela (senão o PDF e o Word saem vazios).
    const blocks = [...el.querySelectorAll<HTMLElement>("[data-section]")].filter(
      (b) => b.closest("[data-report-root]") === null,
    );
    const found = [...new Set(blocks.map((b) => b.dataset.section ?? ""))]
      .filter((id) => id !== "")
      .sort((a, b) => rank(a) - rank(b));
    const current =
      activeRef.current && found.includes(activeRef.current)
        ? activeRef.current
        : (found[0] ?? null);
    for (const b of blocks) b.hidden = !showAllRef.current && b.dataset.section !== current;
    setIds((prev) => (prev.join("|") === found.join("|") ? prev : found));
  }, []);

  useLayoutEffect(() => {
    apply();
    const el = host.current;
    if (!el) return;
    const observer = new MutationObserver(apply);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [apply]);

  useLayoutEffect(() => {
    activeRef.current = active;
    apply();
  }, [active, apply]);

  const toggleAll = (on: boolean) => {
    showAllRef.current = on;
    setShowAll(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
    apply();
  };

  const current = active && ids.includes(active) ? active : (ids[0] ?? null);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowDown" ? 1 : ids.length - 1)) % ids.length;
    const id = ids[next];
    if (id) setActive(id);
    (
      event.currentTarget.closest("ul")?.querySelectorAll("button")[next] as HTMLElement | undefined
    )?.focus();
  };

  return (
    <div className="results-layout" data-testid="results-layout">
      {ids.length > 1 && (
        <nav className="results-nav" aria-label={t("sections.label")}>
          <ul>
            {ids.map((id, index) => (
              <li key={id}>
                <button
                  type="button"
                  className={!showAll && id === current ? "active" : ""}
                  aria-current={!showAll && id === current ? "page" : undefined}
                  data-testid={`section-${id}`}
                  onClick={() => setActive(id)}
                  onKeyDown={(e) => move(e, index)}
                >
                  {t(`sections.${id}`, { defaultValue: id })}
                </button>
              </li>
            ))}
          </ul>
          <label className="check small">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => toggleAll(e.target.checked)}
              data-testid="show-all-sections"
            />
            <span>{t("sections.showAll")}</span>
          </label>
        </nav>
      )}
      <div className="results-body" ref={host}>
        {children}
      </div>
    </div>
  );
}
