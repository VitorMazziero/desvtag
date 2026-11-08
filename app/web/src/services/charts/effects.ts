// Efeitos principais e interações de dois fatores (U09): médias da resposta por nível.
import { wrapWidth } from "./layout";
import {
  close,
  DEFAULT_FRAME,
  dataMarks,
  type Frame,
  legend,
  line,
  linear,
  n,
  niceTicks,
  open,
  type PaintMode,
  paint,
  text,
  yAxis,
} from "./svg";

export interface EffectPanel {
  /** Título do painel (nome do fator ou do par). */
  title: string;
  lowLabel?: string;
  highLabel?: string;
  /** Séries: cada uma com nome e médias nos níveis baixo e alto (null = indefinida). */
  series: Array<{ name: string; low: number | null; high: number | null; dashed?: boolean }>;
  /** Média dos pontos centrais, se houver. */
  center: number | null;
}

export interface EffectsChartSpec {
  id: string;
  title: string;
  description: string;
  yLabel: string;
  lowLabel: string;
  highLabel: string;
  centerLabel: string;
  legend: string;
  panels: EffectPanel[];
  metadata?: string;
}

/** Painéis lado a lado (até 4 por linha) com eixo `y` comum. */
export function effectsChart(
  spec: EffectsChartSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const perRow = Math.min(2, Math.max(1, spec.panels.length));
  const rows = Math.ceil(spec.panels.length / perRow);
  const availableCell = (DEFAULT_FRAME.width - 64 - DEFAULT_FRAME.right) / perRow;
  const keyLines = spec.panels.map((p) =>
    p.series.length > 1 ? p.series.map((s) => wrapWidth(s.name, availableCell - 44, 12)) : [],
  );
  const keyHeight = Math.max(
    0,
    ...keyLines.map((p) => p.reduce((sum, lines) => sum + lines.length * 17 + 5, 0)),
  );
  const panelTitles = spec.panels.map((p) => wrapWidth(p.title, availableCell - 16, 14.4));
  const titleExtra = Math.max(0, ...panelTitles.map((lines) => lines.length - 1)) * 18;
  const panelHeight = 190 + keyHeight + titleExtra;
  const frame: Frame = {
    ...DEFAULT_FRAME,
    left: 64,
    top: 44,
    bottom: 56,
    height: 44 + rows * panelHeight + 56,
  };
  const values = spec.panels
    .flatMap((p) => [...p.series.flatMap((s) => [s.low, s.high]), p.center])
    .filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.12;
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata)];
  parts.push(
    text(16, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  const plotWidth = frame.width - frame.left - frame.right;
  const cell = plotWidth / perRow;
  spec.panels.forEach((panel, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const top = 44 + row * panelHeight;
    const bottom = top + panelHeight - 52 - keyHeight;
    const ticks = niceTicks(min - pad, max + pad);
    const y = linear(
      [ticks[0] ?? min - pad, ticks.at(-1) ?? max + pad],
      [bottom, top + 16 + titleExtra],
    );
    const x0 = frame.left + col * cell + cell * 0.2;
    const x1 = frame.left + col * cell + cell * 0.8;
    if (col === 0) {
      // Eixo vertical só na primeira coluna, com grade fina.
      const sub: Frame = { ...frame, top: top + 16 + titleExtra, height: bottom + frame.bottom };
      parts.push(
        yAxis(sub, [min - pad, max + pad], row === 0 ? spec.yLabel : "", mode, format).svg,
      );
    }
    for (const [lineIndex, label] of panelTitles[index]!.entries())
      parts.push(text((x0 + x1) / 2, top + 10 + lineIndex * 18, label, mode, { weight: 600 }));
    parts.push(line(x0, bottom, x1, bottom, mode, { role: "ink" }));
    parts.push(
      text(x0, bottom + 14, panel.lowLabel ?? spec.lowLabel, mode, {
        size: 11,
        role: "inkSecondary",
      }),
    );
    parts.push(
      text(x1, bottom + 14, panel.highLabel ?? spec.highLabel, mode, {
        size: 11,
        role: "inkSecondary",
      }),
    );
    const marks: string[] = [];
    for (const s of panel.series) {
      if (s.low === null || s.high === null) continue;
      marks.push(
        line(x0, y(s.low), x1, y(s.high), mode, {
          role: s.dashed ? "inkSecondary" : "action",
          width: 2,
          dash: s.dashed ? "5 3" : undefined,
        }),
      );
      for (const [px, py] of [
        [x0, s.low],
        [x1, s.high],
      ] as const)
        marks.push(
          `<circle cx="${n(px)}" cy="${n(y(py))}" r="3.5" fill="${paint(s.dashed ? "inkSecondary" : "action", mode)}"/>`,
        );
    }
    if (panel.center !== null) {
      const cx = (x0 + x1) / 2;
      marks.push(
        `<rect x="${n(cx - 4)}" y="${n(y(panel.center) - 4)}" width="8" height="8" fill="${paint("alert", mode)}"/>`,
      );
    }
    parts.push(
      `<defs><clipPath id="${spec.id}-${index}-plot"><rect x="${frame.left + col * cell}" y="${top + 16 + titleExtra}" width="${cell}" height="${bottom - top - 16 - titleExtra}"/></clipPath></defs>`,
    );
    parts.push(dataMarks(`${spec.id}-${index}`, marks.join("")));
    if (panel.series.length > 1) {
      let keyY = bottom + 32;
      for (const [i, s] of panel.series.entries()) {
        parts.push(
          line(frame.left + col * cell + 4, keyY, frame.left + col * cell + 24, keyY, mode, {
            role: s.dashed ? "inkSecondary" : "action",
            width: 2,
            dash: s.dashed ? "5 3" : undefined,
          }),
        );
        for (const label of keyLines[index]![i]!) {
          parts.push(
            text(frame.left + col * cell + 32, keyY + 4, label, mode, {
              anchor: "start",
              size: 10,
              role: s.dashed ? "inkSecondary" : "action",
            }),
          );
          keyY += 17;
        }
        keyY += 5;
      }
    }
  });
  parts.push(legend(frame, [spec.legend], mode));
  parts.push(close());
  return parts.join("");
}
