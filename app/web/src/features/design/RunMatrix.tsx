// Matriz de ensaios do planejamento, propriedades (relação definidora, resolução, confundimento)
// e exportação em CSV (U06).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { DesignSpec, GeneratedDesign } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { utf8 } from "../../services/export";
import { useStorage } from "../../services/storage/context";
import { useWorkspace } from "../../state/ProjectContext";
import { matrixCsv } from "./matrixCsv";

const VISIBLE_ROWS = 200;

export function RunMatrix({ spec, language }: { spec: DesignSpec; language: Language }) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const storage = useStorage();
  const workspace = useWorkspace();
  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [view, setView] = useState<"real" | "coded">("real");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    client
      .request({ type: "designGenerate", ...spec }, { channel: "design-matrix" })
      .then((response) => {
        if (
          live &&
          response.outcome.status === "ok" &&
          response.outcome.result.type === "designGenerate"
        ) {
          const { type: _type, ...rest } = response.outcome.result as unknown as GeneratedDesign & {
            type: string;
          };
          setDesign(rest);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec]);

  if (!design) return null;
  const fmt = (v: number) => formatSignificant(v, language, 8);
  const properties = design.spec.kind.type !== "fullFactorial";
  const exportCsv = async () => {
    try {
      const bytes = utf8(matrixCsv(design, { app: "EnziTAG Optima", project: workspace.name }));
      const saved = await storage.exportFile(bytes, "matriz-de-ensaios.csv");
      setNotice(
        saved ? t("design.matrix.exported", { name: saved.name }) : t("design.matrix.cancelled"),
      );
    } catch {
      setNotice(t("design.matrix.failed"));
    }
  };

  return (
    <section aria-labelledby="matrix-title" data-testid="run-matrix">
      <h3 id="matrix-title">{t("design.matrix.title")}</h3>
      <div className="row">
        <label className="field">
          <span>{t("design.matrix.view")}</span>
          <select value={view} onChange={(e) => setView(e.target.value as "real" | "coded")}>
            <option value="real">{t("design.matrix.real")}</option>
            <option value="coded">{t("design.matrix.coded")}</option>
          </select>
        </label>
        <button type="button" className="button secondary small" onClick={exportCsv}>
          {t("design.matrix.exportCsv")}
        </button>
      </div>
      {notice && (
        <p role="status" className="muted small">
          {notice}
        </p>
      )}
      <div className="grid-scroll">
        <table className="results-table" data-testid="matrix-table">
          <thead>
            <tr>
              <th scope="col">{t("design.matrix.run")}</th>
              <th scope="col">{t("design.matrix.standard")}</th>
              <th scope="col">{t("design.matrix.point")}</th>
              <th scope="col">{t("design.matrix.replicate")}</th>
              {design.spec.factors.map((f) => (
                <th scope="col" key={f.id}>
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {design.runs.slice(0, VISIBLE_ROWS).map((r) => (
              <tr key={r.run}>
                <th scope="row">{r.run}</th>
                <td className="num">{r.standardOrder}</td>
                <td>
                  {r.point === "center"
                    ? t("design.matrix.center")
                    : r.point === "axial"
                      ? t("design.matrix.axial")
                      : t("design.matrix.factorial")}
                </td>
                <td className="num">{r.replicate === 0 ? "—" : r.replicate}</td>
                {(view === "real" ? r.real : r.coded).map((v, j) => (
                  <td className="num" key={design.spec.factors[j]?.id ?? j}>
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {design.runs.length > VISIBLE_ROWS && (
        <p className="muted small">{`${VISIBLE_ROWS} / ${design.runs.length}`}</p>
      )}
      {properties && <DesignProperties design={design} language={language} />}
    </section>
  );
}

function DesignProperties({ design, language }: { design: GeneratedDesign; language: Language }) {
  const { t } = useTranslation();
  return (
    <details open data-testid="design-properties">
      <summary>{t("design.properties.title")}</summary>
      {design.resolution !== null && (
        <p data-testid="design-resolution">
          {t("design.properties.resolution", { resolution: design.resolution })}
        </p>
      )}
      {design.definingRelation.length > 0 && (
        <p data-testid="defining-relation">
          <strong>{t("design.properties.relation")}:</strong> {design.definingRelation.join(", ")}
        </p>
      )}
      {design.axialDistance !== null && (
        <p data-testid="axial-distance">
          {t("design.properties.axial", {
            alpha: formatSignificant(design.axialDistance, language, 6),
            factorial: design.count.factorialRuns - design.count.axialRuns,
            axial: design.count.axialRuns,
            center: design.count.centerRuns,
          })}
        </p>
      )}
      {design.maxMainVsTwoFactorCorrelation > 0 && (
        <p>
          {t("design.properties.pbPartial", {
            value: formatSignificant(design.maxMainVsTwoFactorCorrelation, language, 3),
          })}
        </p>
      )}
      {design.dummyColumns > 0 && (
        <p>{t("design.properties.dummy", { count: design.dummyColumns })}</p>
      )}
      {design.aliases.length > 0 && (
        <>
          <h4>{t("design.properties.aliases")}</h4>
          <p className="muted small">{t("design.properties.aliasesHelp")}</p>
          <ul className="facts-list" data-testid="alias-list">
            {design.aliases.map((row) => (
              <li key={row.effect}>
                <strong>{row.effect}</strong> {row.aliases.join(" ")}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">
        {t("design.properties.algorithm", {
          algorithm: design.randomizationAlgorithm,
          seed: String(design.spec.seed),
        })}
      </p>
    </details>
  );
}
