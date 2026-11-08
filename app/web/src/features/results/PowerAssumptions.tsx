import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatSignificant } from "../../i18n/format";
import type { PowerRecord, PowerRequest } from "../../services/engine";
import { familyExportMetadata } from "./familyExportMetadata";
import { type MixedCell, MixedResultTable } from "./MixedResultTable";
export function PowerAssumptions({
  request,
  language,
}: {
  request: PowerRequest;
  language: Language;
}) {
  const { t } = useTranslation();
  const d = request.design;
  const expectedEffect = d.type === "twoLevel" ? d.effects[d.target] : undefined;
  const fmt = (v: number) => formatSignificant(v, language, 6);
  if (d.type === "regression")
    return (
      <>
        <dt>{t("powerAdvanced.hypothesis")}</dt>
        <dd className="fact-prose">{t("powerAdvanced.hypothesisRegression")}</dd>
        <dt>{t("powerAdvanced.baseDesign")}</dt>
        <dd className="fact-prose">
          {t("powerAdvanced.regressionDimensions", {
            rows: d.predictors.length,
            predictors: d.coefficients.length,
          })}
        </dd>
      </>
    );
  if (d.type === "contrast")
    return (
      <>
        <dt>{t("powerAdvanced.hypothesis")}</dt>
        <dd className="fact-prose">{t("powerAdvanced.hypothesisContrast")}</dd>
        <dt>{t("powerAdvanced.groups")}</dt>
        <dd>{d.means.length}</dd>
      </>
    );
  if (d.type === "twoLevel")
    return (
      <>
        <dt>{t("powerAdvanced.hypothesis")}</dt>
        <dd className="fact-prose">
          {t("powerAdvanced.hypothesisEffect", {
            term: d.terms[d.target]
              ?.map((i) => `${t("powerAdvanced.factor")} ${i + 1}`)
              .join(" × "),
          })}
        </dd>
        <dt>{t("powerAdvanced.expectedEffect")}</dt>
        <dd>{expectedEffect === undefined ? "—" : fmt(expectedEffect)}</dd>
        <dt>{t("powerAdvanced.modelTerms")}</dt>
        <dd className="fact-prose">
          {t("powerAdvanced.termsWithIntercept", { count: d.terms.length })}
        </dd>
      </>
    );
  return (
    <>
      <dt>{t(d.type === "anova" ? "power.means" : "power.difference")}</dt>
      <dd>{d.type === "anova" ? d.means.map(fmt).join("; ") : fmt(d.difference)}</dd>
    </>
  );
}
export function PowerDesignTables({
  record,
  language,
  onDone,
  report = false,
}: {
  record: PowerRecord;
  language: Language;
  onDone: (message: string) => void;
  report?: boolean;
}) {
  const { t } = useTranslation();
  const design = record.input.design;
  const metadata = familyExportMetadata(record);
  const table = (
    id: string,
    title: string,
    columns: { key: string; label: string }[],
    rows: MixedCell[][],
    previewRows?: number,
  ) => (
    <MixedResultTable
      id={id}
      title={title}
      columns={columns}
      rows={rows}
      metadata={metadata}
      fileBase="power"
      language={language}
      onDone={onDone}
      previewRows={report ? undefined : previewRows}
      report={report}
    />
  );
  const column = (key: string, label: string) => ({ key, label });
  return (
    <>
      {design.type === "regression" && (
        <>
          {table(
            "power-coefficients",
            t("powerAdvanced.coefficients"),
            [
              column("predictor", t("powerAdvanced.predictor")),
              column("expected_coefficient", t("powerAdvanced.expectedCoefficient")),
            ],
            design.coefficients.map((v, i) => [`${t("powerAdvanced.predictor")} ${i + 1}`, v]),
          )}
          {table(
            "power-predictor-matrix",
            t("powerAdvanced.baseDesign"),
            [
              column("condition", t("powerAdvanced.condition")),
              ...design.coefficients.map((_, i) => column(`x_${i + 1}`, `X${i + 1}`)),
            ],
            design.predictors.map((row, i) => [i + 1, ...row]),
            20,
          )}
        </>
      )}
      {design.type === "contrast" &&
        table(
          "power-contrast",
          t("powerAdvanced.title.contrast"),
          [
            column("group", t("powerAdvanced.group")),
            column("mean", t("powerAdvanced.expectedMean")),
            column("weight", t("powerAdvanced.weight")),
            column("base_allocation", t("powerAdvanced.baseAllocation")),
          ],
          design.means.map((v, i) => [
            `${t("powerAdvanced.group")} ${i + 1}`,
            v,
            design.weights[i] ?? null,
            design.allocation[i] ?? null,
          ]),
          20,
        )}
      {design.type === "twoLevel" &&
        table(
          "power-effects",
          t("powerAdvanced.effects"),
          [
            column("term", t("powerAdvanced.term")),
            column("expected_effect", t("powerAdvanced.expectedEffect")),
            column("selected", t("powerAdvanced.selected")),
          ],
          design.terms.map((term, i) => [
            term.map((f) => `${t("powerAdvanced.factor")} ${f + 1}`).join(" × "),
            design.effects[i] ?? null,
            t(i === design.target ? "family.yes" : "family.no"),
          ]),
          20,
        )}
      {!report &&
        record.result.simulation &&
        table(
          "power-simulation-table",
          t("powerAdvanced.simulationTitle"),
          [
            column("seed", t("powerAdvanced.seed")),
            column("replications", t("powerAdvanced.studies")),
            column("rejections", t("powerAdvanced.rejections")),
            column("estimate", t("powerAdvanced.simulatedPower")),
            column("mc_standard_error", t("powerAdvanced.shortMcse")),
            column("wilson_lower_95", t("powerAdvanced.shortLower")),
            column("wilson_upper_95", t("powerAdvanced.shortUpper")),
          ],
          [
            [
              record.result.simulation.seed,
              record.result.simulation.replications,
              record.result.simulation.rejections,
              record.result.simulation.estimate,
              record.result.simulation.standardError,
              record.result.simulation.ciLower,
              record.result.simulation.ciUpper,
            ],
          ],
        )}
    </>
  );
}
