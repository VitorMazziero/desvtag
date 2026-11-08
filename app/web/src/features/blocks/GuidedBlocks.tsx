// Percurso guiado por blocos (ET29): em vez de uma página longa, cada etapa mostra **um bloco por
// vez**, com «Anterior» e «Seguir» e uma lista lateral dos blocos. Um bloco só libera o seguinte
// quando está pronto (por exemplo, níveis dos fatores válidos), de modo que opções que dependem de
// uma escolha anterior só aparecem depois dela. Os blocos ficam montados (só escondidos), então o
// que o usuário digitou não se perde ao navegar. «Mostrar tudo» (a mesma preferência da barra de
// seções dos resultados) exibe todos os blocos em sequência.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion, scrollToStep } from "../workflow/scrollToStep";

export interface Block {
  id: string;
  title: string;
  /** Pronto para seguir; ausente = sempre pronto. */
  ready?: boolean;
  content: ReactNode;
  /** O conteúdo já apresenta o próprio título. */
  titled?: boolean;
}

const KEY = "optima.showAllSections";

function readShowAll(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}

// «Mostrar tudo» vale para todos os blocos da página (o principal e os internos): um pequeno
// armazenamento compartilhado avisa os componentes quando a preferência muda.
let memory = false;
const listeners = new Set<() => void>();
function writeShowAll(on: boolean): void {
  memory = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface Props {
  blocks: Block[];
  testId: string;
  focusId?: string;
  label?: string;
  order?: number;
  storageKey?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  nextAllowed?: boolean;
  active?: boolean;
  focusRequest?: { id: string; revision: number };
}

type Entry = { id: string; title: string; ready?: boolean; testId: string; order: number };
const FlowContext = createContext<null | {
  register: (source: string, entries: Entry[]) => void;
  active: string;
  showAll: boolean;
  focus: (id: string) => void;
}>(null);

/** Reúne blocos dos painéis montados em uma única navegação, preservando os formulários. */
export function GuidedFlow({
  children,
  testId,
  label,
  storageKey = testId,
  focusId,
  active: stageActive = true,
  focusRequest,
  onPrevious,
  onNext,
  nextAllowed = true,
}: Omit<Props, "blocks"> & { children: ReactNode }) {
  const { t } = useTranslation();
  const showAll = useSyncExternalStore(subscribe, readShowAll, () => false);
  const [sources, setSources] = useState<Record<string, Entry[]>>({});
  const [selected, setSelected] = useState(() => {
    try {
      return sessionStorage.getItem(`optima.block.${storageKey}`) ?? focusId ?? "";
    } catch {
      return "";
    }
  });
  const root = useRef<HTMLDivElement>(null);
  const register = useCallback(
    (source: string, entries: Entry[]) =>
      setSources((prev) => {
        if (JSON.stringify(prev[source] ?? []) === JSON.stringify(entries)) return prev;
        return { ...prev, [source]: entries };
      }),
    [],
  );
  const blocks = Object.values(sources)
    .flat()
    .sort((a, b) => a.order - b.order);
  const current = showAll
    ? Math.max(0, blocks.length - 1)
    : Math.max(
        0,
        blocks.findIndex((b) => b.id === selected),
      );
  const active = blocks[current]?.id ?? "";
  const pending = blocks.findIndex((b) => b.ready === false);
  const reachable = pending < 0 ? blocks.length - 1 : pending;
  const focus = useCallback(
    (id: string) => {
      setSelected(id);
      requestAnimationFrame(() => scrollToStep(root.current, prefersReducedMotion()));
      try {
        sessionStorage.setItem(`optima.block.${storageKey}`, id);
      } catch {
        /* session only */
      }
    },
    [storageKey],
  );
  const requestId = focusRequest?.id;
  const requestRevision = focusRequest?.revision;
  useEffect(() => {
    if (requestId && requestRevision !== undefined) focus(requestId);
  }, [requestId, requestRevision, focus]);
  const wasActive = useRef(stageActive);
  useEffect(() => {
    if (stageActive && !wasActive.current && focusId) focus(focusId);
    wasActive.current = stageActive;
  }, [stageActive, focusId, focus]);
  const move = (id: string) => {
    focus(id);
  };
  return (
    <FlowContext.Provider value={{ register, active, showAll, focus }}>
      <div
        className="guided"
        data-testid={testId}
        data-mode={showAll ? "all" : "guided"}
        ref={root}
      >
        <nav
          className="guided-nav"
          hidden={blocks.length <= 1}
          aria-label={label ?? t("blocks.label")}
        >
          <ol>
            {blocks.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="guided-step"
                  aria-current={!showAll && i === current ? "step" : undefined}
                  disabled={!showAll && i > reachable}
                  data-testid={`${b.testId}-${b.id.split(":").at(-1)}`}
                  onClick={() => move(b.id)}
                >
                  <span className="step-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{b.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <label className="check small">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => writeShowAll(e.target.checked)}
              data-testid="show-all-blocks"
            />
            <span>{t("blocks.showAll")}</span>
          </label>
        </nav>
        <div className="guided-body">
          {children}
          <div className="guided-actions">
            <button
              type="button"
              className="button secondary"
              disabled={(showAll || current === 0) && !onPrevious}
              onClick={() =>
                !showAll && current > 0 ? move(blocks[current - 1]!.id) : onPrevious?.()
              }
              data-testid={`${testId}-prev`}
            >
              {t("blocks.previous")}
            </button>
            <span className="muted small" role="status">
              {t("blocks.position", { n: current + 1, total: blocks.length })}
            </span>
            {(current < blocks.length - 1 || onNext) && (
              <button
                type="button"
                className="button"
                disabled={
                  blocks[current]?.ready === false ||
                  (current === blocks.length - 1 && (!onNext || !nextAllowed))
                }
                onClick={() =>
                  current < blocks.length - 1 ? move(blocks[current + 1]!.id) : onNext?.()
                }
                data-testid={`${testId}-next`}
              >
                {current === blocks.length - 1 && onNext ? t("workflow.next") : t("blocks.next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </FlowContext.Provider>
  );
}

function BlockSource({ blocks, testId, focusId, order = 1 }: Props) {
  const flow = useContext(FlowContext)!;
  const entries = JSON.stringify(
    blocks.map((b, i) => ({
      id: `${testId}:${b.id}`,
      title: b.title,
      ready: b.ready,
      testId,
      order: order + i / 100,
    })),
  );
  const { register, focus } = flow;
  useLayoutEffect(() => {
    register(testId, JSON.parse(entries) as Entry[]);
  }, [entries, register, testId]);
  useLayoutEffect(() => () => register(testId, []), [register, testId]);
  const previousFocus = useRef(focusId);
  useEffect(() => {
    if (focusId && previousFocus.current !== focusId) focus(`${testId}:${focusId}`);
    previousFocus.current = focusId;
  }, [focusId, focus, testId]);
  return (
    <div data-block-source={testId}>
      {blocks.map((b) => (
        <section
          key={b.id}
          className="guided-block"
          data-block={b.id}
          hidden={!flow.showAll && flow.active !== `${testId}:${b.id}`}
        >
          {flow.showAll && !b.titled && <h3 className="guided-title">{b.title}</h3>}
          {b.content}
        </section>
      ))}
    </div>
  );
}

export function GuidedBlocks(props: Props) {
  const flow = useContext(FlowContext);
  if (flow) return <BlockSource {...props} />;
  return (
    <GuidedFlow {...props}>
      <BlockSource {...props} />
    </GuidedFlow>
  );
}

export function FlowBlock({
  id,
  title,
  children,
  ready,
  order = 1,
  focus = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  ready?: boolean;
  order?: number;
  focus?: boolean;
}) {
  return (
    <GuidedBlocks
      testId={id}
      order={order}
      focusId={focus ? id : undefined}
      blocks={[{ id, title, content: children, ready, titled: true }]}
    />
  );
}

export function FillResponsesButton() {
  const flow = useContext(FlowContext);
  const { t } = useTranslation();
  return (
    flow && (
      <button type="button" className="button" onClick={() => flow.focus("data-grid-blocks:grid")}>
        {t("design.fillResponses")}
      </button>
    )
  );
}

export function useGuidedBlockFocus() {
  const flow = useContext(FlowContext);
  return flow?.showAll ? undefined : flow?.focus;
}
