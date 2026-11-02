// Ordem de execução do DIC (regenerada pelo motor a partir da especificação gravada no projeto),
// com identificador da unidade experimental e exportação em CSV/XLSX.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CrdSpec, GeneratedCrd } from "../../services/engine";
import { useEngine } from "../../services/engine/EngineContext";
import { useProject, useWorkspace } from "../../state/ProjectContext";
import { TableExportButtons } from "../results/TableExportButtons";
import { collectionColumns } from "./collectionColumns";
import { unitIdOf } from "./crdRows";

const VISIBLE_ROWS = 200;

export function CrdMatrix({ spec }: { spec: CrdSpec }) {
  const { t } = useTranslation();
  const { client } = useEngine();
  const workspace = useWorkspace();
  const project = useProject();
  const [crd, setCrd] = useState<GeneratedCrd | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    client
      .request({ type: "designCrdGenerate", ...spec }, { channel: "crd-matrix" })
      .then((response) => {
        if (
          live &&
          response.outcome.status === "ok" &&
          response.outcome.result.type === "designCrdGenerate"
        ) {
          const { type: _type, ...rest } = response.outcome.result as unknown as GeneratedCrd & {
            type: string;
          };
          setCrd(rest);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client, spec]);

  if (!crd) return null;
  const collection = collectionColumns(
    project,
    crd.runs.map((r) => ({
      unit: unitIdOf(r),
      levels: project.factors.map((f) => (f.id === spec.factorId ? r.level : undefined)),
    })),
  );
  const header = [
    "run",
    "standard_order",
    "unit_id",
    spec.factorName,
    "replicate",
    ...collection.header,
  ];
  const rows = crd.runs.map((r, i) => [
    r.run,
    r.standardOrder,
    unitIdOf(r),
    r.level,
    r.replicate,
    ...(collection.cells[i] ?? []),
  ]);
  const meta = {
    app: "EnziTAG Optima",
    project: workspace.name,
    method: `${crd.provenance.methodId} v${crd.provenance.methodVersion}`,
    engine: crd.provenance.engineVersion,
    design: "completely randomized design",
    levels: String(spec.levels.length),
    replicates: String(spec.replicates),
    randomized: String(spec.randomize),
    seed: String(spec.seed),
    randomization: crd.randomizationAlgorithm,
  };

  return (
    <section aria-labelledby="crd-matrix-title" data-testid="crd-matrix">
      <h3 id="crd-matrix-title">{t("design.crd.matrix.title")}</h3>
      <TableExportButtons
        label={t("design.crd.matrix.exportCsv")}
        suffix={t("design.crd.matrix.suffix")}
        sheet={t("design.crd.matrix.title")}
        header={header}
        rows={rows}
        metadata={meta}
        fileBase="matriz-dic"
        onDone={setNotice}
      />
      <p className="muted small" data-testid="collection-note">
        {t("design.collectionNote")}
      </p>
      {notice && (
        <p role="status" className="muted small">
          {notice}
        </p>
      )}
      <div className="grid-scroll">
        <table className="results-table" data-testid="crd-table">
          <thead>
            <tr>
              <th scope="col">{t("design.crd.matrix.run")}</th>
              <th scope="col">{t("design.crd.matrix.standard")}</th>
              <th scope="col">{t("design.crd.matrix.unit")}</th>
              <th scope="col">{spec.factorName}</th>
              <th scope="col">{t("design.crd.matrix.replicate")}</th>
            </tr>
          </thead>
          <tbody>
            {crd.runs.slice(0, VISIBLE_ROWS).map((r) => (
              <tr key={r.run}>
                <th scope="row">{r.run}</th>
                <td className="num">{r.standardOrder}</td>
                <td>{unitIdOf(r)}</td>
                <td>{r.level}</td>
                <td className="num">{r.replicate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {crd.runs.length > VISIBLE_ROWS && (
        <p className="muted small">{`${VISIBLE_ROWS} / ${crd.runs.length}`}</p>
      )}
      <p className="muted small">{t("design.crd.unitNote")}</p>
      <p className="muted small">
        {t("design.crd.algorithm", {
          algorithm: crd.randomizationAlgorithm,
          seed: String(spec.seed),
        })}
      </p>
    </section>
  );
}
