import { useTranslation } from "react-i18next";
import type { SurfaceBlockContext } from "../../services/engine";

export function BlockContextNote({ block }: { block?: SurfaceBlockContext | null }) {
  const { t } = useTranslation();
  return block ? (
    <p className="muted" data-testid="block-prediction-context">
      {t("blocking.assumption", { name: block.name, reference: block.reference })}
    </p>
  ) : null;
}
