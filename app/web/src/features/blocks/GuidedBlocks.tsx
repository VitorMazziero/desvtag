// Percurso guiado por blocos (ET29): em vez de uma página longa, cada etapa mostra **um bloco por
// vez**, com «Anterior» e «Seguir» e uma lista lateral dos blocos. Um bloco só libera o seguinte
// quando está pronto (por exemplo, níveis dos fatores válidos), de modo que opções que dependem de
// uma escolha anterior só aparecem depois dela. Os blocos ficam montados (só escondidos), então o
// que o usuário digitou não se perde ao navegar. «Mostrar tudo» (a mesma preferência da barra de
// seções dos resultados) exibe todos os blocos em sequência.
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { prefersReducedMotion, scrollToStep } from "../workflow/scrollToStep";

export interface Block {
  id: string;
  title: string;
  /** Pronto para seguir; ausente = sempre pronto. */
  ready?: boolean;
  content: ReactNode;
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
  /** O bloco principal da etapa mostra a opção «Mostrar tudo»; blocos internos não. */
  primary?: boolean;
  /** Quando muda para um id, o bloco correspondente passa a ser o atual (ex.: depois de gerar). */
  focusId?: string;
  /** Nome acessível da lista de blocos (único na página). */
  label?: string;
}

export function GuidedBlocks({ blocks, testId, primary = true, focusId, label }: Props) {
  const { t } = useTranslation();
  const showAll = useSyncExternalStore(subscribe, readShowAll, () => false);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  // Alcançável: até o primeiro bloco ainda não pronto (inclusive ele).
  const firstPending = blocks.findIndex((b) => b.ready === false);
  const reachable = firstPending === -1 ? blocks.length - 1 : firstPending;
  const current = Math.min(index, blocks.length - 1);

  const ids = blocks.map((b) => b.id).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `ids` representa a lista de blocos.
  useEffect(() => {
    if (focusId === undefined) return;
    const target = ids.split("|").indexOf(focusId);
    if (target >= 0) setIndex(target);
  }, [focusId, ids]);

  // Ao trocar de bloco, rola até o início do percurso (não na primeira exibição).
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o bloco muda.
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    if (!showAll) scrollToStep(root.current, prefersReducedMotion());
  }, [current]);

  const toggleAll = (on: boolean) => writeShowAll(on);

  if (blocks.length === 0) return null;
  if (blocks.length === 1)
    return (
      <div className="guided" data-testid={testId} data-mode="single" ref={root}>
        {blocks[0]?.content}
      </div>
    );
  return (
    <div
      className={primary ? "guided" : "guided inner"}
      data-testid={testId}
      data-mode={showAll ? "all" : "guided"}
      ref={root}
    >
      <nav className="guided-nav" aria-label={label ?? t("blocks.label")}>
        <ol>
          {blocks.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                className="guided-step"
                aria-current={!showAll && i === current ? "step" : undefined}
                disabled={!showAll && i > reachable}
                data-testid={`${testId}-${b.id}`}
                onClick={() => setIndex(i)}
              >
                <span className="step-number" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{b.title}</span>
              </button>
            </li>
          ))}
        </ol>
        {primary && (
          <label className="check small">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => toggleAll(e.target.checked)}
              data-testid="show-all-blocks"
            />
            <span>{t("blocks.showAll")}</span>
          </label>
        )}
      </nav>
      <div className="guided-body">
        {blocks.map((b, i) => (
          <section
            key={b.id}
            className="guided-block"
            data-block={b.id}
            hidden={!showAll && i !== current}
          >
            {showAll && blocks.length > 1 && <h3 className="guided-title">{b.title}</h3>}
            {b.content}
          </section>
        ))}
        {!showAll && blocks.length > 1 && (
          <div className="guided-actions">
            <button
              type="button"
              className="button secondary"
              disabled={current === 0}
              onClick={() => setIndex(current - 1)}
              data-testid={`${testId}-prev`}
            >
              {t("blocks.previous")}
            </button>
            <span className="muted small" role="status">
              {t("blocks.position", { n: current + 1, total: blocks.length })}
            </span>
            <button
              type="button"
              className="button"
              disabled={current >= blocks.length - 1 || blocks[current]?.ready === false}
              onClick={() => setIndex(current + 1)}
              data-testid={`${testId}-next`}
            >
              {t("blocks.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
