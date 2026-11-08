import { useTranslation } from "react-i18next";
import type { Language } from "../../i18n";
import { formatFull, formatP, formatSignificant, formatStatistic } from "../../i18n/format";
import type { Stat } from "../../services/engine";

export function StatNumber({
  stat,
  language,
  p = false,
  digits = 6,
  residual = false,
}: {
  stat: Stat;
  language: Language;
  p?: boolean;
  digits?: number;
  residual?: boolean;
}) {
  const { t } = useTranslation("results");
  if (stat.status !== "defined") {
    const label =
      stat.reason === "notEstimable"
        ? t("number.notEstimable")
        : stat.reason === "noValidObservations"
          ? t("number.missing")
          : stat.reason === "noResidualDegreesOfFreedom"
            ? t("number.noDf")
            : "—";
    const reason = t(`undefinedReason.${stat.reason}`);
    return (
      <span
        className="undefined"
        title={reason}
        role="note"
        aria-label={reason}
        data-stat-state={stat.reason}
      >
        {label}
      </span>
    );
  }
  const full = formatFull(stat.value, language);
  const almostZero = residual && stat.value !== 0 && Math.abs(stat.value) < 1e-12;
  const shown = almostZero
    ? "≈ 0"
    : p
      ? formatP(stat.value, language)
      : digits === 4
        ? formatStatistic(stat.value, language)
        : formatSignificant(stat.value, language, digits);
  return (
    <span
      className="numeric-value"
      title={full}
      data-full-value={stat.value}
      role="math"
      aria-label={`${almostZero ? `${t("number.nearZero")}: ` : ""}${full}`}
    >
      {shown}
    </span>
  );
}

export function StatCell(props: Parameters<typeof StatNumber>[0]) {
  return (
    <td className="num">
      <StatNumber digits={4} {...props} />
    </td>
  );
}
